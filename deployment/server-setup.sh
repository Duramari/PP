#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# 🐝 DIALBEE — ONE COMMAND SERVER SETUP
# Run this on a fresh Ubuntu 22.04 EC2 instance
#
# HOW TO USE:
#   1. SSH into your EC2 server
#   2. Run: curl -sSL https://raw.githubusercontent.com/YOUR/dialbee-app/main/server-setup.sh | bash
#   OR copy-paste this entire file and run: bash server-setup.sh
# ═══════════════════════════════════════════════════════════════

set -e  # Stop on any error

# ── Colors ────────────────────────────────────────────────────
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✅ $1${NC}"; }
info() { echo -e "${BLUE}▶  $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
err()  { echo -e "${RED}❌ $1${NC}"; exit 1; }

echo -e "${BOLD}${BLUE}
╔════════════════════════════════════════════════════╗
║   🐝 DIALBEE — Server Setup Script                ║
║   Ubuntu 22.04 | Node.js 20 | Nginx | PM2 | Docker║
╚════════════════════════════════════════════════════╝
${NC}"

# ── Check OS ──────────────────────────────────────────────────
info "Checking system..."
if [ "$(uname -s)" != "Linux" ]; then
  err "This script is for Linux only"
fi
ok "Linux detected"

# ── Step 1: Update system ─────────────────────────────────────
info "Updating system packages..."
sudo apt update -qq && sudo apt upgrade -y -qq
ok "System updated"

# ── Step 2: Install Node.js 20 ────────────────────────────────
info "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - > /dev/null 2>&1
sudo apt-get install -y nodejs > /dev/null 2>&1
ok "Node.js $(node -v) installed"

# ── Step 3: Install PM2 ───────────────────────────────────────
info "Installing PM2..."
sudo npm install -g pm2 --quiet
ok "PM2 $(pm2 --version) installed"

# ── Step 4: Install Nginx ─────────────────────────────────────
info "Installing Nginx..."
sudo apt install nginx -y -qq
sudo systemctl enable nginx > /dev/null 2>&1
sudo systemctl start nginx > /dev/null 2>&1
ok "Nginx installed and running"

# ── Step 5: Install Docker ────────────────────────────────────
info "Installing Docker..."
curl -fsSL https://get.docker.com | sh > /dev/null 2>&1
sudo usermod -aG docker ubuntu
sudo apt install docker-compose -y -qq > /dev/null 2>&1
ok "Docker $(docker --version | cut -d' ' -f3) installed"

# ── Step 6: Install Git ───────────────────────────────────────
info "Installing Git..."
sudo apt install git -y -qq > /dev/null 2>&1
ok "Git $(git --version | cut -d' ' -f3) installed"

# ── Step 7: Install Certbot (SSL) ─────────────────────────────
info "Installing Certbot (SSL)..."
sudo apt install certbot python3-certbot-nginx -y -qq > /dev/null 2>&1
ok "Certbot installed"

# ── Step 8: Install helpful tools ─────────────────────────────
info "Installing utilities..."
sudo apt install htop curl wget nano unzip -y -qq > /dev/null 2>&1
ok "Utilities installed"

# ── Step 9: Elasticsearch memory setting ──────────────────────
info "Configuring Elasticsearch memory..."
sudo sysctl -w vm.max_map_count=262144 > /dev/null 2>&1
echo 'vm.max_map_count=262144' | sudo tee -a /etc/sysctl.conf > /dev/null
ok "Elasticsearch memory configured"

# ── Step 10: Ask for GitHub repo ──────────────────────────────
echo ""
echo -e "${BOLD}Configuration needed:${NC}"
read -p "Enter your GitHub username: " GH_USER
read -p "Enter your GitHub repo name (e.g. dialbee-app): " GH_REPO
read -p "Enter your domain name (e.g. dialbee.ng): " DOMAIN
read -p "Enter your admin email: " ADMIN_EMAIL

# ── Step 11: Clone repository ─────────────────────────────────
info "Downloading Dialbee from GitHub..."
cd /home/ubuntu

if [ -d "dialbee-app" ]; then
  warn "dialbee-app folder exists, pulling latest..."
  cd dialbee-app && git pull origin main
  cd /home/ubuntu
else
  git clone https://github.com/$GH_USER/$GH_REPO.git dialbee-app
fi
ok "Code downloaded"

# ── Step 12: Start Docker services ────────────────────────────
info "Starting Docker services (PostgreSQL, Redis, Elasticsearch)..."
cd /home/ubuntu/dialbee-app
docker-compose up -d postgres redis elasticsearch mailhog > /dev/null 2>&1
ok "Docker services starting..."
echo "   Waiting 30 seconds for services to be ready..."
sleep 30

# Check postgres
if docker exec dialbee_postgres pg_isready -U dialbee > /dev/null 2>&1; then
  ok "PostgreSQL ready"
else
  warn "PostgreSQL still starting — will retry after backend setup"
fi

# ── Step 13: Install backend ──────────────────────────────────
info "Installing backend dependencies..."
cd /home/ubuntu/dialbee-app/backend
npm install --quiet
ok "Backend dependencies installed"

# ── Step 14: Create .env file ─────────────────────────────────
info "Creating .env configuration..."

# Generate random JWT secrets
JWT_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-40)
JWT_REFRESH=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-40)

