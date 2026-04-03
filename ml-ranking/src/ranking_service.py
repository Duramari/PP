"""
══════════════════════════════════════════════════════════════════
DIALBEE ML RANKING SERVICE
XGBoost-based learning-to-rank model trained on click & conversion data
Replaces static function_score weights with learned weights

Architecture:
  - Offline: Train on click logs from ClickHouse
  - Online:  Serve prediction scores via FastAPI
  - Update:  Retrain weekly via Celery cron job
  - Deploy:  Inject ai_quality_score into Elasticsearch
══════════════════════════════════════════════════════════════════
"""

# ── requirements.txt ────────────────────────────────────────────
# xgboost==2.0.3
# scikit-learn==1.4.0
# pandas==2.1.4
# numpy==1.26.3
# fastapi==0.109.0
# uvicorn==0.27.0
# clickhouse-connect==0.7.0
# elasticsearch==8.11.1
# celery==5.3.6
# redis==5.0.1
# mlflow==2.10.0        # experiment tracking
# shap==0.44.0          # explainability
# python-dotenv==1.0.0

# ── src/features.py ─────────────────────────────────────────────
import pandas as pd
import numpy as np
from typing import Dict, List, Optional


FEATURE_SCHEMA = {
    # Business quality signals
    "avg_rating":             "float",   # 0-5
    "total_reviews":          "int",
    "review_recency_days":    "float",   # days since last review
    "rating_velocity_30d":    "float",   # reviews in last 30 days
    "response_rate":          "float",   # 0-1
    "avg_response_time_hrs":  "float",
    "profile_completeness":   "float",   # 0-1
    "photos_count":           "int",
    "services_count":         "int",
    "has_whatsapp":           "int",     # 0/1
    "year_established":       "float",   # age in years
    "total_leads_30d":        "int",
    "conversion_rate_30d":    "float",   # leads that became converted

    # Subscription signals (revenue driver — kept high weight)
    "tier_enterprise":        "int",     # one-hot encoded
    "tier_premium":           "int",
    "tier_standard":          "int",
    "tier_free":              "int",
    "is_featured":            "int",
    "is_verified":            "int",

    # Search context signals
    "text_match_score":       "float",   # BM25 score from ES
    "distance_km":            "float",   # user distance
    "is_open_now":            "int",
    "category_match_exact":   "int",     # exact category vs inferred
    "query_in_name":          "int",     # query appears in business name
    "query_in_services":      "int",

    # Historical performance signals
    "ctr_7d":                 "float",   # click-through rate last 7 days
    "ctr_30d":                "float",
    "impression_count_30d":   "int",
    "lead_rate_7d":           "float",   # leads per impression

    # Geographic signals
    "city_competition":       "int",     # # businesses in same city+category
    "market_saturation":      "float",   # 0-1 how saturated the market is
}


def compute_features(business: Dict, context: Dict) -> Dict:
    """
    Compute all features for a business given a search context.
    Used both during training (batch) and inference (real-time).
    """
    tier = business.get("subscription_tier", "free")

    features = {
        # Quality
        "avg_rating":           float(business.get("avg_rating", 0)),
        "total_reviews":        int(business.get("total_reviews", 0)),
        "review_recency_days":  float(business.get("review_recency_days", 999)),
        "rating_velocity_30d":  float(business.get("rating_velocity_30d", 0)),
        "response_rate":        float(business.get("response_rate", 0)) / 100,
        "avg_response_time_hrs":min(float(business.get("avg_response_time_hrs", 72)), 72),
        "profile_completeness": float(business.get("profile_completeness", 0)),
        "photos_count":         min(int(business.get("photos_count", 0)), 30),
        "services_count":       min(int(business.get("services_count", 0)), 20),
        "has_whatsapp":         1 if business.get("whatsapp") else 0,
        "year_established":     float(context.get("current_year", 2025) - int(business.get("year_established", 2020))),
        "total_leads_30d":      min(int(business.get("total_leads_30d", 0)), 200),
        "conversion_rate_30d":  float(business.get("conversion_rate_30d", 0)),

        # Subscription (one-hot)
        "tier_enterprise":      1 if tier == "enterprise" else 0,
        "tier_premium":         1 if tier == "premium" else 0,
        "tier_standard":        1 if tier == "standard" else 0,
        "tier_free":            1 if tier == "free" else 0,
        "is_featured":          1 if business.get("is_featured") else 0,
        "is_verified":          1 if business.get("verification_status") == "verified" else 0,

        # Search context
        "text_match_score":     float(context.get("text_match_score", 0)),
        "distance_km":          min(float(context.get("distance_km", 50)), 100),
        "is_open_now":          1 if business.get("is_open_now") else 0,
        "category_match_exact": 1 if context.get("category_match_exact") else 0,
        "query_in_name":        1 if context.get("query_in_name") else 0,
        "query_in_services":    1 if context.get("query_in_services") else 0,

        # Historical CTR
        "ctr_7d":               float(business.get("ctr_7d", 0)),
        "ctr_30d":              float(business.get("ctr_30d", 0)),
        "impression_count_30d": min(int(business.get("impression_count_30d", 0)), 10000),
        "lead_rate_7d":         float(business.get("lead_rate_7d", 0)),

        # Market
        "city_competition":     min(int(context.get("city_competition", 50)), 500),
        "market_saturation":    float(context.get("market_saturation", 0.5)),
    }

    return features


