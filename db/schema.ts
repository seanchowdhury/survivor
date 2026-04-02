import { pgTable, serial, text, integer, timestamp, boolean, unique } from "drizzle-orm/pg-core";

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
  mergeOccurred: boolean("merge_occurred").notNull().default(false),
});

export type SelectEpisode = typeof episodesTable.$inferSelect;
export type InsertEpisode = typeof episodesTable.$inferInsert;

export const castMembersTable = pgTable("cast_members_table", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  seasonNumber: integer("season_number"),
  tribe: text("tribe").notNull(),
  imageUrl: text("image_url").notNull(),
  eliminatedEpisodeId: integer("eliminated_episode_id").references(() => episodesTable.id),
  evacuated: boolean("evacuated").notNull().default(false),
  quit: boolean("quit").notNull().default(false),
  finalPlacement: integer("final_placement"),
  portraitImageUrl: text("portrait_image_url"),
  quote: text("quote"),
});

export type SelectCastMember = typeof castMembersTable.$inferSelect;
export type InsertCastMember = typeof castMembersTable.$inferInsert;

export const castMemberProfilesTable = pgTable("cast_member_profiles_table", {
  id: serial("id").primaryKey(),
  castMemberId: integer("cast_member_id")
    .notNull()
    .unique()
    .references(() => castMembersTable.id, { onDelete: "cascade" }),
  physical:         integer("physical"),          // 1–10
  strategic:        integer("strategic"),         // 1–10
  social:           integer("social"),            // 1–10
  threatLevel:      integer("threat_level"),      // 1–10
  highestPlacement: integer("highest_placement"), // raw placement, 1 = winner, cross-season
});

export type SelectCastMemberProfile = typeof castMemberProfilesTable.$inferSelect;
export type InsertCastMemberProfile = typeof castMemberProfilesTable.$inferInsert;

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

export const tribalCouncilsTable = pgTable("tribal_councils_table", {
  id: serial("id").primaryKey(),
  episodeId: integer("episode_id")
    .notNull()
    .references(() => episodesTable.id),
  tribe: text("tribe").notNull(),
  sequence: integer("sequence").notNull().default(1),
  eliminatedCastMemberId: integer("eliminated_cast_member_id")
    .references(() => castMembersTable.id),
  blindsided: boolean("blindsided").notNull().default(false),
});

export type SelectTribalCouncil = typeof tribalCouncilsTable.$inferSelect;
export type InsertTribalCouncil = typeof tribalCouncilsTable.$inferInsert;

export const tribalVotesTable = pgTable("tribal_votes_table", {
  id: serial("id").primaryKey(),
  tribalCouncilId: integer("tribal_council_id")
    .notNull()
    .references(() => tribalCouncilsTable.id),
  voterId: integer("voter_id")
    .notNull()
    .references(() => castMembersTable.id),
  votedForId: integer("voted_for_id")
    .references(() => castMembersTable.id),
  shotInTheDark: boolean("shot_in_the_dark").notNull().default(false),
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
  isFoodReward: boolean("is_food_reward").notNull().default(false),
  isImmunity: boolean("is_immunity").notNull(),
  individualChallenge: boolean("individual_challenge").notNull(),
  tribe: text("tribe").array(),
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
  placement: integer("placement").notNull(),
});

export type SelectChallengeWinner = typeof challengeWinnersTable.$inferSelect;
export type InsertChallengeWinner = typeof challengeWinnersTable.$inferInsert;

export const challengeRewardRecipientsTable = pgTable(
  "challenge_reward_recipients_table",
  {
    challengeId: integer("challenge_id")
      .notNull()
      .references(() => challengesTable.id, { onDelete: "cascade" }),
    castMemberId: integer("cast_member_id")
      .notNull()
      .references(() => castMembersTable.id, { onDelete: "cascade" }),
  },
  (t) => [unique().on(t.challengeId, t.castMemberId)],
);

export type SelectChallengeRewardRecipient = typeof challengeRewardRecipientsTable.$inferSelect;
export type InsertChallengeRewardRecipient = typeof challengeRewardRecipientsTable.$inferInsert;

export const idolsTable = pgTable("idols_table", {
  id: serial("id").primaryKey(),
  label: text("label"),
  foundByCastMemberId: integer("found_by_cast_member_id")
    .notNull()
    .references(() => castMembersTable.id),
  foundInEpisodeId: integer("found_in_episode_id")
    .notNull()
    .references(() => episodesTable.id),
  currentHolderId: integer("current_holder_id")
    .references(() => castMembersTable.id),
  usedByCastMemberId: integer("used_by_cast_member_id")
    .references(() => castMembersTable.id),
  usedInEpisodeId: integer("used_in_episode_id")
    .references(() => episodesTable.id),
});

export type SelectIdol = typeof idolsTable.$inferSelect;
export type InsertIdol = typeof idolsTable.$inferInsert;

