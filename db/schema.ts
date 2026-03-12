import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

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
  title: text("title").notNull().unique(),
  seasonNumber: integer("season_number"),
  episodeNumber: integer("episode_number").unique(),
  airDate: text("air_date"),
  eliminatedCastaways: text("eliminated_castaways"), // comma-separated
  wikiUrl: text("wiki_url"),
  importedAt: timestamp("imported_at").defaultNow(),
});

export type SelectEpisode = typeof episodesTable.$inferSelect;
export type InsertEpisode = typeof episodesTable.$inferInsert;

export const castMembersTable = pgTable("cast_members_table", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  seasonNumber: integer("season_number"),
  tribe: text("tribe").notNull(),
});

export type SelectCastMember = typeof castMembersTable.$inferSelect;
export type InsertCastMember = typeof castMembersTable.$inferInsert;

export const confessionalsTable = pgTable("confessionals_table", {
  id: serial("id").primaryKey(),
  castMemberId: integer("cast_member_id")
    .notNull()
    .references(() => castMembersTable.id),
  episodeId: integer("episode_id")
    .notNull()
    .references(() => episodesTable.id),
  tribe: text("tribe").notNull(),
  quote: text("quote").notNull(),
});

export type SelectConfessional = typeof confessionalsTable.$inferSelect;
export type InsertConfessional = typeof confessionalsTable.$inferInsert;

export const confessionalCountTable = pgTable("confessionals_count_table", {
  id: serial('id').primaryKey(),
    castMemberId: integer("cast_member_id")
    .notNull()
    .references(() => castMembersTable.id),
  episodeId: integer("episode_id")
    .notNull()
    .references(() => episodesTable.id),
  count: integer("count").notNull(),
})

export type SelectConfessionalCount = typeof confessionalCountTable.$inferSelect;
export type InsertConfessionalCount = typeof confessionalCountTable.$inferInsert;

export const tribalVotesTable = pgTable("tribal_votes_table", {
  id: serial("id").primaryKey(),
  episodeId: integer("episode_id")
    .notNull()
    .references(() => episodesTable.id),
  voterId: integer("voter_id")
    .notNull()
    .references(() => castMembersTable.id),
  votedForId: integer("voted_for_id")
    .notNull()
    .references(() => castMembersTable.id),
  tribe: text("tribe"),
});

export type SelectTribalVotes = typeof tribalVotesTable.$inferSelect;
export type InsertTribalVotes = typeof tribalVotesTable.$inferInsert;

export const challengesTable = pgTable("challenges_table", {
  id: serial("id").primaryKey(),
  episodeId: integer("episode_id")
    .notNull()
    .references(() => episodesTable.id),
  name: text("name").notNull(),
  isReward: boolean("is_reward").notNull(),
  isImmunity: boolean("is_immunity").notNull(),
  individualChallenge: boolean("individual_challenge").notNull(),
});

export type SelectChallenge = typeof challengesTable.$inferSelect;
export type InsertChallenge = typeof challengesTable.$inferInsert;

export const challengeWinnersTable = pgTable("challenge_winners_table", {
  challengeId: integer("challenge_id")
    .notNull()
    .references(() => challengesTable.id),
  castMemberId: integer("cast_member_id")
    .notNull()
    .references(() => castMembersTable.id),
  placement: integer("placement"),
});

export type SelectChallengeWinner = typeof challengeWinnersTable.$inferSelect;
export type InsertChallengeWinner = typeof challengeWinnersTable.$inferInsert;