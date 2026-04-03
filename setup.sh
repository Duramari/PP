#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# DIALBEE — COMPLETE SETUP SCRIPT
# Run: chmod +x setup.sh && ./setup.sh
# ═══════════════════════════════════════════════════════════════

set -e

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║     DIALBEE — Phase 1 Setup                ║"
echo "║     Africa & Europe Business Directory    ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# ── Check prerequisites ──────────────────────────────────────
echo "📋 Checking prerequisites..."

command -v node   >/dev/null 2>&1 || { echo "❌ Node.js 20+ required"; exit 1; }
command -v npm    >/dev/null 2>&1 || { echo "❌ npm required"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker required"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose required"; exit 1; }

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo "❌ Node.js 18+ required (current: $(node -v))"
  exit 1
fi

echo "✅ Node.js $(node -v)"
echo "✅ npm $(npm -v)"
echo "✅ Docker $(docker --version | cut -d' ' -f3)"

# ── Start infrastructure ─────────────────────────────────────
echo ""
echo "🐳 Starting Docker infrastructure..."
docker-compose up -d postgres redis elasticsearch

echo "⏳ Waiting for services to be healthy..."
sleep 10

# Wait for PostgreSQL
echo "   Waiting for PostgreSQL..."
until docker-compose exec -T postgres pg_isready -U dialbee -d dialbee 2>/dev/null; do
  sleep 2
done
echo "   ✅ PostgreSQL ready"

# Wait for Elasticsearch
echo "   Waiting for Elasticsearch..."
until curl -s http://localhost:9200/_cluster/health 2>/dev/null | grep -q '"status"'; do
  sleep 3
done
echo "   ✅ Elasticsearch ready"

# ── Install Backend ──────────────────────────────────────────
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install --quiet
echo "✅ Backend dependencies installed"

# ── Run migrations ────────────────────────────────────────────
echo ""
echo "🗄️  Running database migrations..."
# Apply schema directly
docker-compose exec -T postgres psql -U dialbee -d dialbee < ../infra/init.sql
echo "✅ Database schema applied"

# ── Seed database ─────────────────────────────────────────────
echo ""
echo "🌱 Seeding database with initial data..."
npm run seed 2>/dev/null || echo "   (Seed script not found — skipping)"

cd ..

# ── Install Frontend ──────────────────────────────────────────
echo ""
echo "📦 Installing frontend dependencies..."
cd frontend
npm install --quiet
echo "✅ Frontend dependencies installed"
cd ..

# ── Create Elasticsearch index ─────────────────────────────────
echo ""
echo "🔍 Creating Elasticsearch index..."
curl -s -X PUT "http://localhost:9200/businesses_v1" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 0,
      "analysis": {
        "analyzer": {
          "dialbee_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "stop", "snowball"]
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "id":                 { "type": "keyword" },
        "name":               { "type": "text", "analyzer": "dialbee_analyzer", "boost": 4 },
        "tagline":            { "type": "text", "boost": 2 },
        "description":        { "type": "text" },
        "category_name":      { "type": "text", "boost": 3 },
        "city":               { "type": "keyword" },
        "country_code":       { "type": "keyword" },
        "location":           { "type": "geo_point" },
        "avg_rating":         { "type": "float" },
        "total_reviews":      { "type": "integer" },
        "response_rate":      { "type": "float" },
        "subscription_tier":  { "type": "keyword" },
        "is_active":          { "type": "boolean" },
        "is_open_now":        { "type": "boolean" },
        "ai_quality_score":   { "type": "float" },
        "profile_completeness": { "type": "float" }
      }
    }
  }' > /dev/null
echo "✅ Elasticsearch index created"

# ── Start all services ────────────────────────────────────────
echo ""
echo "🚀 Starting all services..."
docker-compose up -d

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║  ✅ DIALBEE IS RUNNING!                            ║"
echo "╠═══════════════════════════════════════════════════╣"
echo "║                                                   ║"
echo "║  🌐 Frontend:    http://localhost:3000            ║"
echo "║  🔌 API:         http://localhost:3001            ║"
echo "║  📚 Swagger:     http://localhost:3001/api/docs   ║"
echo "║  📧 Mailhog:     http://localhost:8025            ║"
echo "║  🔍 Kibana:      http://localhost:5601            ║"
echo "║                                                   ║"
echo "║  Admin login:                                     ║"
echo "║    Email:    admin@dialbee.com                     ║"
echo "║    Password: Admin@Dialbee2024!                    ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
echo "📋 Useful commands:"
echo "   docker-compose logs -f api       # API logs"
echo "   docker-compose logs -f frontend  # Frontend logs"
echo "   docker-compose down              # Stop all"
echo ""

# Copy logo to frontend public folder
echo "📁 Setting up logo..."
cp /home/ubuntu/dialbee-logo.png frontend/public/dialbee-logo.png 2>/dev/null || true
echo "✅ Logo ready"
