CREATE TABLE "cast_member_episode_points_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"cast_member_id" integer NOT NULL,
	"episode_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"points" integer NOT NULL,
	"computed_at" timestamp DEFAULT now(),
	CONSTRAINT "cast_member_episode_points_table_cast_member_id_episode_id_event_type_unique" UNIQUE("cast_member_id","episode_id","event_type")
);
--> statement-breakpoint
CREATE TABLE "participant_episode_roster_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"participant_id" integer NOT NULL,
	"episode_id" integer NOT NULL,
	"cast_member_id" integer NOT NULL,
	CONSTRAINT "participant_episode_roster_table_participant_id_episode_id_cast_member_id_unique" UNIQUE("participant_id","episode_id","cast_member_id")
);
--> statement-breakpoint
CREATE TABLE "participants_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scoring_rules_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"points_per_unit" integer NOT NULL,
	"description" text,
	CONSTRAINT "scoring_rules_table_event_type_unique" UNIQUE("event_type")
);
--> statement-breakpoint
ALTER TABLE "cast_member_episode_points_table" ADD CONSTRAINT "cast_member_episode_points_table_cast_member_id_cast_members_table_id_fk" FOREIGN KEY ("cast_member_id") REFERENCES "public"."cast_members_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cast_member_episode_points_table" ADD CONSTRAINT "cast_member_episode_points_table_episode_id_episodes_table_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_episode_roster_table" ADD CONSTRAINT "participant_episode_roster_table_participant_id_participants_table_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_episode_roster_table" ADD CONSTRAINT "participant_episode_roster_table_episode_id_episodes_table_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_episode_roster_table" ADD CONSTRAINT "participant_episode_roster_table_cast_member_id_cast_members_table_id_fk" FOREIGN KEY ("cast_member_id") REFERENCES "public"."cast_members_table"("id") ON DELETE cascade ON UPDATE no action;