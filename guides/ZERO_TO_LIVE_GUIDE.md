# 🚀 DIALBEE — ZERO TO LIVE
# Complete Step-by-Step Guide | Hindi + English
# अपने laptop से शुरू करके live website तक
# ════════════════════════════════════════════════════════════════

---

## 📋 पहले यह चेक करें (Prerequisites)

आपको इन चीज़ों की ज़रूरत होगी:

| चीज़ | Cost | Link |
|------|------|------|
| Laptop/PC (8GB RAM minimum) | आपके पास है | — |
| Domain Name (dialbee.com जैसा) | $10/year | namecheap.com |
| AWS Account | Free tier available | aws.amazon.com |
| Stripe Account (payments) | Free | stripe.com |
| Paystack Account (Africa) | Free | paystack.com |
| GitHub Account | Free | github.com |

**कुल खर्च Phase 1 में: ~$50-100/month**

---

# ═══════════════════════════════════════════════════════════════
# STEP 1 — अपना Computer तैयार करें
# Time: 30 minutes
# ═══════════════════════════════════════════════════════════════

## 1A. Node.js Install करें

**Windows पर:**
1. https://nodejs.org पर जाएं
2. "LTS" version download करें (20.x)
3. Install करें (सब default रखें)
4. Check करें:
```
Win+R → cmd → टाइप करें:
node --version
```
Output आना चाहिए: `v20.x.x` ✅

**Mac पर:**
```bash
# Terminal खोलें (Cmd+Space → "Terminal")
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install node@20
node --version
```

**Linux (Ubuntu) पर:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
```

---

## 1B. Docker Install करें

Docker से सारे services (Database, Redis, etc.) एक click में चलेंगे।

**Windows/Mac:**
1. https://docker.com/get-started पर जाएं
2. "Docker Desktop" download करें
3. Install करें और start करें
4. Check:
```
docker --version
```
Output: `Docker version 24.x.x` ✅

**Ubuntu Linux:**
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Logout और login करें
docker --version
```

---

## 1C. Git Install करें

**Windows:**
1. https://git-scm.com/download/win
2. Download और install (सब default)

**Mac:**
```bash
brew install git
```

**Linux:**
```bash
sudo apt-get install git -y
```

---

## 1D. VS Code Install करें (Code editor)

1. https://code.visualstudio.com/
2. Download और install करें
3. Extensions install करें:
   - ESLint
   - Prettier
   - GitLens
   - Docker

---

# ═══════════════════════════════════════════════════════════════
# STEP 2 — Code Download और Setup
# Time: 20 minutes
# ═══════════════════════════════════════════════════════════════

## 2A. Project Folder बनाएं

```bash
# Terminal/Command Prompt खोलें
mkdir dialbee
cd dialbee
```

## 2B. Phase 1 Code को यहाँ रखें

आपने पहले जो Phase 1 files download किए थे:
- `backend/` folder
- `frontend/` folder
- `docker-compose.yml`
- `setup.sh`

इन्हें `dialbee/` folder में copy करें।

## 2C. Environment Variables Set करें

```bash
# backend folder में जाएं
cd backend

# .env file बनाएं (यह सबसे important है)
cp .env .env.backup   # backup बनाएं
```

अब `.env` file खोलें (VS Code में) और ये values भरें:

```env
# ─── BASIC SETTINGS ───────────────────────────────────────────
NODE_ENV=development
PORT=3001
APP_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# ─── DATABASE (अभी default रखें, Docker handle करेगा) ────────
DATABASE_URL=postgresql://dialbee:dialbee_pass_2024@localhost:5432/dialbee

# ─── REDIS (default रखें) ─────────────────────────────────────
REDIS_URL=redis://:dialbee_redis_2024@localhost:6379

# ─── JWT SECRETS (यह change करें!) ───────────────────────────
# किसी भी 32+ character का random string लिखें
JWT_ACCESS_SECRET=MyDialbeeSecretKey2024PleaseChangeThis
JWT_REFRESH_SECRET=MyDialbeeRefreshKey2024PleaseChangeThis

# ─── EMAIL (development में Mailhog use होगा) ─────────────────
SMTP_HOST=localhost
SMTP_PORT=1025
EMAIL_FROM=noreply@dialbee.com

# ─── STRIPE (Test keys — अभी के लिए) ─────────────────────────
# stripe.com पर account बनाएं → Developers → API Keys
STRIPE_SECRET_KEY=sk_test_REPLACE_WITH_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_WITH_YOUR_KEY

# ─── PAYSTACK (Africa payments) ───────────────────────────────
# paystack.com पर account बनाएं → Settings → API Keys
PAYSTACK_SECRET_KEY=sk_test_REPLACE_WITH_YOUR_KEY

# ─── ADMIN ACCOUNT ────────────────────────────────────────────
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=Admin@Dialbee2024!
```

