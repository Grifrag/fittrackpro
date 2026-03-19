# FitTrackPro Full Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take FitTrackPro from 75% complete to fully production-ready: Stripe payments, completed APIs, new mobile screens, landing page, and deployment configuration.

**Architecture:** Node.js/Express backend on Railway + PostgreSQL on Supabase; React Native (Expo) mobile app built via EAS; static landing page on GitHub Pages; Stripe for one-time $40 lifetime payment.

**Tech Stack:** Node.js, Express, PostgreSQL (Supabase), React Native (Expo SDK ~51), EAS Build, Stripe API v14, react-native-webview@13, GitHub Pages

---

## Chunk 1: Backend — Schema Fix, CORS, Auth Rate Limiter, Stripe Setup

### Task 1: Fix CORS and Add Auth Rate Limiter

**Files:**
- Modify: `backend/server.js`
- Modify: `backend/.env.example`

**Context:** `server.js` currently uses `origin: '*'` (insecure). `helmet`, `express-rate-limit`, and `morgan` are already installed. Only needs CORS fix + auth-specific rate limiter.

- [ ] **Step 1: Update CORS in server.js**

Replace line 18 in `backend/server.js`:
```js
app.use(cors({ origin: '*' })); // Restrict in production
```
With:
```js
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

- [ ] **Step 2: Add auth-specific rate limiter to server.js**

After the global limiter (line 23-24), add:
```js
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Πολλές προσπάθειες σύνδεσης. Δοκιμάστε ξανά σε 15 λεπτά.' }
});
```

Then on the auth route line (line 27), change to:
```js
app.use('/api/auth', authLimiter, authRoutes);
```

- [ ] **Step 3: Update .env.example**

Replace contents of `backend/.env.example` with:
```
# Database
DATABASE_URL=postgresql://username:password@host:5432/fittrackpro

# Auth
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=30d

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

# CORS (comma-separated list of allowed origins)
ALLOWED_ORIGINS=https://yourusername.github.io,exp://192.168.x.x:8081

# Server
PORT=3000
NODE_ENV=production
```

- [ ] **Step 4: Verify server.js looks correct**

Run: `cd /Users/grigoris/code/fitapp/fittrackpro/backend && node -e "require('./server.js')" 2>&1 | head -5`
Expected: Server starts or shows only DB connection error (not syntax errors)

- [ ] **Step 5: Commit**
```bash
cd /Users/grigoris/code/fitapp/fittrackpro
git add backend/server.js backend/.env.example
git commit -m "fix: restrict CORS, add auth rate limiter, update env example"
```

---

### Task 2: Fix Schema UNIQUE Constraint

**Files:**
- Modify: `backend/db/schema.sql`
- Create: `backend/db/migrations/001_add_progress_logs_unique.sql`

**Context:** `progress.js` uses `ON CONFLICT (user_id, log_date)` but the schema has no UNIQUE constraint — this crashes at runtime.

- [ ] **Step 1: Create migration file**

Create `backend/db/migrations/001_add_progress_logs_unique.sql`:
```sql
-- Migration 001: Add UNIQUE constraint on progress_logs(user_id, log_date)
-- Required for ON CONFLICT upsert in progress routes
ALTER TABLE progress_logs
  ADD CONSTRAINT IF NOT EXISTS progress_logs_user_date_unique
  UNIQUE (user_id, log_date);
```

- [ ] **Step 2: Add constraint to schema.sql**

Find the `progress_logs` table in `backend/db/schema.sql`. After its closing `);`, add:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS progress_logs_user_date_idx
  ON progress_logs(user_id, log_date);
```

- [ ] **Step 3: Commit**
```bash
git add backend/db/migrations/ backend/db/schema.sql
git commit -m "fix: add UNIQUE constraint on progress_logs(user_id, log_date)"
```

---

### Task 3: Stripe Payments Route

**Files:**
- Create: `backend/routes/payments.js`
- Modify: `backend/server.js`
- Modify: `backend/package.json`

**Context:** Need Stripe checkout session creation + webhook handler. Webhook MUST be registered with `express.raw()` BEFORE global `express.json()` in server.js.

- [ ] **Step 1: Install stripe**
```bash
cd /Users/grigoris/code/fitapp/fittrackpro/backend && npm install stripe@^14
```
Expected: `added 1 package`

- [ ] **Step 2: Create backend/routes/payments.js**

```js
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

// ── Create Stripe Checkout Session ─────────────────────────────────────────
router.post('/create-checkout', auth, async (req, res) => {
  try {
    const user = req.user;

    if (user.lifetime_access) {
      return res.status(400).json({ error: 'Έχεις ήδη Lifetime Access!' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      }],
      metadata: {
        userId: user.id,
      },
      success_url: 'fittrackpro://payment/success',
      cancel_url: 'fittrackpro://payment/cancel',
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: 'Αποτυχία δημιουργίας πληρωμής' });
  }
});

// ── Stripe Webhook Handler ──────────────────────────────────────────────────
// Note: This handler receives raw body — registered with express.raw() in server.js
async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;

    if (!userId) {
      console.error('Webhook: no userId in session metadata');
      return res.status(200).json({ received: true }); // Still return 200 to Stripe
    }

    try {
      await pool.query(
        `UPDATE users SET lifetime_access = true, subscription_tier = 'lifetime' WHERE id = $1`,
        [userId]
      );
      console.log(`✅ Lifetime access granted to user ${userId}`);
    } catch (err) {
      console.error('DB error granting lifetime access:', err);
      // Return 500 so Stripe retries
      return res.status(500).json({ error: 'Database update failed' });
    }
  }

  res.json({ received: true });
}

module.exports = { router, handleStripeWebhook };
```

- [ ] **Step 3: Register routes in server.js**

At the top of `backend/server.js`, add import after existing requires:
```js
const { router: paymentRoutes, handleStripeWebhook } = require('./routes/payments');
```

Then, BEFORE `app.use(express.json())` (i.e., before line 20), add:
```js
// Stripe webhook MUST use raw body — registered BEFORE express.json()
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);
```

And after the other `app.use('/api/...')` route registrations, add:
```js
app.use('/api/payments', paymentRoutes);
```

The final top of server.js should look like:
```js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const foodRoutes = require('./routes/foods');
const mealRoutes = require('./routes/meals');
const progressRoutes = require('./routes/progress');
const userRoutes = require('./routes/users');
const { router: paymentRoutes, handleStripeWebhook } = require('./routes/payments');

const app = express();

// ── Stripe Webhook (MUST be before express.json()) ─────────────────────────
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

// ── Security Middleware ────────────────────────────────────────────────────
app.use(helmet());
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());

// ── Rate Limiting ──────────────────────────────────────────────────────────
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Πολλές προσπάθειες σύνδεσης. Δοκιμάστε ξανά σε 15 λεπτά.' }
});

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
```

- [ ] **Step 4: Verify no syntax errors**
```bash
cd /Users/grigoris/code/fitapp/fittrackpro/backend && node -c server.js && node -c routes/payments.js
```
Expected: Both print `OK`

- [ ] **Step 5: Test checkout endpoint (no DB needed)**
```bash
cd /Users/grigoris/code/fitapp/fittrackpro/backend
# Start server in test mode without DB
node -e "
  process.env.STRIPE_SECRET_KEY='sk_test_dummy';
  process.env.JWT_SECRET='test';
  const app = require('./server');
" 2>&1 | head -3
```
Expected: Server starts (DB connection warning is OK)

- [ ] **Step 6: Commit**
```bash
git add backend/routes/payments.js backend/server.js backend/package.json backend/package-lock.json
git commit -m "feat: add Stripe payments route and webhook handler"
```

