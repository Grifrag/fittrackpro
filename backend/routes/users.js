const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

// ── Update user goals / profile ────────────────────────────────────────────
router.put('/profile', auth, async (req, res) => {
  const { name, calorie_goal, protein_goal, carbs_goal, fat_goal, height_cm, weight_kg, gender, birth_year, activity_level, goal_type } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET
         name = COALESCE($1, name),
         calorie_goal = COALESCE($2, calorie_goal),
         protein_goal = COALESCE($3, protein_goal),
         carbs_goal   = COALESCE($4, carbs_goal),
         fat_goal     = COALESCE($5, fat_goal),
         height_cm    = COALESCE($6, height_cm),
         weight_kg    = COALESCE($7, weight_kg),
         gender       = COALESCE($8, gender),
         birth_year   = COALESCE($9, birth_year),
         activity_level = COALESCE($10, activity_level),
         goal_type    = COALESCE($11, goal_type)
       WHERE id = $12
       RETURNING id, email, name, calorie_goal, protein_goal, carbs_goal, fat_goal, height_cm, weight_kg, gender, birth_year, activity_level, goal_type`,
      [name, calorie_goal, protein_goal, carbs_goal, fat_goal, height_cm, weight_kg, gender, birth_year, activity_level, goal_type, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ── Calculate TDEE and suggest goals ──────────────────────────────────────
router.get('/calculate-goals', auth, async (req, res) => {
  try {
    const user = (await pool.query(
      'SELECT weight_kg, height_cm, birth_year, gender, activity_level, goal_type FROM users WHERE id=$1',
      [req.user.id]
    )).rows[0];

    if (!user.weight_kg || !user.height_cm || !user.birth_year) {
      return res.status(400).json({ error: 'Complete your profile first (weight, height, birth year)' });
    }

    const age = new Date().getFullYear() - user.birth_year;
    // Mifflin-St Jeor BMR
    let bmr;
    if (user.gender === 'male') {
      bmr = 10 * user.weight_kg + 6.25 * user.height_cm - 5 * age + 5;
    } else {
      bmr = 10 * user.weight_kg + 6.25 * user.height_cm - 5 * age - 161;
    }

    const activityMultipliers = {
      sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9
    };
    const tdee = Math.round(bmr * (activityMultipliers[user.activity_level] || 1.55));

    const goalAdjustments = { lose: -500, maintain: 0, gain: 300 };
    const calorieGoal = tdee + (goalAdjustments[user.goal_type] || 0);

    // Standard macro split (40/30/30 carbs/protein/fat)
    const protein_goal = Math.round(user.weight_kg * 2.0); // 2g/kg
    const fat_goal = Math.round((calorieGoal * 0.25) / 9);
    const carbs_goal = Math.round((calorieGoal - protein_goal * 4 - fat_goal * 9) / 4);

    res.json({ tdee, calorie_goal: calorieGoal, protein_goal, carbs_goal, fat_goal, bmr: Math.round(bmr) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate goals' });
  }
});

module.exports = router;
