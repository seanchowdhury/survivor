CREATE TABLE "cast_member_episode_tribe_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"cast_member_id" integer NOT NULL,
	"episode_id" integer NOT NULL,
	"tribe" text NOT NULL,
	CONSTRAINT "cast_member_episode_tribe_table_cast_member_id_episode_id_unique" UNIQUE("cast_member_id","episode_id")
);
--> statement-breakpoint
ALTER TABLE "cast_member_episode_tribe_table" ADD CONSTRAINT "cast_member_episode_tribe_table_cast_member_id_cast_members_table_id_fk" FOREIGN KEY ("cast_member_id") REFERENCES "public"."cast_members_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cast_member_episode_tribe_table" ADD CONSTRAINT "cast_member_episode_tribe_table_episode_id_episodes_table_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes_table"("id") ON DELETE cascade ON UPDATE no action;