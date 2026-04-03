╔══════════════════════════════════════════════════════════════════╗
║         🐝 DIALBEE — COMPLETE AWS DEPLOYMENT GUIDE               ║
║         Zero to Live | Step-by-Step | Copy-Paste Ready           ║
╚══════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PROJECT STATUS: FULLY COMPLETE & READY TO DEPLOY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All modules built and verified:
  ✅ Backend (NestJS)     — Auth, Businesses, Leads, Payments, Admin
  ✅ Frontend (Next.js)   — Homepage, Search, Business Profile
  ✅ Database             — PostgreSQL 16 + PostGIS (NOT MongoDB)
  ✅ Search               — Elasticsearch 8
  ✅ Cache                — Redis 7
  ✅ Payments             — Stripe (Europe) + Paystack (Africa)
  ✅ Notifications        — Email + SMS + WhatsApp
  ✅ Brand                — Dialbee (correct spelling everywhere)

⚠️  IMPORTANT NOTE: Dialbee uses PostgreSQL, not MongoDB.
    This guide uses AWS RDS PostgreSQL.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT YOU NEED BEFORE STARTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. AWS Account         → aws.amazon.com (credit card needed)
  2. GitHub Account      → github.com (free)
  3. Domain Name         → namecheap.com (~$10/year)
  4. Stripe Account      → stripe.com (free)
  5. Paystack Account    → paystack.com (free, Nigeria)
  6. Your computer       → Any OS (Windows/Mac/Linux)

TOTAL COST TO GO LIVE: ~$50-80/month on AWS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARCHITECTURE OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  User Browser
       │
       ▼
  CloudFront CDN  ←── S3 (logo, images)
       │
       ├─── dialbee.ng          → Vercel (Next.js Frontend)
       │
       └─── api.dialbee.ng      → EC2 (NestJS Backend)
                                      │
                              ┌───────┼───────────┐
                              │       │           │
                           RDS PG  ElastiCache  Elasticsearch
                         (Database)  (Redis)    (Search)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — PUSH CODE TO GITHUB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

On your computer, open Terminal / Command Prompt:

  # 1. Create a folder called "dialbee"
  mkdir dialbee
  cd dialbee

  # 2. Copy your downloaded files into this folder:
  #    dialbee-phase1/backend   →  dialbee/backend
  #    dialbee-phase1/frontend  →  dialbee/frontend
  #    dialbee-phase1/docker-compose.yml
  #    dialbee-phase1/setup.sh

  # 3. Initialize git
  git init
  git add .
  git commit -m "Dialbee v1.0 — Initial production build"

  # 4. Go to github.com → New Repository
  #    Name: dialbee-app
  #    Private: YES (important for security)
  #    Click: Create Repository

  # 5. Push to GitHub (replace YOUR_USERNAME)
  git remote add origin https://github.com/YOUR_USERNAME/dialbee-app.git
  git branch -M main
  git push -u origin main

  ✅ Code is now on GitHub

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — CREATE AWS EC2 SERVER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. Login to: console.aws.amazon.com
  2. Search "EC2" → Click EC2
  3. Click "Launch Instance" (orange button)

  Fill in these settings:
  ┌─────────────────────────────────────────────────┐
  │  Name:           dialbee-server                 │
  │  OS:             Ubuntu Server 22.04 LTS        │
  │  Architecture:   64-bit (x86)                   │
  │  Instance Type:  t3.medium (2 vCPU, 4GB RAM)   │
  │  Storage:        30 GB gp3                      │
  └─────────────────────────────────────────────────┘

  KEY PAIR (to connect via SSH):
    → "Create new key pair"
    → Name: dialbee-key
    → Type: RSA
    → Format: .pem (Mac/Linux) or .ppk (Windows)
    → Click "Create key pair"
    → FILE WILL DOWNLOAD — SAVE IT SAFELY! (never share this file)

  SECURITY GROUP (firewall rules):
    → "Create security group"
    → Add these rules:
    ┌────────────────────────────────────────────────┐
    │ Type     Port  Source        Purpose           │
    │ SSH      22    My IP         Connect to server │
    │ HTTP     80    Anywhere      Website           │
    │ HTTPS    443   Anywhere      Secure website    │
    │ Custom   3001  Anywhere      API               │
    └────────────────────────────────────────────────┘

  → Click "Launch Instance"
  → Wait 2 minutes
  → Note your server's PUBLIC IP ADDRESS (e.g. 54.123.45.67)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — CONNECT TO YOUR SERVER VIA SSH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ON MAC or LINUX:
  Open Terminal and run:

  # Fix key file permissions (required)
  chmod 400 ~/Downloads/dialbee-key.pem

  # Connect (replace 54.123.45.67 with your IP)
  ssh -i ~/Downloads/dialbee-key.pem ubuntu@54.123.45.67

  # Type "yes" when asked about fingerprint
  # You will see: ubuntu@ip-xxx-xxx ← SUCCESS!

