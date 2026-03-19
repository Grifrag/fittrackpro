# FitTrackPro — Full Production Implementation Design
**Date:** 2026-03-19
**Status:** Approved
**Goal:** Production-ready calorie tracking app, $40 lifetime deal, Google Play launch, forum marketing

---

## 1. Overview

FitTrackPro is a Greek-language fitness/calorie tracking mobile app (React Native + Expo) backed by Node.js + PostgreSQL (Supabase). The app is ~75% implemented. This design covers what's needed to go from current state to a fully launched, monetized product.

**Business model:** $40 one-time lifetime payment via Stripe → `lifetime_access=true` in DB.
**Distribution:** Google Play (via EAS Build), then App Store later.
**Marketing:** Landing page (GitHub Pages) + Greek forum posts.

---

## 2. What Already Exists (Do Not Rebuild)

- ✅ Auth (register/login/JWT)
- ✅ Meal logging (breakfast/lunch/dinner/snack)
- ✅ Barcode scanner (Open Food Facts)
- ✅ Greek food database (240+ foods seeded)
- ✅ Progress tracking (weight chart, stats)
- ✅ Adaptive calorie algorithm
- ✅ Dashboard (macro ring, water tracker)
- ✅ Profile screen (TDEE calculator, goals)
- ✅ Full PostgreSQL schema (Supabase-ready)

---

## 3. Backend Implementation

### 3.1 Stripe Payments

**New file:** `backend/routes/payments.js`

- `POST /api/payments/create-checkout` (protected)
  - Creates Stripe Checkout Session ($40, mode: payment)
  - Returns `{ url }` → app opens WebView
- `POST /api/webhooks/stripe` (public, raw body)
  - Verifies Stripe signature
  - On `checkout.session.completed` → UPDATE users SET lifetime_access=true, subscription_tier='lifetime' WHERE id = metadata.userId
  - Returns 200 immediately

**New file:** `backend/routes/payments.js` registers in `server.js`.

**Environment variables needed:**
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...   # $40 one-time price created in Stripe dashboard
```

### 3.2 Security Fixes

- **CORS:** Replace `origin: '*'` with `origin: process.env.ALLOWED_ORIGINS` (comma-separated list)
- **Rate limiting:** Add `express-rate-limit` to auth routes (5 requests/15 min per IP)
- **Helmet:** Add `helmet()` middleware for security headers
- **Stripe webhook:** Use `express.raw()` only for `/api/webhooks/stripe`; rest keep `express.json()`

### 3.3 Recipes API (complete what's missing)

**New routes in** `backend/routes/recipes.js`:
- `GET /api/recipes` — list user's recipes
- `POST /api/recipes` — create recipe with ingredients
- `GET /api/recipes/:id` — get recipe detail with calculated macros

### 3.4 Environment Config

**Update** `.env.example` with all required variables:
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
ALLOWED_ORIGINS=https://yourdomain.github.io,exp://...
PORT=3000
```

---

## 4. Mobile App Implementation

### 4.1 Stripe Payment Screen

**New file:** `app/src/screens/PaymentScreen.js`
- WebView that opens the Stripe Checkout URL returned from backend
- Detects redirect to success/cancel URL
- On success: calls `GET /api/auth/me` to refresh user → shows "Lifetime Access" badge
- On cancel: shows message and returns to Profile

**Trigger:** Button on ProfileScreen "Αγόρασε Lifetime Access — €40" (shown only if `!user.lifetime_access`)

### 4.2 Workout Screen

**New file:** `app/src/screens/WorkoutScreen.js`
- Form: workout type (dropdown), duration (minutes), calories burned (optional)
- Submit → `POST /api/progress/workout`
- History list below the form (last 7 workouts)
- Added to bottom tab navigation

### 4.3 Privacy Policy Screen

**New file:** `app/src/screens/PrivacyPolicyScreen.js`
- Static screen with Greek privacy policy text
- Required by Google Play
- Accessible from Profile screen footer

### 4.4 App Configuration (EAS Build)

**New file:** `app/app.json`
```json
{
  "expo": {
    "name": "FitTrack Pro",
    "slug": "fittrackpro",
    "version": "1.0.0",
    "android": {
      "package": "gr.fittrackpro.app",
      "versionCode": 1,
      "permissions": ["CAMERA", "INTERNET"]
    },
    "ios": {
      "bundleIdentifier": "gr.fittrackpro.app"
    }
  }
}
```

**New file:** `app/eas.json`
```json
{
  "build": {
    "production": {
      "android": { "buildType": "apk" }
    }
  }
}
```

---

## 5. Landing Page (GitHub Pages)

**Location:** `landing/` directory in repo root
**Hosting:** GitHub Pages (free, instant, no domain needed)
**URL format:** `https://[username].github.io/fittrackpro`

### Content Structure

```
landing/
├── index.html      # Main page (Greek, mobile-first)
├── privacy.html    # Privacy Policy (required by Google Play)
└── style.css       # Inline or embedded CSS
```

### Page Sections (index.html)

