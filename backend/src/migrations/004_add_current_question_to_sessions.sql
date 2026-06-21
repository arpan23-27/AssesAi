-- 004_add_current_question_to_sessions.sql
-- Tracks which question was last served for a session so that an answer can be
-- bound strictly to the active session. This prevents a client from submitting
-- an arbitrary question id to farm an easy score (IDOR / score tampering).

ALTER TABLE quiz_sessions
    ADD COLUMN current_question_id VARCHAR(255);