ON WINDOWS:
  Method 1 — Windows Terminal (recommended):
    Open "Windows Terminal" or "PowerShell"
    
    icacls dialbee-key.pem /inheritance:r /grant:r "%USERNAME%:R"
    ssh -i dialbee-key.pem ubuntu@54.123.45.67

  Method 2 — PuTTY:
    1. Download PuTTY: putty.org
    2. Download PuTTYgen: putty.org
    3. Open PuTTYgen → Load → select dialbee-key.pem
    4. Save private key → dialbee-key.ppk
    5. Open PuTTY:
       Host: ubuntu@54.123.45.67
       SSH → Auth → Browse → select dialbee-key.ppk
       Click Open

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 — INSTALL SOFTWARE ON SERVER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are now connected to your server. Run these commands ONE BY ONE:

─── 4A. Update system ────────────────────────────────────────────
  sudo apt update && sudo apt upgrade -y

  # (This takes 2-3 minutes, type Y if asked)

─── 4B. Install Node.js 20 ───────────────────────────────────────
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs

  # Verify:
  node --version   # Should show: v20.x.x ✅
  npm --version    # Should show: 10.x.x  ✅

─── 4C. Install PM2 (keeps app running 24/7) ─────────────────────
  sudo npm install -g pm2

  # Verify:
  pm2 --version   # Should show: 5.x.x ✅

─── 4D. Install Nginx (web server / reverse proxy) ───────────────
  sudo apt install nginx -y
  sudo systemctl enable nginx
  sudo systemctl start nginx

  # Verify (open browser: http://YOUR_IP — nginx welcome page):
  sudo systemctl status nginx   # Should show: active (running) ✅

─── 4E. Install Git ──────────────────────────────────────────────
  sudo apt install git -y
  git --version   # Should show: git version 2.x.x ✅

─── 4F. Install Docker (for PostgreSQL + Redis + Elasticsearch) ──
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker ubuntu
  sudo apt install docker-compose -y

  # Apply group change without logout:
  newgrp docker

  # Verify:
  docker --version          # Docker version 24.x.x ✅
  docker-compose --version  # docker-compose version 1.x.x ✅

