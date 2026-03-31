CREATE TABLE "cast_member_profiles_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"cast_member_id" integer NOT NULL,
	"physical" integer,
	"strategic" integer,
	"social" integer,
	"threat_level" integer,
	"highest_placement" integer,
	CONSTRAINT "cast_member_profiles_table_cast_member_id_unique" UNIQUE("cast_member_id")
);
--> statement-breakpoint
ALTER TABLE "cast_member_profiles_table" ADD CONSTRAINT "cast_member_profiles_table_cast_member_id_cast_members_table_id_fk" FOREIGN KEY ("cast_member_id") REFERENCES "public"."cast_members_table"("id") ON DELETE cascade ON UPDATE no action;