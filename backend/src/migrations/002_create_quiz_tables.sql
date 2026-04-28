-- 1. Technologies table
CREATE TABLE technologies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Quiz sessions table
CREATE TABLE quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    technology_id INT NOT NULL REFERENCES technologies(id) ON DELETE CASCADE,
    difficulty VARCHAR(20) CHECK (difficulty IN ('basic', 'intermediate', 'advanced')),
    total_questions INT NOT NULL DEFAULT 0,
    correct_count INT NOT NULL DEFAULT 0,
    score_percent NUMERIC(5,2),
    ability_score NUMERIC(5,4),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_quiz_sessions_user_id ON quiz_sessions(user_id);
CREATE INDEX idx_quiz_sessions_technology_id ON quiz_sessions(technology_id);

-- 3. Session answers table
CREATE TABLE session_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    question_id VARCHAR(255) NOT NULL,
    answered_at TIMESTAMPTZ DEFAULT NOW(),
    is_correct BOOLEAN NOT NULL
);

-- Indexes
CREATE INDEX idx_session_answers_session_id ON session_answers(session_id);
CREATE INDEX idx_session_answers_question_id ON session_answers(question_id);

-- 4. User concept mastery table
CREATE TABLE user_concept_mastery (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    technology_id INT NOT NULL REFERENCES technologies(id) ON DELETE CASCADE,
    concept VARCHAR(255) NOT NULL,
    ability_score NUMERIC(5,4) NOT NULL,
    questions_seen INT NOT NULL DEFAULT 0,
    questions_correct INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, technology_id, concept)
);

-- Indexes
CREATE INDEX idx_user_concept_mastery_user_id ON user_concept_mastery(user_id);
CREATE INDEX idx_user_concept_mastery_technology_id ON user_concept_mastery(technology_id);
CREATE INDEX idx_user_concept_mastery_concept ON user_concept_mastery(concept);