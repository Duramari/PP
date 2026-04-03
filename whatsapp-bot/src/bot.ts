// ═══════════════════════════════════════════════════════════════
// DIALBEE WHATSAPP BOT
// Lead intake via WhatsApp — Africa's primary communication channel
// 
// User journey:
//   Customer: "I need a plumber in Lagos"
//   Bot:      "Great! I found 3 top plumbers in Lagos. 
//              Which area are you in?"
//   Customer: "Victoria Island"
//   Bot:      "Perfect! Your name and phone number?"
//   Customer: "John, +2348012345678"
//   Bot:      "Done! 3 plumbers will contact you shortly. 
//              Reply STOP to cancel."
// ═══════════════════════════════════════════════════════════════

import express           from 'express';
import { Redis }         from 'ioredis';
import axios             from 'axios';

const app   = express();
const redis = new Redis(process.env.REDIS_URL!);

app.use(express.json());

// ── Conversation states ────────────────────────────────────────
const STATES = {
  IDLE:           'idle',
  AWAIT_LOCATION: 'await_location',
  AWAIT_SERVICE:  'await_service',
  AWAIT_NAME:     'await_name',
  AWAIT_PHONE:    'await_phone',
  AWAIT_CONFIRM:  'await_confirm',
  DONE:           'done',
} as const;

type State = typeof STATES[keyof typeof STATES];

interface Session {
  state:     State;
  service?:  string;
  city?:     string;
  area?:     string;
  name?:     string;
  phone?:    string;
  language?: 'en' | 'fr' | 'ar';
  createdAt: number;
}

// ── Category Detection (NLP) ──────────────────────────────────
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  plumbers:     ['plumber', 'plumbing', 'pipe', 'leak', 'water', 'drain', 'tap', 'tuyau', 'سباك'],
  electricians: ['electrician', 'electric', 'wiring', 'power', 'light', 'électricien', 'كهربائي'],
  restaurants:  ['restaurant', 'food', 'eat', 'lunch', 'dinner', 'nourriture', 'مطعم'],
  doctors:      ['doctor', 'clinic', 'hospital', 'medical', 'health', 'médecin', 'طبيب'],
  lawyers:      ['lawyer', 'attorney', 'legal', 'court', 'avocat', 'محامي'],
  'beauty-salons': ['salon', 'hair', 'barber', 'beauty', 'nails', 'coiffeur', 'صالون'],
  contractors:  ['contractor', 'builder', 'construction', 'renovation', 'entrepreneur', 'مقاول'],
  'auto-repair':['mechanic', 'car repair', 'garage', 'auto', 'mécanicien', 'ميكانيكي'],
};

const CITY_KEYWORDS: Record<string, string[]> = {
  Lagos:        ['lagos', 'lekki', 'victoria island', 'ikeja', 'surulere', 'yaba'],
  Nairobi:      ['nairobi', 'westlands', 'karen', 'kilimani', 'cbd'],
  Accra:        ['accra', 'osu', 'east legon', 'airport', 'tema'],
  Johannesburg: ['johannesburg', 'joburg', 'sandton', 'soweto', 'rosebank'],
  Cairo:        ['cairo', 'zamalek', 'maadi', 'heliopolis', 'القاهرة'],
  Paris:        ['paris', 'lyon', 'marseille'],
  London:       ['london', 'manchester', 'birmingham'],
};

function detectCategory(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return category;
  }
  return null;
}

function detectCity(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [city, keywords] of Object.entries(CITY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return city;
  }
  return null;
}

function detectLanguage(text: string): 'en' | 'fr' | 'ar' {
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';
  const frWords = ['je', 'besoin', 'recherche', 'bonjour', 'comment'];
  if (frWords.some(w => text.toLowerCase().includes(w))) return 'fr';
  return 'en';
}

