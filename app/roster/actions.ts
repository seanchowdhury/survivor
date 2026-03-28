import { db } from "@/db";
import { and, eq, sql } from "drizzle-orm";
import {
  castMemberEpisodePointsTable,
  castMembersTable,
  episodesTable,
  participantEpisodeRosterTable,
  participantsTable,
} from "@/db/schema";

export type RosterCastMember = {
  castMemberId: number;
  name: string;
  imageUrl: string;
  portraitImageUrl: string | null;
  tribe: string;
  isEliminated: boolean;
  totalPoints: number;
};

export type EpisodeBreakdown = {
  episodeId: number;
  episodeNumber: number | null;
  title: string;
  points: number;
};

export type MyRosterData = {
  participantId: number;
  participantName: string;
  totalPoints: number;
  rank: number;
  currentRoster: RosterCastMember[];
  episodeBreakdown: EpisodeBreakdown[];
};

export async function getMyRoster(userId: string): Promise<MyRosterData | null> {
  // Find participant linked to this user
  const [participant] = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.userId, userId))
    .limit(1);

  if (!participant) return null;

  // Get latest episode (for "current" roster)
  const episodes = await db
    .select({ id: episodesTable.id, episodeNumber: episodesTable.episodeNumber })
    .from(episodesTable)
    .orderBy(episodesTable.episodeNumber);

  const latestEpisode = episodes[episodes.length - 1];
  if (!latestEpisode) return null;

  // All four remaining queries are independent — run in parallel
  const [totalsRow, breakdownRows, rosterRows, allTotals] = await Promise.all([
    // Season total points for this participant
    db
      .select({
        totalPoints: sql<number>`coalesce(sum(${castMemberEpisodePointsTable.points}), 0)`.as("total_points"),
      })
      .from(participantEpisodeRosterTable)
      .leftJoin(
        castMemberEpisodePointsTable,
        sql`${castMemberEpisodePointsTable.castMemberId} = ${participantEpisodeRosterTable.castMemberId} AND ${castMemberEpisodePointsTable.episodeId} = ${participantEpisodeRosterTable.episodeId}`
      )
      .where(eq(participantEpisodeRosterTable.participantId, participant.id))
      .then((rows) => rows[0]),

    // Per-episode breakdown for this participant
    db
      .select({
        episodeId: episodesTable.id,
        episodeNumber: episodesTable.episodeNumber,
        title: episodesTable.title,
        points: sql<number>`coalesce(sum(${castMemberEpisodePointsTable.points}), 0)`.as("episode_points"),
      })
      .from(participantEpisodeRosterTable)
      .innerJoin(episodesTable, eq(episodesTable.id, participantEpisodeRosterTable.episodeId))
      .leftJoin(
        castMemberEpisodePointsTable,
        sql`${castMemberEpisodePointsTable.castMemberId} = ${participantEpisodeRosterTable.castMemberId} AND ${castMemberEpisodePointsTable.episodeId} = ${participantEpisodeRosterTable.episodeId}`
      )
      .where(eq(participantEpisodeRosterTable.participantId, participant.id))
      .groupBy(episodesTable.id, episodesTable.episodeNumber, episodesTable.title)
      .orderBy(episodesTable.episodeNumber),

    // Current roster (latest episode) with each cast member's season total points
    db
      .select({
        castMemberId: castMembersTable.id,
        name: castMembersTable.name,
        imageUrl: castMembersTable.imageUrl,
        portraitImageUrl: castMembersTable.portraitImageUrl,
        tribe: castMembersTable.tribe,
        eliminatedEpisodeId: castMembersTable.eliminatedEpisodeId,
        totalPoints: sql<number>`coalesce(sum(${castMemberEpisodePointsTable.points}), 0)`.as("total_points"),
      })
      .from(participantEpisodeRosterTable)
      .innerJoin(castMembersTable, eq(castMembersTable.id, participantEpisodeRosterTable.castMemberId))
      .leftJoin(
        castMemberEpisodePointsTable,
        eq(castMemberEpisodePointsTable.castMemberId, participantEpisodeRosterTable.castMemberId)
      )
      .where(and(
        eq(participantEpisodeRosterTable.participantId, participant.id),
        eq(participantEpisodeRosterTable.episodeId, latestEpisode.id),
      ))
      .groupBy(
        castMembersTable.id,
        castMembersTable.name,
        castMembersTable.imageUrl,
        castMembersTable.portraitImageUrl,
        castMembersTable.tribe,
        castMembersTable.eliminatedEpisodeId,
      )
      .orderBy(sql`total_points desc`),

    // Rank among all participants
    db
      .select({
        participantId: participantsTable.id,
        totalPoints: sql<number>`coalesce(sum(${castMemberEpisodePointsTable.points}), 0)`.as("total_points"),
      })
      .from(participantsTable)
      .leftJoin(participantEpisodeRosterTable, eq(participantEpisodeRosterTable.participantId, participantsTable.id))
      .leftJoin(
        castMemberEpisodePointsTable,
        sql`${castMemberEpisodePointsTable.castMemberId} = ${participantEpisodeRosterTable.castMemberId} AND ${castMemberEpisodePointsTable.episodeId} = ${participantEpisodeRosterTable.episodeId}`
      )
      .groupBy(participantsTable.id)
      .orderBy(sql`total_points desc`),
  ]);

  const rank = allTotals.findIndex((t) => t.participantId === participant.id) + 1;

  return {
    participantId: participant.id,
    participantName: participant.name,
    totalPoints: Number(totalsRow?.totalPoints ?? 0),
    rank,
    currentRoster: rosterRows.map((r) => ({
      castMemberId: r.castMemberId,
      name: r.name,
      imageUrl: r.imageUrl,
      portraitImageUrl: r.portraitImageUrl,
      tribe: r.tribe,
      isEliminated: r.eliminatedEpisodeId !== null,
      totalPoints: Number(r.totalPoints),
    })),
    episodeBreakdown: breakdownRows.map((r) => ({
      episodeId: r.episodeId,
      episodeNumber: r.episodeNumber,
      title: r.title,
      points: Number(r.points),
    })),
  };
}
