CREATE TABLE "confessionals_count_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"cast_member_id" integer NOT NULL,
	"episode_id" integer NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "confessionals_count_table" ADD CONSTRAINT "confessionals_count_table_cast_member_id_cast_members_table_id_fk" FOREIGN KEY ("cast_member_id") REFERENCES "public"."cast_members_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confessionals_count_table" ADD CONSTRAINT "confessionals_count_table_episode_id_episodes_table_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes_table"("id") ON DELETE no action ON UPDATE no action;