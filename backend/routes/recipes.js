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

router.post('/', auth, async (req, res) => {
  const { name, servings = 1, ingredients = [], source_url } = req.body;

  if (!name || !ingredients.length) {
    return res.status(400).json({ error: 'Όνομα και τουλάχιστον 1 υλικό απαιτούνται' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

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
