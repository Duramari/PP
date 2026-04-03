# DIALBEE — PHASE 2 UPGRADE GUIDE
# Add these modules to your Phase 1 codebase

---

## 📦 NEW MODULES IN PHASE 2

```
Phase 2 adds:
│
├── backend/src/modules/
│   ├── search/
│   │   ├── search.service.ts      ← Elasticsearch function_score ranking
│   │   ├── search.controller.ts
│   │   ├── elasticsearch/
│   │   │   ├── business.index.ts  ← ES mapping with synonyms
│   │   │   └── sync.processor.ts  ← BullMQ worker for ES sync
│   │
│   ├── reviews/
│   │   ├── reviews.module.ts      ← Full reviews system
│   │   ├── reviews.service.ts
│   │   ├── reviews.controller.ts
│   │   └── fraud-detection.service.ts ← AI fraud detection
│   │
│   ├── notifications/
│   │   └── notifications.module.ts ← SMS + WhatsApp + Email + Push
│   │       ├── SmsService         ← Africa's Talking + Twilio router
│   │       ├── WhatsAppService    ← WhatsApp Business API
│   │       ├── EmailService       ← HTML email templates
│   │       └── NotificationsProcessor ← BullMQ worker
│   │
│   ├── payments/
│   │   └── payments.module.ts     ← Stripe + Paystack + M-Pesa
│   │       ├── StripeProvider     ← Checkout + Webhooks
│   │       ├── PaystackProvider   ← Nigeria/Ghana/SA
│   │       ├── MpesaProvider      ← Kenya STK Push
│   │       ├── PaymentsFactory    ← Auto-routes by country_code
│   │       └── WebhooksController ← Handles all 3 providers
│   │
│   └── agents/
│       └── agents.module.ts       ← Sales agent panel
│           ├── AgentsService      ← Dashboard, quick-add, commissions
│           └── AgentsController   ← Agent API routes
│
└── frontend/src/app/
    ├── search/page.tsx            ← Full search results + filters + lead modal
    └── agent/page.tsx             ← Complete agent dashboard UI
```

---

## 🔧 HOW TO INTEGRATE WITH PHASE 1

### Step 1: Add new env variables
```env
# Add to backend/.env

# Africa's Talking (SMS for Africa)
AFRICAS_TALKING_API_KEY=your_at_key_here
AFRICAS_TALKING_USERNAME=dialbee

# WhatsApp Business API
WHATSAPP_API_KEY=your_whatsapp_api_key
WHATSAPP_PHONE_ID=your_phone_id

# Paystack (already in Phase 1, add webhook secret)
PAYSTACK_WEBHOOK_SECRET=your_paystack_webhook_secret

# M-Pesa (Kenya)
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_passkey
```

### Step 2: Add modules to app.module.ts
```typescript
// In backend/src/app.module.ts, add imports:
import { ReviewsModule }    from './modules/reviews/reviews.module';
import { AgentsModule }     from './modules/agents/agents.module';

// Replace BasicSearchModule with full SearchModule
// Add WebhooksModule for payment providers
```

### Step 3: Create Elasticsearch index
```bash
# Run this after starting Docker
curl -X PUT http://localhost:9200/businesses_v1 \
  -H "Content-Type: application/json" \
  -d @infra/es-mapping.json
```

### Step 4: Initial bulk index
```bash
# Via Swagger UI: POST /api/v1/search/admin/reindex
# OR via API call:
curl -X POST http://localhost:3001/api/v1/search/admin/reindex \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Step 5: Replace Phase 1 search controller
```typescript
// In businesses.controller.ts, the search endpoint is now handled by
// SearchController at GET /api/v1/search
// Remove the GET /api/v1/businesses/search from BusinessesController
// or keep it as a DB fallback
```

---

## 🔌 NEW API ENDPOINTS (Phase 2)

```
GET  /api/v1/search                    ← ES-powered main search
GET  /api/v1/search/autocomplete?q=    ← Typeahead
GET  /api/v1/search/trending?cityId=   ← Trending in city
POST /api/v1/search/admin/reindex      ← Bulk reindex (admin)

GET  /api/v1/businesses/:id/reviews    ← Public reviews
POST /api/v1/reviews                   ← Submit review (auth)
POST /api/v1/owner/reviews/:id/reply   ← Reply to review (owner)
POST /api/v1/reviews/:id/helpful       ← Mark helpful

POST /api/v1/webhooks/stripe           ← Stripe webhook
POST /api/v1/webhooks/paystack         ← Paystack webhook
POST /api/v1/webhooks/mpesa            ← M-Pesa callback