---

## Chunk 2: Backend — Recipes API + GET Workouts Endpoint

### Task 4: Add GET /api/progress/workouts

**Files:**
- Modify: `backend/routes/progress.js`

**Context:** `POST /api/progress/workout` already exists. Only the GET endpoint is missing for the WorkoutScreen history list.

- [ ] **Step 1: Add GET /workouts to progress.js**

Add after the existing `router.post('/workout', ...)` handler (after line 85):
```js
// ── Get workout history ────────────────────────────────────────────────────
router.get('/workouts', auth, async (req, res) => {
  const { limit = 20 } = req.query;
  try {
    const result = await pool.query(
      `SELECT * FROM workouts
       WHERE user_id = $1
       ORDER BY log_date DESC, created_at DESC
       LIMIT $2`,
      [req.user.id, parseInt(limit)]
    );
    res.json({ workouts: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Αποτυχία φόρτωσης προπονήσεων' });
  }
});
```

- [ ] **Step 2: Verify syntax**
```bash
node -c /Users/grigoris/code/fitapp/fittrackpro/backend/routes/progress.js
```
Expected: `OK`

- [ ] **Step 3: Commit**
```bash
git add backend/routes/progress.js
git commit -m "feat: add GET /api/progress/workouts endpoint"
```

---

### Task 5: Recipes API

**Files:**
- Create: `backend/routes/recipes.js`
- Modify: `backend/server.js`

**Context:** `recipes` and `recipe_ingredients` tables already exist in schema. Need CRUD endpoints.

- [ ] **Step 1: Create backend/routes/recipes.js**

```js
const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

// ── Get user's recipes ─────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*,
        COALESCE(json_agg(
          json_build_object(
            'food_id', ri.food_id,
            'amount_g', ri.amount_g,
            'food_name', f.name
          )
        ) FILTER (WHERE ri.id IS NOT NULL), '[]') AS ingredients
       FROM recipes r
       LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
       LEFT JOIN foods f ON f.id = ri.food_id
       WHERE r.user_id = $1
       GROUP BY r.id
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json({ recipes: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Αποτυχία φόρτωσης συνταγών' });
  }
});

// ── Get single recipe ──────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT r.*,
        COALESCE(json_agg(
          json_build_object(
            'food_id', ri.food_id,
            'amount_g', ri.amount_g,
            'food_name', f.name,
            'calories', (f.calories * ri.amount_g / 100)::numeric(8,1),
            'protein', (f.protein * ri.amount_g / 100)::numeric(8,1),
            'carbs', (f.carbs * ri.amount_g / 100)::numeric(8,1),
            'fat', (f.fat * ri.amount_g / 100)::numeric(8,1)
          )
        ) FILTER (WHERE ri.id IS NOT NULL), '[]') AS ingredients
       FROM recipes r
       LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
       LEFT JOIN foods f ON f.id = ri.food_id
       WHERE r.id = $1 AND r.user_id = $2
       GROUP BY r.id`,
      [id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Συνταγή δεν βρέθηκε' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Αποτυχία φόρτωσης συνταγής' });
  }
});

