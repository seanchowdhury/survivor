CREATE TABLE "cast_members_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"season_number" integer,
	CONSTRAINT "cast_members_table_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "confessionals_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"cast_member_id" integer NOT NULL,
	"episode_id" integer NOT NULL,
	"tribe" text NOT NULL,
	"quote" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "episodes_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"season_number" integer,
	"episode_number" integer,
	"air_date" text,
	"eliminated_castaways" text,
	"wiki_url" text,
	"imported_at" timestamp DEFAULT now(),
	CONSTRAINT "episodes_table_title_unique" UNIQUE("title")
);
--> statement-breakpoint
CREATE TABLE "tribal_votes_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"episode_id" integer NOT NULL,
	"voter" text NOT NULL,
	"voted_for" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "confessionals_table" ADD CONSTRAINT "confessionals_table_cast_member_id_cast_members_table_id_fk" FOREIGN KEY ("cast_member_id") REFERENCES "public"."cast_members_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confessionals_table" ADD CONSTRAINT "confessionals_table_episode_id_episodes_table_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tribal_votes_table" ADD CONSTRAINT "tribal_votes_table_episode_id_episodes_table_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes_table"("id") ON DELETE no action ON UPDATE no action;