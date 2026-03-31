import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { eq, sql, and, isNotNull, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  castMembersTable,
  castMemberProfilesTable,
  confessionalCountTable,
  episodesTable,
  tribalVotesTable,
  tribalCouncilsTable,
  challengeWinnersTable,
  challengesTable,
  idolsTable,
  advantagesTable,
  castMemberEpisodePointsTable,
  type SelectCastMemberProfile,
} from "@/db/schema";

export const getCastMember = (castMemberId: number) =>
  unstable_cache(
    async () => {
      const eliminatedEp = alias(episodesTable, "eliminated_ep");
      const [row] = await db
        .select({
          id: castMembersTable.id,
          name: castMembersTable.name,
          seasonNumber: castMembersTable.seasonNumber,
          tribe: castMembersTable.tribe,
          imageUrl: castMembersTable.imageUrl,
          eliminatedEpisodeId: castMembersTable.eliminatedEpisodeId,
          evacuated: castMembersTable.evacuated,
          quit: castMembersTable.quit,
          finalPlacement: castMembersTable.finalPlacement,
          portraitImageUrl: castMembersTable.portraitImageUrl,
          quote: castMembersTable.quote,
          eliminatedEpisodeNumber: eliminatedEp.episodeNumber,
        })
        .from(castMembersTable)
        .leftJoin(eliminatedEp, eq(eliminatedEp.id, castMembersTable.eliminatedEpisodeId))
        .where(eq(castMembersTable.id, castMemberId));
      return row ?? null;
    },
    ["cast-member", String(castMemberId)],
    { tags: ["cast-members"] }
  )();

export type PlayerStats = {
  votesAgainst: { preMerge: number; postMerge: number; total: number };
  challengeWins: { immunity: number; reward: number; total: number };
  rightSideOfVote: { right: number; total: number };
  idols: { type: "idol" | "advantage"; label: string | null; foundInEpisode: number | null; played: boolean }[];
};

