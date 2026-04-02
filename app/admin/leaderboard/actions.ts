"use server";

import { revalidateTag, unstable_cache } from "next/cache";
import { db } from "@/db";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  castMemberEpisodePointsTable,
  castMembersTable,
  challengesTable,
  challengeWinnersTable,
  confessionalCountTable,
  episodesTable,
  idolsTable,
  miscTable,
  participantEpisodeRosterTable,
  participantsTable,
  scoringRulesTable,
  tribalCouncilsTable,
  tribalVotesTable,
} from "@/db/schema";

const EPISODE_EVENT_TYPES = [
  "confessional_per_count",
  "not_eliminated_per_episode",
  "won_individual_immunity",
  "won_tribal_immunity",
  "won_reward",
  "right_side_of_vote",
  "effectively_blindsided_vote",
  "blindsided_and_eliminated",
  "found_idol",
  "played_idol",
  "went_home_with_idol",
  "drinks_wine",
  "hunted_for_food",
  "cancels_christmas",
  "premerge_tribal_council",
] as const;

const SEASON_EVENT_TYPES = [
  "winner",
  "final_3",
  "makes_merge",
  "voted_for_winner",
  "medical_evac",
  "quit",
] as const;

type PointEntry = {
  castMemberId: number;
  episodeId: number;
  eventType: string;
  points: number;
};

function accumulate(
  map: Map<string, number>,
  castMemberId: number,
  eventType: string,
  points: number,
) {
  const key = `${castMemberId}:${eventType}`;
  map.set(key, (map.get(key) ?? 0) + points);
}

function flattenPoints(
  map: Map<string, number>,
  episodeId: number,
): PointEntry[] {
  return [...map.entries()].map(([key, points]) => {
    const colon = key.indexOf(":");
    return {
      castMemberId: parseInt(key.slice(0, colon)),
      episodeId,
      eventType: key.slice(colon + 1),
      points,
    };
  });
}

