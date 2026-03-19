-- FitTrack Pro — Database Schema
-- Run this in your Supabase SQL editor or psql

-- ── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW(),
  -- Goals
  calorie_goal  INTEGER DEFAULT 2000,
  protein_goal  INTEGER DEFAULT 150,   -- grams
  carbs_goal    INTEGER DEFAULT 200,   -- grams
  fat_goal      INTEGER DEFAULT 65,    -- grams
  -- Profile
  height_cm     DECIMAL(5,1),
  weight_kg     DECIMAL(5,1),
  birth_year    INTEGER,
  gender        VARCHAR(10),
  activity_level VARCHAR(20) DEFAULT 'moderate',
  goal_type     VARCHAR(20) DEFAULT 'maintain',  -- lose / gain / maintain
  -- Subscription
  lifetime_access BOOLEAN DEFAULT FALSE,
  subscription_tier VARCHAR(20) DEFAULT 'free'
);

-- ── Foods ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS foods (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  name_el       VARCHAR(255),           -- Greek name
  brand         VARCHAR(255),
  barcode       VARCHAR(100),
  serving_size  DECIMAL(8,2) DEFAULT 100,
  serving_unit  VARCHAR(20) DEFAULT 'g',
  -- Macros per serving
  calories      DECIMAL(8,2) NOT NULL DEFAULT 0,
  protein       DECIMAL(8,2) DEFAULT 0,
  carbs         DECIMAL(8,2) DEFAULT 0,
  fat           DECIMAL(8,2) DEFAULT 0,
  fiber         DECIMAL(8,2) DEFAULT 0,
  sugar         DECIMAL(8,2) DEFAULT 0,
  sodium        DECIMAL(8,2) DEFAULT 0,
  -- Micros
  vitamin_c     DECIMAL(8,2) DEFAULT 0,
  calcium       DECIMAL(8,2) DEFAULT 0,
  iron          DECIMAL(8,2) DEFAULT 0,
  -- Meta
  source        VARCHAR(50) DEFAULT 'user',  -- off / usda / greek_db / user
  verified      BOOLEAN DEFAULT FALSE,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_foods_name ON foods USING gin(to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS idx_foods_barcode ON foods(barcode);

-- ── Custom Recipes ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  servings      INTEGER DEFAULT 1,
  -- Calculated macros per serving (auto-computed)
  calories      DECIMAL(8,2) DEFAULT 0,
  protein       DECIMAL(8,2) DEFAULT 0,
  carbs         DECIMAL(8,2) DEFAULT 0,
  fat           DECIMAL(8,2) DEFAULT 0,
  fiber         DECIMAL(8,2) DEFAULT 0,
  source_url    TEXT,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id  UUID REFERENCES recipes(id) ON DELETE CASCADE,
  food_id    UUID REFERENCES foods(id),
  amount     DECIMAL(8,2) NOT NULL,
  unit       VARCHAR(20) DEFAULT 'g'
);

-- ── Meals ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  log_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type   VARCHAR(20) DEFAULT 'other',  -- breakfast/lunch/dinner/snack
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meal_items (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id   UUID REFERENCES meals(id) ON DELETE CASCADE,
  food_id   UUID REFERENCES foods(id),
  recipe_id UUID REFERENCES recipes(id),
  amount    DECIMAL(8,2) NOT NULL,  -- in grams or original serving units
  unit      VARCHAR(20) DEFAULT 'g',
  -- Snapshot of macros at time of logging
  calories  DECIMAL(8,2) NOT NULL,
  protein   DECIMAL(8,2) DEFAULT 0,
  carbs     DECIMAL(8,2) DEFAULT 0,
  fat       DECIMAL(8,2) DEFAULT 0,
  fiber     DECIMAL(8,2) DEFAULT 0
);

-- ── Workouts ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  log_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  workout_type    VARCHAR(100),  -- weights, cardio, HIIT, etc.
  duration_min    INTEGER,
  calories_burned INTEGER DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ── Progress (Weight / Measurements) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS progress_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  log_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg     DECIMAL(5,2),
  body_fat_pct  DECIMAL(4,1),
  waist_cm      DECIMAL(5,1),
  chest_cm      DECIMAL(5,1),
  hips_cm       DECIMAL(5,1),
  notes         TEXT,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS progress_logs_user_date_idx
  ON progress_logs(user_id, log_date);

-- ── Water Intake ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS water_logs (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  log_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_ml INTEGER NOT NULL,
  logged_at TIMESTAMP DEFAULT NOW()
);

-- ── Adaptive Algorithm History ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calorie_adjustments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  week_start      DATE NOT NULL,
  avg_weight_kg   DECIMAL(5,2),
  weight_change   DECIMAL(4,2),
  old_goal        INTEGER,
  new_goal        INTEGER,
  adjustment      INTEGER,
  reason          TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);
