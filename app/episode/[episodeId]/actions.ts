import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  castMemberEpisodePointsTable,
  castMembersTable,
  challengesTable,
  challengeWinnersTable,
  confessionalCountTable,
  episodesTable,
  tribalCouncilsTable,
  tribalVotesTable,
} from "@/db/schema";

export function getEpisodePage(episodeId: number) {
  return unstable_cache(
    async () => {
      const [episode] = await db
        .select()
        .from(episodesTable)
        .where(eq(episodesTable.id, episodeId));
      if (!episode) return null;

      const [prev, next] = await Promise.all([
        db
          .select({ id: episodesTable.id, episodeNumber: episodesTable.episodeNumber })
          .from(episodesTable)
          .where(eq(episodesTable.episodeNumber, (episode.episodeNumber ?? 0) - 1))
          .limit(1),
        db
          .select({ id: episodesTable.id, episodeNumber: episodesTable.episodeNumber })
          .from(episodesTable)
          .where(eq(episodesTable.episodeNumber, (episode.episodeNumber ?? 0) + 1))
          .limit(1),
      ]);

      return {
        id: episode.id,
        title: episode.title,
        episodeNumber: episode.episodeNumber,
        prevId: prev[0]?.id ?? null,
        nextId: next[0]?.id ?? null,
        prevNumber: prev[0]?.episodeNumber ?? null,
        nextNumber: next[0]?.episodeNumber ?? null,
      };
    },
    ["episode-page", String(episodeId)],
    { tags: ["episodes"] }
  )();
}

export function getConfessionalCounts(episodeId: number, episodeNumber: number) {
  return unstable_cache(
    async () => {
  const eliminatedEp = alias(episodesTable, "eliminated_ep");

  const results = await db
    .select({
      name: castMembersTable.name,
      count: confessionalCountTable.count,
      imageUrl: castMembersTable.imageUrl,
      eliminatedEpisodeNumber: eliminatedEp.episodeNumber,
    })
    .from(confessionalCountTable)
    .innerJoin(castMembersTable, eq(castMembersTable.id, confessionalCountTable.castMemberId))
    .leftJoin(eliminatedEp, eq(eliminatedEp.id, castMembersTable.eliminatedEpisodeId))
    .where(eq(confessionalCountTable.episodeId, episodeId));

  return results
    .filter((r) => {
      const elimNum = r.eliminatedEpisodeNumber;
      return elimNum === null || elimNum >= episodeNumber;
    })
    .map((r) => ({ name: r.name, count: r.count, imageUrl: r.imageUrl }))
    .sort((a, b) => b.count - a.count);
    },
    ["confessionals", String(episodeId)],
    { tags: ["episodes"] }
  )();
}

export type ChallengeWinner = {
  castMemberName: string;
  placement: number;
};

export type ChallengeData = {
  id: number;
  challengeName: string;
  isReward: boolean;
  isImmunity: boolean;
  individualChallenge: boolean;
  tribes: string[] | null;
  winners: ChallengeWinner[];
};

export function getChallenges(episodeId: number): Promise<ChallengeData[]> {
  return unstable_cache(
    async (): Promise<ChallengeData[]> => {
  const rows = await db
    .select()
    .from(challengeWinnersTable)
    .innerJoin(challengesTable, eq(challengesTable.id, challengeWinnersTable.challengeId))
    .innerJoin(castMembersTable, eq(castMembersTable.id, challengeWinnersTable.castMemberId))
    .where(eq(challengesTable.episodeId, episodeId));

  const challengeMap: Record<number, ChallengeData> = {};
  for (const row of rows) {
    const cId = row.challenges_table.id;
    if (!challengeMap[cId]) {
      challengeMap[cId] = {
        id: cId,
        challengeName: row.challenges_table.name,
        isReward: row.challenges_table.isReward,
        isImmunity: row.challenges_table.isImmunity,
        individualChallenge: row.challenges_table.individualChallenge,
        tribes: row.challenges_table.tribe,
        winners: [],
      };
    }
    challengeMap[cId].winners.push({
      castMemberName: row.cast_members_table.name,
      placement: row.challenge_winners_table.placement,
    });
  }

  return Object.values(challengeMap).sort((a, b) => a.id - b.id);
    },
    ["challenges", String(episodeId)],
    { tags: ["episodes"] }
  )();
}

export type TribalVoteRow = {
  councilId: number;
  tribe: string;
  sequence: number;
  eliminatedName: string | null;
  blindsided: boolean;
  votes: { voterName: string; votedForName: string | null }[];
};