export async function recalculateEpisodeScores(episodeId: number) {
  const episodes = await db
    .select()
    .from(episodesTable)
    .where(eq(episodesTable.id, episodeId));
  if (!episodes.length) return;
  const episode = episodes[0];
  const episodeNumber = episode.episodeNumber ?? 0;

  // Load scoring rules
  const rules = await db.select().from(scoringRulesTable);
  const ruleMap: Record<string, number> = Object.fromEntries(
    rules.map((r) => [r.eventType, r.pointsPerUnit]),
  );

  // Determine if pre-merge
  const mergeEpisodes = await db
    .select({ episodeNumber: episodesTable.episodeNumber })
    .from(episodesTable)
    .where(eq(episodesTable.mergeOccurred, true));
  const mergeEpisodeNumber =
    mergeEpisodes.length > 0
      ? Math.min(...mergeEpisodes.map((e) => e.episodeNumber ?? Infinity))
      : Infinity;
  const isPreMerge = episodeNumber < mergeEpisodeNumber;

  // Cast members with their elimination episode number
  const elimEp = alias(episodesTable, "elim_ep");
  const castMembers = await db
    .select({
      id: castMembersTable.id,
      eliminatedEpisodeId: castMembersTable.eliminatedEpisodeId,
      eliminatedEpisodeNumber: elimEp.episodeNumber,
      evacuated: castMembersTable.evacuated,
    })
    .from(castMembersTable)
    .leftJoin(elimEp, eq(elimEp.id, castMembersTable.eliminatedEpisodeId));

  const pts = new Map<string, number>();

  // not_eliminated_per_episode: alive players (eliminatedEpisodeNumber > current OR null)
  for (const cm of castMembers) {
    const alive =
      cm.eliminatedEpisodeId === null ||
      (cm.eliminatedEpisodeNumber ?? 0) > episodeNumber ||
      (cm.evacuated && (cm.eliminatedEpisodeNumber ?? 0) === episodeNumber);
    if (alive) {
      accumulate(
        pts,
        cm.id,
        "not_eliminated_per_episode",
        ruleMap["not_eliminated_per_episode"] ?? 10,
      );
    }
  }

  // confessional_per_count
  const confessionals = await db
    .select()
    .from(confessionalCountTable)
    .where(eq(confessionalCountTable.episodeId, episodeId));
  for (const c of confessionals) {
    if (c.count > 0) {
      accumulate(
        pts,
        c.castMemberId,
        "confessional_per_count",
        c.count * (ruleMap["confessional_per_count"] ?? 5),
      );
    }
  }

  // Challenge winners
  const challengeWinners = await db
    .select({
      castMemberId: challengeWinnersTable.castMemberId,
      placement: challengeWinnersTable.placement,
      isImmunity: challengesTable.isImmunity,
      gotReward: challengeWinnersTable.gotReward,
      individualChallenge: challengesTable.individualChallenge,
    })
    .from(challengeWinnersTable)
    .innerJoin(
      challengesTable,
      eq(challengesTable.id, challengeWinnersTable.challengeId),
    )
    .where(eq(challengesTable.episodeId, episodeId));

  for (const w of challengeWinners) {
    if (w.placement !== 1) continue;
    if (w.isImmunity && w.individualChallenge) {
      accumulate(
        pts,
        w.castMemberId,
        "won_individual_immunity",
        ruleMap["won_individual_immunity"] ?? 20,
      );
    }
    if (w.isImmunity && !w.individualChallenge) {
      accumulate(
        pts,
        w.castMemberId,
        "won_tribal_immunity",
        ruleMap["won_tribal_immunity"] ?? 3,
      );
    }
    if (w.gotReward) {
      accumulate(
        pts,
        w.castMemberId,
        "won_reward",
        ruleMap["won_reward"] ?? 3,
      );
    }
  }

  // Tribal council events
  const councils = await db
    .select({
      councilId: tribalCouncilsTable.id,
      eliminatedCastMemberId: tribalCouncilsTable.eliminatedCastMemberId,
      blindsided: tribalCouncilsTable.blindsided,
    })
    .from(tribalCouncilsTable)
    .where(eq(tribalCouncilsTable.episodeId, episodeId));

  if (councils.length > 0) {
    const councilIds = councils.map((c) => c.councilId);
    const votes = await db
      .select({
        voterId: tribalVotesTable.voterId,
        votedForId: tribalVotesTable.votedForId,
        tribalCouncilId: tribalVotesTable.tribalCouncilId,
      })
      .from(tribalVotesTable)
      .where(inArray(tribalVotesTable.tribalCouncilId, councilIds));

    const councilMap = Object.fromEntries(councils.map((c) => [c.councilId, c]));

    for (const vote of votes) {
      const council = councilMap[vote.tribalCouncilId];
      if (!council) continue;

      if (isPreMerge) {
        accumulate(
          pts,
          vote.voterId,
          "premerge_tribal_council",
          ruleMap["premerge_tribal_council"] ?? -3,
        );
      }

      if (
        vote.votedForId !== null &&
        vote.votedForId === council.eliminatedCastMemberId
      ) {
        accumulate(
          pts,
          vote.voterId,
          "right_side_of_vote",
          ruleMap["right_side_of_vote"] ?? 5,
        );
        if (council.blindsided) {
          accumulate(
            pts,
            vote.voterId,
            "effectively_blindsided_vote",
            ruleMap["effectively_blindsided_vote"] ?? 10,
          );
        }
      }
    }

    // blindsided_and_eliminated
    for (const council of councils) {
      if (council.blindsided && council.eliminatedCastMemberId) {
        accumulate(
          pts,
          council.eliminatedCastMemberId,
          "blindsided_and_eliminated",
          ruleMap["blindsided_and_eliminated"] ?? -5,
        );
      }
    }
  }

  // Idols found this episode
  const foundIdols = await db
    .select()
    .from(idolsTable)
    .where(eq(idolsTable.foundInEpisodeId, episodeId));
  for (const idol of foundIdols) {
    accumulate(
      pts,
      idol.foundByCastMemberId,
      "found_idol",
      ruleMap["found_idol"] ?? 15,
    );
  }

  // Idols played this episode
  const playedIdols = await db
    .select()
    .from(idolsTable)
    .where(eq(idolsTable.usedInEpisodeId, episodeId));
  for (const idol of playedIdols) {
    if (idol.usedByCastMemberId) {
      accumulate(
        pts,
        idol.usedByCastMemberId,
        "played_idol",
        ruleMap["played_idol"] ?? 7,
      );
    }
  }

  // Went home with idol: eliminated this episode, holding unplayed idol
  const eliminatedThisEpisode = castMembers
    .filter((cm) => cm.eliminatedEpisodeId === episodeId)
    .map((cm) => cm.id);

  if (eliminatedThisEpisode.length > 0) {
    const heldIdols = await db
      .select()
      .from(idolsTable)
      .where(
        and(
          inArray(idolsTable.currentHolderId, eliminatedThisEpisode),
          isNull(idolsTable.usedByCastMemberId),
        ),
      );
    for (const idol of heldIdols) {
      if (idol.currentHolderId) {
        accumulate(
          pts,
          idol.currentHolderId,
          "went_home_with_idol",
          ruleMap["went_home_with_idol"] ?? -10,
        );
      }
    }
  }

  // Misc events
  const miscEntries = await db
    .select()
    .from(miscTable)
    .where(eq(miscTable.episodeId, episodeId));
  const miscEventTypeMap: Record<string, string> = {
    "Drank wine": "drinks_wine",
    "Hunted for food": "hunted_for_food",
    "Cancelled Christmas": "cancels_christmas",
  };
  for (const entry of miscEntries) {
    const eventType = miscEventTypeMap[entry.value];
    if (eventType && ruleMap[eventType] !== undefined) {
      accumulate(pts, entry.castMemberId, eventType, ruleMap[eventType]);
    }
  }

  // Delete existing episode-level rows, then insert fresh
  await db.delete(castMemberEpisodePointsTable).where(
    and(
      eq(castMemberEpisodePointsTable.episodeId, episodeId),
      inArray(castMemberEpisodePointsTable.eventType, [
        ...EPISODE_EVENT_TYPES,
      ]),
    ),
  );

  const entries = flattenPoints(pts, episodeId);
  if (entries.length > 0) {
    await db.insert(castMemberEpisodePointsTable).values(entries);
  }

  await recalculateSeasonScores();
  revalidateTag("episodes", "default");
}