---

# ═══════════════════════════════════════════════════════════════
# STEP 3 — Local पर Run करें (Test First!)
# Time: 15 minutes
# ═══════════════════════════════════════════════════════════════

```bash
# dialbee/ folder में जाएं
cd dialbee

# Docker services start करें (Database + Redis + Elasticsearch)
docker-compose up -d postgres redis elasticsearch mailhog

# Wait करें 30 seconds...

# Backend install और start करें
cd backend
npm install
npm run start:dev
```

दूसरी Terminal/Command Prompt खोलें:

```bash
cd dialbee/frontend
npm install
npm run dev
```

अब Browser में खोलें:
- 🌐 Website: **http://localhost:3000**
- 🔌 API Docs: **http://localhost:3001/api/docs**
- 📧 Email UI: **http://localhost:8025**

---

# ═══════════════════════════════════════════════════════════════
# STEP 4 — Accounts बनाएं (सभी Free!)
# Time: 45 minutes
# ═══════════════════════════════════════════════════════════════

## 4A. AWS Account बनाएं

1. **https://aws.amazon.com** पर जाएं
2. "Create an AWS Account" click करें
3. Email, Password भरें
4. Credit card add करें (Free tier में charge नहीं होगा)
5. Phone verify करें
6. "Basic Support Plan" चुनें (Free)

✅ Done! AWS Console open होगा।

---

## 4B. Domain Name खरीदें

**Namecheap पर (सबसे सस्ता):**
1. https://namecheap.com पर जाएं
2. अपना domain search करें (जैसे: `dialbee.ng`, `dialbee.africa`)
3. Cart में add करें
4. Checkout करें (~$10-15/year)

💡 **Tip:** Africa के लिए `.ng`, `.ke`, `.co.za` domains लें।
Europe के लिए `.com`, `.co.uk`, `.eu` लें।

---

## 4C. Stripe Account बनाएं

1. https://stripe.com पर जाएं
2. "Start now" → email और password
3. Business details fill करें
4. Dashboard में जाएं → Developers → API Keys
5. **Test keys copy करें** (sk_test_...)
6. `.env` file में paste करें

---

## 4D. Paystack Account बनाएं (Nigeria/Africa)

1. https://paystack.com पर जाएं
2. "Create a free account"
3. Business verification करें
4. Settings → API Keys → Test Secret Key copy करें
5. `.env` file में paste करें

---

# ═══════════════════════════════════════════════════════════════
# STEP 5 — Server पर Deploy करें
# Time: 2-3 hours
# सबसे आसान तरीका: Railway.app (Recommended for beginners!)
# ═══════════════════════════════════════════════════════════════

## Option A: Railway.app (EASIEST — Recommended! 🌟)

Railway एक platform है जो automatically सब कुछ deploy करता है।
**Cost: $5/month से शुरू** (Free tier भी है)

### Step 5A-1: GitHub पर Code Push करें

```bash
# GitHub पर account बनाएं: github.com

# Terminal में:
cd dialbee
git init
git add .
git commit -m "Initial Dialbee setup"

# GitHub पर new repository बनाएं:
# github.com → + → New Repository → "dialbee-app" → Create

# Repository connect करें:
git remote add origin https://github.com/YOUR_USERNAME/dialbee-app.git
git branch -M main
git push -u origin main
```

### Step 5A-2: Railway पर Deploy करें

