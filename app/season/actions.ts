import { db } from "@/db";
import { sql, eq } from "drizzle-orm";
import { castMembersTable, castMemberEpisodePointsTable } from "@/db/schema";

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

export async function getSeasonTotals(): Promise<SeasonCastMemberRow[]> {
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
}
