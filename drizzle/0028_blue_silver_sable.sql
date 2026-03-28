CREATE TABLE "poll_votes_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"episode_id" integer NOT NULL,
	"question" text NOT NULL,
	"cast_member_id" integer NOT NULL,
	"voter_token" text NOT NULL,
	"ip_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "poll_votes_table_episode_id_question_voter_token_unique" UNIQUE("episode_id","question","voter_token")
);
--> statement-breakpoint
ALTER TABLE "poll_votes_table" ADD CONSTRAINT "poll_votes_table_episode_id_episodes_table_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes_table" ADD CONSTRAINT "poll_votes_table_cast_member_id_cast_members_table_id_fk" FOREIGN KEY ("cast_member_id") REFERENCES "public"."cast_members_table"("id") ON DELETE no action ON UPDATE no action;