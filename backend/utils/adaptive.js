/**
 * Adaptive Calorie Algorithm
 * Analyzes the last 2 weeks of weight data and adjusts calorie goal
 * to match the user's target (lose/maintain/gain).
 */
const pool = require('../db/pool');

async function runAdaptiveAlgorithm(userId) {
  try {
    const user = (await pool.query(
      'SELECT calorie_goal, goal_type FROM users WHERE id=$1', [userId]
    )).rows[0];
    if (!user) return null;

    // Get last 14 days of weight logs
    const logs = (await pool.query(
      `SELECT weight_kg, log_date FROM progress_logs
       WHERE user_id=$1 AND log_date >= NOW() - INTERVAL '14 days'
       ORDER BY log_date ASC`,
      [userId]
    )).rows;

    if (logs.length < 4) return null; // Not enough data

    // Calculate average weight for week 1 and week 2
    const mid = Math.floor(logs.length / 2);
    const week1 = logs.slice(0, mid);
    const week2 = logs.slice(mid);

    const avg1 = week1.reduce((s, l) => s + parseFloat(l.weight_kg), 0) / week1.length;
    const avg2 = week2.reduce((s, l) => s + parseFloat(l.weight_kg), 0) / week2.length;
    const weeklyChange = avg2 - avg1; // kg/week (negative = losing)

    // Target rate based on goal
    const targets = { lose: -0.5, maintain: 0, gain: 0.25 }; // kg/week
    const target = targets[user.goal_type] || 0;

    const diff = weeklyChange - target;
    let adjustment = 0;
    let reason = '';

    if (Math.abs(diff) < 0.1) {
      // On track — no adjustment needed
      return { status: 'on_track', weeklyChange: Math.round(weeklyChange * 100) / 100 };
    }

    if (diff > 0.15) {
      // Gaining too fast or not losing fast enough
      adjustment = -100;
      reason = `Βάρος αυξάνεται ${weeklyChange.toFixed(2)}kg/εβδ. — μείωση κατά 100kcal`;
    } else if (diff > 0.05) {
      adjustment = -50;
      reason = `Ελαφρά πάνω από στόχο — μείωση κατά 50kcal`;
    } else if (diff < -0.15) {
      // Losing too fast
      adjustment = 100;
      reason = `Χάνεις πολύ γρήγορα (${weeklyChange.toFixed(2)}kg/εβδ.) — αύξηση κατά 100kcal`;
    } else if (diff < -0.05) {
      adjustment = 50;
      reason = `Ελαφρά κάτω από στόχο — αύξηση κατά 50kcal`;
    }

    if (adjustment !== 0) {
      const newGoal = Math.max(1200, Math.min(5000, user.calorie_goal + adjustment));

      // Update user goal
      await pool.query('UPDATE users SET calorie_goal=$1 WHERE id=$2', [newGoal, userId]);

      // Log the adjustment
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      await pool.query(
        `INSERT INTO calorie_adjustments (user_id, week_start, avg_weight_kg, weight_change, old_goal, new_goal, adjustment, reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [userId, weekStart.toISOString().split('T')[0], Math.round(avg2 * 100) / 100,
         Math.round(weeklyChange * 100) / 100, user.calorie_goal, newGoal, adjustment, reason]
      );

      return { status: 'adjusted', adjustment, newGoal, reason, weeklyChange: Math.round(weeklyChange * 100) / 100 };
    }

    return { status: 'on_track', weeklyChange: Math.round(weeklyChange * 100) / 100 };
  } catch (err) {
    console.error('Adaptive algorithm error:', err);
    return null;
  }
}

module.exports = { runAdaptiveAlgorithm };
