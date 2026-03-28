ALTER TABLE "poll_votes_table" DROP CONSTRAINT "poll_votes_table_episode_id_question_voter_token_unique";--> statement-breakpoint
ALTER TABLE "poll_votes_table" ADD COLUMN "question_type" text DEFAULT 'select_cast_member' NOT NULL;--> statement-breakpoint
ALTER TABLE "poll_votes_table" ADD COLUMN "answer" boolean;--> statement-breakpoint
ALTER TABLE "poll_votes_table" ADD CONSTRAINT "poll_votes_table_episode_id_question_cast_member_id_voter_token_unique" UNIQUE("episode_id","question","cast_member_id","voter_token");