export async function recalculateSeasonScores() {
  const rules = await db.select().from(scoringRulesTable);
  const ruleMap: Record<string, number> = Object.fromEntries(
    rules.map((r) => [r.eventType, r.pointsPerUnit]),
  );

  const [castMembers, allEpisodes] = await Promise.all([
    db.select().from(castMembersTable),
    db.select().from(episodesTable),
  ]);

  if (!allEpisodes.length) return;

  const finaleEpisode = allEpisodes.reduce((max, ep) =>
    (ep.episodeNumber ?? 0) > (max.episodeNumber ?? 0) ? ep : max,
  );
  const mergeEpisode = allEpisodes.find((ep) => ep.mergeOccurred) ?? null;
  const episodeNumberMap = Object.fromEntries(
    allEpisodes.map((ep) => [ep.id, ep.episodeNumber ?? 0]),
  );

  // Delete all season-level event rows
  await db.delete(castMemberEpisodePointsTable).where(
    inArray(castMemberEpisodePointsTable.eventType, [...SEASON_EVENT_TYPES]),
  );

  const entries: PointEntry[] = [];

  const winner = castMembers.find((cm) => cm.finalPlacement === 1);

  // winner
  if (winner) {
    entries.push({
      castMemberId: winner.id,
      episodeId: finaleEpisode.id,
      eventType: "winner",
      points: ruleMap["winner"] ?? 100,
    });
  }

  // final_3
  for (const cm of castMembers) {
    if (cm.finalPlacement !== null && cm.finalPlacement <= 3) {
      entries.push({
        castMemberId: cm.id,
        episodeId: finaleEpisode.id,
        eventType: "final_3",
        points: ruleMap["final_3"] ?? 25,
      });
    }
  }

  // makes_merge
  if (mergeEpisode) {
    const mergeNumber = mergeEpisode.episodeNumber ?? 0;
    for (const cm of castMembers) {
      const alive =
        cm.eliminatedEpisodeId === null ||
        (episodeNumberMap[cm.eliminatedEpisodeId] ?? 0) >= mergeNumber;
      if (alive) {
        entries.push({
          castMemberId: cm.id,
          episodeId: mergeEpisode.id,
          eventType: "makes_merge",
          points: ruleMap["makes_merge"] ?? 25,
        });
      }
    }
  }

  // voted_for_winner: jury vote for winner at finale tribal council
  if (winner) {
    const finaleCouncils = await db
      .select({ id: tribalCouncilsTable.id })
      .from(tribalCouncilsTable)
      .where(eq(tribalCouncilsTable.episodeId, finaleEpisode.id));

    if (finaleCouncils.length > 0) {
      const finaleCouncilIds = finaleCouncils.map((c) => c.id);
      const winnerVotes = await db
        .select({ voterId: tribalVotesTable.voterId })
        .from(tribalVotesTable)
        .where(
          and(
            inArray(tribalVotesTable.tribalCouncilId, finaleCouncilIds),
            eq(tribalVotesTable.votedForId, winner.id),
          ),
        );
      for (const vote of winnerVotes) {
        entries.push({
          castMemberId: vote.voterId,
          episodeId: finaleEpisode.id,
          eventType: "voted_for_winner",
          points: ruleMap["voted_for_winner"] ?? 5,
        });
      }
    }
  }

  // medical_evac
  for (const cm of castMembers) {
    if (cm.evacuated && cm.eliminatedEpisodeId) {
      entries.push({
        castMemberId: cm.id,
        episodeId: cm.eliminatedEpisodeId,
        eventType: "medical_evac",
        points: ruleMap["medical_evac"] ?? 40,
      });
    }
  }

  // quit
  for (const cm of castMembers) {
    if (cm.quit && cm.eliminatedEpisodeId) {
      entries.push({
        castMemberId: cm.id,
        episodeId: cm.eliminatedEpisodeId,
        eventType: "quit",
        points: ruleMap["quit"] ?? -25,
      });
    }
  }

  if (entries.length > 0) {
    await db.insert(castMemberEpisodePointsTable).values(entries);
  }
  revalidateTag("season", "default");
  revalidateTag("leaderboard", "default");
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

export const getLeaderboard = unstable_cache(
  async (): Promise<LeaderboardEntry[]> => {
  // Total points per participant
  const totals = await db
    .select({
      participantId: participantsTable.id,
      participantName: participantsTable.name,
      totalPoints:
        sql<number>`coalesce(sum(${castMemberEpisodePointsTable.points}), 0)`.as(
          "total_points",
        ),
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
      points:
        sql<number>`coalesce(sum(${castMemberEpisodePointsTable.points}), 0)`.as(
          "episode_points",
        ),
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
    .groupBy(
      participantsTable.id,
      episodesTable.id,
      episodesTable.episodeNumber,
      episodesTable.title,
    )
    .orderBy(episodesTable.episodeNumber);

  // Group breakdowns by participant
  const breakdownByParticipant: Record<
    number,
    LeaderboardEntry["episodeBreakdown"]
  > = {};
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
  },
  ["leaderboard"],
  { tags: ["leaderboard"] }
);

export async function seedScoringRules() {
  const newRules = [
    { eventType: "winner", pointsPerUnit: 100, description: "Won the game" },
    { eventType: "medical_evac", pointsPerUnit: 40, description: "Medically evacuated" },
    { eventType: "final_3", pointsPerUnit: 25, description: "Made the Final 3" },
    { eventType: "makes_merge", pointsPerUnit: 25, description: "Survived to the merge" },
    { eventType: "won_individual_immunity", pointsPerUnit: 20, description: "Won individual immunity" },
    { eventType: "found_idol", pointsPerUnit: 15, description: "Found a hidden immunity idol" },
    { eventType: "not_eliminated_per_episode", pointsPerUnit: 10, description: "Survived an episode" },
    { eventType: "effectively_blindsided_vote", pointsPerUnit: 10, description: "Voted for a blindsided castaway" },
    { eventType: "played_idol", pointsPerUnit: 7, description: "Played a hidden immunity idol" },
    { eventType: "drinks_wine", pointsPerUnit: 5, description: "Drank wine" },
    { eventType: "hunted_for_food", pointsPerUnit: 5, description: "Shown hunting for food" },
    { eventType: "voted_for_winner", pointsPerUnit: 5, description: "Jury vote for the winner at Final TC" },
    { eventType: "right_side_of_vote", pointsPerUnit: 5, description: "Voted for the eliminated castaway" },
    { eventType: "won_tribal_immunity", pointsPerUnit: 3, description: "Won tribal immunity (1st place tribe)" },
    { eventType: "won_reward", pointsPerUnit: 3, description: "Won a reward challenge" },
    { eventType: "cancels_christmas", pointsPerUnit: 0, description: "Cancelled Christmas" },
    { eventType: "premerge_tribal_council", pointsPerUnit: -3, description: "Attended tribal council before merge" },
    { eventType: "blindsided_and_eliminated", pointsPerUnit: -5, description: "Eliminated in a blindside" },
    { eventType: "went_home_with_idol", pointsPerUnit: -10, description: "Eliminated holding an unplayed idol" },
    { eventType: "quit", pointsPerUnit: -25, description: "Quit voluntarily" },
  ];

  for (const rule of newRules) {
    await db
      .insert(scoringRulesTable)
      .values(rule)
      .onConflictDoNothing();
  }

  // Update confessional_per_count from the old default of 1 to 5
  await db
    .insert(scoringRulesTable)
    .values({ eventType: "confessional_per_count", pointsPerUnit: 5, description: "5 points per confessional" })
    .onConflictDoUpdate({
      target: scoringRulesTable.eventType,
      set: { pointsPerUnit: 5, description: "5 points per confessional" },
    });
}
