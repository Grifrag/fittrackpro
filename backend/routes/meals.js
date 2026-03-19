const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

// ── Get meals for a day ────────────────────────────────────────────────────
router.get('/:date', auth, async (req, res) => {
  const { date } = req.params; // YYYY-MM-DD
  try {
    const mealsResult = await pool.query(
      `SELECT m.id, m.meal_type, m.log_date,
              json_agg(json_build_object(
                'id', mi.id,
                'food_id', mi.food_id,
                'food_name', f.name,
                'food_name_el', f.name_el,
                'brand', f.brand,
                'amount', mi.amount,
                'unit', mi.unit,
                'calories', mi.calories,
                'protein', mi.protein,
                'carbs', mi.carbs,
                'fat', mi.fat,
                'fiber', mi.fiber
              ) ORDER BY mi.id) AS items
       FROM meals m
       LEFT JOIN meal_items mi ON mi.meal_id = m.id
       LEFT JOIN foods f ON f.id = mi.food_id
       WHERE m.user_id = $1 AND m.log_date = $2
       GROUP BY m.id
       ORDER BY m.meal_type`,
      [req.user.id, date]
    );

    // Calculate daily totals
    const meals = mealsResult.rows;
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    meals.forEach(meal => {
      (meal.items || []).forEach(item => {
        if (item.calories) {
          totals.calories += parseFloat(item.calories);
          totals.protein  += parseFloat(item.protein || 0);
          totals.carbs    += parseFloat(item.carbs || 0);
          totals.fat      += parseFloat(item.fat || 0);
          totals.fiber    += parseFloat(item.fiber || 0);
        }
      });
    });
    Object.keys(totals).forEach(k => { totals[k] = Math.round(totals[k] * 10) / 10; });

    // Get water for the day
    const waterResult = await pool.query(
      'SELECT COALESCE(SUM(amount_ml), 0) AS total_ml FROM water_logs WHERE user_id = $1 AND log_date = $2',
      [req.user.id, date]
    );

    res.json({ meals, totals, water_ml: parseInt(waterResult.rows[0].total_ml) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch meals' });
  }
});

// ── Log a meal item ────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  const { date, meal_type, food_id, amount, unit = 'g' } = req.body;
  if (!food_id || !amount) return res.status(400).json({ error: 'food_id and amount required' });

  try {
    // Get or create meal for this date+type
    let meal = await pool.query(
      'SELECT id FROM meals WHERE user_id=$1 AND log_date=$2 AND meal_type=$3',
      [req.user.id, date || new Date().toISOString().split('T')[0], meal_type || 'other']
    );
    let mealId;
    if (meal.rows.length === 0) {
      const newMeal = await pool.query(
        'INSERT INTO meals (user_id, log_date, meal_type) VALUES ($1,$2,$3) RETURNING id',
        [req.user.id, date || new Date().toISOString().split('T')[0], meal_type || 'other']
      );
      mealId = newMeal.rows[0].id;
    } else {
      mealId = meal.rows[0].id;
    }

    // Get food macros
    let food;
    if (food_id.startsWith('off_')) {
      // It's from Open Food Facts — use req.body macros
      const { calories, protein, carbs, fat, fiber } = req.body;
      food = { calories, protein, carbs, fat, fiber, serving_size: 100 };
    } else {
      const foodResult = await pool.query('SELECT * FROM foods WHERE id=$1', [food_id]);
      if (foodResult.rows.length === 0) return res.status(404).json({ error: 'Food not found' });
      food = foodResult.rows[0];
    }

    // Calculate macros for given amount
    const ratio = parseFloat(amount) / parseFloat(food.serving_size || 100);
    const itemMacros = {
      calories: Math.round(food.calories * ratio * 10) / 10,
      protein:  Math.round((food.protein || 0) * ratio * 10) / 10,
      carbs:    Math.round((food.carbs || 0) * ratio * 10) / 10,
      fat:      Math.round((food.fat || 0) * ratio * 10) / 10,
      fiber:    Math.round((food.fiber || 0) * ratio * 10) / 10,
    };

    const item = await pool.query(
      `INSERT INTO meal_items (meal_id, food_id, amount, unit, calories, protein, carbs, fat, fiber)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [mealId, food_id.startsWith('off_') ? null : food_id, amount, unit,
       itemMacros.calories, itemMacros.protein, itemMacros.carbs, itemMacros.fat, itemMacros.fiber]
    );

    res.status(201).json({ item: item.rows[0], macros: itemMacros });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to log meal' });
  }
});

// ── Delete meal item ───────────────────────────────────────────────────────
router.delete('/items/:itemId', auth, async (req, res) => {
  try {
    // Verify ownership
    const check = await pool.query(
      'SELECT mi.id FROM meal_items mi JOIN meals m ON m.id=mi.meal_id WHERE mi.id=$1 AND m.user_id=$2',
      [req.params.itemId, req.user.id]
    );
    if (check.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    await pool.query('DELETE FROM meal_items WHERE id=$1', [req.params.itemId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// ── Log water ──────────────────────────────────────────────────────────────
router.post('/water', auth, async (req, res) => {
  const { amount_ml, date } = req.body;
  if (!amount_ml) return res.status(400).json({ error: 'amount_ml required' });
  try {
    const result = await pool.query(
      'INSERT INTO water_logs (user_id, log_date, amount_ml) VALUES ($1,$2,$3) RETURNING *',
      [req.user.id, date || new Date().toISOString().split('T')[0], amount_ml]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to log water' });
  }
});

module.exports = router;