1. **Hero:** App name, tagline "Παρακολούθησε τη διατροφή σου — Μια φορά πληρωμή, για πάντα δικό σου", CTA button
2. **Features:** Barcode scanner, Greek food database, adaptive algorithm, macro tracking, progress charts
3. **Pricing:** Big card — €40 εφάπαξ, lifetime, no subscription. Stripe Payment Link button.
4. **Screenshots:** Placeholder images (can add real screenshots later)
5. **FAQ:** "Τι λαμβάνω;", "Πότε ανεβαίνει στο App Store;", "Τι γίνεται αν χάσω το κινητό μου;"
6. **Footer:** Privacy Policy link, email contact

### Design
- Colors matching app: #2E86AB (blue), #1F4E79 (navy)
- Mobile-first, single HTML file (no build tools needed)
- Stripe Payment Link embedded directly (no backend needed for payment button on landing page)

---

## 6. Forum Posts

**Platforms:**
1. Reddit r/greece + r/fitness (English)
2. bodybuilding.gr (Greek)
3. Any Greek fitness/health Facebook groups

**Post Template (Greek):**
> Φίλοι, φτιάξαμε ένα ελληνικό app για παρακολούθηση διατροφής — χωρίς συνδρομή, χωρίς bullshit.
> Έχει ελληνική βάση φαγητών, barcode scanner, adaptive αλγόριθμο που προσαρμόζει τους στόχους σου αυτόματα.
> **€40 εφάπαξ. Ποτέ ξανά χρέωση.**
> [Κατεβάστε από Google Play] | [Μάθετε περισσότερα]

**Post Template (English for r/greece):**
> Built a Greek calorie tracker with no subscription — pay once, use forever.
> Greek food database, barcode scanner, adaptive calorie algorithm.
> $40 lifetime. No recurring fees.
> [Google Play] | [Landing Page]

---

## 7. Deployment Guide (DEPLOY.md)

### Step-by-step for user:

**1. Supabase (manual — 15 min)**
- Create project → copy DATABASE_URL
- Run `backend/db/schema.sql` in SQL editor
- Run `node backend/db/seed.js`

**2. Stripe (manual — 10 min)**
- Create Product "FitTrack Pro Lifetime" → Price $40 one-time
- Copy STRIPE_PRICE_ID, STRIPE_SECRET_KEY
- Create webhook endpoint → copy STRIPE_WEBHOOK_SECRET
- Create Payment Link for landing page CTA

**3. Railway (semi-automated)**
- New project → Deploy from GitHub
- Set env variables (all from .env.example)
- Copy Railway URL → update `app/src/api/index.js` BASE_URL

**4. GitHub Pages (automated)**
- Push `landing/` to repo → enable GitHub Pages in settings
- Done — landing page live

**5. EAS Build (manual — 30 min)**
- `npm install -g eas-cli`
- `eas login`
- `cd app && eas build --platform android --profile production`
- Download .apk from EAS dashboard

**6. Google Play (manual — 2-3 days review)**
- Create app in Play Console
- Upload .apk
- Fill store listing (description, screenshots, privacy policy URL)
- Submit for review

---

## 8. Architecture Diagram

```
User Device (React Native)
    │
    ├─► Stripe Checkout WebView ──► Stripe ──► Webhook
    │                                              │
    └─► API calls ─────────────► Railway (Node.js) ◄─┘
                                      │
                                  Supabase (PostgreSQL)

Marketing Flow:
Forums → Landing Page (GitHub Pages) → Stripe Payment Link OR Google Play
```

---

## 9. File Changes Summary

### New Files
- `backend/routes/payments.js` — Stripe checkout + webhook
- `backend/routes/recipes.js` — Recipes CRUD
- `app/src/screens/PaymentScreen.js` — Stripe WebView
- `app/src/screens/WorkoutScreen.js` — Workout logging UI
- `app/src/screens/PrivacyPolicyScreen.js` — Privacy policy
- `app/app.json` — Expo config
- `app/eas.json` — EAS build config
- `landing/index.html` — Landing page
- `landing/privacy.html` — Privacy policy page
- `landing/style.css` — Styles
- `DEPLOY.md` — Step-by-step deployment guide
- `forum-posts.md` — Ready-to-post marketing copy

### Modified Files
- `backend/server.js` — Add payments route, helmet, rate limiting, fix CORS, raw body for webhook
- `backend/package.json` — Add stripe, helmet, express-rate-limit
- `backend/.env.example` — Add all Stripe variables
- `app/src/screens/ProfileScreen.js` — Add "Buy Lifetime" button + Privacy Policy link
- `app/src/navigation/index.js` — Add Workout + Privacy Policy + Payment screens
- `app/package.json` — Add react-native-webview

---

## 10. Success Criteria

- [ ] Backend deploys on Railway without errors
- [ ] Stripe checkout flow works end-to-end (test mode first)
- [ ] `lifetime_access` flips to true after successful payment
- [ ] Android APK builds via EAS without errors
- [ ] Landing page accessible via GitHub Pages URL
- [ ] Stripe Payment Link on landing page works
- [ ] Privacy Policy URL accessible (required for Google Play)
- [ ] Forum posts ready to copy-paste
- [ ] DEPLOY.md covers every manual step clearly
