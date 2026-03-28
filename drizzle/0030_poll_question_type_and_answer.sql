-- Add question_type and answer columns
ALTER TABLE "poll_votes_table" ADD COLUMN "question_type" text NOT NULL DEFAULT 'select_cast_member';
ALTER TABLE "poll_votes_table" ADD COLUMN "answer" boolean;

-- Migrate existing blindside votes from the old hack:
--   Old: question = 'blindsided_42', cast_member_id = 1 (yes) or 2 (no)
--   New: question = 'blindsided', question_type = 'yesno', cast_member_id = 42, answer = true/false
-- Note: SET clauses in PostgreSQL use original column values, so the order is safe.
UPDATE "poll_votes_table"
SET
  question_type = 'yesno',
  answer = CASE WHEN cast_member_id = 1 THEN true ELSE false END,
  cast_member_id = CAST(SPLIT_PART(question, '_', 2) AS INTEGER),
  question = 'blindsided'
WHERE question LIKE 'blindsided_%';

-- Replace unique constraint
ALTER TABLE "poll_votes_table"
  DROP CONSTRAINT "poll_votes_table_episode_id_question_voter_token_unique";

ALTER TABLE "poll_votes_table"
  ADD CONSTRAINT "poll_votes_table_episode_id_question_cast_member_id_voter_token_unique"
  UNIQUE("episode_id", "question", "cast_member_id", "voter_token");
