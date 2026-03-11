CREATE TABLE "challenge_winners_table" (
	"challenge_id" integer NOT NULL,
	"cast_member_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenges_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"episode_id" integer NOT NULL,
	"name" text NOT NULL,
	"is_reward" boolean NOT NULL,
	"is_immunity" boolean NOT NULL,
	"individual_challenge" boolean NOT NULL
);
--> statement-breakpoint
ALTER TABLE "challenge_winners_table" ADD CONSTRAINT "challenge_winners_table_challenge_id_challenges_table_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_winners_table" ADD CONSTRAINT "challenge_winners_table_cast_member_id_cast_members_table_id_fk" FOREIGN KEY ("cast_member_id") REFERENCES "public"."cast_members_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges_table" ADD CONSTRAINT "challenges_table_episode_id_episodes_table_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes_table"("id") ON DELETE no action ON UPDATE no action;