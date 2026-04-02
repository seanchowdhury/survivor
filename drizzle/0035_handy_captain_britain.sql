CREATE TABLE "challenge_reward_recipients_table" (
	"challenge_id" integer NOT NULL,
	"cast_member_id" integer NOT NULL,
	CONSTRAINT "challenge_reward_recipients_table_challenge_id_cast_member_id_unique" UNIQUE("challenge_id","cast_member_id")
);
--> statement-breakpoint
ALTER TABLE "challenge_reward_recipients_table" ADD CONSTRAINT "challenge_reward_recipients_table_challenge_id_challenges_table_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_reward_recipients_table" ADD CONSTRAINT "challenge_reward_recipients_table_cast_member_id_cast_members_table_id_fk" FOREIGN KEY ("cast_member_id") REFERENCES "public"."cast_members_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_winners_table" DROP COLUMN "got_reward";