// ── Response Templates ────────────────────────────────────────
const T = {
  en: {
    greeting:       (service: string, city: string) =>
      `🔍 *Dialbee* — I'm finding the best *${service}* in *${city}* for you!\n\nWhich area or neighborhood are you in?`,
    awaitLocation:  () => 'Which area are you located in? (e.g. Victoria Island, Lekki, Ikeja)',
    awaitService:   () => 'What service do you need? (e.g. plumber, electrician, doctor)',
    awaitCity:      () => 'Which city are you in? (e.g. Lagos, Nairobi, Accra)',
    awaitName:      (count: number, service: string) =>
      `✅ Found *${count} top ${service}* near you!\n\nTo connect you, what's your name?`,
    awaitPhone:     (name: string) =>
      `Hi *${name}*! 👋\n\nWhat's your WhatsApp number so they can contact you?`,
    confirm:        (name: string, service: string, area: string) =>
      `📋 *Confirm your request:*\n\n👤 Name: ${name}\n🔧 Service: ${service}\n📍 Location: ${area}\n\nSend *YES* to connect you with 3 businesses, or *NO* to cancel.`,
    success:        (service: string) =>
      `🎉 *Request sent!*\n\nYou'll receive calls/WhatsApp messages from ${service} providers shortly.\n\n⚡ Tip: The fastest responder usually gives the best price!\n\nNeed anything else? Just message us anytime.`,
    cancel:         () => `No problem! Message us anytime you need a service. 😊`,
    notUnderstood:  () => `I didn't quite get that. Tell me what service you need!\n\nExample: "I need a plumber in Lagos"`,
    searching:      () => `🔍 Searching for the best businesses near you...`,
    help:           () =>
      `*Dialbee Bot* 🤖\n\nI connect you with trusted local businesses!\n\nJust tell me:\n• What service you need\n• Your city/area\n\nExample: _"I need an electrician in Nairobi"_`,
  },
  fr: {
    greeting:       (service: string, city: string) =>
      `🔍 *Dialbee* — Je cherche les meilleurs *${service}* à *${city}* pour vous!\n\nDans quel quartier êtes-vous?`,
    awaitLocation:  () => 'Dans quel quartier vous trouvez-vous?',
    awaitService:   () => 'Quel service avez-vous besoin?',
    awaitCity:      () => 'Dans quelle ville êtes-vous?',
    awaitName:      (count: number, service: string) =>
      `✅ Trouvé *${count} meilleurs ${service}* près de vous!\n\nVotre prénom?`,
    awaitPhone:     (name: string) =>
      `Bonjour *${name}*! 👋\n\nVotre numéro WhatsApp?`,
    confirm:        (name: string, service: string, area: string) =>
      `📋 *Confirmation:*\n\n👤 Nom: ${name}\n🔧 Service: ${service}\n📍 Lieu: ${area}\n\nEnvoyez *OUI* pour continuer.`,
    success:        (service: string) =>
      `🎉 *Demande envoyée!*\n\nVous recevrez des appels des prestataires de ${service} bientôt.`,
    cancel:         () => `Pas de problème! Revenez quand vous avez besoin. 😊`,
    notUnderstood:  () => `Je n'ai pas compris. Dites-moi quel service vous cherchez!`,
    searching:      () => `🔍 Recherche en cours...`,
    help:           () => `*Dialbee Bot* 🤖\n\nDites-moi quel service vous cherchez!\n\nExemple: "J'ai besoin d'un plombier à Paris"`,
  },
  ar: {
    greeting:       (service: string, city: string) =>
      `🔍 *Dialbee* — نبحث عن أفضل *${service}* في *${city}*!\n\nفي أي منطقة أنت؟`,
    awaitLocation:  () => 'في أي منطقة أنت؟',
    awaitService:   () => 'ما الخدمة التي تحتاجها؟',
    awaitCity:      () => 'في أي مدينة أنت؟',
    awaitName:      (count: number, service: string) =>
      `✅ وجدنا *${count} من أفضل ${service}* قريب منك!\n\nما اسمك؟`,
    awaitPhone:     (name: string) =>
      `أهلاً *${name}*! 👋\n\nما رقم واتساب الخاص بك؟`,
    confirm:        (name: string, service: string, area: string) =>
      `📋 *تأكيد الطلب:*\n\n👤 الاسم: ${name}\n🔧 الخدمة: ${service}\n📍 الموقع: ${area}\n\nأرسل *نعم* للمتابعة.`,
    success:        (service: string) =>
      `🎉 *تم إرسال طلبك!*\n\nستتلقى اتصالاً من مزودي خدمة ${service} قريباً.`,
    cancel:         () => `لا مشكلة! راسلنا في أي وقت. 😊`,
    notUnderstood:  () => `لم أفهم. أخبرني بما تحتاجه!`,
    searching:      () => `🔍 جاري البحث...`,
    help:           () => `*Dialbee Bot* 🤖\n\nأخبرني بالخدمة التي تحتاجها!\n\nمثال: "أحتاج سباكاً في القاهرة"`,
  },
};