1. **https://railway.app** पर जाएं
2. "Login with GitHub" करें
3. "New Project" click करें
4. "Deploy from GitHub repo" → `dialbee-app` select करें

**Database add करें:**
- "+ New" → "Database" → "PostgreSQL" → Add
- Railway automatically `DATABASE_URL` set करेगा ✅

**Redis add करें:**
- "+ New" → "Database" → "Redis" → Add ✅

**Backend deploy करें:**
- "+ New" → "GitHub Repo" → `dialbee-app`
- Root Directory: `/backend`
- Build Command: `npm install && npm run build`
- Start Command: `npm run start:prod`

**Environment Variables add करें:**
Railway में जाएं → आपकी service → Variables tab:
```
NODE_ENV=production
JWT_ACCESS_SECRET=your_secret_here
JWT_REFRESH_SECRET=your_refresh_secret
STRIPE_SECRET_KEY=sk_live_...
PAYSTACK_SECRET_KEY=sk_live_...
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=StrongPassword123!
```

**Frontend deploy करें:**
- "+ New" → "GitHub Repo" → `dialbee-app`
- Root Directory: `/frontend`
- Build Command: `npm install && npm run build`
- Start Command: `npm run start`
- Environment: `NEXT_PUBLIC_API_URL=https://your-backend.railway.app`

✅ **5-10 minutes में आपकी website live होगी!**

---

## Option B: AWS (Production-grade, Phase 2 के बाद करें)

**यह advanced है। पहले Railway पर test करें।**

### Step 5B-1: AWS EC2 Server बनाएं

1. AWS Console → EC2 → Launch Instance
2. Settings:
   ```
   Name: dialbee-server
   OS: Ubuntu 22.04 LTS
   Instance Type: t3.medium (2 vCPU, 4GB RAM) — $30/month
   Storage: 30 GB
   Security Group: HTTP (80), HTTPS (443), SSH (22), 3001, 3000
   ```
3. Key Pair बनाएं → Download करें (`.pem` file)
4. "Launch Instance" click करें

### Step 5B-2: Server Connect करें

**Mac/Linux:**
```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@YOUR_SERVER_IP
```

**Windows (PuTTY):**
1. PuTTY download करें
2. PuTTYgen से .pem को .ppk में convert करें
3. PuTTY → Host: `ubuntu@YOUR_SERVER_IP`

### Step 5B-3: Server पर Software Install करें

```bash
# Server पर ये commands run करें:

# System update
sudo apt update && sudo apt upgrade -y

# Docker install
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
newgrp docker

# Node.js install
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Nginx install (web server)
sudo apt install nginx -y

# PM2 install (keeps app running)
sudo npm install -g pm2

# Git install
sudo apt install git -y

echo "✅ Server ready!"
```

### Step 5B-4: Code Server पर Copy करें

```bash
# Server पर:
cd /home/ubuntu
git clone https://github.com/YOUR_USERNAME/dialbee-app.git
cd dialbee-app

# Backend setup
cd backend
cp .env.example .env
nano .env  # Edit करें (production values)

npm install
npm run build

# Database start करें
docker-compose up -d postgres redis elasticsearch

# Wait 30 seconds...

# PM2 से start करें (auto-restart होगा)
pm2 start "npm run start:prod" --name dialbee-api
pm2 save
pm2 startup

# Frontend build
cd ../frontend
npm install
npm run build

pm2 start "npm run start" --name dialbee-web --env production
pm2 save
```

### Step 5B-5: Nginx Configure करें

```bash
sudo nano /etc/nginx/sites-available/dialbee
```

यह paste करें:
```nginx
# API
server {
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend
server {
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/dialbee /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

# ═══════════════════════════════════════════════════════════════
# STEP 6 — Domain को Server से Connect करें
# Time: 30 minutes (DNS propagation: 1-24 hours)
# ═══════════════════════════════════════════════════════════════

## 6A. Namecheap DNS Settings

1. Namecheap → Domain List → Manage
2. Advanced DNS tab
3. Add Records:

```
Type: A Record
Host: @
Value: YOUR_SERVER_IP
TTL: 3600

Type: A Record
Host: www
Value: YOUR_SERVER_IP
TTL: 3600

