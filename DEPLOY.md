# FitTrack Pro — Οδηγός Deployment

Από το μηδέν ως την παραγωγή. Χρόνος: ~2-3 ώρες.

---

## Βήμα 1: Supabase (Database) — ~15 λεπτά

1. [supabase.com](https://supabase.com) → Sign In → **New Project** → Region: EU West
2. **Settings → Database → Connection String (URI)** → αντίγραψε το `DATABASE_URL`
3. **SQL Editor** → εκτέλεσε το περιεχόμενο του `backend/db/schema.sql`
4. **SQL Editor** → εκτέλεσε το `backend/db/migrations/001_add_progress_logs_unique.sql`
5. Seed τοπικά:
   ```bash
   DATABASE_URL="postgresql://..." node backend/db/seed.js
   ```

---

## Βήμα 2: Stripe — ~10 λεπτά

1. [dashboard.stripe.com](https://dashboard.stripe.com) → **Products → Add Product**
   - Name: `FitTrack Pro Lifetime` | Price: `€40.00` — One time
   - Αντίγραψε **Price ID** (`price_...`)
2. **Developers → API Keys** → αντίγραψε **Secret Key** (`sk_live_...`)
3. **Developers → Webhooks → Add endpoint**
   - URL: `https://YOUR_RAILWAY_URL/api/webhooks/stripe`
   - Events: `checkout.session.completed`
   - Αντίγραψε **Signing Secret** (`whsec_...`)
4. **Payment Links → Create link** → Product: FitTrack Pro Lifetime
   - Αντίγραψε το URL και βάλτο στο `landing/index.html` (αντίγραψε `YOUR_PAYMENT_LINK`)

---

## Βήμα 3: Railway (Backend) — ~20 λεπτά

1. [railway.app](https://railway.app) → **New Project → Deploy from GitHub**
2. **Root Directory**: `backend`
3. **Variables → Add all** από `.env.example`:
   ```
   DATABASE_URL=postgresql://...
   JWT_SECRET=<τυχαία string 32+ chars>
   JWT_EXPIRES_IN=30d
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_ID=price_...
   ALLOWED_ORIGINS=https://USERNAME.github.io,exp://...
   NODE_ENV=production
   PORT=3000
   ```
4. Αντίγραψε το **Railway URL** (π.χ. `https://fittrackpro-api.up.railway.app`)
5. Ενημέρωσε `app/src/api/index.js`:
   ```js
   : 'https://YOUR_RAILWAY_URL.up.railway.app/api';
   ```
6. Ενημέρωσε το Stripe Webhook URL με το Railway URL

---

## Βήμα 4: GitHub Pages (Landing Page) — ~5 λεπτά

1. Push repo στο GitHub
2. **Settings → Pages → Source**: Branch `main`, Folder `/landing`
3. ~2 λεπτά → live στο `https://USERNAME.github.io/fittrackpro`
4. Ενημέρωσε `ALLOWED_ORIGINS` στο Railway με αυτό το URL
5. Ενημέρωσε links στο `landing/index.html` (Google Play URL + Stripe Payment Link)

---

## Βήμα 5: EAS Build (Android AAB) — ~30-60 λεπτά

```bash
# Εγκατάσταση
npm install -g eas-cli

# Σύνδεση (φτιάξε account στο expo.dev αν δεν έχεις)
eas login

# Ρύθμιση (μόνο πρώτη φορά — δίνει projectId)
cd app
eas build:configure

# Ενημέρωσε app.json → extra.eas.projectId με το projectId από πάνω

# Build production AAB
eas build --platform android --profile production

# Κατέβασε το .aab από https://eas.expo.dev
```

---

## Βήμα 6: Google Play Console — ~2-3 ημέρες review

1. [play.google.com/console](https://play.google.com/console) ($25 εφάπαξ)
2. **Create app** → FitTrack Pro | Greek | App | Free
3. **App content** → συμπλήρωσε:
   - Privacy policy URL: `https://USERNAME.github.io/fittrackpro/privacy.html`
   - Target audience: 18+, No ads
4. **Store listing**:
   - Short: `Παρακολούθησε διατροφή & άσκηση. Πλήρωσε μία φορά, χρησιμοποίησε για πάντα.`
   - Screenshots: Τράβηξε από Expo Go ή emulator
5. **Production → Create release → Upload .aab**
6. **Submit for review** → 2-3 εργάσιμες

---

## ✅ Checklist Πριν το Launch

- [ ] `https://YOUR_RAILWAY_URL/health` → `{"status":"ok"}`
- [ ] Stripe test payment (`sk_test_...` πρώτα)
- [ ] Landing page φορτώνει OK
- [ ] Privacy Policy URL προσβάσιμο (απαραίτητο για Google Play)
- [ ] `.env` αρχεία ΔΕΝ είναι committed στο git
- [ ] Google Play review εγκρίθηκε
- [ ] Forum posts έτοιμα (δες `forum-posts.md`)