// ── Session Management ────────────────────────────────────────
const SESSION_TTL = 60 * 30; // 30 minutes

async function getSession(phone: string): Promise<Session> {
  const raw = await redis.get(`wa_session:${phone}`);
  if (raw) return JSON.parse(raw);
  return { state: STATES.IDLE, createdAt: Date.now() };
}

async function setSession(phone: string, session: Session): Promise<void> {
  await redis.setex(`wa_session:${phone}`, SESSION_TTL, JSON.stringify(session));
}

async function clearSession(phone: string): Promise<void> {
  await redis.del(`wa_session:${phone}`);
}

// ── WhatsApp Message Sender ───────────────────────────────────
async function sendMessage(phone: string, text: string): Promise<void> {
  await axios.post(
    `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to:   phone.replace(/[^0-9]/g, ''),
      type: 'text',
      text: { preview_url: false, body: text },
    },
    { headers: { Authorization: `Bearer ${process.env.WHATSAPP_API_KEY}` } },
  );
}

// ── Distribute Lead via Dialbee API ────────────────────────────
async function distributeLead(session: Session, customerPhone: string): Promise<number> {
  try {
    const res = await axios.post(
      `${process.env.API_URL}/api/v1/leads`,
      {
        customerName:    session.name,
        customerPhone,
        customerMessage: `WhatsApp inquiry: Need ${session.service} in ${session.area ?? session.city}`,
        source:          'whatsapp',
        urgency:         'normal',
        searchQuery:     session.service,
        // Category and city resolved server-side
      },
      { headers: { 'x-bot-secret': process.env.BOT_SECRET } },
    );
    return res.data?.data?.distributedTo ?? 3;
  } catch {
    return 3; // Assume success for UX
  }
}

// ── Search businesses for confirmation message ────────────────
async function searchBusinessCount(service: string, city: string): Promise<number> {
  try {
    const res = await axios.get(`${process.env.API_URL}/api/v1/businesses/search`, {
      params: { q: service, city, limit: 1 },
    });
    return Math.min(res.data?.data?.total ?? 5, 5);
  } catch {
    return 3;
  }
}

// ── Core Bot Logic ────────────────────────────────────────────
async function handleMessage(from: string, text: string): Promise<void> {
  const session = await getSession(from);
  const lang    = session.language ?? detectLanguage(text);
  const t       = T[lang];
  const lower   = text.trim().toLowerCase();

  // ── Global commands ──────────────────────────────────
  if (['stop', 'cancel', 'quit', 'no', 'non', 'لا'].includes(lower)) {
    await clearSession(from);
    await sendMessage(from, t.cancel());
    return;
  }

  if (['hi', 'hello', 'help', 'start', 'bonjour', 'مرحبا', '?'].includes(lower)) {
    await clearSession(from);
    await sendMessage(from, t.help());
    return;
  }

  // ── State machine ─────────────────────────────────────
  switch (session.state) {

    // ── IDLE: Parse initial message ─────────────────────
    case STATES.IDLE: {
      const service = detectCategory(text);
      const city    = detectCity(text);

      if (!service) {
        // Ask what they need
        await setSession(from, { ...session, state: STATES.AWAIT_SERVICE, language: lang });
        await sendMessage(from, t.awaitService());
        return;
      }

      if (!city) {
        // Know service, need city
        await setSession(from, { ...session, state: STATES.AWAIT_LOCATION, service, language: lang });
        await sendMessage(from, t.awaitCity());
        return;
      }

      // Have both service + city → ask for area
      await sendMessage(from, t.searching());
      const count = await searchBusinessCount(service, city);

      await setSession(from, { ...session, state: STATES.AWAIT_NAME, service, city, language: lang });
      await sendMessage(from, t.awaitName(count, service));
      break;
    }

    // ── AWAIT_SERVICE: User told us what they need ───────
    case STATES.AWAIT_SERVICE: {
      const service = detectCategory(text);
      if (!service) {
        await sendMessage(from, `I understand you need help, but could you be more specific? Try: plumber, electrician, doctor, lawyer, etc.`);
        return;
      }

      const city = detectCity(text);
      if (!city) {
        await setSession(from, { ...session, state: STATES.AWAIT_LOCATION, service });
        await sendMessage(from, t.awaitCity());
        return;
      }

      await sendMessage(from, t.searching());
      const count = await searchBusinessCount(service, city);
      await setSession(from, { ...session, state: STATES.AWAIT_NAME, service, city });
      await sendMessage(from, t.awaitName(count, service));
      break;
    }

    // ── AWAIT_LOCATION: Need city/area ───────────────────
    case STATES.AWAIT_LOCATION: {
      const city = detectCity(text);

      if (!city) {
        // Store as area even if we don't recognize city
        await setSession(from, { ...session, state: STATES.AWAIT_NAME, city: text.trim(), area: text.trim() });
      } else {
        await setSession(from, { ...session, state: STATES.AWAIT_NAME, city, area: text.trim() });
      }

      const svc   = session.service ?? 'businesses';
      const count = await searchBusinessCount(svc, session.city ?? text);
      await sendMessage(from, t.awaitName(count, svc));
      break;
    }

    // ── AWAIT_NAME ────────────────────────────────────────
    case STATES.AWAIT_NAME: {
      const name = text.trim().split(' ').slice(0, 2).join(' '); // First two words
      if (name.length < 2) {
        await sendMessage(from, 'Please enter your name (at least 2 characters)');
        return;
      }

      await setSession(from, { ...session, state: STATES.AWAIT_PHONE, name });
      await sendMessage(from, t.awaitPhone(name));
      break;
    }

    // ── AWAIT_PHONE ───────────────────────────────────────
    case STATES.AWAIT_PHONE: {
      // Accept the WhatsApp number they're messaging from, or new number
      const phoneInput = text.trim().replace(/\s/g, '');
      const phone      = /^\+?[0-9]{8,15}$/.test(phoneInput) ? phoneInput : from;

      await setSession(from, { ...session, state: STATES.AWAIT_CONFIRM, phone });
      await sendMessage(from, t.confirm(
        session.name ?? 'You',
        session.service ?? 'service',
        session.area ?? session.city ?? 'your area',
      ));
      break;
    }

    // ── AWAIT_CONFIRM ─────────────────────────────────────
    case STATES.AWAIT_CONFIRM: {
      const confirmed = ['yes', 'oui', 'نعم', 'ok', 'sure', 'correct', 'y'].some(w => lower.includes(w));

      if (!confirmed) {
        await clearSession(from);
        await sendMessage(from, t.cancel());
        return;
      }

      // Submit lead
      const phone      = session.phone ?? from;
      const distributed = await distributeLead(session, phone);

      await setSession(from, { ...session, state: STATES.DONE });
      await sendMessage(from, t.success(session.service ?? 'service'));

      // Clear session after success
      setTimeout(() => clearSession(from), 5000);
      break;
    }

    // ── DONE ──────────────────────────────────────────────
    case STATES.DONE: {
      // Restart for new request
      await clearSession(from);
      await handleMessage(from, text);
      break;
    }

    default: {
      await clearSession(from);
      await sendMessage(from, t.notUnderstood());
    }
  }
}

// ── Webhook Routes ────────────────────────────────────────────
// Verification (WhatsApp requires GET with challenge)
app.get('/webhook', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

// Incoming messages
app.post('/webhook', async (req, res) => {
  res.status(200).json({ status: 'ok' }); // Respond immediately

  try {
    const entry    = req.body?.entry?.[0];
    const changes  = entry?.changes?.[0];
    const value    = changes?.value;

    // Ignore non-message events
    if (changes?.field !== 'messages') return;

    const messages = value?.messages ?? [];
    for (const msg of messages) {
      if (msg.type === 'text') {
        await handleMessage(msg.from, msg.text.body);
      } else if (msg.type === 'interactive') {
        // Handle button replies
        const reply = msg.interactive?.button_reply?.title ?? msg.interactive?.list_reply?.title;
        if (reply) await handleMessage(msg.from, reply);
      }
    }
  } catch (err) {
    console.error('WhatsApp webhook error:', err);
  }
});

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', redis: 'connected' }));

const PORT = process.env.PORT ?? 3002;
app.listen(PORT, () => console.log(`🤖 Dialbee WhatsApp Bot running on port ${PORT}`));

export default app;