cat > /home/ubuntu/dialbee-app/backend/.env << ENVEOF
# 🐝 DIALBEE — Production Environment
# Generated: $(date)

NODE_ENV=production
PORT=3001
APP_URL=https://api.$DOMAIN
FRONTEND_URL=https://$DOMAIN

# Database (Docker PostgreSQL)
DATABASE_URL=postgresql://dialbee:dialbee_pass_2024@localhost:5432/dialbee

# Redis
REDIS_URL=redis://:dialbee_redis_2024@localhost:6379

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200

# JWT Secrets (auto-generated)
JWT_ACCESS_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d

# Email (configure after deployment)
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=REPLACE_WITH_RESEND_KEY
EMAIL_FROM=hello@$DOMAIN

# AWS S3 (configure after deployment)
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=REPLACE_WITH_AWS_KEY
AWS_SECRET_ACCESS_KEY=REPLACE_WITH_AWS_SECRET
AWS_S3_BUCKET=dialbee-media-production

# Stripe (Europe) — configure after deployment
STRIPE_SECRET_KEY=sk_live_REPLACE_WITH_STRIPE_KEY
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_WITH_WEBHOOK_SECRET

# Paystack (Nigeria/Africa) — configure after deployment
PAYSTACK_SECRET_KEY=sk_live_REPLACE_WITH_PAYSTACK_KEY

# Admin
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=Admin@Dialbee2024!

ENVEOF

ok ".env file created"
echo -e "${YELLOW}   ⚠️  Remember to update STRIPE, PAYSTACK, and EMAIL keys in .env${NC}"

# ── Step 15: Build backend ────────────────────────────────────
info "Building backend..."
npm run build
ok "Backend built"

# ── Step 16: Create Elasticsearch index ──────────────────────
info "Creating Elasticsearch index..."
sleep 10
curl -s -X PUT "http://localhost:9200/businesses_v1" \
  -H "Content-Type: application/json" \
  -d '{
    "settings":{"number_of_shards":1,"number_of_replicas":0},
    "mappings":{
      "properties":{
        "id":{"type":"keyword"},
        "name":{"type":"text","boost":4},
        "category_name":{"type":"text","boost":3},
        "city":{"type":"keyword"},
        "country_code":{"type":"keyword"},
        "location":{"type":"geo_point"},
        "avg_rating":{"type":"float"},
        "total_reviews":{"type":"integer"},
        "subscription_tier":{"type":"keyword"},
        "is_active":{"type":"boolean"},
        "ai_quality_score":{"type":"float"}
      }
    }
  }' > /dev/null 2>&1 && ok "Elasticsearch index created" || warn "ES index creation skipped (ES may still be starting)"

# ── Step 17: Start with PM2 ───────────────────────────────────
info "Starting Dialbee API with PM2..."
pm2 delete dialbee-api 2>/dev/null || true
pm2 start "npm run start:prod" --name dialbee-api
pm2 save > /dev/null 2>&1
pm2 startup | tail -1 | sudo bash > /dev/null 2>&1 || true
ok "Dialbee API started with PM2"

# ── Step 18: Configure Nginx ──────────────────────────────────
info "Configuring Nginx..."

sudo tee /etc/nginx/sites-available/dialbee > /dev/null << NGINXEOF
# 🐝 Dialbee Nginx Configuration

server {
    listen 80;
    server_name api.$DOMAIN;
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
    }
}

server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINXEOF

sudo ln -sf /etc/nginx/sites-available/dialbee /etc/nginx/sites-enabled/dialbee
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t > /dev/null 2>&1 && sudo systemctl reload nginx
ok "Nginx configured"

# ── Final Status ──────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}
╔═══════════════════════════════════════════════════════════════╗
║  ✅ DIALBEE SERVER SETUP COMPLETE!                            ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  API:     http://$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_IP"):3001                  ║
║  API Docs: http://$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_IP"):3001/api/docs        ║
║                                                               ║
║  NEXT STEPS:                                                  ║
║  1. Point DNS: $DOMAIN → $(curl -s ifconfig.me 2>/dev/null || echo "YOUR_IP")             ║
║  2. Run SSL:   sudo certbot --nginx -d api.$DOMAIN          ║
║  3. Update .env with Stripe/Paystack keys                    ║
║  4. Deploy frontend to Vercel                                ║
║  5. Open admin: https://$DOMAIN/admin                       ║
║     Email: $ADMIN_EMAIL                                      ║
║     Pass:  Admin@Dialbee2024!                               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
${NC}"

pm2 status
