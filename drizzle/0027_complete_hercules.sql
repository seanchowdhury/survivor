ALTER TABLE "participants_table" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "participants_table" ADD CONSTRAINT "participants_table_user_id_unique" UNIQUE("user_id");