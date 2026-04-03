# 🚀 DIALBEE LAGOS — DEPLOY & LAUNCH PLAN
# For Business Owner + Developer Team
# Target: Live in 5 days, First paying customer in Week 2

---

## 📋 PART 1: DEVELOPER को दें (Technical Brief)

### What to Deploy
```
Stack:
  Backend:  NestJS (Node.js 20) — dialbee-phase1/backend/
  Frontend: Next.js 14          — dialbee-phase1/frontend/
  DB:       PostgreSQL 16 + PostGIS
  Cache:    Redis 7
  Search:   Elasticsearch 8
  Queue:    BullMQ

Hosting (Recommended for MVP):
  App:      Railway.app OR Render.com
  DB:       Supabase (free PostgreSQL) OR Railway
  Domain:   Namecheap
  Media:    Cloudflare R2 (cheaper than S3)
  Email:    Resend.com (100 free/day)
```

### Environment Variables (Developer को दें)
```env
# Production .env — Developer को fill करना है

NODE_ENV=production
PORT=3001
APP_URL=https://api.YOURDOMAIN.com
FRONTEND_URL=https://YOURDOMAIN.com

# DB — Railway/Supabase से मिलेगा
DATABASE_URL=postgresql://...

# Redis — Railway से मिलेगा
REDIS_URL=redis://...

# ES — Bonsai.io (free 125MB) या Railway
ELASTICSEARCH_URL=https://...

# JWT — Developer generate करे
JWT_ACCESS_SECRET=min_32_chars_random_string
JWT_REFRESH_SECRET=different_32_chars_string

# Stripe (Europe)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Paystack (Nigeria ← MOST IMPORTANT)
PAYSTACK_SECRET_KEY=sk_live_...

# Email — Resend.com
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_your_api_key
EMAIL_FROM=hello@YOURDOMAIN.com

# Admin
ADMIN_EMAIL=admin@YOURDOMAIN.com
ADMIN_PASSWORD=YourStrongPassword123!
```

### Developer Checklist
```
Day 1:
□ Railway.app पर project बनाएं
□ PostgreSQL + Redis add करें
□ Backend deploy करें
□ Database migrations run करें
□ Test: /api/v1/auth/register काम करे

Day 2:
□ Frontend deploy करें
□ Domain connect करें (api.domain.com + domain.com)
□ SSL verify करें
□ Admin panel test करें

Day 3:
□ Stripe webhook configure करें
□ Paystack webhook configure करें
□ Subscription plans बनाएं (Stripe + Paystack)
□ Test payment करें

Day 4:
□ Elasticsearch index बनाएं
□ Email service test करें
□ 50 Lagos businesses seed करें
□ Performance test करें

Day 5:
□ Final QA — सारे flows test करें
□ Monitoring setup (UptimeRobot)
□ Error tracking (Sentry free)
□ LAUNCH ✅
```

---

## 📋 PART 2: आप करें (Business Owner)

### Step 1: Accounts बनाएं (आज ही — 2 घंटे)

**1. Domain खरीदें**
- Namecheap.com पर जाएं
- Options:
  - `dialbee.ng` — ₦8,000/year (~$5) ← Best for Nigeria
  - `dialbee.ng` — ₦8,000/year
  - `yourbrand.com.ng` — ₦5,000/year
- Cart → Checkout → Pay

**2. Paystack Account (Most Important for Lagos)**
- https://paystack.com → Create Account
- Business Name: आपका company name
- Business Type: Technology/Software
- Bank Account add करें (withdrawals के लिए)
- Settings → API Keys → Live Secret Key copy करें
- Developer को दें

**3. Stripe Account (For UK/Europe later)**
- https://stripe.com → Create Account
- Business verification करें
- Live keys copy करें → Developer को दें

**4. Business Email बनाएं**
- Zoho Mail: https://zoho.com/mail (Free)
- Create: admin@yourdomain.ng, hello@yourdomain.ng
- SMTP settings developer को दें

---

### Step 2: Pricing Set करें (Lagos-Specific)

```
NAIRA PRICING (recommended):

FREE Plan:        ₦0
  - Basic listing
  - 3 photos
  - Lead contacts hidden

STANDARD Plan:    ₦14,900/month ($9)
  - See all lead contacts
  - 20 photos
  - Priority in search
  - Basic analytics
  - 14-day free trial

PREMIUM Plan:     ₦34,900/month ($21)
  - Top 3 search placement
  - Verified badge
  - 30 photos
  - SMS lead alerts
  - Full analytics
  - Featured listing

ENTERPRISE Plan:  ₦99,900/month ($60)
  - #1 placement
  - Multiple branches
  - API access
  - Dedicated support

PAY-PER-LEAD (wallet):
  - Restaurants:     ₦500/lead
  - Plumbers:        ₦1,500/lead
  - Electricians:    ₦1,500/lead
  - Doctors:         ₦5,000/lead
  - Lawyers:         ₦8,000/lead
  - Real Estate:     ₦15,000/lead
```

---

### Step 3: Lagos Businesses Collect करें

**Target: 200 businesses before launch**

**Categories priority (Lagos में demand):**
1. Plumbers/Electricians (emergency services)
2. Restaurants (Lekki, VI, Ikeja)
3. Doctors/Clinics
4. Auto Repair/Mechanics
5. Beauty Salons
6. Contractors/Builders