GET  /api/v1/agents/dashboard          ← Agent overview
POST /api/v1/agents/businesses         ← Quick-add business
GET  /api/v1/agents/businesses         ← My businesses
GET  /api/v1/agents/commissions        ← Commission history
GET  /api/v1/agents/territory          ← Territory cities
GET  /api/v1/agents/targets            ← Monthly targets
```

---

## 📊 ES FUNCTION SCORE — HOW IT WORKS

```
Final Score = base_relevance × sum_of_functions

Functions applied (in order):
1. subscription_tier:  enterprise=4.0, premium=3.0, standard=1.8, free=1.0
2. is_featured:        +2.5x if true
3. avg_rating:         field_value_factor (sqrt modifier)
4. total_reviews:      field_value_factor (log1p modifier)
5. response_rate:      field_value_factor (0-100 → 0-0.2 boost)
6. ai_quality_score:   direct multiplier (0-1)
7. profile_completeness: 0-1 multiplier
8. is_verified:        +1.3x
9. is_open_now:        +1.2x
10. distance decay:    gauss function (closer = more boost)

Example:
  Free listing, 4.5 stars, 50 reviews = score ~3.5
  Standard listing, 4.5 stars, 50 reviews = score ~5.0
  Premium listing, 4.5 stars, 50 reviews = score ~8.5

This is your entire revenue model — businesses pay to rank higher.
```

---

## 🔔 NOTIFICATION FLOW

```
New Lead Submitted
    ↓
leads.service → leadQueue.add('distribute', {...})
    ↓
LeadProcessor.process() → leadsService.distributeLead()
    ↓
For each business:
  notifQueue.add('new-lead', { leadId, businessId, ownerId })
    ↓
NotificationsProcessor.handleNewLead()
    ↓ (parallel)
  ├── EmailService.sendNewLeadEmail()     → HTML email
  ├── SmsService.send()                  → AT (Africa) or Twilio (Europe)
  └── WhatsAppService.sendLeadTemplate() → WA Business API
```

---

## 💳 PAYMENT FLOW (Africa example — Paystack)

```
Business owner in Lagos wants Premium plan ($99 = ₦164,000)

1. POST /api/v1/subscriptions/checkout
   { businessId, planId: 'premium_monthly', countryCode: 'NG' }

2. PaymentsFactory.getProvider('NG') → 'paystack'

3. PaystackProvider.initializeTransaction()
   → returns { checkoutUrl: 'https://checkout.paystack.com/...' }

4. User redirected to Paystack checkout
   → pays with card / bank transfer / USSD

5. Paystack sends webhook to POST /api/v1/webhooks/paystack

6. WebhooksController.paystackWebhook()
   → verifies signature
   → handlePaystackChargeSuccess()
   → activateSubscription(businessId, 'premium_monthly')
   → UPDATE businesses SET subscription_tier = 'premium'
   → esQueue.add('index') → re-index business with premium tier boost
   → notifQueue.add('subscription-activated') → email to owner
```

---

## 🛡️ FRAUD DETECTION THRESHOLDS

```
fraud_score < 0.40  → Auto-approve review
fraud_score 0.40-0.79 → Flag for human review
fraud_score >= 0.80 → Auto-reject review

Signals that increase fraud score:
- account_too_new (+0.35): Account < 1 day old
- same_ip_as_business (+0.60): VERY HIGH — clear indicator of self-review
- burst_reviews (+0.25): 3+ reviews same day
- wrote_too_fast (+0.25): < 15 seconds to write
- sentiment_mismatch (+0.20): 5 stars but negative words
- generic_text (+0.15): "great service, highly recommend" etc
- first_ever_review (+0.10): No prior review history
```

---

## 🚀 DEPLOYMENT NOTES

```bash
# Stripe webhook (add to Stripe dashboard):
# https://your-api.dialbee.com/api/v1/webhooks/stripe
# Events: checkout.session.completed, invoice.payment_succeeded,
#          invoice.payment_failed, customer.subscription.deleted

# Paystack webhook:
# https://your-api.dialbee.com/api/v1/webhooks/paystack
# Events: charge.success, subscription.create

# M-Pesa callback URL (set in M-Pesa developer portal):
# https://your-api.dialbee.com/api/v1/webhooks/mpesa

# IMPORTANT: Stripe and Paystack webhooks need raw body
# In main.ts, add: app.use('/api/v1/webhooks/stripe', express.raw({ type: 'application/json' }))
```

---

Built for Africa & Europe · Phase 2 of 3
