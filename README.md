# 🌍 Dialbee — Phase 1 Complete Codebase
### Local Business Directory for Africa & Europe
---

## ⚡ Quick Start (5 minutes)

```bash
# 1. Clone & enter
cd dialbee-phase1

# 2. Run setup (installs everything + starts Docker)
chmod +x setup.sh
./setup.sh

# OR manually:
docker-compose up -d                    # Start infrastructure
cd backend && npm install && npm run start:dev   # API on :3001
cd frontend && npm install && npm run dev        # Web on :3000
```

**Running at:**
| Service | URL |
|---------|-----|
| 🌐 Frontend | http://localhost:3000 |
| 🔌 API | http://localhost:3001 |
| 📚 Swagger | http://localhost:3001/api/docs |
| 📧 Mailhog (email) | http://localhost:8025 |
| 🔍 Kibana (ES UI) | http://localhost:5601 |

**Default admin:** `admin@dialbee.com` / `Admin@Dialbee2024!`

---

## 📁 Project Structure

```
dialbee-phase1/
│
├── docker-compose.yml          ← All services (PG, Redis, ES, API, Frontend)
├── setup.sh                    ← One-command setup
│
├── backend/                    ← NestJS API
│   ├── src/
│   │   ├── main.ts             ← Entry point (Swagger, CORS, global pipes)
│   │   ├── app.module.ts       ← Root module (all dependencies wired)
│   │   ├── modules/
│   │   │   ├── auth/           ← JWT auth, refresh tokens, OTP, brute-force
│   │   │   ├── businesses/     ← CRUD, search, approval, media, dashboard
│   │   │   ├── leads/          ← Lead intake, distribution, wallet, scoring
│   │   │   ├── payments/       ← Stripe + Paystack + M-Pesa factory
│   │   │   ├── reviews/        ← Reviews with fraud detection
│   │   │   ├── categories/     ← 16 categories, multilingual
│   │   │   ├── locations/      ← 11 countries, 40+ cities
│   │   │   ├── admin/          ← Revenue dashboard, approval, moderation
│   │   │   ├── storage/        ← S3 file uploads
│   │   │   └── notifications/  ← Email, SMS, WhatsApp, Push
│   │   ├── common/
│   │   │   ├── guards/         ← JWT guard, Roles guard
│   │   │   ├── filters/        ← Global HTTP exception filter
│   │   │   ├── interceptors/   ← Response wrapper, logging
│   │   │   └── decorators/     ← @CurrentUser, @Roles
│   │   └── database/
│   │       ├── migrations/     ← TypeORM migrations
│   │       └── seeds/          ← Country, category, admin seed
│   ├── .env                    ← Environment variables
│   └── package.json
│
├── frontend/                   ← Next.js 14 App Router
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx        ← Homepage (search + categories + hero)
│   │   │   ├── search/         ← Search results page
│   │   │   ├── business/[slug] ← Business profile page
│   │   │   ├── dashboard/      ← Business owner dashboard
│   │   │   ├── admin/          ← Admin panel
│   │   │   ├── login/          ← Login page
│   │   │   └── register/       ← Register page
│   │   ├── lib/
│   │   │   └── api.ts          ← Axios client + all API calls
│   │   └── types/
│   │       └── index.ts        ← Complete TypeScript types
│   ├── .env.local
│   └── package.json
│
└── infra/
    └── init.sql                ← Database schema + seed data
```

---

## 🔌 API Endpoints (Phase 1)

### Auth
```
POST /api/v1/auth/register       Register (customer/business_owner/admin)
POST /api/v1/auth/login          Login → JWT + refresh token
POST /api/v1/auth/refresh        Rotate tokens
POST /api/v1/auth/logout         Revoke token
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
GET  /api/v1/auth/me             Current user (JWT required)
```

### Businesses (Public)
```
GET  /api/v1/businesses/search?q=&city=&page=   Search
GET  /api/v1/businesses/:slug                   Profile
```