Type: A Record
Host: api
Value: YOUR_SERVER_IP
TTL: 3600
```

## 6B. SSL Certificate (HTTPS) — Free!

```bash
# Server पर:
sudo apt install certbot python3-certbot-nginx -y

sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Email enter करें
# Terms agree करें: Y
# Redirect to HTTPS: 2

# Auto-renewal setup
sudo crontab -e
# Add करें:
0 12 * * * /usr/bin/certbot renew --quiet
```

✅ **अब आपकी website https://yourdomain.com पर live है!**

---

# ═══════════════════════════════════════════════════════════════
# STEP 7 — Payment Systems Setup करें
# Time: 1 hour
# ═══════════════════════════════════════════════════════════════

## 7A. Stripe Webhooks (Europe payments)

1. Stripe Dashboard → Developers → Webhooks
2. "Add endpoint" click करें
3. Endpoint URL: `https://api.yourdomain.com/api/v1/webhooks/stripe`
4. Events select करें:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
5. "Add endpoint" → Signing secret copy करें
6. `.env` में add करें: `STRIPE_WEBHOOK_SECRET=whsec_...`

**Stripe Prices बनाएं:**
- Products → Add Product → "Dialbee Standard Plan"
- Pricing: $29/month recurring
- Price ID copy करें → `.env` में add करें

## 7B. Paystack Webhooks (Africa)

1. Paystack Dashboard → Settings → API Keys & Webhooks
2. Webhook URL: `https://api.yourdomain.com/api/v1/webhooks/paystack`
3. Save करें

## 7C. Live mode activate करें

**Stripe:**
- Test mode से Live mode switch करें
- Live keys copy करें → `.env` update करें

**Paystack:**
- Business verification complete करें
- Live keys activate करें

---

# ═══════════════════════════════════════════════════════════════
# STEP 8 — WhatsApp Business Setup (Africa के लिए)
# Time: 2-3 days (Meta approval लगती है)
# ═══════════════════════════════════════════════════════════════

1. https://business.facebook.com पर जाएं
2. Business account बनाएं
3. WhatsApp Business API के लिए apply करें
4. Meta Developers → Create App → Business
5. WhatsApp product add करें
6. Phone number verify करें
7. Webhook URL add करें: `https://api.yourdomain.com/api/v1/webhooks/whatsapp`

**Alternative (तेज़ और आसान):** 360dialog.com
- साइन अप करें
- WhatsApp number connect करें
- API key मिलेगी
- `.env` में add करें: `WHATSAPP_API_KEY=your_key`

---

# ═══════════════════════════════════════════════════════════════
# STEP 9 — पहले Businesses Add करें (City Seed)
# Time: 2-3 hours
# ═══════════════════════════════════════════════════════════════

## यह सबसे Important Step है!

**Strategy:** Google Maps से data scrape करके free listings बनाएं।

### Method 1: Manual (Recommended शुरुआत में)

Admin panel खोलें: `https://yourdomain.com/admin`
Login: `admin@yourdomain.com` / `Admin@Dialbee2024!`

Businesses manually add करें:
- Category select करें
- Business name
- Phone number
- Address
- Status: Active

**पहले दिन target: 50-100 businesses add करें अपने launch city में**

### Method 2: CSV Import (Fast!)

1. Google Maps पर जाएं
2. "Plumbers in Lagos" search करें
3. सभी results note करें:
   - Name
   - Phone
   - Address
   - Rating
4. Excel/Google Sheets में डालें
5. CSV export करें
6. Admin panel → Import CSV

### Method 3: Outsource करें (~$50-100)

Fiverr/Upwork पर post करें:
"Need 200 local business listings for Lagos, Nigeria with name, phone, address, category"

---

# ═══════════════════════════════════════════════════════════════
# STEP 10 — SEO Setup करें
# Time: 2 hours
# ═══════════════════════════════════════════════════════════════

## 10A. Google Search Console

1. https://search.google.com/search-console
2. "Add Property" → आपका domain
3. Verify करें (HTML tag method)
4. `frontend/app/layout.tsx` में add करें:
```html
<meta name="google-site-verification" content="YOUR_CODE" />
```
5. Sitemap submit करें: `https://yourdomain.com/sitemap.xml`

