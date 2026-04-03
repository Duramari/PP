-- ═══════════════════════════════════════════════════════════════
-- DIALBEE CLICKHOUSE ANALYTICS
-- Columnar DB for billions of events — fast aggregations
-- Powers: Admin dashboard, business analytics, ML training data
-- ═══════════════════════════════════════════════════════════════

-- ── Database Setup ────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS dialbee_analytics;
USE dialbee_analytics;

-- ── 1. Search Events ─────────────────────────────────────────
-- Every search query, result, click, and conversion
-- ~10M rows/day at scale

CREATE TABLE IF NOT EXISTS search_events (
    -- Time (partition key — queries 99% of the time)
    event_date      Date          DEFAULT toDate(created_at),
    created_at      DateTime64(3) DEFAULT now(),

    -- Identity
    event_id        UUID          DEFAULT generateUUIDv4(),
    session_id      String,
    user_id         Nullable(String),

    -- Query
    query           String,
    query_lang      LowCardinality(String) DEFAULT 'en',
    category_slug   LowCardinality(String),
    city_slug       LowCardinality(String),
    country_code    LowCardinality(String),
    location_lat    Nullable(Float32),
    location_lng    Nullable(Float32),

    -- Results
    results_count   UInt32 DEFAULT 0,
    results_page    UInt8  DEFAULT 1,
    sort_by         LowCardinality(String) DEFAULT 'relevance',

    -- Interaction
    clicked_biz_id     Nullable(String),
    click_position     Nullable(UInt8),
    lead_submitted     UInt8 DEFAULT 0,   -- 0/1
    time_to_click_ms   Nullable(UInt32),  -- milliseconds to first click
    session_duration_s Nullable(UInt32),

    -- Device
    device_type     LowCardinality(String) DEFAULT 'unknown',
    platform        LowCardinality(String) DEFAULT 'web',

    -- UTM
    utm_source      String DEFAULT '',
    utm_medium      String DEFAULT '',
    utm_campaign    String DEFAULT '',
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (country_code, city_slug, event_date, session_id)
TTL event_date + INTERVAL 2 YEAR
SETTINGS index_granularity = 8192;


-- ── 2. Lead Events ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_events (
    event_date      Date          DEFAULT toDate(created_at),
    created_at      DateTime64(3) DEFAULT now(),
    lead_id         String,
    business_id     String,
    country_code    LowCardinality(String),
    city_slug       LowCardinality(String),
    category_slug   LowCardinality(String),
    source          LowCardinality(String),
    urgency         LowCardinality(String),
    quality_score   Float32,
    cost_charged    Float32,
    currency_code   LowCardinality(String),
    status          LowCardinality(String),
    tier_at_receipt LowCardinality(String),
    response_time_s Nullable(UInt32),
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (country_code, city_slug, event_date, business_id)
TTL event_date + INTERVAL 3 YEAR;


-- ── 3. Business Daily Snapshots ───────────────────────────────
-- Taken nightly — used for ML training + trend analysis
CREATE TABLE IF NOT EXISTS business_snapshots (
    snapshot_date       Date,
    business_id         String,
    name                String,
    city_slug           LowCardinality(String),
    country_code        LowCardinality(String),
    category_slug       LowCardinality(String),
    subscription_tier   LowCardinality(String),
    avg_rating          Float32,
    total_reviews       UInt32,
    total_leads         UInt32,
    response_rate       Float32,
    profile_completeness Float32,
    view_count_7d       UInt32,
    lead_count_7d       UInt32,
    conversion_rate_7d  Float32,
    impression_count_7d UInt32,
    ctr_7d              Float32,
    ai_quality_score    Float32,
)
ENGINE = ReplacingMergeTree()
PARTITION BY toYYYYMM(snapshot_date)
ORDER BY (snapshot_date, business_id);


-- ── 4. Revenue Events ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revenue_events (
    event_date      Date          DEFAULT toDate(created_at),
    created_at      DateTime64(3) DEFAULT now(),
    payment_id      String,
    business_id     String,
    country_code    LowCardinality(String),
    city_slug       LowCardinality(String),
    amount_usd      Float32,
    amount_local    Float32,
    currency_code   LowCardinality(String),
    payment_type    LowCardinality(String),
    provider        LowCardinality(String),
    subscription_tier LowCardinality(String),
    agent_id        Nullable(String),
    commission_usd  Float32 DEFAULT 0,
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (country_code, event_date, payment_id)
TTL event_date + INTERVAL 5 YEAR;


-- ══════════════════════════════════════════════════════════════
-- MATERIALIZED VIEWS — pre-aggregate for dashboard speed
-- ══════════════════════════════════════════════════════════════

-- Daily search metrics by city
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_search_by_city
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, country_code, city_slug)
AS SELECT
    event_date,
    country_code,
    city_slug,
    count()                               AS total_searches,
    countIf(clicked_biz_id IS NOT NULL)   AS total_clicks,
    countIf(lead_submitted = 1)           AS total_leads,
    avg(results_count)                    AS avg_results,
    countIf(query != '')                  AS searches_with_query,
    uniqExact(session_id)                 AS unique_sessions,
    uniqExact(user_id)                    AS unique_users
FROM search_events
GROUP BY event_date, country_code, city_slug;


-- Daily revenue by country
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_revenue_by_country
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, country_code, payment_type)
AS SELECT
    event_date,
    country_code,
    payment_type,
    provider,
    count()         AS transactions,
    sum(amount_usd) AS revenue_usd,
    sum(commission_usd) AS commissions_usd
FROM revenue_events
GROUP BY event_date, country_code, payment_type, provider;


-- Top searches per city (7-day rolling)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_trending_queries
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, country_code, city_slug, query)
AS SELECT
    event_date,
    country_code,
    city_slug,
    lower(trim(query)) AS query,
    count()            AS search_count,
    countIf(lead_submitted = 1) AS lead_count
