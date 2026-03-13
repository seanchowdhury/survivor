-- Create tribal_councils_table
CREATE TABLE "tribal_councils_table" (
  "id" serial PRIMARY KEY NOT NULL,
  "episode_id" integer NOT NULL,
  "tribe" text NOT NULL,
  "sequence" integer NOT NULL DEFAULT 1,
  "eliminated_cast_member_id" integer
);

-- Migrate existing data: one tribal council per (episode_id, tribe) combo, sequence = 1
INSERT INTO "tribal_councils_table" ("episode_id", "tribe", "sequence")
SELECT DISTINCT episode_id, tribe, 1
FROM "tribal_votes_table"
WHERE tribe IS NOT NULL;

-- Add tribal_council_id (nullable during backfill)
ALTER TABLE "tribal_votes_table" ADD COLUMN "tribal_council_id" integer;

-- Backfill tribal_council_id from (episode_id, tribe) match
UPDATE "tribal_votes_table" v
SET tribal_council_id = tc.id
FROM "tribal_councils_table" tc
WHERE v.episode_id = tc.episode_id AND v.tribe = tc.tribe;

-- Make tribal_council_id NOT NULL
ALTER TABLE "tribal_votes_table" ALTER COLUMN "tribal_council_id" SET NOT NULL;

-- Drop old columns
ALTER TABLE "tribal_votes_table" DROP COLUMN "episode_id";
ALTER TABLE "tribal_votes_table" DROP COLUMN "tribe";

-- Add foreign keys
ALTER TABLE "tribal_councils_table" ADD CONSTRAINT "tribal_councils_table_episode_id_episodes_table_id_fk"
  FOREIGN KEY ("episode_id") REFERENCES "public"."episodes_table"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "tribal_councils_table" ADD CONSTRAINT "tribal_councils_table_eliminated_cast_member_id_cast_members_table_id_fk"
  FOREIGN KEY ("eliminated_cast_member_id") REFERENCES "public"."cast_members_table"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "tribal_votes_table" ADD CONSTRAINT "tribal_votes_table_tribal_council_id_tribal_councils_table_id_fk"
  FOREIGN KEY ("tribal_council_id") REFERENCES "public"."tribal_councils_table"("id") ON DELETE no action ON UPDATE no action;