─── 4G. Install Certbot (for FREE SSL / HTTPS) ───────────────────
  sudo apt install certbot python3-certbot-nginx -y

  ✅ ALL SOFTWARE INSTALLED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5 — UPLOAD PROJECT TO SERVER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ON YOUR SERVER, run:

  # Go to home folder
  cd /home/ubuntu

  # Download code from GitHub (replace YOUR_USERNAME)
  git clone https://github.com/YOUR_USERNAME/dialbee-app.git

  # Enter project
  cd dialbee-app

  # Verify files are there:
  ls -la
  # You should see: backend/  frontend/  docker-compose.yml

  ✅ Code uploaded to server

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 6 — DATABASE SETUP (PostgreSQL on RDS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OPTION A — AWS RDS (Recommended for production)
────────────────────────────────────────────────

  1. AWS Console → Search "RDS" → Click RDS
  2. Click "Create database"
  3. Settings:
     ┌──────────────────────────────────────────────────────┐
     │ Engine:          PostgreSQL                          │
     │ Version:         PostgreSQL 16.x                    │
     │ Template:        Free tier (dev) / Production (live)│
     │ DB identifier:   dialbee-db                         │
     │ Master username: dialbee                            │
     │ Master password: YourStrongPassword123!             │
     │ Instance class:  db.t3.micro (free tier) or         │
     │                  db.t3.small (production)           │
     │ Storage:         20 GB gp2                          │
     │ VPC:             Same VPC as your EC2               │
     │ Public access:   NO (private — more secure)         │
     └──────────────────────────────────────────────────────┘
  4. Click "Create database" → Takes 5-10 minutes
  5. After creation → Click your DB → Copy "Endpoint"
     Looks like: dialbee-db.xxxxx.eu-west-1.rds.amazonaws.com

  Your DATABASE_URL will be:
  postgresql://dialbee:YourStrongPassword123!@dialbee-db.xxxxx.eu-west-1.rds.amazonaws.com:5432/dialbee

OPTION B — Docker PostgreSQL on EC2 (Simpler, cheaper)
───────────────────────────────────────────────────────

  On your server, run:

  cd /home/ubuntu/dialbee-app

  # Start only the database containers
  docker-compose up -d postgres redis

  # Wait 30 seconds, then verify:
  docker ps
  # You should see: dialbee_postgres and dialbee_redis running ✅

  Your DATABASE_URL will be:
  postgresql://dialbee:dialbee_pass_2024@localhost:5432/dialbee

  (EASIER — use this for Phase 1 launch)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 7 — CREATE .ENV FILE (Most Important Step!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ON YOUR SERVER:

  cd /home/ubuntu/dialbee-app/backend

  # Create the .env file:
  nano .env

  # PASTE this entire block (edit the values marked with ←):

━━━━━━━━━━━━━━━━━━━ COPY FROM HERE ━━━━━━━━━━━━━━━━━━━
# ═══════════════════════════════════════
# DIALBEE — PRODUCTION ENVIRONMENT
# ═══════════════════════════════════════

# App
NODE_ENV=production
PORT=3001
APP_URL=https://api.dialbee.ng
FRONTEND_URL=https://dialbee.ng

# Database (use your RDS endpoint or localhost)
DATABASE_URL=postgresql://dialbee:dialbee_pass_2024@localhost:5432/dialbee

# Redis
REDIS_URL=redis://:dialbee_redis_2024@localhost:6379

# Elasticsearch (local docker)
ELASTICSEARCH_URL=http://localhost:9200

# JWT Secrets (CHANGE THESE! — any 32+ character random text)
JWT_ACCESS_SECRET=Dialbee2024ProductionSecretKeyXYZ
JWT_REFRESH_SECRET=Dialbee2024RefreshSecretKeyABCDEF
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d

# Email (use your SMTP or Resend.com)
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_REPLACE_WITH_YOUR_RESEND_KEY
EMAIL_FROM=hello@dialbee.ng

# AWS S3 (for file uploads)
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=REPLACE_WITH_YOUR_AWS_KEY
AWS_SECRET_ACCESS_KEY=REPLACE_WITH_YOUR_AWS_SECRET
AWS_S3_BUCKET=dialbee-media-production

# Stripe (Europe payments)
STRIPE_SECRET_KEY=sk_live_REPLACE_WITH_YOUR_STRIPE_KEY
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_WITH_YOUR_WEBHOOK_SECRET

# Paystack (Nigeria/Africa payments)
PAYSTACK_SECRET_KEY=sk_live_REPLACE_WITH_YOUR_PAYSTACK_KEY

# Twilio SMS (optional — for SMS notifications)
TWILIO_ACCOUNT_SID=AC_REPLACE_IF_USING
TWILIO_AUTH_TOKEN=REPLACE_IF_USING
TWILIO_FROM_NUMBER=+1234567890

# Africa's Talking (Africa SMS — cheaper)
AFRICAS_TALKING_API_KEY=REPLACE_IF_USING
AFRICAS_TALKING_USERNAME=dialbee

# WhatsApp Business API
WHATSAPP_API_KEY=REPLACE_IF_USING
WHATSAPP_PHONE_ID=REPLACE_IF_USING

# Admin Account
ADMIN_EMAIL=admin@dialbee.ng
ADMIN_PASSWORD=Admin@Dialbee2024!

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
━━━━━━━━━━━━━━━━━━━ COPY TO HERE ━━━━━━━━━━━━━━━━━━━

  # Save in nano:
  # Press CTRL + X
  # Press Y
  # Press ENTER

  ✅ .env file saved!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 8 — START ALL SERVICES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

─── 8A. Start Docker services ────────────────────────────────────
  cd /home/ubuntu/dialbee-app

  docker-compose up -d postgres redis elasticsearch mailhog

  # Wait 30 seconds...
  sleep 30

  # Check they're running:
  docker ps

  # Expected output:
  # dialbee_postgres    ← running ✅
  # dialbee_redis       ← running ✅
  # dialbee_es          ← running ✅

─── 8B. Install Backend dependencies ─────────────────────────────
  cd /home/ubuntu/dialbee-app/backend

  npm install

  # This takes 2-3 minutes...

─── 8C. Build Backend ────────────────────────────────────────────
  npm run build

  # This creates a dist/ folder
  # Takes 1-2 minutes...

─── 8D. Run Database migrations ──────────────────────────────────
  # Apply the database schema:
  docker exec -i dialbee_postgres psql -U dialbee -d dialbee < /home/ubuntu/dialbee-app/infra/init.sql

  # If init.sql doesn't exist, run this to create tables via TypeORM:
  npm run typeorm -- migration:run -d src/config/database.config.ts

─── 8E. Create Elasticsearch Index ──────────────────────────────
  # Wait for ES to fully start first:
  sleep 20

  curl -X PUT "http://localhost:9200/businesses_v1" \
    -H "Content-Type: application/json" \
    -d '{
      "settings": { "number_of_shards": 1, "number_of_replicas": 0 },
      "mappings": {
        "properties": {
          "id":                {"type":"keyword"},
          "name":              {"type":"text","boost":4},
          "category_name":     {"type":"text","boost":3},
          "city":              {"type":"keyword"},
          "country_code":      {"type":"keyword"},
          "location":          {"type":"geo_point"},
          "avg_rating":        {"type":"float"},
          "total_reviews":     {"type":"integer"},
          "subscription_tier": {"type":"keyword"},
          "is_active":         {"type":"boolean"},
          "ai_quality_score":  {"type":"float"}
        }
      }
    }'

  # Expected: {"acknowledged":true} ✅

─── 8F. Start Backend with PM2 ───────────────────────────────────
  cd /home/ubuntu/dialbee-app/backend

  pm2 start "npm run start:prod" --name dialbee-api

  # Check it's running:
  pm2 status
  # Should show: dialbee-api  online  ✅

  # Save PM2 process list (auto-restart on reboot):
  pm2 save
  pm2 startup
  # Run the command it outputs (starts with "sudo env PATH...")

─── 8G. Test Backend is working ──────────────────────────────────
  curl http://localhost:3001/api/v1/auth/me

  # Expected: {"message":"Unauthorized"} or similar = API is alive ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 9 — CONFIGURE NGINX (Reverse Proxy)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # Create nginx config file:
  sudo nano /etc/nginx/sites-available/dialbee

  # PASTE this (replace dialbee.ng with YOUR domain):

━━━━━━━━━━━━━━━━━━━ COPY FROM HERE ━━━━━━━━━━━━━━━━━━━
# Dialbee API
server {
    listen 80;
    server_name api.dialbee.ng;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }
}