## 10B. Google Analytics

1. https://analytics.google.com
2. Property बनाएं
3. Measurement ID copy करें (G-XXXXXXXXXX)
4. `.env.local` में add करें:
```
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

## 10C. Important SEO Pages

ये pages automatically generate होने चाहिए:
- `/plumbers-in-lagos` — Category + City pages
- `/restaurants-in-nairobi`
- `/doctors-in-london`

हर page Google पर rank करेगा → free traffic आएगा!

---

# ═══════════════════════════════════════════════════════════════
# STEP 11 — First Paying Customers
# Time: Week 1-2
# ═══════════════════════════════════════════════════════════════

## 11A. WhatsApp Marketing (Best for Africa!)

पहले 100 businesses को WhatsApp करें:

```
नमस्ते [Business Name]!

मैं Dialbee का founder हूं — Africa का नया business directory।

आपका business already हमारी site पर है:
https://yourdomain.com/business/[slug]

इस हफ्ते 5 लोगों ने [आपकी category] in [city] search किया।
Upgrade करें → वो आपको directly contact करेंगे।

Standard Plan: सिर्फ ₦14,900/month
14 दिन FREE trial।

Reply करें अगर interested हैं!
```

## 11B. Cold Calling Script

```
"Hello, am I speaking with [Business Name]?

I'm calling from Dialbee — the new business directory 
for Lagos. We already have your business listed for free.

This week, 5 people searched for [category] in Lagos 
on our platform. 

With our Standard plan for ₦14,900/month, they can 
see your contact and call you directly.

Would you like a free 14-day trial?"
```

## 11C. Sales Agent Hire करें

Fiverr/Local hire:
- 3-5 commission-only agents
- Pay: 10% of first month subscription
- Standard plan (₦14,900) → Agent earns ₦1,490 per sale
- Target: 20 businesses/month per agent

---

# ═══════════════════════════════════════════════════════════════
# STEP 12 — Monitoring Setup
# Time: 1 hour
# ═══════════════════════════════════════════════════════════════

## Server Monitor करें

```bash
# Server पर:
pm2 monit           # Real-time stats
pm2 logs            # Logs देखें
pm2 status          # All processes

# Disk space check
df -h

# Memory check
free -m
```

## Uptime Monitor (Free!)

1. https://uptimerobot.com पर जाएं
2. "Add New Monitor"
3. URL: `https://yourdomain.com`
4. Alert: Email/SMS अगर site down हो

## Error Tracking (Sentry — Free tier)

1. https://sentry.io → Create account
2. New Project → Node.js
3. DSN copy करें
4. `.env` में: `SENTRY_DSN=your_dsn`

---

# ═══════════════════════════════════════════════════════════════
# STEP 13 — Daily Operations
# ═══════════════════════════════════════════════════════════════

## हर सुबह करें (10 minutes)

```bash
# Server health check
pm2 status

# Error logs check
pm2 logs dialbee-api --lines 50

# New registrations देखें
# Admin Panel → Users
```

## हर हफ्ते करें

1. New business listings approve करें (Admin Panel)
2. Pending reviews moderate करें
3. Revenue check करें (Stripe/Paystack Dashboard)
4. WhatsApp marketing new businesses को
5. Server update:
```bash
sudo apt update && sudo apt upgrade -y
pm2 restart all
```

## Code Update कैसे करें

```bash
# Local पर changes करें
git add .
git commit -m "Bug fix / New feature"
git push origin main

# Server पर:
cd dialbee-app
git pull origin main
cd backend && npm install && npm run build
pm2 restart dialbee-api

cd ../frontend && npm install && npm run build
pm2 restart dialbee-web
```

---

# ═══════════════════════════════════════════════════════════════
# COSTS BREAKDOWN
# ═══════════════════════════════════════════════════════════════

## Option A: Railway (Beginner — Start Here)

| Service | Cost/month |
|---------|-----------|
| Railway Starter Plan | $5 |
| Database (PostgreSQL) | $5 |
| Redis | $5 |
| Domain (yearly/12) | $1 |
| **Total** | **~$16/month** |

