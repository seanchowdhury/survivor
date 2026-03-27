"use server";

import { db } from "@/db";
import { eq, sql } from "drizzle-orm";
import {
  castMemberEpisodePointsTable,
  confessionalCountTable,
  episodesTable,
  participantEpisodeRosterTable,
  participantsTable,
  scoringRulesTable,
} from "@/db/schema";

export async function recalculateEpisodeScores(episodeId: number) {
  // Get scoring rule for confessionals
  const rules = await db
    .select()
    .from(scoringRulesTable)
    .where(eq(scoringRulesTable.eventType, "confessional_per_count"));

  if (rules.length === 0) return;
  const { pointsPerUnit } = rules[0];

  // Get all confessional counts for this episode
  const counts = await db
    .select()
    .from(confessionalCountTable)
    .where(eq(confessionalCountTable.episodeId, episodeId));

  if (counts.length === 0) return;

  // Upsert one row per cast member
  await db
    .insert(castMemberEpisodePointsTable)
    .values(
      counts.map((c) => ({
        castMemberId: c.castMemberId,
        episodeId,
        eventType: "confessional_per_count" as const,
        points: c.count * pointsPerUnit,
      })),
    )
    .onConflictDoUpdate({
      target: [
        castMemberEpisodePointsTable.castMemberId,
        castMemberEpisodePointsTable.episodeId,
        castMemberEpisodePointsTable.eventType,
      ],
      set: {
        points: sql`excluded.points`,
        computedAt: sql`now()`,
      },
    });
}

export type LeaderboardEntry = {
  participantId: number;
  participantName: string;
  totalPoints: number;
  episodeBreakdown: {
    episodeId: number;
    episodeNumber: number | null;
    title: string;
    points: number;
  }[];
};

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  // Total points per participant
  const totals = await db
    .select({
      participantId: participantsTable.id,
      participantName: participantsTable.name,
      totalPoints: sql<number>`coalesce(sum(${castMemberEpisodePointsTable.points}), 0)`.as("total_points"),
    })
    .from(participantsTable)
    .leftJoin(
      participantEpisodeRosterTable,
      eq(participantEpisodeRosterTable.participantId, participantsTable.id),
    )
    .leftJoin(
      castMemberEpisodePointsTable,
      sql`${castMemberEpisodePointsTable.castMemberId} = ${participantEpisodeRosterTable.castMemberId} AND ${castMemberEpisodePointsTable.episodeId} = ${participantEpisodeRosterTable.episodeId}`,
    )
    .groupBy(participantsTable.id, participantsTable.name)
    .orderBy(sql`total_points desc`);

  // Per-episode breakdown per participant
  const breakdowns = await db
    .select({
      participantId: participantsTable.id,
      episodeId: episodesTable.id,
      episodeNumber: episodesTable.episodeNumber,
      title: episodesTable.title,
      points: sql<number>`coalesce(sum(${castMemberEpisodePointsTable.points}), 0)`.as("episode_points"),
    })
    .from(participantsTable)
    .innerJoin(
      participantEpisodeRosterTable,
      eq(participantEpisodeRosterTable.participantId, participantsTable.id),
    )
    .innerJoin(
      episodesTable,
      eq(episodesTable.id, participantEpisodeRosterTable.episodeId),
    )
    .leftJoin(
      castMemberEpisodePointsTable,
      sql`${castMemberEpisodePointsTable.castMemberId} = ${participantEpisodeRosterTable.castMemberId} AND ${castMemberEpisodePointsTable.episodeId} = ${participantEpisodeRosterTable.episodeId}`,
    )
    .groupBy(participantsTable.id, episodesTable.id, episodesTable.episodeNumber, episodesTable.title)
    .orderBy(episodesTable.episodeNumber);

  // Group breakdowns by participant
  const breakdownByParticipant: Record<number, LeaderboardEntry["episodeBreakdown"]> = {};
  for (const row of breakdowns) {
    if (!breakdownByParticipant[row.participantId]) {
      breakdownByParticipant[row.participantId] = [];
    }
    breakdownByParticipant[row.participantId].push({
      episodeId: row.episodeId,
      episodeNumber: row.episodeNumber,
      title: row.title,
      points: Number(row.points),
    });
  }

  return totals.map((t) => ({
    participantId: t.participantId,
    participantName: t.participantName,
    totalPoints: Number(t.totalPoints),
    episodeBreakdown: breakdownByParticipant[t.participantId] ?? [],
  }));
}

export async function seedScoringRules() {
  await db
    .insert(scoringRulesTable)
    .values({
      eventType: "confessional_per_count",
      pointsPerUnit: 1,
      description: "1 point per confessional",
    })
    .onConflictDoNothing();
}