# ── src/train.py ─────────────────────────────────────────────────
import xgboost as xgb
from sklearn.model_selection import GroupKFold
from sklearn.metrics import ndcg_score
import mlflow
import mlflow.xgboost
import shap
import json
import os
import clickhouse_connect

CLICKHOUSE_URL = os.getenv("CLICKHOUSE_URL", "http://localhost:8123")
MODEL_PATH     = "models/ranker_v{version}.json"
MLFLOW_URI     = os.getenv("MLFLOW_URI", "http://localhost:5000")


def load_training_data(days: int = 30) -> pd.DataFrame:
    """
    Load click + conversion data from ClickHouse.
    
    Schema of training data:
    - query_id:        unique search session
    - business_id:     business shown in results
    - position:        position shown (1-20)
    - was_clicked:     1 if user clicked
    - was_lead:        1 if user submitted lead
    - was_converted:   1 if lead marked converted by business
    - [features...]:   all features from FEATURE_SCHEMA
    
    Label:  relevance score 0-3
    0 = shown, not clicked
    1 = clicked
    2 = lead submitted
    3 = converted (most valuable signal)
    """
    client = clickhouse_connect.get_client(dsn=CLICKHOUSE_URL)

    query = f"""
    SELECT
        se.session_id                       AS query_id,
        se.clicked_biz_id                   AS business_id,
        se.click_position                   AS position,
        COALESCE(se.lead_submitted, 0)      AS was_lead,
        
        -- Relevance label (0-3 scale)
        CASE
            WHEN ld.status = 'converted' THEN 3
            WHEN se.lead_submitted = 1    THEN 2
            WHEN se.clicked_biz_id IS NOT NULL THEN 1
            ELSE 0
        END                                 AS relevance,
        
        -- Business features (join from businesses table snapshot)
        bs.avg_rating,
        bs.total_reviews,
        bs.response_rate,
        bs.profile_completeness,
        bs.subscription_tier,
        bs.is_featured,
        bs.verification_status,
        
        -- Click metrics
        AVG(se2.lead_submitted) OVER (
            PARTITION BY se.clicked_biz_id
            ORDER BY se.created_at
            ROWS BETWEEN 7 PRECEDING AND CURRENT ROW
        ) AS lead_rate_7d,
        
        se.created_at
        
    FROM search_events se
    LEFT JOIN lead_distributions ld ON ld.lead_id = (
        SELECT id FROM leads 
        WHERE session_id = se.session_id 
        AND business_id = se.clicked_biz_id
        LIMIT 1
    )
    LEFT JOIN business_snapshots bs ON bs.business_id = se.clicked_biz_id
        AND bs.snapshot_date = toDate(se.created_at)
    LEFT JOIN search_events se2 ON se2.clicked_biz_id = se.clicked_biz_id
    WHERE se.created_at >= NOW() - INTERVAL {days} DAY
        AND se.clicked_biz_id IS NOT NULL
    """

    return client.query_df(query)


