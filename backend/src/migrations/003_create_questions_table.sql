-- 003_create_questions_table.sql
-- Question bank moved from MongoDB into PostgreSQL.
-- `options` and `metadata` are stored as JSONB — the only semi-structured
-- fields on a question — so the whole platform runs on a single database.

CREATE TABLE questions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technology       VARCHAR(50)  NOT NULL,
    concept          VARCHAR(255) NOT NULL,
    difficulty       VARCHAR(20)  NOT NULL
                     CHECK (difficulty IN ('basic', 'intermediate', 'advanced')),
    -- Continuous 0..1 difficulty used by the adaptive selector to pick the
    -- question within a tier that best matches the learner's running ability.
    difficulty_score NUMERIC(4,3) NOT NULL
                     CHECK (difficulty_score >= 0 AND difficulty_score <= 1),
    text             TEXT NOT NULL,
    -- Exactly four answer options, stored as a JSON array of strings.
    options          JSONB NOT NULL,
    correct_index    SMALLINT NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
    source           VARCHAR(20) NOT NULL DEFAULT 'manual'
                     CHECK (source IN ('manual', 'ai_generated')),
    status           VARCHAR(20) NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'pending_review', 'retired')),
    -- Free-form generation metadata (prompt_version, model, ...).
    metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- sha256 of `text`, used to make seeding idempotent and block duplicates.
    text_hash        CHAR(64) UNIQUE NOT NULL,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW(),

    -- Enforce the 4-option rule at the database level, not just in app code.
    CONSTRAINT questions_four_options CHECK (jsonb_array_length(options) = 4)
);

-- Filter index for "give me active questions for this tech/concept/difficulty".
CREATE INDEX idx_questions_filter
    ON questions (technology, difficulty, concept, status);

-- Supports adaptive selection by ability within a technology.
CREATE INDEX idx_questions_difficulty_score
    ON questions (technology, difficulty_score);