export const getPlayerStats = (castMemberId: number) =>
  unstable_cache(
    async (): Promise<PlayerStats> => {
      const votedFor = alias(castMembersTable, "voted_for");

      const [voteRows, challengeRows, votecastRows, idolRows, advantageRows, mergeEpRows] = await Promise.all([
        // Votes against this player
        db
          .select({
            episodeNumber: episodesTable.episodeNumber,
          })
          .from(tribalVotesTable)
          .innerJoin(tribalCouncilsTable, eq(tribalCouncilsTable.id, tribalVotesTable.tribalCouncilId))
          .innerJoin(episodesTable, eq(episodesTable.id, tribalCouncilsTable.episodeId))
          .innerJoin(votedFor, eq(votedFor.id, tribalVotesTable.votedForId))
          .where(and(isNotNull(tribalVotesTable.votedForId), eq(votedFor.id, castMemberId))),

        // Challenge wins for this player
        db
          .select({
            isImmunity: challengesTable.isImmunity,
            isReward: challengesTable.isReward,
          })
          .from(challengeWinnersTable)
          .innerJoin(challengesTable, eq(challengesTable.id, challengeWinnersTable.challengeId))
          .where(eq(challengeWinnersTable.castMemberId, castMemberId)),

        // Right side of vote for this player
        db
          .select({
            rightVotes: sql<number>`count(*) filter (where ${tribalVotesTable.votedForId} = ${tribalCouncilsTable.eliminatedCastMemberId})`,
            totalVotes: sql<number>`count(*) filter (where ${tribalVotesTable.votedForId} is not null)`,
          })
          .from(tribalVotesTable)
          .innerJoin(tribalCouncilsTable, eq(tribalCouncilsTable.id, tribalVotesTable.tribalCouncilId))
          .where(eq(tribalVotesTable.voterId, castMemberId)),

        // Idols held by this player
        db
          .select({
            label: idolsTable.label,
            foundInEpisodeId: idolsTable.foundInEpisodeId,
            usedInEpisodeId: idolsTable.usedInEpisodeId,
          })
          .from(idolsTable)
          .where(eq(idolsTable.currentHolderId, castMemberId)),

        // Advantages held by this player
        db
          .select({
            label: advantagesTable.label,
            foundInEpisodeId: advantagesTable.foundInEpisodeId,
            usedInEpisodeId: advantagesTable.usedInEpisodeId,
          })
          .from(advantagesTable)
          .where(eq(advantagesTable.currentHolderId, castMemberId)),

        // Merge episode for this player's season
        db
          .select({ episodeNumber: episodesTable.episodeNumber })
          .from(episodesTable)
          .innerJoin(castMembersTable, eq(castMembersTable.seasonNumber, episodesTable.seasonNumber))
          .where(and(eq(episodesTable.mergeOccurred, true), eq(castMembersTable.id, castMemberId)))
          .limit(1),
      ]);

      // Votes against
      const mergeEpNum = mergeEpRows[0]?.episodeNumber ?? null;
      let preMerge = 0, postMerge = 0;
      for (const r of voteRows) {
        const isPost = mergeEpNum != null && r.episodeNumber != null && r.episodeNumber >= mergeEpNum;
        if (isPost) postMerge++; else preMerge++;
      }

      // Challenge wins
      let immunity = 0, reward = 0;
      for (const r of challengeRows) {
        if (r.isImmunity) immunity++;
        if (r.isReward) reward++;
      }

      // Right side of vote
      const [rsov] = votecastRows;
      const right = Number(rsov?.rightVotes ?? 0);
      const total = Number(rsov?.totalVotes ?? 0);

      // Episode numbers for idols/advantages
      const epIds = [
        ...idolRows.map((r) => r.foundInEpisodeId),
        ...advantageRows.map((r) => r.foundInEpisodeId),
      ];
      const epNumbers = epIds.length > 0
        ? await db.select({ id: episodesTable.id, episodeNumber: episodesTable.episodeNumber }).from(episodesTable).where(inArray(episodesTable.id, epIds))
        : [];
      const epNumMap = new Map(epNumbers.map((e) => [e.id, e.episodeNumber]));

      const idols = [
        ...idolRows.map((r) => ({
          type: "idol" as const,
          label: r.label,
          foundInEpisode: epNumMap.get(r.foundInEpisodeId) ?? null,
          played: r.usedInEpisodeId !== null,
        })),
        ...advantageRows.map((r) => ({
          type: "advantage" as const,
          label: r.label,
          foundInEpisode: epNumMap.get(r.foundInEpisodeId) ?? null,
          played: r.usedInEpisodeId !== null,
        })),
      ].sort((a, b) => (a.foundInEpisode ?? 999) - (b.foundInEpisode ?? 999));

      return {
        votesAgainst: { preMerge, postMerge, total: preMerge + postMerge },
        challengeWins: { immunity, reward, total: immunity + reward },
        rightSideOfVote: { right, total },
        idols,
      };
    },
    ["player-stats", String(castMemberId)],
    { tags: ["episodes", "cast-members", "tribal-votes", "challenges", "idols"] }
  )();

export type ConfessionalPoint = {
  episodeNumber: number;
  count: number;
  avg: number;
};