**How to collect data:**

**Method A: Google Maps (Free, 2-3 hours)**
```
Google Maps → "Plumbers in Lagos" search करें
हर result note करें:
  - Business Name
  - Phone Number
  - Address
  - Rating
  - Category
Excel में डालें → developer को CSV दें
```

**Method B: Fiverr (Fast, $30-50)**
Post करें:
```
"Need 200 Lagos business listings scraped from 
Google Maps. Required: Name, Phone, Address, 
Category, Rating. Delivery: 2 days."
```

**Method C: Manual Visit/Call**
- Lekki Phase 1 market
- Ikeja Computer Village
- Victoria Island business district
- Surulere market

---

### Step 4: Sales Script तैयार करें

**WhatsApp message (copy-paste ready):**
```
Hello [Name]! 👋

I'm [Your Name] from Dialbee.ng — Lagos' newest 
business directory.

Your business "[Business Name]" is already on 
our platform:
https://dialbee.ng/business/[slug]

This week 8 people searched for [their category] 
in Lagos on our site.

With our Standard Plan (₦14,900/month), these 
customers can see your contact and call you directly.

We're offering 14-day FREE trial this week only.

Interested? Reply YES and I'll set it up for you! 🙏
```

**Phone call script:**
```
"Hello, am I speaking with [Business Name]?

My name is [Your Name], I'm calling from Dialbee 
— the new business directory for Lagos.

We've already listed your business for free on 
our platform. This week, 8 people searched for 
[their service] in Lagos and could have contacted you.

With our Standard plan for just ₦14,900 per month, 
they can see your number and call you directly.

We're giving a 14-day free trial right now.
Can I sign you up today?"
```

---

### Step 5: Sales Agent Hire करें

**Post on:** LinkedIn Nigeria, Jobberman.com, WhatsApp groups

**Job description:**
```
SALES AGENT WANTED — Dialbee.ng
Lagos, Nigeria

We're a tech startup launching a business directory 
for Lagos. Looking for 3 commission-only sales agents.

Responsibilities:
- Visit/call local businesses in Lagos
- Sign them up on our platform
- Collect payment (Paystack link)

Commission:
- ₦1,490 per Standard plan sold (₦14,900 × 10%)
- ₦3,490 per Premium plan sold (₦34,900 × 10%)
- Bonus: ₦10,000 for first 20 sales this month

Requirements:
- Good communication skills
- Smartphone
- Lagos-based

WhatsApp CV to: +234-YOUR-NUMBER
```

**Target:** 3 agents × 20 sales/month = 60 new businesses/month

---

## 📋 PART 3: LAUNCH WEEK PLAN

### Day 1 (Launch Day)
```
Morning:
□ Website live check करें
□ Test account बनाएं
□ Test payment करें
□ Admin panel check करें

Afternoon:
□ First 20 businesses WhatsApp करें
□ Instagram page बनाएं: @dialbee.ng
□ Post: "Lagos, we're LIVE! 🚀 #Dialbee"

Evening:
□ Lagos business WhatsApp groups join करें
□ Post announcement in groups
□ Respond to all replies
```

### Day 2-3
```
□ 50 more businesses contact करें
□ Sales agents onboard करें
□ First agents को training दें
□ Track: Who responded? Who's interested?
```

### Day 4-7
```
□ Follow up करें (3-day rule)
□ First paying customers close करें
□ Reviews ask करें from early users
□ Fix any bugs developer reports करे
```

---

## 📊 FINANCIAL PROJECTIONS — Lagos Only

```
Month 1:
  Businesses listed:  200 (free)
  Paying customers:   10
  Revenue:            10 × ₦14,900 = ₦149,000 (~$90)
  
Month 2:
  Businesses listed:  400
  Paying customers:   30
  Revenue:            30 × ₦14,900 = ₦447,000 (~$270)
  
Month 3:
  Businesses listed:  600
  Standard (50):      ₦745,000
  Premium (15):       ₦523,500
  PPL wallet:         ₦200,000
  Total:              ₦1,468,500 (~$900)

Month 6:
  Total Revenue:      ₦5,000,000+ (~$3,000/month)
  
BREAK-EVEN:
  Server costs:       ~₦25,000/month ($16)
  Break-even:         2 Standard plan customers ✅
```

---

## 🆘 COMMON PROBLEMS & SOLUTIONS

**"Businesses don't want to pay"**
→ Lead masking strategy: Show them "3 leads received" 
  but blur the phone numbers. They'll upgrade.

**"No one is searching yet"**
→ SEO takes time. Meanwhile: WhatsApp marketing,
  Google Ads (₦10,000 budget), Instagram ads.

**"Competitor already exists"**
→ In Lagos, competition is thin. USP: faster, 
  more modern, WhatsApp integration, better UX.

**"Developer is slow"**
→ Railway.app deployment: experienced developer
  should finish in 2-3 days maximum.

---

## 📞 IMPORTANT CONTACTS TO SAVE

```
Paystack Support:  support@paystack.com
Stripe Support:    support.stripe.com
Railway Support:   help.railway.app
Domain (Namecheap): support.namecheap.com
```

---

**First goal: ₦149,000 MRR (Month 1)**
**= 10 Standard plan customers**
**= 1 good sales person working 1 week**

आप कर सकते हैं! 💪🌍
