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
      return res.status(200).json({ received: true });
    }

    try {
      await pool.query(
        `UPDATE users SET lifetime_access = true, subscription_tier = 'lifetime' WHERE id = $1`,
        [userId]
      );
      console.log(`✅ Lifetime access granted to user ${userId}`);
    } catch (err) {
      console.error('DB error granting lifetime access:', err);
      return res.status(500).json({ error: 'Database update failed' });
    }
  }

  res.json({ received: true });
}

module.exports = { router, handleStripeWebhook };