# Dialbee Frontend (if hosting on same server)
server {
    listen 80;
    server_name dialbee.ng www.dialbee.ng;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
━━━━━━━━━━━━━━━━━━━ COPY TO HERE ━━━━━━━━━━━━━━━━━━━

  # Save file: CTRL+X → Y → ENTER

  # Enable the config:
  sudo ln -s /etc/nginx/sites-available/dialbee /etc/nginx/sites-enabled/dialbee
  sudo rm -f /etc/nginx/sites-enabled/default

  # Test nginx config:
  sudo nginx -t
  # Expected: syntax is ok / test is successful ✅

  # Reload nginx:
  sudo systemctl reload nginx

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 10 — DEPLOY FRONTEND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OPTION A — VERCEL (Recommended — Easiest, Free!) ⭐
──────────────────────────────────────────────────

  1. Go to: vercel.com
  2. Click "Sign Up" → "Continue with GitHub"
  3. Click "New Project"
  4. Import your "dialbee-app" repository
  5. Settings:
     ┌─────────────────────────────────────────────┐
     │ Framework Preset:  Next.js                  │
     │ Root Directory:    frontend                 │
     │ Build Command:     npm run build            │
     │ Output Directory:  .next                    │
     └─────────────────────────────────────────────┘
  6. Environment Variables (add these):
     NEXT_PUBLIC_API_URL = https://api.dialbee.ng
     NEXT_PUBLIC_APP_URL = https://dialbee.ng

  7. Click "Deploy"
  8. Vercel gives you URL: dialbee-app.vercel.app
  9. Add custom domain later (dialbee.ng)

  ✅ Frontend live in 3 minutes!

OPTION B — AWS S3 + CloudFront
──────────────────────────────
  (Use this if you want full AWS setup)

  ON YOUR SERVER:
  cd /home/ubuntu/dialbee-app/frontend
  npm install
  npm run build

  # Upload to S3:
  aws s3 sync .next/static s3://dialbee-media-production/_next/static \
    --cache-control "public, max-age=31536000, immutable"

  # For CloudFront, create distribution pointing to S3 bucket.
  # (Ask your developer to set this up — takes 30 minutes)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 11 — DOMAIN SETUP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Buy your domain at namecheap.com
  Example: dialbee.ng

─── 11A. Point domain to your server ─────────────────────────────

  Go to Namecheap → Manage → Advanced DNS

  Add these records:
  ┌───────────────────────────────────────────────────────────┐
  │ Type    Host    Value              TTL                    │
  │ A       @       54.123.45.67       Automatic             │
  │ A       www     54.123.45.67       Automatic             │
  │ A       api     54.123.45.67       Automatic             │
  └───────────────────────────────────────────────────────────┘
  (Replace 54.123.45.67 with YOUR EC2 server IP)

  Wait 15-60 minutes for DNS to propagate.

  Check if DNS is working:
  ping dialbee.ng
  # Should show your server IP ✅

─── 11B. Add domain to Vercel (for frontend) ─────────────────────

  Vercel → Your Project → Settings → Domains
  Add: dialbee.ng
  Add: www.dialbee.ng

  Vercel will show you CNAME records to add in Namecheap.
  Add them → Wait 5 minutes → SSL auto-configured ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 12 — SSL CERTIFICATE (HTTPS) — FREE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ON YOUR SERVER (after DNS is working):

  sudo certbot --nginx \
    -d api.dialbee.ng \
    --non-interactive \
    --agree-tos \
    --email admin@dialbee.ng \
    --redirect

  # Enter your email when asked
  # Type A to agree to terms
  # Type 2 to redirect HTTP to HTTPS

  # Verify HTTPS works:
  curl https://api.dialbee.ng/api/v1/auth/me
  # Expected: {"message":"Unauthorized"} = HTTPS working! ✅

  # Auto-renewal (SSL expires every 90 days — this renews it auto):
  echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 13 — STRIPE & PAYSTACK WEBHOOKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

─── Stripe Webhooks ──────────────────────────────────────────────
  1. Go to: dashboard.stripe.com → Developers → Webhooks
  2. Click "Add endpoint"
  3. URL: https://api.dialbee.ng/api/v1/webhooks/stripe
  4. Select events:
     ✅ checkout.session.completed
     ✅ invoice.payment_succeeded
     ✅ invoice.payment_failed
     ✅ customer.subscription.deleted
  5. Click "Add endpoint"
  6. Copy "Signing secret" (starts with whsec_)
  7. Add to .env: STRIPE_WEBHOOK_SECRET=whsec_your_secret

─── Paystack Webhooks ────────────────────────────────────────────
  1. Go to: dashboard.paystack.com → Settings → API Keys & Webhooks
  2. Webhook URL: https://api.dialbee.ng/api/v1/webhooks/paystack
  3. Save

─── Restart backend to load new .env ─────────────────────────────
  pm2 restart dialbee-api

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 14 — ADD LOGO TO WEBSITE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # On your local computer, upload logo to server:
  scp -i ~/Downloads/dialbee-key.pem \
    dialbee-logo-chosen.png \
    ubuntu@54.123.45.67:/home/ubuntu/dialbee-app/frontend/public/dialbee-logo.png

  # Then rebuild frontend:
  cd /home/ubuntu/dialbee-app/frontend
  npm run build
  pm2 restart dialbee-web

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 15 — SEED INITIAL DATA (Lagos Businesses)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # Test Admin login:
  curl -X POST https://api.dialbee.ng/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@dialbee.ng","password":"Admin@Dialbee2024!"}'

  # Expected: {"accessToken":"eyJ...", ...} ✅

  # Now open admin panel:
  # https://dialbee.ng/admin
  # Login with admin@dialbee.ng / Admin@Dialbee2024!

  # Add first 50 Lagos businesses manually
  # OR import via CSV (Admin → Businesses → Import)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINAL VERIFICATION — IS EVERYTHING WORKING?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Run all these checks:

  1. Website loads:
     ✅ Open https://dialbee.ng → Homepage appears

  2. API health check:
     curl https://api.dialbee.ng/api/v1/auth/me
     ✅ Returns JSON (not "connection refused")

  3. API docs work:
     ✅ Open https://api.dialbee.ng/api/docs → Swagger UI appears

  4. Search works:
     curl "https://api.dialbee.ng/api/v1/businesses/search?q=plumber&city=Lagos"
     ✅ Returns JSON with businesses array

  5. Admin panel:
     ✅ Open https://dialbee.ng/admin → Login works

  6. HTTPS (SSL):
     ✅ Browser shows 🔒 padlock on both URLs

  7. PM2 processes running:
     pm2 status
     ✅ dialbee-api: online

  8. Test lead submission:
     curl -X POST https://api.dialbee.ng/api/v1/leads \
       -H "Content-Type: application/json" \
       -d '{"businessId":"test","customerName":"John","customerPhone":"+2348012345678","source":"form"}'
     ✅ Returns lead ID

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LIVE URL STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  https://dialbee.ng              → Homepage
  https://dialbee.ng/search       → Search results
  https://dialbee.ng/business/xxx → Business profile
  https://dialbee.ng/dashboard    → Business owner panel
  https://dialbee.ng/admin        → Admin panel
  https://dialbee.ng/agent        → Sales agent panel
  https://api.dialbee.ng/api/v1   → Backend API
  https://api.dialbee.ng/api/docs → API documentation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMMON ERRORS & FIXES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ERROR 1: "Connection refused" on port 3001
FIX:
  pm2 status          # Check if dialbee-api is running
  pm2 logs dialbee-api # See the error
  pm2 restart dialbee-api

ERROR 2: "cannot connect to database"
FIX:
  docker ps           # Check if postgres container is running
  docker-compose up -d postgres   # Start if stopped
  # Check DATABASE_URL in .env is correct

ERROR 3: "npm run build" fails
FIX:
  cd backend
  rm -rf node_modules dist
  npm install
  npm run build

ERROR 4: Nginx "502 Bad Gateway"
FIX:
  pm2 restart dialbee-api    # Backend is not running
  # Wait 10 seconds, try again

ERROR 5: SSL certificate fails
FIX:
  # DNS must be pointing to server first!
  # Check: ping api.dialbee.ng → should show your server IP
  # Then run certbot again

ERROR 6: "Port 3001 already in use"
FIX:
  sudo kill -9 $(sudo lsof -t -i:3001)
  pm2 restart dialbee-api

ERROR 7: Elasticsearch not starting
FIX:
  sudo sysctl -w vm.max_map_count=262144
  echo 'vm.max_map_count=262144' | sudo tee -a /etc/sysctl.conf
  docker-compose restart elasticsearch

ERROR 8: "Cannot POST /api/v1/webhooks/stripe" (403)
FIX:
  # Webhook secret is wrong in .env
  # Go to Stripe → Webhooks → copy signing secret again
  # Update .env → pm2 restart dialbee-api

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DAILY OPERATIONS COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # Check server status
  pm2 status

  # View live logs
  pm2 logs dialbee-api --lines 50

  # Restart backend
  pm2 restart dialbee-api

  # Stop everything
  pm2 stop all

  # Update code from GitHub
  cd /home/ubuntu/dialbee-app
  git pull origin main
  cd backend
  npm install
  npm run build
  pm2 restart dialbee-api

  # Database backup
  docker exec dialbee_postgres pg_dump -U dialbee dialbee > backup_$(date +%Y%m%d).sql

  # Server disk space
  df -h

  # Server memory
  free -m

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MONTHLY COST BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Phase 1 (MVP Launch):
  ┌───────────────────────────────────────────────────────┐
  │ EC2 t3.medium (server)      ~$30/month               │
  │ Domain (.ng)                ~$1/month  ($12/year)    │
  │ Vercel Frontend             FREE                     │
  │ SSL Certificate             FREE (Let's Encrypt)     │
  │ Email (Resend.com)          FREE (100/day)           │
  │ Total                       ~$31/month               │
  └───────────────────────────────────────────────────────┘

  Break-even: Just 3 Standard Plan customers (₦14,900×3 = ₦44,700)

  Phase 2 (Growth — add RDS):
  ┌───────────────────────────────────────────────────────┐
  │ EC2 t3.medium               ~$30/month               │
  │ RDS db.t3.small (PostgreSQL)~$15/month               │
  │ ElastiCache t3.micro (Redis)~$12/month               │
  │ S3 + CloudFront (media)     ~$5/month                │
  │ Domain                      ~$1/month                │
  │ Total                       ~$63/month               │
  └───────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUICK DEPLOY SUMMARY (5 steps)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. git push code to GitHub
  2. Launch EC2 t3.medium (Ubuntu 22.04)
  3. SSH in → run install commands (Step 4)
  4. git clone → create .env → pm2 start
  5. Nginx config → certbot SSL → LIVE! 🐝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🐝 DIALBEE IS LIVE! Connect. Discover. Prosper.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
