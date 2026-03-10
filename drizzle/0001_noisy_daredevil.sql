CREATE TABLE "error_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"context" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