### Businesses (Owner — JWT)
```
POST   /api/v1/owner/businesses           Create listing
GET    /api/v1/owner/businesses           My listings
PATCH  /api/v1/owner/businesses/:id       Update
GET    /api/v1/owner/businesses/:id/stats Dashboard stats
POST   /api/v1/owner/businesses/:id/media Upload photos
```

### Leads
```
POST  /api/v1/leads                         Submit lead (public)
GET   /api/v1/owner/businesses/:id/leads    Lead inbox (JWT)
PATCH /api/v1/owner/leads/:id/status        Update status (JWT)
GET   /api/v1/owner/businesses/:id/wallet   Wallet balance (JWT)
```

### Payments
```
GET  /api/v1/plans?countryCode=NG    Plans by country
POST /api/v1/subscriptions/checkout  Start checkout
GET  /api/v1/subscriptions/me        My subscription
```

### Admin (JWT + admin role)
```
GET   /api/v1/admin/dashboard
GET   /api/v1/admin/businesses
PATCH /api/v1/admin/businesses/:id   approve/reject/suspend
GET   /api/v1/admin/users
PATCH /api/v1/admin/users/:id/suspend
GET   /api/v1/admin/leads
GET   /api/v1/admin/payments
GET   /api/v1/admin/reviews
```

---

## 🔑 Key Features Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| JWT Auth + Refresh Tokens | ✅ | Redis-backed, 30d TTL |
| Brute-force Protection | ✅ | 5 attempts → 15min lockout |
| Business CRUD | ✅ | With approval workflow |
| Multi-factor Search | ✅ | PG query + tier boosting |
| Lead Distribution | ✅ | Multi-vendor, quality scoring |
| Lead Masking (free tier) | ✅ | Free users see `***-4821` |
| Pay-per-Lead Wallet | ✅ | Atomic deduction in DB tx |
| Admin Panel | ✅ | Approve, reject, suspend |
| Multi-country Support | ✅ | 11 countries, 40+ cities |
| Rate Limiting | ✅ | 3-tier (sec/10s/min) |
| Swagger API Docs | ✅ | http://localhost:3001/api/docs |
| Response Format | ✅ | `{ success, data, timestamp }` |

### Phase 2 (add next):
- [ ] Elasticsearch (replace PG search)
- [ ] SMS + WhatsApp notifications (Twilio/Africa's Talking)
- [ ] Paystack/M-Pesa payment webhooks
- [ ] Review system + AI fraud detection
- [ ] Sales agent panel

---

## 💰 Pricing Plans (auto-set by country)

| Country | Starter | Standard | Premium | Enterprise |
|---------|---------|----------|---------|------------|
| Nigeria (₦) | ₦4,900 | ₦14,900 | ₦34,900 | ₦99,900 |
| Kenya (KSh) | KSh 500 | KSh 1,500 | KSh 3,500 | KSh 9,500 |
| UK (£) | £9 | £19 | £59 | £199 |
| Europe (€) | €8 | €17 | €49 | €179 |

---

## 🚀 Deployment (AWS Production)

```bash
# 1. Build Docker images
docker build -t dialbee-api ./backend
docker build -t dialbee-frontend ./frontend

# 2. Push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin $ECR
docker tag dialbee-api:latest $ECR/dialbee-api:latest
docker push $ECR/dialbee-api:latest

# 3. Deploy to ECS
aws ecs update-service --cluster dialbee-prod --service dialbee-api --force-new-deployment

# 4. Frontend → Vercel (recommended)
npx vercel --prod
```

---

## 🧪 Test the API

```bash
# Register a user
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!","fullName":"Test User"}'

# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'

# Search businesses
curl "http://localhost:3001/api/v1/businesses/search?q=plumber&city=Lagos"

# Submit a lead
curl -X POST http://localhost:3001/api/v1/leads \
  -H "Content-Type: application/json" \
  -d '{"businessId":"BIZ_ID","customerName":"John","customerPhone":"+2348012345678","customerMessage":"Need urgent plumbing fix","source":"form"}'
```

---

Built with ❤️ for Africa & Europe | NestJS + Next.js + PostgreSQL + Elasticsearch