export const advantagesTable = pgTable("advantages_table", {
  id: serial("id").primaryKey(),
  label: text("label"),
  foundByCastMemberId: integer("found_by_cast_member_id")
    .notNull()
    .references(() => castMembersTable.id),
  foundInEpisodeId: integer("found_in_episode_id")
    .notNull()
    .references(() => episodesTable.id),
  currentHolderId: integer("current_holder_id")
    .references(() => castMembersTable.id),
  usedByCastMemberId: integer("used_by_cast_member_id")
    .references(() => castMembersTable.id),
  usedInEpisodeId: integer("used_in_episode_id")
    .references(() => episodesTable.id),
});

export type SelectAdvantage = typeof advantagesTable.$inferSelect;
export type InsertAdvantage = typeof advantagesTable.$inferInsert;

export const miscTable = pgTable("misc_table", {
  id: serial("id").primaryKey(),
  episodeId: integer("episode_id")
    .notNull()
    .references(() => episodesTable.id),
  castMemberId: integer("cast_member_id")
    .notNull()
    .references(() => castMembersTable.id),
  value: text("value").notNull(),
});

export type SelectMisc = typeof miscTable.$inferSelect;
export type InsertMisc = typeof miscTable.$inferInsert;

// Fantasy pool participants
export const participantsTable = pgTable("participants_table", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: text("user_id").unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SelectParticipant = typeof participantsTable.$inferSelect;
export type InsertParticipant = typeof participantsTable.$inferInsert;

// Configurable scoring rules
export const scoringRulesTable = pgTable("scoring_rules_table", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull().unique(),
  pointsPerUnit: integer("points_per_unit").notNull(),
  description: text("description"),
});

export type SelectScoringRule = typeof scoringRulesTable.$inferSelect;
export type InsertScoringRule = typeof scoringRulesTable.$inferInsert;

// Cached points per cast member per episode per event type
export const castMemberEpisodePointsTable = pgTable(
  "cast_member_episode_points_table",
  {
    id: serial("id").primaryKey(),
    castMemberId: integer("cast_member_id")
      .notNull()
      .references(() => castMembersTable.id, { onDelete: "cascade" }),
    episodeId: integer("episode_id")
      .notNull()
      .references(() => episodesTable.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    points: integer("points").notNull(),
    computedAt: timestamp("computed_at").defaultNow(),
  },
  (t) => [unique().on(t.castMemberId, t.episodeId, t.eventType)],
);

export type SelectCastMemberEpisodePoints = typeof castMemberEpisodePointsTable.$inferSelect;
export type InsertCastMemberEpisodePoints = typeof castMemberEpisodePointsTable.$inferInsert;

// Admin-managed roster snapshot per participant per episode
export const participantEpisodeRosterTable = pgTable(
  "participant_episode_roster_table",
  {
    id: serial("id").primaryKey(),
    participantId: integer("participant_id")
      .notNull()
      .references(() => participantsTable.id, { onDelete: "cascade" }),
    episodeId: integer("episode_id")
      .notNull()
      .references(() => episodesTable.id, { onDelete: "cascade" }),
    castMemberId: integer("cast_member_id")
      .notNull()
      .references(() => castMembersTable.id, { onDelete: "cascade" }),
  },
  (t) => [unique().on(t.participantId, t.episodeId, t.castMemberId)],
);

export type SelectParticipantEpisodeRoster = typeof participantEpisodeRosterTable.$inferSelect;
export type InsertParticipantEpisodeRoster = typeof participantEpisodeRosterTable.$inferInsert;

export const castMemberEpisodeTribeTable = pgTable(
  "cast_member_episode_tribe_table",
  {
    id: serial("id").primaryKey(),
    castMemberId: integer("cast_member_id")
      .notNull()
      .references(() => castMembersTable.id, { onDelete: "cascade" }),
    episodeId: integer("episode_id")
      .notNull()
      .references(() => episodesTable.id, { onDelete: "cascade" }),
    tribe: text("tribe").notNull(),
  },
  (t) => [unique().on(t.castMemberId, t.episodeId)],
);

export type SelectCastMemberEpisodeTribe = typeof castMemberEpisodeTribeTable.$inferSelect;
export type InsertCastMemberEpisodeTribe = typeof castMemberEpisodeTribeTable.$inferInsert;

// Public prediction poll votes
export const pollVotesTable = pgTable(
  "poll_votes_table",
  {
    id: serial("id").primaryKey(),
    episodeId: integer("episode_id")
      .notNull()
      .references(() => episodesTable.id),
    questionType: text("question_type").notNull().default("select_cast_member"),
    question: text("question").notNull(),
    castMemberId: integer("cast_member_id")
      .references(() => castMembersTable.id),
    answer: boolean("answer"),
    voterToken: text("voter_token").notNull(),
    ipHash: text("ip_hash").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.episodeId, t.question, t.castMemberId, t.voterToken)],
);

export type SelectPollVote = typeof pollVotesTable.$inferSelect;
export type InsertPollVote = typeof pollVotesTable.$inferInsert;

// Leaderboard trash talk comments
export const leaderboardCommentsTable = pgTable("leaderboard_comments_table", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SelectLeaderboardComment = typeof leaderboardCommentsTable.$inferSelect;
export type InsertLeaderboardComment = typeof leaderboardCommentsTable.$inferInsert;