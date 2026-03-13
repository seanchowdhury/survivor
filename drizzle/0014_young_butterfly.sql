CREATE TABLE "advantages_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text,
	"found_by_cast_member_id" integer NOT NULL,
	"found_in_episode_id" integer NOT NULL,
	"current_holder_id" integer,
	"used_by_cast_member_id" integer,
	"used_in_episode_id" integer
);
--> statement-breakpoint
CREATE TABLE "idols_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text,
	"found_by_cast_member_id" integer NOT NULL,
	"found_in_episode_id" integer NOT NULL,
	"current_holder_id" integer,
	"used_by_cast_member_id" integer,
	"used_in_episode_id" integer
);
--> statement-breakpoint
ALTER TABLE "cast_members_table" ADD COLUMN "evacuated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cast_members_table" ADD COLUMN "quit" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "episodes_table" ADD COLUMN "merge_occurred" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "advantages_table" ADD CONSTRAINT "advantages_table_found_by_cast_member_id_cast_members_table_id_fk" FOREIGN KEY ("found_by_cast_member_id") REFERENCES "public"."cast_members_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advantages_table" ADD CONSTRAINT "advantages_table_found_in_episode_id_episodes_table_id_fk" FOREIGN KEY ("found_in_episode_id") REFERENCES "public"."episodes_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advantages_table" ADD CONSTRAINT "advantages_table_current_holder_id_cast_members_table_id_fk" FOREIGN KEY ("current_holder_id") REFERENCES "public"."cast_members_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advantages_table" ADD CONSTRAINT "advantages_table_used_by_cast_member_id_cast_members_table_id_fk" FOREIGN KEY ("used_by_cast_member_id") REFERENCES "public"."cast_members_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advantages_table" ADD CONSTRAINT "advantages_table_used_in_episode_id_episodes_table_id_fk" FOREIGN KEY ("used_in_episode_id") REFERENCES "public"."episodes_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idols_table" ADD CONSTRAINT "idols_table_found_by_cast_member_id_cast_members_table_id_fk" FOREIGN KEY ("found_by_cast_member_id") REFERENCES "public"."cast_members_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idols_table" ADD CONSTRAINT "idols_table_found_in_episode_id_episodes_table_id_fk" FOREIGN KEY ("found_in_episode_id") REFERENCES "public"."episodes_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idols_table" ADD CONSTRAINT "idols_table_current_holder_id_cast_members_table_id_fk" FOREIGN KEY ("current_holder_id") REFERENCES "public"."cast_members_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idols_table" ADD CONSTRAINT "idols_table_used_by_cast_member_id_cast_members_table_id_fk" FOREIGN KEY ("used_by_cast_member_id") REFERENCES "public"."cast_members_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idols_table" ADD CONSTRAINT "idols_table_used_in_episode_id_episodes_table_id_fk" FOREIGN KEY ("used_in_episode_id") REFERENCES "public"."episodes_table"("id") ON DELETE no action ON UPDATE no action;