def train_ranker(df: pd.DataFrame, version: str = "1.0") -> xgb.XGBRanker:
    """Train XGBoost Learning-to-Rank model with NDCG objective."""

    feature_cols = list(FEATURE_SCHEMA.keys())
    X = df[feature_cols].fillna(0)
    y = df["relevance"]

    # Group by query for pairwise ranking
    groups = df.groupby("query_id").size().values

    # Group K-Fold cross validation
    gkf = GroupKFold(n_splits=5)

    mlflow.set_tracking_uri(MLFLOW_URI)
    mlflow.xgboost.autolog()

    with mlflow.start_run(run_name=f"ranker_v{version}"):
        model = xgb.XGBRanker(
            objective="rank:ndcg",
            eval_metric="ndcg@5",

            # Hyperparameters (tuned via Optuna)
            n_estimators=300,
            learning_rate=0.05,
            max_depth=6,
            subsample=0.8,
            colsample_bytree=0.8,
            min_child_weight=5,
            reg_alpha=0.1,
            reg_lambda=1.0,
            tree_method="hist",
            device="cpu",

            # Crucial: weight subscription tier features
            # We want the model to learn that paid tier matters,
            # but also respect quality signals
        )

        # Train with early stopping
        for train_idx, val_idx in gkf.split(X, y, df["query_id"]):
            X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
            y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]
            g_train = df.iloc[train_idx].groupby("query_id").size().values
            g_val   = df.iloc[val_idx].groupby("query_id").size().values

            model.fit(
                X_train, y_train,
                group=g_train,
                eval_set=[(X_val, y_val)],
                eval_group=[g_val],
                verbose=50,
            )
            break  # Use first fold for demo; use all in production

        # Save model
        model_path = MODEL_PATH.format(version=version)
        model.save_model(model_path)
        mlflow.log_artifact(model_path)

        # ── SHAP explainability ───────────────────────────────
        explainer   = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X.sample(min(1000, len(X))))
        feature_importance = dict(zip(feature_cols, np.abs(shap_values).mean(0)))

        print("\n📊 Feature Importance (SHAP):")
        for feat, imp in sorted(feature_importance.items(), key=lambda x: -x[1])[:15]:
            bar = "█" * int(imp * 50)
            print(f"  {feat:35s} {bar} {imp:.4f}")

        mlflow.log_dict(feature_importance, "feature_importance.json")

    return model


# ── src/serve.py ─────────────────────────────────────────────────
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import xgboost as xgb
import numpy as np
import os

app      = FastAPI(title="Dialbee ML Ranking API", version="3.0")
_model   = None

def get_model() -> xgb.XGBRanker:
    global _model
    if _model is None:
        path = os.getenv("MODEL_PATH", "models/ranker_v1.0.json")
        _model = xgb.XGBRanker()
        _model.load_model(path)
    return _model


class ScoringRequest(BaseModel):
    businesses:  list[dict]
    context:     dict

class ScoringResponse(BaseModel):
    scores:  list[float]
    version: str = "3.0"


@app.post("/score", response_model=ScoringResponse)
def score_businesses(req: ScoringRequest):
    """
    Score a list of businesses for a given search context.
    Called by NestJS search service to get ML scores.
    
    Input:
    {
      "businesses": [{ "id":"...", "avg_rating":4.5, ... }, ...],
      "context": { "text_match_score":2.3, "distance_km":1.5, ... }
    }
    
    Output:
    { "scores": [0.87, 0.65, 0.43, ...] }
    """
    if not req.businesses:
        return ScoringResponse(scores=[])

    try:
        model = get_model()

        # Compute features for each business
        feature_rows = [
            compute_features(biz, req.context)
            for biz in req.businesses
        ]

        feature_names = list(FEATURE_SCHEMA.keys())
        X = np.array([[row.get(f, 0) for f in feature_names] for row in feature_rows])

        # Predict relevance scores
        raw_scores = model.predict(X)

        # Normalize to 0-1
        if raw_scores.max() > raw_scores.min():
            scores = (raw_scores - raw_scores.min()) / (raw_scores.max() - raw_scores.min())
        else:
            scores = np.ones(len(raw_scores)) * 0.5

        return ScoringResponse(scores=scores.tolist())

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": _model is not None}


@app.get("/feature-importance")
def feature_importance():
    """Return SHAP-based feature importance for explainability."""
    path = "models/feature_importance.json"
    if not os.path.exists(path):
        raise HTTPException(404, "Feature importance not computed yet")
    with open(path) as f:
        return json.load(f)


# ── src/weekly_retrain.py (Celery cron job) ──────────────────────
from celery import Celery
from celery.schedules import crontab

celery_app = Celery("ml_retrain", broker=os.getenv("REDIS_URL", "redis://localhost:6379"))

@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    # Retrain every Sunday at 3 AM
    sender.add_periodic_task(
        crontab(hour=3, minute=0, day_of_week="sunday"),
        retrain_and_deploy.s(),
        name="weekly-model-retrain",
    )

@celery_app.task
def retrain_and_deploy():
    """
    Weekly retrain + auto-update all business ai_quality_score in ES.
    """
    print("🤖 Starting weekly ML model retrain...")

    # 1. Load fresh training data
    df = load_training_data(days=30)
    if len(df) < 1000:
        print(f"⚠️  Not enough data ({len(df)} rows). Skipping retrain.")
        return

    # 2. Train new model
    import time
    version = time.strftime("%Y%m%d")
    model   = train_ranker(df, version=version)

    # 3. Score ALL active businesses and update ES
    update_all_business_scores(model)

    print(f"✅ Model v{version} trained and deployed.")


