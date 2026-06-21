-- 005_add_session_answers_unique.sql
-- Enforce one answer per (session, question) at the database level. This closes
-- the double-submit race: even if two concurrent requests both pass the
-- application-level hasAnswered() check, the second INSERT now fails with a
-- unique violation (translated to QUESTION_ALREADY_ANSWERED) instead of
-- recording a duplicate answer that would distort the score.
--
-- Wrapped in a guard so the migration is safe to re-run.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'session_answers_session_question_uniq'
  ) THEN
    ALTER TABLE session_answers
      ADD CONSTRAINT session_answers_session_question_uniq
      UNIQUE (session_id, question_id);
  END IF;
END $$;