FROM search_events
WHERE length(query) > 2
GROUP BY event_date, country_code, city_slug, query;


-- ══════════════════════════════════════════════════════════════
-- DASHBOARD QUERIES
-- ══════════════════════════════════════════════════════════════

-- 1. Admin KPI Dashboard (last 30 days)
-- Returns: revenue, searches, leads, users by day
SELECT
    event_date,
    country_code,
    sum(revenue_usd) AS revenue_usd,
    sum(transactions) AS payments
FROM mv_daily_revenue_by_country
WHERE event_date >= today() - 30
GROUP BY event_date, country_code
ORDER BY event_date DESC, revenue_usd DESC;


-- 2. Search funnel (searches → clicks → leads)
SELECT
    toStartOfWeek(event_date) AS week,
    country_code,
    sum(total_searches) AS searches,
    sum(total_clicks)   AS clicks,
    sum(total_leads)    AS leads,
    round(sum(total_clicks) / sum(total_searches) * 100, 2)  AS ctr_pct,
    round(sum(total_leads) / sum(total_clicks) * 100, 2)     AS lead_rate_pct,
    round(sum(total_leads) / sum(total_searches) * 100, 2)   AS conversion_pct
FROM mv_daily_search_by_city
WHERE event_date >= today() - 90
GROUP BY week, country_code
ORDER BY week DESC;


-- 3. Top trending searches (last 7 days per city)
SELECT
    city_slug,
    country_code,
    query,
    sum(search_count) AS total_searches,
    sum(lead_count)   AS total_leads,
    round(sum(lead_count) / sum(search_count) * 100, 1) AS lead_rate_pct
FROM mv_trending_queries
WHERE event_date >= today() - 7
    AND length(query) > 3
GROUP BY city_slug, country_code, query
HAVING total_searches > 10
ORDER BY total_searches DESC
LIMIT 50;


-- 4. Business performance analytics (for business dashboard)
WITH recent AS (
    SELECT
        business_id,
        sum(view_count_7d)       AS views_7d,
        sum(lead_count_7d)       AS leads_7d,
        avg(conversion_rate_7d)  AS conversion_rate,
        avg(ctr_7d)              AS ctr,
        avg(ai_quality_score)    AS avg_quality_score
    FROM business_snapshots
    WHERE snapshot_date >= today() - 7
        AND business_id = {business_id: String}
    GROUP BY business_id
)
SELECT * FROM recent;


-- 5. Revenue breakdown (subscriptions vs PPL vs featured)
SELECT
    toStartOfMonth(event_date) AS month,
    country_code,
    payment_type,
    provider,
    count()                    AS count,
    round(sum(amount_usd), 2)  AS total_usd
FROM revenue_events
WHERE event_date >= today() - 365
GROUP BY month, country_code, payment_type, provider
ORDER BY month DESC, total_usd DESC;


-- 6. Category performance (which categories drive most leads)
SELECT
    category_slug,
    country_code,
    count()                     AS total_leads,
    round(avg(quality_score), 3) AS avg_quality,
    round(avg(cost_charged), 2)  AS avg_lead_cost_usd,
    round(sum(cost_charged), 2)  AS total_revenue_usd,
    countIf(status = 'converted') AS conversions,
    round(countIf(status = 'converted') / count() * 100, 1) AS conversion_rate
FROM lead_events
WHERE event_date >= today() - 30
GROUP BY category_slug, country_code
ORDER BY total_revenue_usd DESC;


-- 7. Agent performance leaderboard
SELECT
    agent_id,
    country_code,
    count() AS total_sales,
    round(sum(amount_usd), 2) AS total_gmv_usd,
    round(sum(commission_usd), 2) AS total_commission_usd
FROM revenue_events
WHERE agent_id IS NOT NULL
    AND event_date >= toStartOfMonth(today())
GROUP BY agent_id, country_code
ORDER BY total_gmv_usd DESC
LIMIT 20;
