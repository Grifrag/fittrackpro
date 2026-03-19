const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const { runAdaptiveAlgorithm } = require('../utils/adaptive');

const router = express.Router();

// ── Log weight / measurements ──────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  const { weight_kg, body_fat_pct, waist_cm, chest_cm, hips_cm, notes, date } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO progress_logs (user_id, log_date, weight_kg, body_fat_pct, waist_cm, chest_cm, hips_cm, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (user_id, log_date) DO UPDATE SET
         weight_kg=EXCLUDED.weight_kg, body_fat_pct=EXCLUDED.body_fat_pct,
         waist_cm=EXCLUDED.waist_cm, chest_cm=EXCLUDED.chest_cm,
         hips_cm=EXCLUDED.hips_cm, notes=EXCLUDED.notes
       RETURNING *`,
      [req.user.id, date || new Date().toISOString().split('T')[0],
       weight_kg, body_fat_pct, waist_cm, chest_cm, hips_cm, notes]
    );

    // Run adaptive algorithm after every weight log
    const adjustment = await runAdaptiveAlgorithm(req.user.id);
    res.status(201).json({ log: result.rows[0], adjustment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to log progress' });
  }
});

// ── Get progress history ───────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  const { days = 90 } = req.query;
  try {
    const result = await pool.query(
      `SELECT * FROM progress_logs
       WHERE user_id = $1 AND log_date >= NOW() - INTERVAL '${parseInt(days)} days'
       ORDER BY log_date ASC`,
      [req.user.id]
    );
    res.json({ logs: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// ── Get weekly summary ─────────────────────────────────────────────────────
router.get('/weekly', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         DATE_TRUNC('week', log_date) AS week,
         AVG(weight_kg)::numeric(5,2) AS avg_weight,
         MIN(weight_kg) AS min_weight,
         MAX(weight_kg) AS max_weight,
         COUNT(*) AS days_logged
       FROM progress_logs
       WHERE user_id = $1 AND log_date >= NOW() - INTERVAL '12 weeks'
       GROUP BY week
       ORDER BY week ASC`,
      [req.user.id]
    );
    res.json({ weeks: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch weekly summary' });
  }
});

// ── Log workout ────────────────────────────────────────────────────────────
router.post('/workout', auth, async (req, res) => {
  const { workout_type, duration_min, calories_burned, notes, date } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO workouts (user_id, log_date, workout_type, duration_min, calories_burned, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.id, date || new Date().toISOString().split('T')[0],
       workout_type, duration_min, calories_burned || 0, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to log workout' });
  }
});

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

// ── Get calorie adjustment history ─────────────────────────────────────────
router.get('/adjustments', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM calorie_adjustments WHERE user_id=$1 ORDER BY week_start DESC LIMIT 10',
      [req.user.id]
    );
    res.json({ adjustments: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch adjustments' });
  }
});

module.exports = router;
