# 📅 DIALBEE LAUNCH CHECKLIST
# ये करो — इसी order में — रोज़ थोड़ा-थोड़ा

---

## 🗓️ DAY 1 — Computer Setup (1-2 घंटे)

```
□ Node.js install करें
    👉 https://nodejs.org → LTS version download
    ✅ Check: node --version → v20.x.x

□ Docker install करें
    👉 https://docker.com/get-started → Docker Desktop
    ✅ Check: docker --version

□ VS Code install करें
    👉 https://code.visualstudio.com/
    
□ Git install करें
    👉 https://git-scm.com/

□ Project code VS Code में खोलें
    ✅ dialbee-phase1 folder open करें
```

---

## 🗓️ DAY 2 — Local Test (1-2 घंटे)

```
□ Terminal/Command Prompt खोलें

□ Docker services start करें:
    docker-compose up -d postgres redis elasticsearch mailhog

□ Backend start करें:
    cd backend
    npm install
    npm run start:dev

□ नई Terminal में Frontend start करें:
    cd frontend
    npm install
    npm run dev

□ Browser में खोलें:
    ✅ http://localhost:3000 → Homepage दिखे
    ✅ http://localhost:3001/api/docs → API docs दिखे
    ✅ http://localhost:8025 → Email UI दिखे

अगर सब दिख रहा है → ✅ Day 2 Complete!
```

---

## 🗓️ DAY 3 — Accounts बनाएं (2-3 घंटे)

```
□ GitHub account
    👉 github.com → Sign up
    □ New repository बनाएं: "my-dialbee"
    □ Code push करें (Guide में Step 5A-1 देखें)

□ Domain खरीदें
    👉 namecheap.com
    □ Search: yourbrand.com / yourbrand.ng / yourbrand.africa
    □ Purchase करें (~$10-15)
    📝 Note करें: आपका domain: _______________

□ Stripe account (Europe payments)
    👉 stripe.com → Create account
    □ Email verify करें
    □ Dashboard → Developers → API Keys
    📝 Secret Key copy करें: sk_test_________________

□ Paystack account (Africa payments)  
    👉 paystack.com → Create account
    □ Business verify करें
    □ Settings → API Keys
    📝 Secret Key copy करें: sk_test_________________
```

---

## 🗓️ DAY 4 — Server Setup (2-3 घंटे)

```
OPTION A: Railway (Beginner — START HERE)
    👉 railway.app → Login with GitHub

    □ New Project → Deploy from GitHub
    □ Add PostgreSQL database
    □ Add Redis database
    □ Deploy backend
    □ Deploy frontend
    □ Add environment variables
    ✅ Railway URL मिलेगी (like: abc123.up.railway.app)

OPTION B: AWS (Advanced)
    □ aws.amazon.com → Create account
    □ EC2 → Launch Instance → Ubuntu 22.04
    □ t3.medium, 30GB storage
    □ SSH से connect करें
    □ install.sh script run करें
```

---

## 🗓️ DAY 5 — Domain Connect करें (30 min + 24hr wait)

```
□ Namecheap → Domain → Advanced DNS

□ A Records add करें:
    @ → YOUR_SERVER_IP
    www → YOUR_SERVER_IP
    api → YOUR_SERVER_IP

□ Wait करें (DNS propagate होने में 1-24 hours लगते हैं)

□ Check: https://dnschecker.org/#A/yourdomain.com

□ SSL Certificate install करें:
    sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com

✅ https://yourdomain.com खुले → LIVE!
```

---

## 🗓️ DAY 6 — Payments Setup (1 घंटा)

```
□ Stripe Webhooks:
    Stripe Dashboard → Developers → Webhooks
    Endpoint: https://api.yourdomain.com/api/v1/webhooks/stripe
    Events: checkout.session.completed, invoice.payment_succeeded
    □ Signing secret copy करें → .env में add करें

□ Paystack Webhooks:
    Paystack → Settings → Webhooks
    URL: https://api.yourdomain.com/api/v1/webhooks/paystack

□ Test payment करें:
    Card: 4242 4242 4242 4242
    Date: Any future date
    CVV: Any 3 digits

✅ Payment success दिखे → Done!
```

---

## 🗓️ DAY 7 — Content Add करें (2-3 घंटे)

```
□ Admin panel खोलें:
    https://yourdomain.com/admin
    Email: admin@yourdomain.com
    Password: Admin@Dialbee2024!

□ Launch city choose करें (ONE CITY FIRST!)
    □ Categories verify करें
    
□ 50 businesses add करें:
    Method 1: Google Maps से manually collect करें
    Method 2: Admin → Import CSV
    Method 3: Fiverr पर outsource करें ($20-50)

    हर business में भरें:
    □ Business name
    □ Category
    □ City
    □ Phone number
    □ Address
    Status: Active ← यह important है!

✅ 50 businesses live → LAUNCH DAY!
```

---

## 🗓️ LAUNCH DAY 🚀 — Marketing शुरू करें

```
□ Website final check:
    □ Homepage खुले
    □ Search काम करे
    □ Business profile खुले
    □ Lead form submit हो

□ First 10 businesses को WhatsApp करें:
    Message template:
    ---
    "Hello [Name],
    
    I'm the founder of [YourBrand] - a new business 
    directory for [City].
    
    Your business is already listed: 
    https://yourdomain.com/business/[slug]
    
    This week 5 people searched for [category] in 
    [city]. Upgrade to see their contact details.
    
    14-day FREE trial available!
    
    Interested?"
    ---

□ Social media post करें:
    "🚀 Introducing [YourBrand]!
    Find trusted local businesses in [City].
    Try it: yourdomain.com
    #Lagos #Business #Directory"

□ Google Search Console:
    search.google.com/search-console
    Domain add करें
    Sitemap submit: yourdomain.com/sitemap.xml
```

---

## 📊 SUCCESS METRICS — हर हफ्ते check करें

```
Week 1 Target:
□ 50+ businesses listed ___/50
□ 100+ page views ___/100
□ 10 lead submissions ___/10
□ 1 paying customer ___/1

Week 2 Target:
□ 100+ businesses listed ___/100
□ 500+ page views ___/500
□ 3 paying customers ___/3
□ 1 sales agent hired ___/1

Month 1 Target:
□ 200+ businesses listed ___/200
□ 10 paying customers ___/10
□ $290+ MRR ___/$290
□ 2 cities launched ___/2
```

---

## 🆘 HELP चाहिए?

**Step पर अटक गए?** मुझे बताइए:
- कौन सा step है
- क्या error आ रही है
- Screenshot share करें

**Common help:**
- Error messages → copy paste करें
- Server login नहीं हो रहा → SSH key check करें
- Payment काम नहीं → Webhook URL check करें
- Domain नहीं खुल रहा → DNS propagation wait करें

---

*"Every expert was once a beginner. Start now, improve later."* 🌍