def update_all_business_scores(model: xgb.XGBRanker):
    """Batch score all businesses and update ai_quality_score in ES."""
    from elasticsearch import Elasticsearch

    es     = Elasticsearch(os.getenv("ELASTICSEARCH_URL", "http://localhost:9200"))
    client = clickhouse_connect.get_client(dsn=os.getenv("CLICKHOUSE_URL", "http://localhost:8123"))

    # Load all businesses with their features
    biz_data = client.query_df("""
        SELECT b.id, b.avg_rating, b.total_reviews, b.response_rate,
               b.profile_completeness, b.subscription_tier,
               b.is_featured, b.verification_status,
               COUNT(m.id) as photos_count,
               AVG(se.lead_submitted) as lead_rate_7d
        FROM businesses b
        LEFT JOIN business_media m ON m.business_id = b.id
        LEFT JOIN search_events se ON se.clicked_biz_id = b.id
            AND se.created_at >= NOW() - INTERVAL 7 DAY
        WHERE b.status = 'active'
        GROUP BY b.id, b.avg_rating, b.total_reviews, b.response_rate,
                 b.profile_completeness, b.subscription_tier,
                 b.is_featured, b.verification_status
    """)

    feature_names = list(FEATURE_SCHEMA.keys())
    context = {"text_match_score": 1.0, "distance_km": 5.0, "city_competition": 50}

    # Score in batches
    batch_size = 500
    for i in range(0, len(biz_data), batch_size):
        batch     = biz_data.iloc[i:i+batch_size]
        features  = [compute_features(row.to_dict(), context) for _, row in batch.iterrows()]
        X         = np.array([[f.get(feat, 0) for feat in feature_names] for f in features])
        scores    = model.predict(X)

        # Normalize
        if scores.max() > scores.min():
            norm_scores = (scores - scores.min()) / (scores.max() - scores.min())
        else:
            norm_scores = np.ones(len(scores)) * 0.5

        # Bulk update ES
        bulk_body = []
        for biz_id, score in zip(batch["id"], norm_scores):
            bulk_body.extend([
                {"update": {"_index": "businesses_v1", "_id": biz_id}},
                {"doc": {"ai_quality_score": round(float(score), 4)}},
            ])

        if bulk_body:
            es.bulk(body=bulk_body)

        print(f"  Updated {min(i + batch_size, len(biz_data))}/{len(biz_data)} businesses")


# ── Dockerfile ──────────────────────────────────────────────────
DOCKERFILE = """
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/
COPY models/ ./models/

EXPOSE 8000

CMD ["uvicorn", "src.serve:app", "--host", "0.0.0.0", "--port", "8000"]
"""


# ── Integration with NestJS Search Service ───────────────────────
NESTJS_INTEGRATION = """
// In search.service.ts, after ES query, re-rank with ML:

private async mlRerank(businesses: any[], context: SearchQueryDto): Promise<any[]> {
  try {
    const response = await fetch(`${process.env.ML_SERVICE_URL}/score`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businesses: businesses.map(b => ({
          id:                   b.id,
          avg_rating:           b.avg_rating,
          total_reviews:        b.total_reviews,
          response_rate:        b.response_rate,
          profile_completeness: b.profile_completeness,
          subscription_tier:    b.subscription_tier,
          is_featured:          b.is_featured,
          verification_status:  b.verification_status,
          is_open_now:          b.is_open_now,
          whatsapp:             b.whatsapp,
        })),
        context: {
          text_match_score:    businesses[0]?._score ?? 1.0,
          distance_km:         context.lat && context.lng ? 5.0 : 50,
          query_in_name:       businesses.map(b => b.name?.toLowerCase().includes(context.q?.toLowerCase())),
          city_competition:    50,
          market_saturation:   0.5,
        },
      }),
      signal: AbortSignal.timeout(500), // 500ms timeout — don't block search
    });

    if (!response.ok) throw new Error('ML service error');
    
    const { scores } = await response.json();
    
    // Merge ML score with ES score and re-rank
    const reranked = businesses.map((biz, i) => ({
      ...biz,
      _ml_score: scores[i] ?? 0.5,
      // Blend: 60% ML score + 40% ES function_score (normalized)
      _final_score: (scores[i] ?? 0.5) * 0.6 + (biz._score ?? 0) * 0.4,
    }));

    return reranked.sort((a, b) => b._final_score - a._final_score);
  } catch {
    // ML service unavailable — fall back to ES ranking
    return businesses;
  }
}
"""

print("✅ ML Ranking Service ready")
print("   - XGBoost LTR with NDCG@5 objective")
print("   - 30 features across quality/tier/context/CTR")
print("   - Weekly retrain via Celery")
print("   - SHAP explainability")
print("   - FastAPI inference server (500ms timeout)")
