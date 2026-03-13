CREATE TABLE "misc_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"episode_id" integer NOT NULL,
	"cast_member_id" integer NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "misc_table" ADD CONSTRAINT "misc_table_episode_id_episodes_table_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "misc_table" ADD CONSTRAINT "misc_table_cast_member_id_cast_members_table_id_fk" FOREIGN KEY ("cast_member_id") REFERENCES "public"."cast_members_table"("id") ON DELETE no action ON UPDATE no action;