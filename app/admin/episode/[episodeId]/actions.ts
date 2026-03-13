'use server';

import { db } from '@/db';
import { and, eq } from 'drizzle-orm';
import {
  castMembersTable,
  challengesTable,
  challengeWinnersTable,
  confessionalCountTable,
  episodesTable,
  SelectCastMember,
} from '@/db/schema';
import { takeUniqueOrThrow } from '@/db/helpers';
import { PendingChallengeChanges } from './episode-challenge-winners';
import { PendingConfessionalChanges } from './episode-confessional-count';

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

export async function getEpisodeConfessionalCounts(
  episodeId: number,
) {
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
  pendingChanges: PendingConfessionalChanges,
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

export async function getCastMembers(): Promise<SelectCastMember[]> {
  return await db.select().from(castMembersTable);
}

export type Winner = {
  castMemberId: number;
  castMemberName: string;
  placement: number;
};

export type Challenge = {
  challengeName: string;
  winners: Winner[];
  isReward: boolean;
  isImmunity: boolean;
  individualChallenge: boolean;
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
      placement: winner.challenge_winners_table.placement,
    };
    const challenge = challengeRecord[winner.challenges_table.id];
    if (challenge) {
      challenge.winners.push(formattedWinner);
    } else {
      challengeRecord[winner.challenge_winners_table.challengeId] = {
        challengeName: winner.challenges_table.name,
        isReward: winner.challenges_table.isReward,
        isImmunity: winner.challenges_table.isImmunity,
        individualChallenge: winner.challenges_table.individualChallenge,
        winners: [formattedWinner],
      };
    }
  });
  return challengeRecord;
}

export async function updateChallenges(
  pendingChanges: PendingChallengeChanges,
  castMembers: SelectCastMember[],
) {
  const nameToId = Object.fromEntries(castMembers.map((c) => [c.name, c.id]));
  const ops: Promise<unknown>[] = [];

  for (const [challengeIdStr, changes] of Object.entries(pendingChanges)) {
    const challengeId = parseInt(challengeIdStr);

    if (changes.isReward !== undefined || changes.isImmunity !== undefined || changes.individualChallenge !== undefined) {
      ops.push(
        db
          .update(challengesTable)
          .set({
            ...(changes.isReward !== undefined && { isReward: changes.isReward }),
            ...(changes.isImmunity !== undefined && { isImmunity: changes.isImmunity }),
            ...(changes.individualChallenge !== undefined && { individualChallenge: changes.individualChallenge }),
          })
          .where(eq(challengesTable.id, challengeId)),
      );
    }

    for (const [placement, names] of [
      [1, changes.firstPlace],
      [2, changes.secondPlace],
    ] as const) {
      if (!names) continue;

      const castMemberIds = names.map((name) => nameToId[name]).filter(Boolean);

      ops.push(
        (async () => {
          await db
            .delete(challengeWinnersTable)
            .where(
              and(
                eq(challengeWinnersTable.challengeId, challengeId),
                eq(challengeWinnersTable.placement, placement),
              ),
            );

          if (castMemberIds.length > 0) {
            await db.insert(challengeWinnersTable).values(
              castMemberIds.map((castMemberId) => ({
                challengeId,
                castMemberId,
                placement,
              })),
            );
          }
        })(),
      );
    }
  }

  await Promise.all(ops);
}