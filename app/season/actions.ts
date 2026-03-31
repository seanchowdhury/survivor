import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { sql, eq, isNotNull, isNull, and, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { castMembersTable, castMemberEpisodePointsTable, confessionalCountTable, episodesTable, tribalCouncilsTable, tribalVotesTable, challengesTable, challengeWinnersTable, idolsTable, advantagesTable, castMemberEpisodeTribeTable } from "@/db/schema";

export type StatCategory = {
  label: string;
  points: number;
};

export type SeasonCastMemberRow = {
  castMemberId: number;
  name: string;
  imageUrl: string;
  portraitImageUrl: string | null;
  tribe: string;
  totalPoints: number;
  isEliminated: boolean;
  finalPlacement: number | null;
  stats: StatCategory[];
};

const STAT_CATEGORIES: { label: string; eventTypes: string[] }[] = [
  {
    label: "Survival",
    eventTypes: [
      "not_eliminated_per_episode",
      "makes_merge",
      "final_3",
      "winner",
      "medical_evac",
      "quit",
    ],
  },
  {
    label: "Challenges",
    eventTypes: ["won_individual_immunity", "won_tribal_immunity", "won_reward"],
  },
  {
    label: "Confessionals",
    eventTypes: [
      "confessional_per_count",
      "drinks_wine",
      "hunted_for_food",
      "cancels_christmas",
    ],
  },
  {
    label: "Social/Voting",
    eventTypes: [
      "right_side_of_vote",
      "effectively_blindsided_vote",
      "voted_for_winner",
      "premerge_tribal_council",
      "blindsided_and_eliminated",
    ],
  },
  {
    label: "Idols",
    eventTypes: ["found_idol", "played_idol", "went_home_with_idol"],
  },
];

export const getSeasonTotals = unstable_cache(
  async (): Promise<SeasonCastMemberRow[]> => {
  const [totals, eventTotals] = await Promise.all([
    db
      .select({
        castMemberId: castMembersTable.id,
        name: castMembersTable.name,
        imageUrl: castMembersTable.imageUrl,
        portraitImageUrl: castMembersTable.portraitImageUrl,
        tribe: castMembersTable.tribe,
        finalPlacement: castMembersTable.finalPlacement,
        evacuated: castMembersTable.evacuated,
        quit: castMembersTable.quit,
        eliminatedEpisodeId: castMembersTable.eliminatedEpisodeId,
        totalPoints: sql<number>`coalesce(sum(${castMemberEpisodePointsTable.points}), 0)`.as(
          "total_points"
        ),
      })
      .from(castMembersTable)
      .leftJoin(
        castMemberEpisodePointsTable,
        eq(castMemberEpisodePointsTable.castMemberId, castMembersTable.id)
      )
      .groupBy(
        castMembersTable.id,
        castMembersTable.name,
        castMembersTable.imageUrl,
        castMembersTable.portraitImageUrl,
        castMembersTable.tribe,
        castMembersTable.finalPlacement,
        castMembersTable.evacuated,
        castMembersTable.quit,
        castMembersTable.eliminatedEpisodeId
      )
      .orderBy(sql`total_points desc`),

    db
      .select({
        castMemberId: castMemberEpisodePointsTable.castMemberId,
        eventType: castMemberEpisodePointsTable.eventType,
        points: sql<number>`sum(${castMemberEpisodePointsTable.points})`.as("pts"),
      })
      .from(castMemberEpisodePointsTable)
      .groupBy(
        castMemberEpisodePointsTable.castMemberId,
        castMemberEpisodePointsTable.eventType
      ),
  ]);

  // Build map: castMemberId -> eventType -> points
  const eventMap = new Map<number, Record<string, number>>();
  for (const row of eventTotals) {
    const existing = eventMap.get(row.castMemberId) ?? {};
    existing[row.eventType] = Number(row.points);
    eventMap.set(row.castMemberId, existing);
  }

  return totals.map((row) => {
    const eventsByType = eventMap.get(row.castMemberId) ?? {};
    const stats: StatCategory[] = STAT_CATEGORIES.map((cat) => ({
      label: cat.label,
      points: cat.eventTypes.reduce((sum, et) => sum + (eventsByType[et] ?? 0), 0),
    }));

    return {
      castMemberId: row.castMemberId,
      name: row.name,
      imageUrl: row.imageUrl,
      portraitImageUrl: row.portraitImageUrl,
      tribe: row.tribe,
      totalPoints: Number(row.totalPoints),
      isEliminated: row.eliminatedEpisodeId !== null,
      finalPlacement: row.finalPlacement,
      stats,
    };
  });
  },
  ["season-totals"],
  { tags: ["season"] }
);

export type HeatmapData = {
  episodes: { id: number; episodeNumber: number | null; title: string; mergeOccurred: boolean }[];
  castaways: {
    castMemberId: number;
    name: string;
    imageUrl: string;
    tribe: string;
    eliminatedEpisodeId: number | null;
    counts: (number | null)[];
  }[];
  maxCount: number;
};

export const getConfessionalHeatmap = unstable_cache(
  async (): Promise<HeatmapData> => {
  const [episodes, countRows] = await Promise.all([
    db
      .select({
        id: episodesTable.id,
        episodeNumber: episodesTable.episodeNumber,
        title: episodesTable.title,
        mergeOccurred: episodesTable.mergeOccurred,
      })
      .from(episodesTable)
      .orderBy(episodesTable.episodeNumber),

    db
      .select({
        castMemberId: castMembersTable.id,
        name: castMembersTable.name,
        imageUrl: castMembersTable.imageUrl,
        tribe: castMembersTable.tribe,
        eliminatedEpisodeId: castMembersTable.eliminatedEpisodeId,
        episodeId: confessionalCountTable.episodeId,
        count: confessionalCountTable.count,
      })
      .from(confessionalCountTable)
      .innerJoin(castMembersTable, eq(castMembersTable.id, confessionalCountTable.castMemberId)),
  ]);

  // Build map: castMemberId -> episodeId -> count
  const countMap = new Map<number, Map<number, number>>();
  const castawayMeta = new Map<number, { name: string; imageUrl: string; tribe: string; eliminatedEpisodeId: number | null }>();

  for (const row of countRows) {
    if (!countMap.has(row.castMemberId)) countMap.set(row.castMemberId, new Map());
    countMap.get(row.castMemberId)!.set(row.episodeId, row.count);
    if (!castawayMeta.has(row.castMemberId)) {
      castawayMeta.set(row.castMemberId, {
        name: row.name,
        imageUrl: row.imageUrl,
        tribe: row.tribe,
        eliminatedEpisodeId: row.eliminatedEpisodeId,
      });
    }
  }

  // Sort: active players first (by total confessionals desc), eliminated last (by total confessionals desc)
  const sortedIds = [...countMap.keys()].sort((a, b) => {
    const metaA = castawayMeta.get(a)!;
    const metaB = castawayMeta.get(b)!;
    const eliminatedA = metaA.eliminatedEpisodeId !== null ? 1 : 0;
    const eliminatedB = metaB.eliminatedEpisodeId !== null ? 1 : 0;
    if (eliminatedA !== eliminatedB) return eliminatedA - eliminatedB;
    const totalA = [...(countMap.get(a)?.values() ?? [])].reduce((s, v) => s + v, 0);
    const totalB = [...(countMap.get(b)?.values() ?? [])].reduce((s, v) => s + v, 0);
    return totalB - totalA;
  });

  let maxCount = 1;
  for (const epMap of countMap.values()) {
    for (const c of epMap.values()) {
      if (c > maxCount) maxCount = c;
    }
  }

  const castaways = sortedIds.map((id) => {
    const meta = castawayMeta.get(id)!;
    const epMap = countMap.get(id)!;
    const counts = episodes.map((ep) => epMap.get(ep.id) ?? null);
    return { castMemberId: id, ...meta, counts };
  });

  return { episodes, castaways, maxCount };
  },
  ["confessional-heatmap"],
  { tags: ["season"] }
);

export type VotesAgainstEntry = {
  castMemberId: number;
  name: string;
  imageUrl: string;
  preMerge: number;
  postMerge: number;
  total: number;
};

export const getVotesAgainst = unstable_cache(
  async (): Promise<{ entries: VotesAgainstEntry[]; hasMerge: boolean }> => {
    const votedFor = alias(castMembersTable, "voted_for");

    const rows = await db
      .select({
        castMemberId: votedFor.id,
        name: votedFor.name,
        imageUrl: votedFor.imageUrl,
        episodeNumber: episodesTable.episodeNumber,
        mergeOccurred: episodesTable.mergeOccurred,
      })
      .from(tribalVotesTable)
      .innerJoin(tribalCouncilsTable, eq(tribalCouncilsTable.id, tribalVotesTable.tribalCouncilId))
      .innerJoin(episodesTable, eq(episodesTable.id, tribalCouncilsTable.episodeId))
      .innerJoin(votedFor, eq(votedFor.id, tribalVotesTable.votedForId))
      .where(and(isNotNull(tribalVotesTable.votedForId), isNull(votedFor.eliminatedEpisodeId)));

    if (rows.length === 0) return { entries: [], hasMerge: false };

    // Find the merge episode number
    const mergeEpisodeNumber = rows.find((r) => r.mergeOccurred)?.episodeNumber ?? null;
    const hasMerge = mergeEpisodeNumber !== null;

    // Tally votes per castaway
    const tally = new Map<number, VotesAgainstEntry>();
    for (const row of rows) {
      if (!tally.has(row.castMemberId)) {
        tally.set(row.castMemberId, {
          castMemberId: row.castMemberId,
          name: row.name,
          imageUrl: row.imageUrl,
          preMerge: 0,
          postMerge: 0,
          total: 0,
        });
      }
      const entry = tally.get(row.castMemberId)!;
      const isPostMerge = hasMerge && row.episodeNumber != null && row.episodeNumber >= mergeEpisodeNumber!;
      if (isPostMerge) {
        entry.postMerge += 1;
      } else {
        entry.preMerge += 1;
      }
      entry.total += 1;
    }

    const entries = [...tally.values()]
      .filter((e) => e.total > 0)
      .sort((a, b) => b.total - a.total);

    return { entries, hasMerge };
  },
  ["votes-against"],
  { tags: ["episodes"] }
);

export type ChallengeWinsEntry = {
  castMemberId: number;
  name: string;
  imageUrl: string;
  isEliminated: boolean;
  wins: number;
};

export type RightSideEntry = {
  castMemberId: number;
  name: string;
  imageUrl: string;
  rightVotes: number;
  totalVotes: number;
};

export const getRightSideOfVote = unstable_cache(
  async (): Promise<RightSideEntry[]> => {
    const rows = await db
      .select({
        castMemberId: castMembersTable.id,
        name: castMembersTable.name,
        imageUrl: castMembersTable.imageUrl,
        rightVotes: sql<number>`count(*) filter (where ${tribalVotesTable.votedForId} = ${tribalCouncilsTable.eliminatedCastMemberId})`,
        totalVotes: sql<number>`count(*) filter (where ${tribalVotesTable.votedForId} is not null)`,
      })
      .from(tribalVotesTable)
      .innerJoin(tribalCouncilsTable, eq(tribalCouncilsTable.id, tribalVotesTable.tribalCouncilId))
      .innerJoin(castMembersTable, eq(castMembersTable.id, tribalVotesTable.voterId))
      .where(sql`${castMembersTable.eliminatedEpisodeId} is null`)
      .groupBy(castMembersTable.id, castMembersTable.name, castMembersTable.imageUrl)
      .orderBy(sql`count(*) filter (where ${tribalVotesTable.votedForId} = ${tribalCouncilsTable.eliminatedCastMemberId}) desc`);

    return rows.map((r) => ({
      ...r,
      rightVotes: Number(r.rightVotes),
      totalVotes: Number(r.totalVotes),
    }));
  },
  ["right-side-of-vote"],
  { tags: ["episodes"] }
);

export type ContentionEntry = {
  voterId: number;
  voterName: string;
  voterImageUrl: string;
  votedForId: number;
  votedForName: string;
  votedForImageUrl: string;
  count: number;
};

export const getContention = unstable_cache(
  async (): Promise<ContentionEntry[]> => {
    const voter = alias(castMembersTable, "voter");
    const votedFor = alias(castMembersTable, "voted_for");

    const rows = await db
      .select({
        voterId: voter.id,
        voterName: voter.name,
        voterImageUrl: voter.imageUrl,
        votedForId: votedFor.id,
        votedForName: votedFor.name,
        votedForImageUrl: votedFor.imageUrl,
        count: sql<number>`count(*)`,
      })
      .from(tribalVotesTable)
      .innerJoin(tribalCouncilsTable, eq(tribalCouncilsTable.id, tribalVotesTable.tribalCouncilId))
      .innerJoin(voter, eq(voter.id, tribalVotesTable.voterId))
      .innerJoin(votedFor, eq(votedFor.id, tribalVotesTable.votedForId))
      .where(
        sql`${voter.eliminatedEpisodeId} is null and ${votedFor.eliminatedEpisodeId} is null and ${tribalVotesTable.votedForId} is not null`
      )
      .groupBy(voter.id, voter.name, voter.imageUrl, votedFor.id, votedFor.name, votedFor.imageUrl)
      .orderBy(sql`count(*) desc`);

    return rows.map((r) => ({ ...r, count: Number(r.count) }));
  },
  ["contention"],
  { tags: ["episodes"] }
);

export const getChallengeWins = unstable_cache(
  async (): Promise<ChallengeWinsEntry[]> => {
    const rows = await db
      .select({
        castMemberId: castMembersTable.id,
        name: castMembersTable.name,
        imageUrl: castMembersTable.imageUrl,
        isEliminated: sql<boolean>`${castMembersTable.eliminatedEpisodeId} is not null`,
        wins: sql<number>`count(*)`,
      })
      .from(challengeWinnersTable)
      .innerJoin(challengesTable, eq(challengesTable.id, challengeWinnersTable.challengeId))
      .innerJoin(castMembersTable, eq(castMembersTable.id, challengeWinnersTable.castMemberId))
      .groupBy(castMembersTable.id, castMembersTable.name, castMembersTable.imageUrl, castMembersTable.eliminatedEpisodeId)
      .orderBy(sql`count(*) desc`);

    return rows.map((r) => ({ ...r, wins: Number(r.wins) }));
  },
  ["challenge-wins"],
  { tags: ["episodes"] }
);

export type IdolEntry = {
  id: number;
  type: "idol" | "advantage";
  label: string | null;
  foundByName: string;
  foundByImageUrl: string;
  foundInEpisodeNumber: number | null;
  currentHolderName: string | null;
  currentHolderImageUrl: string | null;
  currentHolderIsEliminated: boolean;
  usedByName: string | null;
  usedInEpisodeNumber: number | null;
};

export const getIdolsAndAdvantages = unstable_cache(
  async (): Promise<IdolEntry[]> => {
    const foundBy = alias(castMembersTable, "found_by");
    const currentHolder = alias(castMembersTable, "current_holder");
    const usedBy = alias(castMembersTable, "used_by");
    const foundInEp = alias(episodesTable, "found_in_ep");
    const usedInEp = alias(episodesTable, "used_in_ep");

    const [idols, advantages] = await Promise.all([
      db
        .select({
          id: idolsTable.id,
          label: idolsTable.label,
          foundByName: foundBy.name,
          foundByImageUrl: foundBy.imageUrl,
          foundInEpisodeNumber: foundInEp.episodeNumber,
          currentHolderName: currentHolder.name,
          currentHolderImageUrl: currentHolder.imageUrl,
          currentHolderIsEliminated: sql<boolean>`${currentHolder.eliminatedEpisodeId} is not null`,
          usedByName: usedBy.name,
          usedInEpisodeNumber: usedInEp.episodeNumber,
        })
        .from(idolsTable)
        .innerJoin(foundBy, eq(foundBy.id, idolsTable.foundByCastMemberId))
        .innerJoin(foundInEp, eq(foundInEp.id, idolsTable.foundInEpisodeId))
        .leftJoin(currentHolder, eq(currentHolder.id, idolsTable.currentHolderId))
        .leftJoin(usedBy, eq(usedBy.id, idolsTable.usedByCastMemberId))
        .leftJoin(usedInEp, eq(usedInEp.id, idolsTable.usedInEpisodeId)),

      db
        .select({
          id: advantagesTable.id,
          label: advantagesTable.label,
          foundByName: foundBy.name,
          foundByImageUrl: foundBy.imageUrl,
          foundInEpisodeNumber: foundInEp.episodeNumber,
          currentHolderName: currentHolder.name,
          currentHolderImageUrl: currentHolder.imageUrl,
          currentHolderIsEliminated: sql<boolean>`${currentHolder.eliminatedEpisodeId} is not null`,
          usedByName: usedBy.name,
          usedInEpisodeNumber: usedInEp.episodeNumber,
        })
        .from(advantagesTable)
        .innerJoin(foundBy, eq(foundBy.id, advantagesTable.foundByCastMemberId))
        .innerJoin(foundInEp, eq(foundInEp.id, advantagesTable.foundInEpisodeId))
        .leftJoin(currentHolder, eq(currentHolder.id, advantagesTable.currentHolderId))
        .leftJoin(usedBy, eq(usedBy.id, advantagesTable.usedByCastMemberId))
        .leftJoin(usedInEp, eq(usedInEp.id, advantagesTable.usedInEpisodeId)),
    ]);

    const mapped: IdolEntry[] = [
      ...idols.map((r) => ({ ...r, type: "idol" as const })),
      ...advantages.map((r) => ({ ...r, type: "advantage" as const })),
    ];

    return mapped.sort((a, b) => {
      const epA = a.foundInEpisodeNumber ?? Infinity;
      const epB = b.foundInEpisodeNumber ?? Infinity;
      return epA - epB;
    });
  },
  ["idols-and-advantages"],
  { tags: ["episodes"] }
);

// ── Alliance Network Graph ────────────────────────────────────────────────────

export type AllianceNode = {
  id: number;
  name: string;
  imageUrl: string;
  tribe: string;
  currentTribe: string | null; // latest episode tribe from castMemberEpisodeTribeTable
  isEliminated: boolean;
  finalPlacement: number | null;
};

export type CoVoteEdge = {
  playerAId: number;
  playerBId: number;
  coVoteCount: number;
  preMergeCount: number;
  postMergeCount: number;
};

export type AdvantagePairEdge = {
  giverId: number;
  receiverId: number;
};

export type ConflictEdge = {
  voterId: number;
  votedForId: number;
  count: number;
};

export type CurrentTribePair = {
  playerAId: number;
  playerBId: number;
};

export type AllianceGraphData = {
  nodes: AllianceNode[];
  coVoteEdges: CoVoteEdge[];
  advantagePairs: AdvantagePairEdge[];
  conflictEdges: ConflictEdge[];
  currentTribePairs: CurrentTribePair[];
  mergeEpisodeNumber: number | null;
};

export const getAllianceGraphData = unstable_cache(
  async (): Promise<AllianceGraphData> => {
    const tvA = alias(tribalVotesTable, "tv_a");
    const tvB = alias(tribalVotesTable, "tv_b");
    const voter = alias(castMembersTable, "voter");
    const votedFor = alias(castMembersTable, "voted_for");

    const [castRows, coVoteRows, conflictRows, idolPassRows, advantagePassRows, mergeEp, latestTribeRows] = await Promise.all([
      // All cast members
      db.select({
        id: castMembersTable.id,
        name: castMembersTable.name,
        imageUrl: castMembersTable.imageUrl,
        tribe: castMembersTable.tribe,
        eliminatedEpisodeId: castMembersTable.eliminatedEpisodeId,
        finalPlacement: castMembersTable.finalPlacement,
      }).from(castMembersTable),

      // Co-vote pairs: two voters who voted for the same person at the same council
      db.select({
        playerAId: tvA.voterId,
        playerBId: tvB.voterId,
        coVoteCount: sql<number>`count(*)`,
        preMergeCount: sql<number>`count(*) filter (where ${episodesTable.mergeOccurred} = false)`,
        postMergeCount: sql<number>`count(*) filter (where ${episodesTable.mergeOccurred} = true)`,
      })
        .from(tvA)
        .innerJoin(
          tvB,
          sql`${tvA.tribalCouncilId} = ${tvB.tribalCouncilId} and ${tvA.votedForId} = ${tvB.votedForId} and ${tvA.voterId} < ${tvB.voterId} and ${tvA.votedForId} is not null`
        )
        .innerJoin(tribalCouncilsTable, eq(tribalCouncilsTable.id, tvA.tribalCouncilId))
        .innerJoin(episodesTable, eq(episodesTable.id, tribalCouncilsTable.episodeId))
        .groupBy(tvA.voterId, tvB.voterId),

      // Conflict edges: who voted for whom, across all councils
      db.select({
        voterId: voter.id,
        votedForId: votedFor.id,
        count: sql<number>`count(*)`,
      })
        .from(tribalVotesTable)
        .innerJoin(voter, eq(voter.id, tribalVotesTable.voterId))
        .innerJoin(votedFor, eq(votedFor.id, tribalVotesTable.votedForId))
        .where(isNotNull(tribalVotesTable.votedForId))
        .groupBy(voter.id, votedFor.id),

      // Idol passes: idol found by A, currently held by B (B ≠ A)
      db.select({
        giverId: idolsTable.foundByCastMemberId,
        receiverId: idolsTable.currentHolderId,
      })
        .from(idolsTable)
        .where(and(isNotNull(idolsTable.currentHolderId), ne(idolsTable.currentHolderId, idolsTable.foundByCastMemberId))),

      // Advantage passes: same pattern
      db.select({
        giverId: advantagesTable.foundByCastMemberId,
        receiverId: advantagesTable.currentHolderId,
      })
        .from(advantagesTable)
        .where(and(isNotNull(advantagesTable.currentHolderId), ne(advantagesTable.currentHolderId, advantagesTable.foundByCastMemberId))),

      // Merge episode number
      db.select({ episodeNumber: episodesTable.episodeNumber })
        .from(episodesTable)
        .where(eq(episodesTable.mergeOccurred, true))
        .limit(1),

      // Current tribe for each player (latest episode they appear in)
      db.select({
        castMemberId: castMemberEpisodeTribeTable.castMemberId,
        tribe: castMemberEpisodeTribeTable.tribe,
        episodeId: castMemberEpisodeTribeTable.episodeId,
      }).from(castMemberEpisodeTribeTable),
    ]);

    // Derive current tribe per player (latest episodeId wins)
    const currentTribeMap = new Map<number, string>();
    const latestEpMap = new Map<number, number>();
    for (const row of latestTribeRows) {
      const prev = latestEpMap.get(row.castMemberId) ?? -1;
      if (row.episodeId > prev) {
        latestEpMap.set(row.castMemberId, row.episodeId);
        currentTribeMap.set(row.castMemberId, row.tribe);
      }
    }

    // Build current-tribe pairs (only active players on same tribe)
    const activeByCastMember = new Map<number, string>();
    for (const c of castRows) {
      if (c.eliminatedEpisodeId === null) {
        const ct = currentTribeMap.get(c.id);
        if (ct) activeByCastMember.set(c.id, ct);
      }
    }
    const byTribe = new Map<string, number[]>();
    for (const [id, tribe] of activeByCastMember) {
      const list = byTribe.get(tribe) ?? [];
      list.push(id);
      byTribe.set(tribe, list);
    }
    const currentTribePairs: CurrentTribePair[] = [];
    for (const members of byTribe.values()) {
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          currentTribePairs.push({ playerAId: members[i], playerBId: members[j] });
        }
      }
    }

    const nodes: AllianceNode[] = castRows.map((r) => ({
      id: r.id,
      name: r.name,
      imageUrl: r.imageUrl,
      tribe: r.tribe,
      currentTribe: currentTribeMap.get(r.id) ?? null,
      isEliminated: r.eliminatedEpisodeId !== null,
      finalPlacement: r.finalPlacement,
    }));

    const advantagePairs: AdvantagePairEdge[] = [
      ...idolPassRows.map((r) => ({ giverId: r.giverId, receiverId: r.receiverId! })),
      ...advantagePassRows.map((r) => ({ giverId: r.giverId, receiverId: r.receiverId! })),
    ];

    return {
      nodes,
      coVoteEdges: coVoteRows.map((r) => ({
        playerAId: r.playerAId,
        playerBId: r.playerBId,
        coVoteCount: Number(r.coVoteCount),
        preMergeCount: Number(r.preMergeCount),
        postMergeCount: Number(r.postMergeCount),
      })),
      advantagePairs,
      conflictEdges: conflictRows.map((r) => ({ voterId: r.voterId, votedForId: r.votedForId, count: Number(r.count) })),
      currentTribePairs,
      mergeEpisodeNumber: mergeEp[0]?.episodeNumber ?? null,
    };
  },
  ["alliance-graph"],
  { tags: ["episodes"] }
);
