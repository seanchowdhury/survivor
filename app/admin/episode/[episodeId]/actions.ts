"use server";

import { db } from "@/db";
import { eq } from "drizzle-orm";
import {
  castMembersTable,
  challengesTable,
  challengeWinnersTable,
  confessionalCountTable,
  episodesTable,
} from "@/db/schema";
import { takeUniqueOrThrow } from "@/db/helpers";
import { PendingChanges } from "./episode-confessional-count";

export async function getEpisodeDetails(episodeId: number) {
  const episodeDetails = takeUniqueOrThrow(
    await db
      .select()
      .from(episodesTable)
      .where(eq(episodesTable.id, episodeId)),
  );
  return {
    episodeTitle: episodeDetails.title,
    episodeNumber: episodeDetails.episodeNumber,
  };
}

export async function getEpisodeConfessionalCounts(episodeId: number) {
  const results = await db
    .select()
    .from(confessionalCountTable)
    .innerJoin(
      castMembersTable,
      eq(castMembersTable.id, confessionalCountTable.castMemberId),
    )
    .where(eq(confessionalCountTable.episodeId, episodeId));
  const confessionalsByPlayer: Record<
    number,
    { confessionalCount: number; castMemberName: string }
  > = Object.fromEntries(
    results.map((r) => [
      r.confessionals_count_table.id,
      {
        confessionalCount: r.confessionals_count_table.count,
        castMemberName: r.cast_members_table.name,
      },
    ]),
  );

  return { confessionalsByPlayer };
}

export async function updateEpisodeConfessionalCounts(
  pendingChanges: PendingChanges,
) {
  await Promise.all(
    Object.entries(pendingChanges).map(([id, count]) =>
      db
        .update(confessionalCountTable)
        .set({ count })
        .where(eq(confessionalCountTable.id, parseInt(id))),
    ),
  );
}

export type Challenge = {
  challengeName: string;
  winners: { castMemberId: number; castMemberName: string }[];
};

export async function getEpisodeChallengeWinners(
  episodeId: number,
): Promise<Record<number, Challenge>> {
  const challengeWinners = await db
    .select()
    .from(challengeWinnersTable)
    .innerJoin(
      challengesTable,
      eq(challengesTable.id, challengeWinnersTable.challengeId),
    )
    .innerJoin(
      castMembersTable,
      eq(castMembersTable.id, challengeWinnersTable.castMemberId),
    )
    .where(eq(challengesTable.episodeId, episodeId));

  const challengeRecord: Record<number, Challenge> = {};
  challengeWinners.forEach((winner) => {
    const formattedWinner = {
      castMemberId: winner.challenge_winners_table.castMemberId,
      castMemberName: winner.cast_members_table.name,
    };
    const challenge = challengeRecord[winner.challenges_table.id];
    if (challenge) {
      challenge.winners.push(formattedWinner);
    } else {
      challengeRecord[winner.challenge_winners_table.challengeId] = {
        challengeName: winner.challenges_table.name,
        winners: [formattedWinner],
      };
    }
  });
  return challengeRecord;
}