**Break-even: 1 Standard Plan customer** ✅

## Option B: AWS (Growth — After 50+ businesses)

| Service | Cost/month |
|---------|-----------|
| EC2 t3.medium | $30 |
| RDS db.t3.micro | $15 |
| ElastiCache t3.micro | $12 |
| S3 + Bandwidth | $5 |
| Domain | $1 |
| **Total** | **~$63/month** |

**Break-even: 3 Standard Plan customers** ✅

---

# ═══════════════════════════════════════════════════════════════
# TROUBLESHOOTING — Common Problems
# ═══════════════════════════════════════════════════════════════

## Problem 1: "npm install" fail हो रहा है

```bash
# Solution:
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## Problem 2: Database connect नहीं हो रहा

```bash
# Docker running है?
docker ps

# नहीं running है तो:
docker-compose up -d postgres redis

# Logs check करें:
docker-compose logs postgres
```

## Problem 3: Website open नहीं हो रहा

```bash
# Backend running है?
pm2 status

# Port check करें:
netstat -tlnp | grep 3001

# Nginx check:
sudo nginx -t
sudo systemctl status nginx
```

## Problem 4: Stripe payment काम नहीं कर रहा

1. Test mode में हैं? Test card use करें: `4242 4242 4242 4242`
2. Webhook URL सही है?
3. `.env` में STRIPE_WEBHOOK_SECRET सही है?

## Problem 5: Emails नहीं आ रहे

Development में Mailhog use करें:
- http://localhost:8025 → सारे emails यहाँ दिखेंगे

Production में:
- `.env` में SMTP settings सही करें
- या SendGrid use करें (free tier: 100 emails/day)

---

# ═══════════════════════════════════════════════════════════════
# QUICK REFERENCE
# ═══════════════════════════════════════════════════════════════

## Important URLs

| URL | क्या है |
|-----|---------|
| http://localhost:3000 | Frontend (development) |
| http://localhost:3001/api/docs | API Documentation |
| http://localhost:8025 | Email testing (Mailhog) |
| https://yourdomain.com | Live website |
| https://yourdomain.com/admin | Admin Panel |
| https://api.yourdomain.com/api/docs | Live API Docs |

## Important Commands

```bash
# Start everything locally
docker-compose up -d
cd backend && npm run start:dev
cd frontend && npm run dev

# Production restart
pm2 restart all

# Check logs
pm2 logs

# Check server status
pm2 status

# Update from GitHub
git pull && npm install && npm run build && pm2 restart all
```

## Emergency Commands

```bash
# Server down है?
pm2 resurrect

# Database backup
docker exec dialbee_postgres pg_dump -U dialbee dialbee > backup.sql

# Restore backup
cat backup.sql | docker exec -i dialbee_postgres psql -U dialbee -d dialbee
```

---

# ═══════════════════════════════════════════════════════════════
# WEEK 1 LAUNCH CHECKLIST
# ═══════════════════════════════════════════════════════════════

```
Day 1 — Setup
□ Node.js, Docker, Git install करें
□ Code download करें
□ Local पर test करें (localhost:3000 open हो)
□ Domain खरीदें

Day 2 — Accounts
□ AWS account बनाएं
□ Stripe account बनाएं
□ Paystack account बनाएं
□ GitHub account बनाएं

Day 3 — Deploy
□ Code GitHub पर push करें
□ Railway/AWS पर deploy करें
□ Domain connect करें
□ SSL certificate लगाएं

Day 4 — Setup Payments
□ Stripe webhook configure करें
□ Paystack webhook configure करें
□ Test payment करें

Day 5 — Content
□ 50+ businesses add करें (admin panel से)
□ Categories verify करें
□ Admin account test करें

Day 6 — SEO
□ Google Search Console add करें
□ Sitemap submit करें
□ Google Analytics add करें

Day 7 — LAUNCH! 🚀
□ Website share करें
□ First 10 businesses को WhatsApp करें
□ Social media announce करें
```

---

**Support चाहिए?** अगला step पर अटक जाएं तो बताएं! 🚀
