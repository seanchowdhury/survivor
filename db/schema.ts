import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const invitesTable = pgTable("invites_table", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  claimedByUserId: text("claimed_by_user_id"),
});

export type SelectInvite = typeof invitesTable.$inferSelect;
export type InsertInvite = typeof invitesTable.$inferInsert;

export const errorLogs = pgTable("error_logs", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  context: text("context"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InsertErrorLog = typeof errorLogs.$inferInsert;

export const episodesTable = pgTable("episodes_table", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});
