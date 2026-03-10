CREATE TABLE "invites_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"claimed_by_user_id" text,
	CONSTRAINT "invites_table_code_unique" UNIQUE("code")
);
