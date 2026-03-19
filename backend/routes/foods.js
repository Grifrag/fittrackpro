const express = require('express');
const axios = require('axios');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

// ── Search foods (local DB + Open Food Facts) ──────────────────────────────
router.get('/search', auth, async (req, res) => {
  const { q, source = 'all', limit = 20 } = req.query;
  if (!q || q.length < 2) return res.status(400).json({ error: 'Query too short' });

  try {
    // 1. Search local DB first (Greek foods + previously cached)
    const localResult = await pool.query(
      `SELECT * FROM foods
       WHERE to_tsvector('simple', name || ' ' || COALESCE(name_el, '')) @@ plainto_tsquery('simple', $1)
          OR name ILIKE $2 OR name_el ILIKE $2
       ORDER BY verified DESC, source DESC
       LIMIT $3`,
      [q, `%${q}%`, Math.min(parseInt(limit), 50)]
    );

    const foods = localResult.rows;

    // 2. If not enough results, fetch from Open Food Facts
    if (foods.length < 5 && source !== 'local') {
      try {
        const offResponse = await axios.get(
          `https://world.openfoodfacts.org/cgi/search.pl`,
          {
            params: {
              search_terms: q,
              json: true,
              page_size: 10,
              fields: 'id,product_name,brands,nutriments,serving_size,code',
            },
            timeout: 5000,
          }
        );
        const offFoods = (offResponse.data.products || [])
          .filter(p => p.nutriments && p.nutriments['energy-kcal_100g'])
          .map(p => ({
            id: `off_${p.code}`,
            name: p.product_name || 'Unknown',
            brand: p.brands || null,
            barcode: p.code,
            serving_size: 100,
            serving_unit: 'g',
            calories: Math.round(p.nutriments['energy-kcal_100g'] || 0),
            protein: Math.round((p.nutriments.proteins_100g || 0) * 10) / 10,
            carbs: Math.round((p.nutriments.carbohydrates_100g || 0) * 10) / 10,
            fat: Math.round((p.nutriments.fat_100g || 0) * 10) / 10,
            fiber: Math.round((p.nutriments.fiber_100g || 0) * 10) / 10,
            source: 'off',
            verified: false,
          }));
        foods.push(...offFoods);
      } catch (offErr) {
        // OFF not available — continue with local results
        console.warn('Open Food Facts unavailable:', offErr.message);
      }
    }

    res.json({ foods, total: foods.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ── Barcode lookup ─────────────────────────────────────────────────────────
router.get('/barcode/:code', auth, async (req, res) => {
  const { code } = req.params;
  try {
    // Check local DB first
    const local = await pool.query('SELECT * FROM foods WHERE barcode = $1 LIMIT 1', [code]);
    if (local.rows.length > 0) return res.json(local.rows[0]);

    // Fetch from Open Food Facts
    const response = await axios.get(
      `https://world.openfoodfacts.org/api/v0/product/${code}.json`,
      { timeout: 5000 }
    );
    const p = response.data.product;
    if (!p || !p.nutriments) return res.status(404).json({ error: 'Product not found' });

    const food = {
      id: `off_${code}`,
      name: p.product_name || 'Unknown',
      brand: p.brands || null,
      barcode: code,
      serving_size: 100,
      serving_unit: 'g',
      calories: Math.round(p.nutriments['energy-kcal_100g'] || 0),
      protein: Math.round((p.nutriments.proteins_100g || 0) * 10) / 10,
      carbs: Math.round((p.nutriments.carbohydrates_100g || 0) * 10) / 10,
      fat: Math.round((p.nutriments.fat_100g || 0) * 10) / 10,
      fiber: Math.round((p.nutriments.fiber_100g || 0) * 10) / 10,
      source: 'off',
      verified: false,
    };

    // Cache it in our DB for future lookups
    await pool.query(
      `INSERT INTO foods (name, brand, barcode, calories, protein, carbs, fat, fiber, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'off')
       ON CONFLICT (barcode) DO NOTHING`,
      [food.name, food.brand, code, food.calories, food.protein, food.carbs, food.fat, food.fiber]
    ).catch(() => {}); // ignore cache errors

    res.json(food);
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: 'Product not found' });
  }
});

// ── Add custom food ────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  const { name, name_el, brand, barcode, serving_size, calories, protein, carbs, fat, fiber } = req.body;
  if (!name || calories === undefined) return res.status(400).json({ error: 'name and calories required' });
  try {
    const result = await pool.query(
      `INSERT INTO foods (name, name_el, brand, barcode, serving_size, calories, protein, carbs, fat, fiber, source, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'user',$11) RETURNING *`,
      [name, name_el, brand, barcode, serving_size || 100, calories, protein||0, carbs||0, fat||0, fiber||0, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add food' });
  }
});

// ── Greek foods (curated list) ─────────────────────────────────────────────
router.get('/greek', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM foods WHERE source = 'greek_db' ORDER BY name_el ASC`
    );
    res.json({ foods: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Greek foods' });
  }
});

module.exports = router;