export const getPlayerConfessionals = (castMemberId: number) =>
  unstable_cache(
    async (): Promise<ConfessionalPoint[]> => {
      const eliminatedEpAlias = alias(episodesTable, "elim_ep_confessional");
      const [playerRows, avgRows, [playerInfo]] = await Promise.all([
        // This player's count per episode
        db
          .select({
            episodeId: confessionalCountTable.episodeId,
            count: confessionalCountTable.count,
          })
          .from(confessionalCountTable)
          .where(eq(confessionalCountTable.castMemberId, castMemberId)),

        // Average confessionals per player per episode (excludes eliminated players)
        (() => {
          const eliminatedEp = alias(episodesTable, "eliminated_ep");
          const currentEp = alias(episodesTable, "current_ep");
          return db
            .select({
              episodeId: confessionalCountTable.episodeId,
              avg: sql<number>`avg(${confessionalCountTable.count})`,
            })
            .from(confessionalCountTable)
            .innerJoin(castMembersTable, eq(castMembersTable.id, confessionalCountTable.castMemberId))
            .innerJoin(currentEp, eq(currentEp.id, confessionalCountTable.episodeId))
            .leftJoin(eliminatedEp, eq(eliminatedEp.id, castMembersTable.eliminatedEpisodeId))
            .where(
              sql`${castMembersTable.eliminatedEpisodeId} is null or ${eliminatedEp.episodeNumber} >= ${currentEp.episodeNumber}`
            )
            .groupBy(confessionalCountTable.episodeId);
        })(),

        // This player's elimination episode number
        db
          .select({ eliminatedEpisodeNumber: eliminatedEpAlias.episodeNumber })
          .from(castMembersTable)
          .leftJoin(eliminatedEpAlias, eq(eliminatedEpAlias.id, castMembersTable.eliminatedEpisodeId))
          .where(eq(castMembersTable.id, castMemberId)),
      ]);

      const eliminatedEpisodeNumber = playerInfo?.eliminatedEpisodeNumber ?? null;

      // Episode numbers for labeling
      const episodeIds = [...new Set(playerRows.map((r) => r.episodeId))];
      if (episodeIds.length === 0) return [];

      const episodes = await db
        .select({ id: episodesTable.id, episodeNumber: episodesTable.episodeNumber })
        .from(episodesTable)
        .where(inArray(episodesTable.id, episodeIds));

      const epNumMap = new Map(episodes.map((e) => [e.id, e.episodeNumber]));
      const avgMap = new Map(avgRows.map((r) => [r.episodeId, r.avg]));

      return playerRows
        .map((r) => ({
          episodeNumber: epNumMap.get(r.episodeId) ?? 0,
          count: r.count,
          avg: Math.round((avgMap.get(r.episodeId) ?? 0) * 10) / 10,
        }))
        .filter((r) => eliminatedEpisodeNumber === null || r.episodeNumber <= eliminatedEpisodeNumber)
        .sort((a, b) => a.episodeNumber - b.episodeNumber);
    },
    ["player-confessionals", String(castMemberId)],
    { tags: ["episodes"] }
  )();

export type PlayerEpisodeBreakdown = {
  episodeId: number;
  episodeNumber: number;
  episodeTitle: string;
  totalPoints: number;
  breakdown: { eventType: string; points: number }[];
};

export const getPlayerEpisodeBreakdown = (castMemberId: number) =>
  unstable_cache(
    async (): Promise<PlayerEpisodeBreakdown[]> => {
      const rows = await db
        .select({
          episodeId: castMemberEpisodePointsTable.episodeId,
          episodeNumber: episodesTable.episodeNumber,
          episodeTitle: episodesTable.title,
          eventType: castMemberEpisodePointsTable.eventType,
          points: castMemberEpisodePointsTable.points,
        })
        .from(castMemberEpisodePointsTable)
        .innerJoin(episodesTable, eq(episodesTable.id, castMemberEpisodePointsTable.episodeId))
        .where(eq(castMemberEpisodePointsTable.castMemberId, castMemberId))
        .orderBy(episodesTable.episodeNumber);

      // Group by episode
      const epMap = new Map<number, PlayerEpisodeBreakdown>();
      for (const r of rows) {
        if (!epMap.has(r.episodeId)) {
          epMap.set(r.episodeId, {
            episodeId: r.episodeId,
            episodeNumber: r.episodeNumber ?? 0,
            episodeTitle: r.episodeTitle ?? "",
            totalPoints: 0,
            breakdown: [],
          });
        }
        const ep = epMap.get(r.episodeId)!;
        ep.totalPoints += r.points;
        ep.breakdown.push({ eventType: r.eventType, points: r.points });
      }

      return [...epMap.values()].sort((a, b) => a.episodeNumber - b.episodeNumber);
    },
    ["player-episode-breakdown", String(castMemberId)],
    { tags: ["episodes"] }
  )();

export type FantasyPoint = {
  episodeNumber: number;
  points: number;
  avg: number;
};