export type EpisodeFantasyRow = {
  castMemberId: number;
  name: string;
  imageUrl: string;
  totalPoints: number;
  eliminatedEpisodeNumber: number | null;
  breakdown: { eventType: string; points: number }[];
};

export function getEpisodeFantasyPoints(episodeId: number): Promise<EpisodeFantasyRow[]> {
  return unstable_cache(
    async (): Promise<EpisodeFantasyRow[]> => {
  const elimEp = alias(episodesTable, "elim_ep");

  // Aggregate totals per cast member
  const totals = await db
    .select({
      castMemberId: castMembersTable.id,
      name: castMembersTable.name,
      imageUrl: castMembersTable.imageUrl,
      eliminatedEpisodeNumber: elimEp.episodeNumber,
      totalPoints: sql<number>`coalesce(sum(${castMemberEpisodePointsTable.points}), 0)`.as("total_points"),
    })
    .from(castMembersTable)
    .leftJoin(elimEp, eq(elimEp.id, castMembersTable.eliminatedEpisodeId))
    .leftJoin(
      castMemberEpisodePointsTable,
      sql`${castMemberEpisodePointsTable.castMemberId} = ${castMembersTable.id} AND ${castMemberEpisodePointsTable.episodeId} = ${episodeId}`,
    )
    .groupBy(castMembersTable.id, castMembersTable.name, castMembersTable.imageUrl, elimEp.episodeNumber)
    .orderBy(sql`total_points desc`);

  // All individual event rows for this episode
  const eventRows = await db
    .select({
      castMemberId: castMemberEpisodePointsTable.castMemberId,
      eventType: castMemberEpisodePointsTable.eventType,
      points: castMemberEpisodePointsTable.points,
    })
    .from(castMemberEpisodePointsTable)
    .where(eq(castMemberEpisodePointsTable.episodeId, episodeId));

  const breakdownMap: Record<number, { eventType: string; points: number }[]> = {};
  for (const row of eventRows) {
    if (!breakdownMap[row.castMemberId]) breakdownMap[row.castMemberId] = [];
    breakdownMap[row.castMemberId].push({ eventType: row.eventType, points: row.points });
  }
  // Sort each breakdown: positive first (desc), then negative (asc)
  for (const rows of Object.values(breakdownMap)) {
    rows.sort((a, b) => b.points - a.points);
  }

  return totals.map((r) => ({
    ...r,
    totalPoints: Number(r.totalPoints),
    breakdown: breakdownMap[r.castMemberId] ?? [],
  }));
    },
    ["fantasy-points", String(episodeId)],
    { tags: ["episodes"] }
  )();
}

export function getTribalVotes(episodeId: number): Promise<TribalVoteRow[]> {
  return unstable_cache(
    async (): Promise<TribalVoteRow[]> => {
  const voter = alias(castMembersTable, "voter");
  const votedFor = alias(castMembersTable, "voted_for");
  const eliminated = alias(castMembersTable, "eliminated");

  const rows = await db
    .select({
      councilId: tribalCouncilsTable.id,
      tribe: tribalCouncilsTable.tribe,
      sequence: tribalCouncilsTable.sequence,
      blindsided: tribalCouncilsTable.blindsided,
      voterName: voter.name,
      votedForName: votedFor.name,
      eliminatedName: eliminated.name,
    })
    .from(tribalVotesTable)
    .innerJoin(tribalCouncilsTable, eq(tribalCouncilsTable.id, tribalVotesTable.tribalCouncilId))
    .leftJoin(voter, eq(voter.id, tribalVotesTable.voterId))
    .leftJoin(votedFor, eq(votedFor.id, tribalVotesTable.votedForId))
    .leftJoin(eliminated, eq(eliminated.id, tribalCouncilsTable.eliminatedCastMemberId))
    .where(eq(tribalCouncilsTable.episodeId, episodeId));

  const councilMap: Record<number, TribalVoteRow> = {};
  for (const row of rows) {
    if (!councilMap[row.councilId]) {
      councilMap[row.councilId] = {
        councilId: row.councilId,
        tribe: row.tribe,
        sequence: row.sequence,
        blindsided: row.blindsided,
        eliminatedName: row.eliminatedName ?? null,
        votes: [],
      };
    }
    if (row.voterName) {
      councilMap[row.councilId].votes.push({
        voterName: row.voterName,
        votedForName: row.votedForName ?? null,
      });
    }
  }

  return Object.values(councilMap).sort((a, b) => a.sequence - b.sequence);
    },
    ["tribal-votes", String(episodeId)],
    { tags: ["episodes"] }
  )();
}