// ── Create recipe ──────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  const { name, servings = 1, ingredients = [], source_url } = req.body;

  if (!name || !ingredients.length) {
    return res.status(400).json({ error: 'Όνομα και τουλάχιστον 1 υλικό απαιτούνται' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Calculate totals from ingredients
    let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0, totalFiber = 0;

    for (const ing of ingredients) {
      const food = await client.query('SELECT * FROM foods WHERE id = $1', [ing.food_id]);
      if (!food.rows.length) throw new Error(`Τρόφιμο ${ing.food_id} δεν βρέθηκε`);
      const f = food.rows[0];
      const ratio = ing.amount_g / 100;
      totalCalories += f.calories * ratio;
      totalProtein  += f.protein * ratio;
      totalCarbs    += f.carbs * ratio;
      totalFat      += f.fat * ratio;
      totalFiber    += (f.fiber || 0) * ratio;
    }

    const recipe = await client.query(
      `INSERT INTO recipes (user_id, name, servings, calories, protein, carbs, fat, fiber, source_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.id, name, servings,
       Math.round(totalCalories), Math.round(totalProtein * 10) / 10,
       Math.round(totalCarbs * 10) / 10, Math.round(totalFat * 10) / 10,
       Math.round(totalFiber * 10) / 10, source_url || null]
    );

    for (const ing of ingredients) {
      await client.query(
        'INSERT INTO recipe_ingredients (recipe_id, food_id, amount_g) VALUES ($1,$2,$3)',
        [recipe.rows[0].id, ing.food_id, ing.amount_g]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(recipe.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message || 'Αποτυχία δημιουργίας συνταγής' });
  } finally {
    client.release();
  }
});

// ── Delete recipe ──────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM recipes WHERE id=$1 AND user_id=$2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Συνταγή δεν βρέθηκε' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Αποτυχία διαγραφής συνταγής' });
  }
});

module.exports = router;
```

- [ ] **Step 2: Register recipes route in server.js**

Add import at top of server.js:
```js
const recipeRoutes = require('./routes/recipes');
```

Add route registration after existing routes:
```js
app.use('/api/recipes', recipeRoutes);
```

- [ ] **Step 3: Verify syntax**
```bash
node -c /Users/grigoris/code/fitapp/fittrackpro/backend/routes/recipes.js
```
Expected: `OK`

- [ ] **Step 4: Commit**
```bash
git add backend/routes/recipes.js backend/server.js
git commit -m "feat: add Recipes CRUD API and GET workouts history endpoint"
```

---

## Chunk 3: Mobile App — API Layer + PaymentScreen

### Task 6: Update app/src/api/index.js

**Files:**
- Modify: `app/src/api/index.js`

**Context:** Need to add `paymentsAPI` and `progressAPI.getWorkouts`. Also update the production URL placeholder.

- [ ] **Step 1: Add missing API methods to app/src/api/index.js**

After the existing `progressAPI` object (after line 57), add:
```js
// ── Payments ─────────────────────────────────────────────────────────────
export const paymentsAPI = {
  createCheckout: () => api.post('/payments/create-checkout'),
};

// ── Recipes ──────────────────────────────────────────────────────────────
export const recipesAPI = {
  list: () => api.get('/recipes'),
  get: (id) => api.get(`/recipes/${id}`),
  create: (data) => api.post('/recipes', data),
  delete: (id) => api.delete(`/recipes/${id}`),
};
```

Also add `getWorkouts` to existing `progressAPI`:
```js
export const progressAPI = {
  log: (data) => api.post('/progress', data),
  history: (days = 90) => api.get('/progress', { params: { days } }),
  weekly: () => api.get('/progress/weekly'),
  logWorkout: (data) => api.post('/progress/workout', data),
  getWorkouts: (limit = 20) => api.get('/progress/workouts', { params: { limit } }),
  adjustments: () => api.get('/progress/adjustments'),
};
```

- [ ] **Step 2: Commit**
```bash
git add app/src/api/index.js
git commit -m "feat: add paymentsAPI, recipesAPI, progressAPI.getWorkouts to API layer"
```

---

### Task 7: PaymentScreen

**Files:**
- Create: `app/src/screens/PaymentScreen.js`

**Context:** Uses WebView to open Stripe Checkout URL. Uses `updateUser` from AuthContext (already exists). Detects success/cancel redirects via URL change.

- [ ] **Step 1: Install react-native-webview**
```bash
cd /Users/grigoris/code/fitapp/fittrackpro/app && npx expo install react-native-webview@13
```
Expected: Package installed, compatible with Expo SDK

- [ ] **Step 2: Create app/src/screens/PaymentScreen.js**

```jsx
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  Alert, TouchableOpacity
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../context/AuthContext';
import { paymentsAPI, authAPI } from '../api';

export default function PaymentScreen({ navigation }) {
  const { updateUser } = useAuth();
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [webLoading, setWebLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch checkout URL on mount
  React.useEffect(() => {
    (async () => {
      try {
        const { url } = await paymentsAPI.createCheckout();
        setCheckoutUrl(url);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleNavigationStateChange = async (navState) => {
    const { url } = navState;

    if (url?.startsWith('fittrackpro://payment/success')) {
      // Payment successful — refresh user data
      try {
        const updatedUser = await authAPI.me();
        updateUser(updatedUser);
        Alert.alert(
          '🎉 Συγχαρητήρια!',
          'Απέκτησες Lifetime Access! Απόλαυσε όλες τις λειτουργίες χωρίς χρέωση.',
          [{ text: 'Τέλεια!', onPress: () => navigation.goBack() }]
        );
      } catch (err) {
        // Even if refresh fails, tell user it worked
        Alert.alert('✅ Επιτυχία!', 'Η πληρωμή ολοκληρώθηκε! Αποσυνδέσου και ξανασυνδέσου για να ενημερωθεί το προφίλ σου.');
        navigation.goBack();
      }
      return;
    }

    if (url?.startsWith('fittrackpro://payment/cancel')) {
      Alert.alert('Ακύρωση', 'Η πληρωμή ακυρώθηκε.');
      navigation.goBack();
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#2E86AB" />
        <Text style={s.loadingText}>Φόρτωση πληρωμής...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>❌ {error}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={s.retryText}>Πίσω</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {webLoading && (
        <View style={s.webLoading}>
          <ActivityIndicator size="large" color="#2E86AB" />
        </View>
      )}
      <WebView
        source={{ uri: checkoutUrl }}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={() => setWebLoading(true)}
        onLoadEnd={() => setWebLoading(false)}
        style={s.webview}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#666', fontSize: 16 },
  errorText: { fontSize: 16, color: '#EF5350', textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#2E86AB', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  webview: { flex: 1 },
  webLoading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 10, backgroundColor: '#fff' },
});
```

- [ ] **Step 3: Commit**
```bash
git add app/src/screens/PaymentScreen.js app/package.json app/package-lock.json
git commit -m "feat: add PaymentScreen with Stripe WebView integration"
```

---

### Task 8: Update ProfileScreen — Add Buy Button + Privacy Policy Link

**Files:**
- Modify: `app/src/screens/ProfileScreen.js`

**Context:** ProfileScreen already shows lifetime_access badge. Need to add "Buy" button when user doesn't have lifetime access, and a Privacy Policy link at the bottom.

- [ ] **Step 1: Add "Buy Lifetime Access" button and Privacy Policy link**

In `app/src/screens/ProfileScreen.js`, after the logout button (after line 127), add:

```jsx
      {/* Privacy Policy */}
      <TouchableOpacity
        style={s.privacyBtn}
        onPress={() => navigation.navigate('PrivacyPolicy')}
      >
        <Text style={s.privacyText}>Πολιτική Απορρήτου</Text>
      </TouchableOpacity>
      <View style={{ height: 32 }} />
```

Also, inside the `<View style={s.header}>` section (after the badge), add the buy button when user doesn't have lifetime access. After line 76 (the lifetime badge block), add:
```jsx
        {!user?.lifetime_access && (
          <TouchableOpacity
            style={s.buyBtn}
            onPress={() => navigation.navigate('Payment')}
          >
            <Text style={s.buyBtnText}>⭐ Αγόρασε Lifetime Access — €40</Text>
          </TouchableOpacity>
        )}
```

Add to StyleSheet at end of `s`:
```js
  buyBtn:     { backgroundColor: '#FFD700', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10, marginTop: 12 },
  buyBtnText: { color: '#1A1A2E', fontWeight: '800', fontSize: 15 },
  privacyBtn: { alignItems: 'center', padding: 12 },
  privacyText:{ color: '#999', fontSize: 13, textDecorationLine: 'underline' },
```

Also add `navigation` to the component params:
Change line 10 from:
```js
export default function ProfileScreen() {
```
to:
```js
export default function ProfileScreen({ navigation }) {
```

- [ ] **Step 2: Commit**
```bash
git add app/src/screens/ProfileScreen.js
git commit -m "feat: add lifetime purchase button and privacy policy link to ProfileScreen"
```

---

## Chunk 4: Mobile App — WorkoutScreen, PrivacyPolicyScreen, Navigation, App Config

### Task 9: WorkoutScreen

**Files:**
- Create: `app/src/screens/WorkoutScreen.js`

- [ ] **Step 1: Create app/src/screens/WorkoutScreen.js**

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { progressAPI } from '../api';

const WORKOUT_TYPES = [
  { key: 'running', label: '🏃 Τρέξιμο' },
  { key: 'cycling', label: '🚴 Ποδήλατο' },
  { key: 'swimming', label: '🏊 Κολύμπι' },
  { key: 'weights', label: '🏋️ Βάρη' },
  { key: 'yoga', label: '🧘 Yoga' },
  { key: 'walking', label: '🚶 Περπάτημα' },
  { key: 'other', label: '💪 Άλλο' },
];

export default function WorkoutScreen() {
  const [selectedType, setSelectedType] = useState('running');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [workouts, setWorkouts] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      const { workouts: data } = await progressAPI.getWorkouts(10);
      setWorkouts(data);
    } catch (err) {
      console.error('Failed to load workouts:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleSave = async () => {
    if (!duration || isNaN(parseInt(duration)) || parseInt(duration) <= 0) {
      return Alert.alert('Σφάλμα', 'Συμπλήρωσε τη διάρκεια σε λεπτά');
    }
    setSaving(true);
    try {
      await progressAPI.logWorkout({
        workout_type: selectedType,
        duration_min: parseInt(duration),
        calories_burned: calories ? parseInt(calories) : 0,
        notes: notes.trim() || null,
        date: new Date().toISOString().split('T')[0],
      });
      Alert.alert('✅ Καταγράφηκε!', `${WORKOUT_TYPES.find(w => w.key === selectedType)?.label} ${duration} λεπτά`);
      setDuration('');
      setCalories('');
      setNotes('');
      loadHistory();
    } catch (err) {
      Alert.alert('Σφάλμα', err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('el-GR', { day: 'numeric', month: 'short' });
  };

  const getLabel = (key) => WORKOUT_TYPES.find(w => w.key === key)?.label || key;

  return (
    <ScrollView style={s.container} keyboardShouldPersistTaps="handled">
      <View style={s.header}>
        <Text style={s.title}>💪 Καταγραφή Προπόνησης</Text>
      </View>

      {/* Workout Type Selector */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Τύπος Προπόνησης</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.typeRow}>
          {WORKOUT_TYPES.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[s.typeChip, selectedType === key && s.typeChipActive]}
              onPress={() => setSelectedType(key)}
            >
              <Text style={[s.typeChipText, selectedType === key && s.typeChipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Form */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Λεπτομέρειες</Text>

        <View style={s.inputRow}>
          <Ionicons name="time-outline" size={20} color="#2E86AB" style={s.inputIcon} />
          <TextInput
            style={s.input}
            placeholder="Διάρκεια (λεπτά) *"
            keyboardType="number-pad"
            value={duration}
            onChangeText={setDuration}
          />
        </View>

        <View style={s.inputRow}>
          <Ionicons name="flame-outline" size={20} color="#FFA726" style={s.inputIcon} />
          <TextInput
            style={s.input}
            placeholder="Θερμίδες που κάηκαν (προαιρετικό)"
            keyboardType="number-pad"
            value={calories}
            onChangeText={setCalories}
          />
        </View>

        <View style={s.inputRow}>
          <Ionicons name="create-outline" size={20} color="#999" style={s.inputIcon} />
          <TextInput
            style={[s.input, s.inputMultiline]}
            placeholder="Σημειώσεις (προαιρετικό)"
            multiline
            numberOfLines={2}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.saveBtnText}>Καταγραφή Προπόνησης</Text>
          }
        </TouchableOpacity>
      </View>

      {/* History */}
      <View style={s.card}>
        <Text style={s.cardTitle}>📋 Ιστορικό</Text>
        {loadingHistory ? (
          <ActivityIndicator color="#2E86AB" style={{ marginVertical: 12 }} />
        ) : workouts.length === 0 ? (
          <Text style={s.emptyText}>Δεν έχεις καταγράψει προπονήσεις ακόμα</Text>
        ) : (
          workouts.map((w) => (
            <View key={w.id} style={s.historyItem}>
              <View style={s.historyLeft}>
                <Text style={s.historyType}>{getLabel(w.workout_type)}</Text>
                <Text style={s.historyDate}>{formatDate(w.log_date)}</Text>
              </View>
              <View style={s.historyRight}>
                <Text style={s.historyDuration}>{w.duration_min} λεπτά</Text>
                {w.calories_burned > 0 && (
                  <Text style={s.historyCalories}>{w.calories_burned} kcal</Text>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#F8F9FA' },
  header:             { backgroundColor: '#1F4E79', padding: 24, paddingTop: 56 },
  title:              { color: '#fff', fontSize: 22, fontWeight: '800' },
  card:               { backgroundColor: '#fff', margin: 12, marginBottom: 0, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle:          { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  typeRow:            { flexDirection: 'row', marginBottom: 4 },
  typeChip:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0F4F8', marginRight: 8 },
  typeChipActive:     { backgroundColor: '#2E86AB' },
  typeChipText:       { color: '#555', fontSize: 13, fontWeight: '600' },
  typeChipTextActive: { color: '#fff' },
  inputRow:           { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingVertical: 8, marginBottom: 4 },
  inputIcon:          { marginRight: 10 },
  input:              { flex: 1, fontSize: 15, color: '#1A1A2E' },
  inputMultiline:     { height: 60, textAlignVertical: 'top' },
  saveBtn:            { backgroundColor: '#2E86AB', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText:        { color: '#fff', fontWeight: '700', fontSize: 16 },
  historyItem:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  historyLeft:        {},
  historyRight:       { alignItems: 'flex-end' },
  historyType:        { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  historyDate:        { fontSize: 12, color: '#999', marginTop: 2 },
  historyDuration:    { fontSize: 14, fontWeight: '700', color: '#2E86AB' },
  historyCalories:    { fontSize: 12, color: '#FFA726' },
  emptyText:          { color: '#999', textAlign: 'center', paddingVertical: 16 },
});
```

- [ ] **Step 2: Commit**
```bash
git add app/src/screens/WorkoutScreen.js
git commit -m "feat: add WorkoutScreen with logging form and history"
```

---

### Task 10: PrivacyPolicyScreen

**Files:**
- Create: `app/src/screens/PrivacyPolicyScreen.js`

- [ ] **Step 1: Create app/src/screens/PrivacyPolicyScreen.js**

```jsx
import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SECTIONS = [
  {
    title: '1. Ποιοι είμαστε',
    content: 'Το FitTrack Pro είναι εφαρμογή παρακολούθησης διατροφής και άσκησης. Διαχειριζόμαστε τα δεδομένα σου με πλήρη διαφάνεια και σεβασμό στην ιδιωτικότητά σου.'
  },
  {
    title: '2. Ποια δεδομένα συλλέγουμε',
    content: 'Συλλέγουμε: email και κωδικό πρόσβασης (κρυπτογραφημένο), σωματικά στοιχεία που εισάγεις (βάρος, ύψος), καταγραφές γευμάτων και προπονήσεων, δεδομένα προόδου (βάρος, μετρήσεις).'
  },
  {
    title: '3. Πώς χρησιμοποιούμε τα δεδομένα',
    content: 'Τα δεδομένα σου χρησιμοποιούνται αποκλειστικά για τη λειτουργία της εφαρμογής: υπολογισμό θερμίδων, παρακολούθηση προόδου, προσαρμογή στόχων. ΔΕΝ πωλούμε ή μοιραζόμαστε δεδομένα με τρίτους.'
  },
  {
    title: '4. Πληρωμές',
    content: 'Οι πληρωμές επεξεργάζονται από την Stripe (stripe.com). Δεν αποθηκεύουμε στοιχεία κάρτας. Για ερωτήσεις σχετικά με χρεώσεις, επικοινώνησε μαζί μας.'
  },
  {
    title: '5. Ασφάλεια',
    content: 'Οι κωδικοί πρόσβασης αποθηκεύονται κρυπτογραφημένοι (bcrypt). Η επικοινωνία γίνεται μέσω HTTPS. Τα δεδομένα αποθηκεύονται σε ασφαλείς servers της Supabase (AWS).'
  },
  {
    title: '6. Δικαιώματά σου',
    content: 'Έχεις δικαίωμα πρόσβασης, διόρθωσης ή διαγραφής των δεδομένων σου. Για αίτημα διαγραφής λογαριασμού, επικοινώνησε μαζί μας μέσω email.'
  },
  {
    title: '7. Επικοινωνία',
    content: 'Για οποιαδήποτε ερώτηση σχετικά με την ιδιωτικότητά σου: fittrackpro.app@gmail.com'
  },
  {
    title: '8. Αλλαγές',
    content: 'Ενδέχεται να ενημερώσουμε αυτή την πολιτική. Θα σε ειδοποιήσουμε για σημαντικές αλλαγές μέσω της εφαρμογής. Τελευταία ενημέρωση: Μάρτιος 2026.'
  },
];

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.title}>Πολιτική Απορρήτου</Text>
        <Text style={s.subtitle}>FitTrack Pro</Text>
      </View>

      {SECTIONS.map((sec, i) => (
        <View key={i} style={s.section}>
          <Text style={s.sectionTitle}>{sec.title}</Text>
          <Text style={s.sectionContent}>{sec.content}</Text>
        </View>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#F8F9FA' },
  header:         { backgroundColor: '#1F4E79', padding: 24, paddingTop: 56 },
  backBtn:        { marginBottom: 12 },
  title:          { color: '#fff', fontSize: 22, fontWeight: '800' },
  subtitle:       { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 },
  section:        { backgroundColor: '#fff', margin: 12, marginBottom: 0, borderRadius: 12, padding: 16 },
  sectionTitle:   { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  sectionContent: { fontSize: 14, color: '#444', lineHeight: 22 },
});
```

- [ ] **Step 2: Commit**
```bash
git add app/src/screens/PrivacyPolicyScreen.js
git commit -m "feat: add PrivacyPolicyScreen (required for Google Play)"
```

---

### Task 11: Update Navigation

**Files:**
- Modify: `app/src/navigation/index.js`

**Context:** Need to add WorkoutScreen as 5th tab, and PaymentScreen + PrivacyPolicyScreen as stack screens.

- [ ] **Step 1: Update app/src/navigation/index.js**

Replace the entire file with:
```jsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../context/AuthContext';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Main screens
import DashboardScreen from '../screens/DashboardScreen';
import FoodSearchScreen from '../screens/FoodSearchScreen';
import BarcodeScannerScreen from '../screens/BarcodeScannerScreen';
import LogMealScreen from '../screens/LogMealScreen';
import ProgressScreen from '../screens/ProgressScreen';
import ProfileScreen from '../screens/ProfileScreen';
import WorkoutScreen from '../screens/WorkoutScreen';
import PaymentScreen from '../screens/PaymentScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const COLORS = { primary: '#2E86AB', background: '#F8F9FA', text: '#1A1A2E' };

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#eee', paddingBottom: 4 },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            Dashboard: focused ? 'home'              : 'home-outline',
            Log:       focused ? 'add-circle'        : 'add-circle-outline',
            Progress:  focused ? 'stats-chart'       : 'stats-chart-outline',
            Workout:   focused ? 'barbell'           : 'barbell-outline',
            Profile:   focused ? 'person'            : 'person-outline',
          };
          return <Ionicons name={icons[route.name] || 'ellipse'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Αρχική' }} />
      <Tab.Screen name="Log"       component={LogMealScreen}   options={{ title: 'Γεύμα' }} />
      <Tab.Screen name="Progress"  component={ProgressScreen}  options={{ title: 'Πρόοδος' }} />
      <Tab.Screen name="Workout"   component={WorkoutScreen}   options={{ title: 'Άσκηση' }} />
      <Tab.Screen name="Profile"   component={ProfileScreen}   options={{ title: 'Προφίλ' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="FoodSearch"     component={FoodSearchScreen}     options={{ headerShown: true, title: 'Αναζήτηση τροφίμου' }} />
            <Stack.Screen name="BarcodeScanner" component={BarcodeScannerScreen} options={{ headerShown: true, title: 'Σάρωση barcode' }} />
            <Stack.Screen name="Payment"        component={PaymentScreen}        options={{ headerShown: true, title: 'Αγορά Lifetime Access' }} />
            <Stack.Screen name="PrivacyPolicy"  component={PrivacyPolicyScreen}  options={{ headerShown: false }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login"    component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add app/src/navigation/index.js
git commit -m "feat: add Workout tab, Payment and PrivacyPolicy screens to navigation"
```

---

### Task 12: App Config (app.json + eas.json)

**Files:**
- Create: `app/app.json`
- Create: `app/eas.json`

- [ ] **Step 1: Create app/app.json**

```json
{
  "expo": {
    "name": "FitTrack Pro",
    "slug": "fittrackpro",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1F4E79"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "gr.fittrackpro.app",
      "buildNumber": "1"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1F4E79"
      },
      "package": "gr.fittrackpro.app",
      "versionCode": 1,
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.INTERNET"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      [
        "expo-camera",
        { "cameraPermission": "Επιτρέψτε στο FitTrack Pro να χρησιμοποιεί την κάμερα για σάρωση barcodes." }
      ]
    ],
    "scheme": "fittrackpro",
    "extra": {
      "eas": {
        "projectId": "YOUR_EAS_PROJECT_ID"
      }
    }
  }
}
```

**Note:** `scheme: "fittrackpro"` enables deep links like `fittrackpro://payment/success` for Stripe redirect.

- [ ] **Step 2: Create app/eas.json**

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "android": {
        "buildType": "apk"
      },
      "distribution": "internal"
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

- [ ] **Step 3: Commit**
```bash
git add app/app.json app/eas.json
git commit -m "feat: add app.json and eas.json for EAS Build (Android AAB for Play Store)"
```

---

## Chunk 5: Landing Page

### Task 13: Landing Page (GitHub Pages)

**Files:**
- Create: `landing/index.html`
- Create: `landing/privacy.html`
- Create: `landing/style.css`

- [ ] **Step 1: Create landing/style.css**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
:root {
  --primary: #2E86AB;
  --dark: #1F4E79;
  --accent: #FFD700;
  --light: #F8F9FA;
  --text: #1A1A2E;
}
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: var(--text); background: #fff; }
a { color: var(--primary); text-decoration: none; }

/* NAV */
nav { background: var(--dark); padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100; }
.logo { color: #fff; font-size: 20px; font-weight: 800; }
.nav-cta { background: var(--accent); color: var(--text); padding: 8px 18px; border-radius: 20px; font-weight: 700; font-size: 14px; }

/* HERO */
.hero { background: linear-gradient(135deg, var(--dark) 0%, var(--primary) 100%); color: #fff; padding: 80px 24px; text-align: center; }
.hero h1 { font-size: clamp(28px, 5vw, 52px); font-weight: 900; line-height: 1.2; margin-bottom: 16px; }
.hero p { font-size: clamp(16px, 2.5vw, 20px); opacity: 0.85; max-width: 600px; margin: 0 auto 32px; }
.hero-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.btn-primary { background: var(--accent); color: var(--text); padding: 16px 32px; border-radius: 50px; font-weight: 800; font-size: 16px; display: inline-block; transition: transform .2s; }
.btn-primary:hover { transform: scale(1.04); color: var(--text); }
.btn-secondary { background: rgba(255,255,255,.15); color: #fff; padding: 16px 32px; border-radius: 50px; font-weight: 700; font-size: 16px; display: inline-block; border: 2px solid rgba(255,255,255,.4); }

/* FEATURES */
.features { padding: 64px 24px; max-width: 1100px; margin: 0 auto; }
.features h2 { text-align: center; font-size: 32px; font-weight: 800; margin-bottom: 48px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; }
.feature-card { background: var(--light); border-radius: 16px; padding: 28px; }
.feature-icon { font-size: 36px; margin-bottom: 12px; }
.feature-card h3 { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
.feature-card p { color: #555; line-height: 1.6; font-size: 15px; }

/* PRICING */
.pricing { background: var(--light); padding: 64px 24px; text-align: center; }
.pricing h2 { font-size: 32px; font-weight: 800; margin-bottom: 8px; }
.pricing-sub { color: #666; margin-bottom: 40px; font-size: 16px; }
.price-card { background: #fff; border-radius: 24px; padding: 48px 40px; max-width: 420px; margin: 0 auto; box-shadow: 0 8px 40px rgba(0,0,0,.1); border: 3px solid var(--primary); }
.price-badge { background: var(--dark); color: #fff; font-size: 13px; font-weight: 700; padding: 6px 14px; border-radius: 20px; display: inline-block; margin-bottom: 20px; }
.price-amount { font-size: 64px; font-weight: 900; color: var(--dark); line-height: 1; }
.price-amount span { font-size: 28px; vertical-align: super; }
.price-once { color: #666; font-size: 15px; margin-top: 6px; margin-bottom: 24px; }
.price-features { list-style: none; text-align: left; margin-bottom: 32px; }
.price-features li { padding: 8px 0; font-size: 15px; border-bottom: 1px solid #F0F0F0; }
.price-features li:last-child { border: none; }
.btn-buy { background: var(--primary); color: #fff; padding: 18px 40px; border-radius: 50px; font-size: 18px; font-weight: 800; display: block; transition: background .2s; }
.btn-buy:hover { background: var(--dark); color: #fff; }
.play-badge { margin-top: 16px; display: block; color: #888; font-size: 13px; }

/* FAQ */
.faq { max-width: 700px; margin: 64px auto; padding: 0 24px; }
.faq h2 { font-size: 28px; font-weight: 800; margin-bottom: 32px; text-align: center; }
.faq-item { border-bottom: 1px solid #eee; padding: 20px 0; }
.faq-q { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
.faq-a { color: #555; font-size: 15px; line-height: 1.6; }

/* FOOTER */
footer { background: var(--dark); color: rgba(255,255,255,.6); padding: 32px 24px; text-align: center; font-size: 14px; }
footer a { color: rgba(255,255,255,.8); }
footer a:hover { color: #fff; }

@media (max-width: 480px) {
  .price-amount { font-size: 48px; }
  .hero { padding: 60px 20px; }
}
```

- [ ] **Step 2: Create landing/index.html**

```html
<!DOCTYPE html>
<html lang="el">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FitTrack Pro — Διατροφή & Άσκηση, Μία φορά πληρωμή</title>
  <meta name="description" content="Παρακολούθησε διατροφή και άσκηση με ελληνική βάση τροφίμων, barcode scanner και adaptive αλγόριθμο. Πλήρωσε μία φορά, χρησιμοποίησε για πάντα.">
  <link rel="stylesheet" href="style.css">
</head>
<body>

<nav>
  <span class="logo">💪 FitTrack Pro</span>
  <a href="#pricing" class="nav-cta">€40 — Lifetime</a>
</nav>

<!-- HERO -->
<section class="hero">
  <h1>Παρακολούθηση Διατροφής<br>χωρίς Μηνιαία Συνδρομή</h1>
  <p>Ελληνική βάση τροφίμων, barcode scanner, adaptive αλγόριθμος θερμίδων. Πλήρωσε μία φορά — χρησιμοποίησε για πάντα.</p>
  <div class="hero-btns">
    <a href="#pricing" class="btn-primary">⭐ Αγόρασε Lifetime — €40</a>
    <a href="https://play.google.com/store/apps/details?id=gr.fittrackpro.app" class="btn-secondary">📱 Google Play</a>
  </div>
</section>

<!-- FEATURES -->
<section class="features">
  <h2>Όλα όσα χρειάζεσαι</h2>
  <div class="grid">
    <div class="feature-card">
      <div class="feature-icon">🇬🇷</div>
      <h3>Ελληνική Βάση Τροφίμων</h3>
      <p>240+ ελληνικά φαγητά με ακριβή μακροθρεπτικά. Γύρος, μουσακάς, ταχίνι και πολλά ακόμα.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">📷</div>
      <h3>Barcode Scanner</h3>
      <p>Σάρωσε barcode και λήψε θρεπτικά στοιχεία αυτόματα από 5 εκατομμύρια προϊόντα.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">🧠</div>
      <h3>Adaptive Αλγόριθμος</h3>
      <p>Το app προσαρμόζει αυτόματα τους στόχους σου βάσει της εξέλιξης του βάρους σου κάθε εβδομάδα.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">📊</div>
      <h3>Πρόοδος & Γραφήματα</h3>
      <p>Παρακολούθησε βάρος, μετρήσεις σώματος και εβδομαδιαία στατιστικά με οπτικά γραφήματα.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">💪</div>
      <h3>Καταγραφή Άσκησης</h3>
      <p>Κατέγραψε προπονήσεις, διάρκεια και θερμίδες που κάηκες. Όλο το ιστορικό στο χέρι σου.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">💧</div>
      <h3>Παρακολούθηση Νερού</h3>
      <p>Κατέγραψε εύκολα την ημερήσια κατανάλωση νερού με ένα tap.</p>
    </div>
  </div>
</section>

<!-- PRICING -->
<section class="pricing" id="pricing">
  <h2>Απλή Τιμολόγηση</h2>
  <p class="pricing-sub">Χωρίς συνδρομές. Χωρίς κρυφές χρεώσεις. Χωρίς αιφνιδιασμούς.</p>
  <div class="price-card">
    <span class="price-badge">🌟 LIFETIME ACCESS</span>
    <div class="price-amount"><span>€</span>40</div>
    <p class="price-once">Εφάπαξ — Δεν υπάρχει ανανέωση</p>
    <ul class="price-features">
      <li>✅ Πλήρη πρόσβαση σε όλες τις λειτουργίες</li>
      <li>✅ Ελληνική βάση τροφίμων (240+ τρόφιμα)</li>
      <li>✅ Barcode scanner απεριόριστα</li>
      <li>✅ Adaptive αλγόριθμος θερμίδων</li>
      <li>✅ Όλες οι μελλοντικές ενημερώσεις</li>
      <li>✅ Χωρίς διαφημίσεις, ποτέ</li>
    </ul>
    <!-- Replace href with your Stripe Payment Link -->
    <a href="https://buy.stripe.com/YOUR_PAYMENT_LINK" class="btn-buy">Αγόρασε Τώρα — €40</a>
    <a href="https://play.google.com/store/apps/details?id=gr.fittrackpro.app" class="play-badge">📱 Κατεβάστε από Google Play</a>
  </div>
</section>

<!-- FAQ -->
<section class="faq">
  <h2>Συχνές Ερωτήσεις</h2>
  <div class="faq-item">
    <p class="faq-q">Τι λαμβάνω με την αγορά;</p>
    <p class="faq-a">Πλήρη πρόσβαση στο FitTrack Pro για Android (Google Play). Περιλαμβάνει όλες τις λειτουργίες και μελλοντικές ενημερώσεις χωρίς επιπλέον χρέωση.</p>
  </div>
  <div class="faq-item">
    <p class="faq-q">Πότε ανεβαίνει η εφαρμογή;</p>
    <p class="faq-a">Η εφαρμογή είναι διαθέσιμη στο Google Play. Η έκδοση iOS (App Store) έρχεται σύντομα.</p>
  </div>
  <div class="faq-item">
    <p class="faq-q">Τι γίνεται αν αλλάξω κινητό;</p>
    <p class="faq-a">Ο λογαριασμός σου αποθηκεύεται στο cloud. Αρκεί να συνδεθείς με το ίδιο email στο νέο σου κινητό.</p>
  </div>
  <div class="faq-item">
    <p class="faq-q">Υπάρχει επιστροφή χρημάτων;</p>
    <p class="faq-a">Εντός 7 ημερών από την αγορά, αν δεν είσαι ευχαριστημένος, επικοινώνησε μαζί μας και θα επιστρέψουμε τα χρήματά σου.</p>
  </div>
  <div class="faq-item">
    <p class="faq-q">Τα δεδομένα μου είναι ασφαλή;</p>
    <p class="faq-a">Ναι. Αποθηκεύονται κρυπτογραφημένα σε ασφαλείς servers. Δεν πωλούμε δεδομένα σε τρίτους.</p>
  </div>
</section>

<footer>
  <p>💪 FitTrack Pro &copy; 2026 &nbsp;|&nbsp; <a href="privacy.html">Πολιτική Απορρήτου</a> &nbsp;|&nbsp; <a href="mailto:fittrackpro.app@gmail.com">Επικοινωνία</a></p>
</footer>

</body>
</html>
```

- [ ] **Step 3: Create landing/privacy.html**

```html
<!DOCTYPE html>
<html lang="el">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Πολιτική Απορρήτου — FitTrack Pro</title>
  <link rel="stylesheet" href="style.css">
  <style>
    .privacy-container { max-width: 740px; margin: 40px auto; padding: 0 24px 60px; }
    .privacy-container h1 { font-size: 32px; font-weight: 900; margin-bottom: 8px; }
    .privacy-container .date { color: #888; margin-bottom: 40px; }
    .privacy-container h2 { font-size: 20px; font-weight: 700; margin: 32px 0 12px; }
    .privacy-container p { line-height: 1.7; color: #444; margin-bottom: 12px; }
    .back-link { display: inline-block; margin: 24px; color: var(--primary); font-weight: 600; }
  </style>
</head>
<body>
<nav>
  <a href="index.html" class="logo">💪 FitTrack Pro</a>
</nav>
<a href="index.html" class="back-link">← Επιστροφή</a>
<div class="privacy-container">
  <h1>Πολιτική Απορρήτου</h1>
  <p class="date">Τελευταία ενημέρωση: Μάρτιος 2026</p>

  <h2>1. Ποιοι είμαστε</h2>
  <p>Το FitTrack Pro είναι εφαρμογή παρακολούθησης διατροφής και άσκησης για Android. Η εφαρμογή αναπτύχθηκε ανεξάρτητα και δεν ανήκει σε μεγάλη εταιρεία. Επικοινωνία: fittrackpro.app@gmail.com</p>

  <h2>2. Δεδομένα που συλλέγουμε</h2>
  <p>Συλλέγουμε αποκλειστικά δεδομένα που εσύ εισάγεις:</p>
  <p>• Email και κωδικό πρόσβασης (κρυπτογραφημένο με bcrypt)<br>
  • Όνομα χρήστη<br>
  • Σωματικά στοιχεία (βάρος, ύψος, φύλο, ηλικία) — προαιρετικά<br>
  • Καταγραφές γευμάτων και τροφίμων<br>
  • Καταγραφές προπονήσεων<br>
  • Δεδομένα προόδου βάρους</p>

  <h2>3. Πώς χρησιμοποιούμε τα δεδομένα</h2>
  <p>Τα δεδομένα χρησιμοποιούνται αποκλειστικά για τη λειτουργία της εφαρμογής: υπολογισμό θερμίδων, παρακολούθηση προόδου, προσαρμογή στόχων. ΔΕΝ πωλούμε, μοιραζόμαστε ή χρησιμοποιούμε δεδομένα για διαφήμιση.</p>

  <h2>4. Αποθήκευση δεδομένων</h2>
  <p>Τα δεδομένα αποθηκεύονται σε servers της Supabase (AWS eu-west-1). Επικοινωνία μεταξύ app και server γίνεται αποκλειστικά μέσω HTTPS.</p>

  <h2>5. Πληρωμές</h2>
  <p>Οι πληρωμές επεξεργάζονται από την Stripe, Inc. (stripe.com). Δεν αποθηκεύουμε ποτέ στοιχεία κάρτας. Για ερωτήσεις σχετικά με χρεώσεις, επικοινώνησε μαζί μας.</p>

  <h2>6. Δικαιώματα χρηστών (GDPR)</h2>
  <p>Έχεις δικαίωμα:<br>
  • Πρόσβασης στα δεδομένα σου<br>
  • Διόρθωσης ανακριβών δεδομένων<br>
  • Διαγραφής λογαριασμού και όλων των δεδομένων<br>
  • Φορητότητας δεδομένων</p>
  <p>Για οποιοδήποτε αίτημα: fittrackpro.app@gmail.com</p>

  <h2>7. Cookies</h2>
  <p>Η εφαρμογή δεν χρησιμοποιεί cookies. Χρησιμοποιεί AsyncStorage του κινητού αποκλειστικά για την αποθήκευση JWT token σύνδεσης.</p>

  <h2>8. Επικοινωνία</h2>
  <p>Για οποιαδήποτε ερώτηση σχετικά με την ιδιωτικότητά σου: <a href="mailto:fittrackpro.app@gmail.com">fittrackpro.app@gmail.com</a></p>
</div>
<footer>
  <p>💪 FitTrack Pro &copy; 2026 &nbsp;|&nbsp; <a href="privacy.html">Πολιτική Απορρήτου</a></p>
</footer>
</body>
</html>
```

- [ ] **Step 4: Commit**
```bash
git add landing/
git commit -m "feat: add landing page and privacy policy (GitHub Pages ready)"
```

---

## Chunk 6: Deployment Docs + Forum Posts

### Task 14: DEPLOY.md

**Files:**
- Create: `DEPLOY.md`

- [ ] **Step 1: Create DEPLOY.md**

```markdown
# FitTrack Pro — Deployment Guide

Οδηγός από το μηδέν ως την παραγωγή. Χρόνος: ~2-3 ώρες.

---

## Βήμα 1: Supabase (Database) — ~15 λεπτά

1. Πήγαινε στο [supabase.com](https://supabase.com) → Sign In
2. **New Project** → Επέλεξε region: EU West
3. Αντίγραψε το **Database URL** από Settings → Database → Connection String (URI mode)
4. Στο SQL Editor, εκτέλεσε:
   ```sql
   -- Βήμα 4α: Τρέξε το schema
   -- Αντίγραψε το περιεχόμενο του backend/db/schema.sql και εκτέλεσέ το
   ```
5. Τρέξε επίσης το migration:
   ```sql
   -- Αντίγραψε το backend/db/migrations/001_add_progress_logs_unique.sql
   ```
6. Seed τα δεδομένα τοπικά:
   ```bash
   DATABASE_URL="postgres://..." node backend/db/seed.js
   ```

---

## Βήμα 2: Stripe — ~10 λεπτά

1. Πήγαινε στο [dashboard.stripe.com](https://dashboard.stripe.com)
2. **Products** → **Add Product**:
   - Name: `FitTrack Pro Lifetime`
   - Price: `€40.00` — One time
   - Αντίγραψε το **Price ID** (αρχίζει με `price_...`)
3. **API Keys** → Αντίγραψε `Secret Key` (αρχίζει με `sk_live_...`)
4. **Webhooks** → **Add endpoint**:
   - URL: `https://YOUR_RAILWAY_URL.railway.app/api/webhooks/stripe`
   - Events: `checkout.session.completed`
   - Αντίγραψε το **Signing Secret** (αρχίζει με `whsec_...`)
5. **Payment Links** → **Create link** (για το landing page CTA button)
   - Product: FitTrack Pro Lifetime
   - Αντίγραψε το URL και βάλτο στο `landing/index.html` (αντικατέστησε `YOUR_PAYMENT_LINK`)

---

## Βήμα 3: Railway (Backend) — ~20 λεπτά

1. Πήγαινε στο [railway.app](https://railway.app) → New Project
2. **Deploy from GitHub repo** → Επέλεξε το repo
3. Set **Root Directory**: `backend`
4. **Variables** → Πρόσθεσε όλα από `.env.example`:
   ```
   DATABASE_URL=postgresql://...   ← από Supabase
   JWT_SECRET=<τυχαία string 32+ χαρακτήρες>
   JWT_EXPIRES_IN=30d
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_ID=price_...
   ALLOWED_ORIGINS=https://YOUR_GITHUB_USERNAME.github.io,exp://...
   NODE_ENV=production
   PORT=3000
   ```
5. Αντίγραψε το Railway URL (π.χ. `https://fittrackpro-api.up.railway.app`)
6. Ενημέρωσε `app/src/api/index.js` — άλλαξε:
   ```js
   : 'https://YOUR_RAILWAY_URL.up.railway.app/api';
   ```
7. Πήγαινε πίσω στο Stripe Webhooks και βάλε το Railway URL

---

## Βήμα 4: GitHub Pages (Landing Page) — ~5 λεπτά

1. Push το repo στο GitHub
2. **Settings** → **Pages** → Source: `Deploy from branch` → Branch: `main`, Folder: `/landing`
3. Αναμονή ~2 λεπτά → Landing page στο `https://USERNAME.github.io/fittrackpro`
4. Ενημέρωσε `ALLOWED_ORIGINS` στο Railway με το GitHub Pages URL

---

## Βήμα 5: EAS Build (Android) — ~30-60 λεπτά

```bash
# 1. Εγκατάστασε EAS CLI
npm install -g eas-cli

# 2. Σύνδεσε Expo account (φτιάξε αν δεν έχεις: expo.dev)
eas login

# 3. Ρύθμισε project (μόνο πρώτη φορά)
cd app
eas build:configure

# 4. Ενημέρωσε app.json με το projectId που έδωσε το eas build:configure

# 5. Build για production (AAB για Play Store)
eas build --platform android --profile production

# 6. Κατέβασε το .aab από EAS dashboard (eas.expo.dev)
```

---

## Βήμα 6: Google Play Console — ~2-3 ημέρες review

1. Πήγαινε στο [play.google.com/console](https://play.google.com/console)
2. **Create app** → App name: `FitTrack Pro` → Greek → App → Free
3. **App content** → Συμπλήρωσε:
   - Privacy policy URL: `https://USERNAME.github.io/fittrackpro/privacy.html`
   - Target audience: 18+
   - Ads: No ads
4. **Store listing**:
   - Short description: Παρακολούθησε διατροφή & άσκηση. Πλήρωσε μία φορά.
   - Full description: [αντίγραψε από forum-posts.md]
   - Screenshots: Τράβηξε screenshots από Expo Go ή emulator
5. **Production** → **Create new release** → Upload .aab
6. **Submit for review**

---

## Checklist Πριν το Launch

- [ ] Backend απαντά στο `https://YOUR_URL/health`
- [ ] Stripe test payment δουλεύει (χρησιμοποίησε `sk_test_...` πρώτα)
- [ ] Landing page φορτώνει και το Stripe Payment Link λειτουργεί
- [ ] Privacy policy URL προσβάσιμο (required για Google Play)
- [ ] .env.example δεν έχει πραγματικά keys (είναι gitignore'd)
```

- [ ] **Step 2: Commit**
```bash
git add DEPLOY.md
git commit -m "docs: add complete deployment guide"
```

---

### Task 15: Forum Posts

**Files:**
- Create: `forum-posts.md`

- [ ] **Step 1: Create forum-posts.md**

```markdown
# FitTrack Pro — Forum Post Templates

Έτοιμα κείμενα για posting σε forums. Αντιγράψτε, προσαρμόστε τα links, και postάρετε!

---

## 🇬🇷 Ελληνικά Forums (bodybuilding.gr, fitness.gr, Facebook groups)

### Τίτλος:
Φτιάξαμε ελληνικό app καταγραφής διατροφής — χωρίς συνδρομή, για πάντα δικό σου

### Κείμενο:
Γεια σας,

Φτιάξαμε ένα ελληνικό app για παρακολούθηση διατροφής και άσκησης — και θέλαμε να σας το παρουσιάσουμε πριν το μαζικό launch.

**Τι κάνει:**
🇬🇷 240+ ελληνικά τρόφιμα (γύρος, μουσακάς, φέτα, ταχίνι κλπ)
📷 Barcode scanner — σαρώνεις, καταγράφεις
🧠 Adaptive αλγόριθμος — προσαρμόζει τους στόχους σου αυτόματα κάθε εβδομάδα βάσει του βάρους σου
📊 Γραφήματα προόδου, καταγραφή άσκησης, tracker νερού

**Τι ΔΕΝ κάνει:**
❌ Δεν έχει μηνιαία συνδρομή
❌ Δεν έχει διαφημίσεις
❌ Δεν πουλάμε τα δεδομένα σας

**Τιμή:** €40 εφάπαξ. Ποτέ ξανά χρέωση. Όλες οι μελλοντικές ενημερώσεις included.

📱 Google Play: [LINK]
🌐 Περισσότερα: [LANDING PAGE LINK]

Ερωτήσεις; Ρωτήστε παρακάτω!

---

## 🌍 Reddit r/greece (English)

### Title:
Built a Greek calorie tracker with no subscription — pay once, use forever ($40 lifetime)

### Body:
Hey r/greece,

I built a calorie tracking app specifically for Greece — with a proper Greek food database (240+ foods like gyros, moussaka, feta, tahini), barcode scanner, and an adaptive algorithm that auto-adjusts your calorie goals based on your weekly weight trend.

**What makes it different:**
- Greek food database built-in (finally, an app that knows what "γύρος" is)
- Adaptive calorie algorithm — not just static goals
- One-time payment, no subscription, no ads
- Works offline for food logging

**Price:** $40 one-time. No recurring fees. All future updates included.

Currently on Android (Google Play). iOS coming soon.

🔗 Landing page: [LINK]
📱 Google Play: [LINK]

Happy to answer questions!

---

## 🏋️ Reddit r/fitness (English)

### Title:
I built a calorie tracker with an adaptive algorithm that auto-adjusts your goals based on actual weight change — one-time payment

### Body:
Most calorie trackers give you a static goal and never update it. I built one that actually adapts.

**How the adaptive algorithm works:**
- Every week, it compares your actual weight change to your goal (lose/maintain/gain)
- If you're not trending right, it adjusts calories ±50-100 kcal
- No manual recalculation needed

**Other features:**
- Barcode scanner (5M+ products via Open Food Facts)
- Progress tracking with charts
- Water logging
- Workout logging

**Business model:** $40 one-time lifetime payment. No subscription. No ads.

Android now, iOS soon.

[Landing page] | [Google Play]

---

## 💡 Tips για Posting

1. **Μην ποστάρεις όλα ταυτόχρονα** — spread out ανά 2-3 μέρες
2. **Απάντα σε κάθε σχόλιο** τις πρώτες 24 ώρες — το engagement βοηθάει στο ranking
3. **Μη βάζεις affiliate links** — plain links μόνο
4. **Φωτογραφίες/Screenshots** αυξάνουν το engagement κατά πολύ — προσθεσε screenshots από το app
5. **Τα πρώτα upvotes μετράνε** — ζήτα από φίλους να upvotάρουν τα πρώτα 30 λεπτά
```

- [ ] **Step 2: Commit everything and final check**
```bash
git add forum-posts.md
git commit -m "docs: add forum post templates for Greek and international forums"

# Final status check
git log --oneline
git status
```

Expected output: All files committed, working tree clean.

---

## Summary: What Was Built

| Component | Files | Status |
|-----------|-------|--------|
| Backend: CORS fix + auth rate limiter | `server.js`, `.env.example` | Task 1 |
| Backend: Schema UNIQUE constraint | `schema.sql`, `migrations/001_*.sql` | Task 2 |
| Backend: Stripe payments + webhook | `routes/payments.js`, `server.js` | Task 3 |
| Backend: GET /progress/workouts | `routes/progress.js` | Task 4 |
| Backend: Recipes CRUD API | `routes/recipes.js`, `server.js` | Task 5 |
| App: API layer updates | `api/index.js` | Task 6 |
| App: PaymentScreen | `screens/PaymentScreen.js` | Task 7 |
| App: ProfileScreen updates | `screens/ProfileScreen.js` | Task 8 |
| App: WorkoutScreen | `screens/WorkoutScreen.js` | Task 9 |
| App: PrivacyPolicyScreen | `screens/PrivacyPolicyScreen.js` | Task 10 |
| App: Navigation | `navigation/index.js` | Task 11 |
| App: Build config | `app.json`, `eas.json` | Task 12 |
| Landing: Full page | `landing/index.html`, `privacy.html`, `style.css` | Task 13 |
| Docs: Deployment guide | `DEPLOY.md` | Task 14 |
| Docs: Forum posts | `forum-posts.md` | Task 15 |

**After completing this plan:**
- Run `npm install` in `/backend` (installs stripe)
- Run `npx expo install react-native-webview@13` in `/app`
- Follow `DEPLOY.md` for Supabase + Railway + GitHub Pages + EAS Build
- Post to forums using `forum-posts.md` templates