export const getPlayerFantasyPoints = (castMemberId: number) =>
  unstable_cache(
    async (): Promise<FantasyPoint[]> => {
      const [playerRows, allRows, episodes] = await Promise.all([
        // This player's total points per episode
        db
          .select({
            episodeId: castMemberEpisodePointsTable.episodeId,
            points: sql<number>`sum(${castMemberEpisodePointsTable.points})`,
          })
          .from(castMemberEpisodePointsTable)
          .where(eq(castMemberEpisodePointsTable.castMemberId, castMemberId))
          .groupBy(castMemberEpisodePointsTable.episodeId),

        // Active players' totals per episode (for average — excludes eliminated players)
        (() => {
          const eliminatedEp = alias(episodesTable, "eliminated_ep");
          const currentEp = alias(episodesTable, "current_ep");
          return db
            .select({
              episodeId: castMemberEpisodePointsTable.episodeId,
              points: sql<number>`sum(${castMemberEpisodePointsTable.points})`,
            })
            .from(castMemberEpisodePointsTable)
            .innerJoin(castMembersTable, eq(castMembersTable.id, castMemberEpisodePointsTable.castMemberId))
            .innerJoin(currentEp, eq(currentEp.id, castMemberEpisodePointsTable.episodeId))
            .leftJoin(eliminatedEp, eq(eliminatedEp.id, castMembersTable.eliminatedEpisodeId))
            .where(
              sql`${castMembersTable.eliminatedEpisodeId} is null or ${eliminatedEp.episodeNumber} >= ${currentEp.episodeNumber}`
            )
            .groupBy(
              castMemberEpisodePointsTable.episodeId,
              castMemberEpisodePointsTable.castMemberId,
            );
        })(),

        db
          .select({ id: episodesTable.id, episodeNumber: episodesTable.episodeNumber })
          .from(episodesTable),
      ]);

      if (playerRows.length === 0) return [];

      // Build average per episode
      const epTotals = new Map<number, number[]>();
      for (const r of allRows) {
        if (!epTotals.has(r.episodeId)) epTotals.set(r.episodeId, []);
        epTotals.get(r.episodeId)!.push(Number(r.points));
      }
      const avgMap = new Map(
        [...epTotals.entries()].map(([epId, pts]) => [
          epId,
          Math.round((pts.reduce((s, v) => s + v, 0) / pts.length) * 10) / 10,
        ]),
      );

      const epNumMap = new Map(episodes.map((e) => [e.id, e.episodeNumber]));

      return playerRows
        .map((r) => ({
          episodeNumber: epNumMap.get(r.episodeId) ?? 0,
          points: Number(r.points),
          avg: avgMap.get(r.episodeId) ?? 0,
        }))
        .sort((a, b) => a.episodeNumber - b.episodeNumber);
    },
    ["player-fantasy-points", String(castMemberId)],
    { tags: ["episodes"] }
  )();

export type SeasonRank = {
  totalPoints: number;
  rank: number;
  totalPlayers: number;
};

export const getPlayerSeasonRank = (castMemberId: number) =>
  unstable_cache(
    async (): Promise<SeasonRank> => {
      const [player] = await db
        .select({ seasonNumber: castMembersTable.seasonNumber })
        .from(castMembersTable)
        .where(eq(castMembersTable.id, castMemberId));

      if (!player?.seasonNumber) return { totalPoints: 0, rank: 1, totalPlayers: 1 };

      const rows = await db
        .select({
          castMemberId: castMemberEpisodePointsTable.castMemberId,
          total: sql<number>`sum(${castMemberEpisodePointsTable.points})`,
        })
        .from(castMemberEpisodePointsTable)
        .innerJoin(castMembersTable, eq(castMembersTable.id, castMemberEpisodePointsTable.castMemberId))
        .where(eq(castMembersTable.seasonNumber, player.seasonNumber))
        .groupBy(castMemberEpisodePointsTable.castMemberId)
        .orderBy(sql`sum(${castMemberEpisodePointsTable.points}) desc`);

      const totalPlayers = rows.length;
      const index = rows.findIndex((r) => r.castMemberId === castMemberId);
      const rank = index === -1 ? totalPlayers : index + 1;
      const totalPoints = index === -1 ? 0 : Number(rows[index].total);

      return { totalPoints, rank, totalPlayers };
    },
    ["player-season-rank", String(castMemberId)],
    { tags: ["episodes"] }
  )();

export const getCastMemberProfile = (castMemberId: number) =>
  unstable_cache(
    async (): Promise<SelectCastMemberProfile | null> => {
      const [row] = await db
        .select()
        .from(castMemberProfilesTable)
        .where(eq(castMemberProfilesTable.castMemberId, castMemberId));
      return row ?? null;
    },
    ["cast-member-profile", String(castMemberId)],
    { tags: ["cast-members"] }
  )();
