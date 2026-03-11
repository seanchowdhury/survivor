ALTER TABLE "tribal_votes_table" DROP COLUMN "voter";--> statement-breakpoint
ALTER TABLE "tribal_votes_table" DROP COLUMN "voted_for";--> statement-breakpoint
ALTER TABLE "tribal_votes_table" ADD COLUMN "voter_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "tribal_votes_table" ADD COLUMN "voted_for_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "tribal_votes_table" ADD CONSTRAINT "tribal_votes_table_voter_id_cast_members_table_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."cast_members_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tribal_votes_table" ADD CONSTRAINT "tribal_votes_table_voted_for_id_cast_members_table_id_fk" FOREIGN KEY ("voted_for_id") REFERENCES "public"."cast_members_table"("id") ON DELETE no action ON UPDATE no action;
