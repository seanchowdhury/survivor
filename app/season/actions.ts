import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { sql, eq } from "drizzle-orm";
import { castMembersTable, castMemberEpisodePointsTable, confessionalCountTable, episodesTable } from "@/db/schema";

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
