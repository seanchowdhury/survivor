"use server";

import { db } from "@/db";
import { and, asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  castMembersTable,
  challengesTable,
  challengeWinnersTable,
  confessionalCountTable,
  episodesTable,
  tribalCouncilsTable,
  SelectCastMember,
  tribalVotesTable,
  idolsTable,
  advantagesTable,
  miscTable,
} from "@/db/schema";
import { takeUniqueOrThrow } from "@/db/helpers";
import { PendingChallengeChanges } from "./episode-challenge-winners";
import { PendingConfessionalChanges } from "./episode-confessional-count";
import { recalculateEpisodeScores } from "@/app/admin/leaderboard/actions";

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
  pendingChanges: PendingConfessionalChanges,
) {
  const updates = await Promise.all(
    Object.entries(pendingChanges).map(([id, count]) =>
      db
        .update(confessionalCountTable)
        .set({ count })
        .where(eq(confessionalCountTable.id, parseInt(id)))
        .returning({ episodeId: confessionalCountTable.episodeId }),
    ),
  );

  // Recalculate scores for all affected episodes
  const episodeIds = [...new Set(updates.flatMap((rows) => rows.map((r) => r.episodeId)))];
  await Promise.all(episodeIds.map((episodeId) => recalculateEpisodeScores(episodeId)));
}

export async function getCastMembers(): Promise<SelectCastMember[]> {
  return await db.select().from(castMembersTable).orderBy(asc(castMembersTable.name));
}

export type Winner = {
  castMemberId: number;
  castMemberName: string;
  placement: number;
  gotReward: boolean;
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
      gotReward: winner.challenge_winners_table.gotReward,
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

    if (
      changes.isReward !== undefined ||
      changes.isImmunity !== undefined ||
      changes.individualChallenge !== undefined
    ) {
      ops.push(
        db
          .update(challengesTable)
          .set({
            ...(changes.isReward !== undefined && {
              isReward: changes.isReward,
            }),
            ...(changes.isImmunity !== undefined && {
              isImmunity: changes.isImmunity,
            }),
            ...(changes.individualChallenge !== undefined && {
              individualChallenge: changes.individualChallenge,
            }),
          })
          .where(eq(challengesTable.id, challengeId)),
      );
    }

    const rewardRecipientIds = changes.rewardRecipients
      ? new Set(changes.rewardRecipients.map((name) => nameToId[name]).filter(Boolean))
      : null;

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
                // if rewardRecipients was explicitly set, use it; otherwise default true
                gotReward: rewardRecipientIds ? rewardRecipientIds.has(castMemberId) : true,
              })),
            );
          }
        })(),
      );
    }
  }

  await Promise.all(ops);

  const challengeIds = Object.keys(pendingChanges).map(Number);
  if (challengeIds.length > 0) {
    const [ch] = await db
      .select({ episodeId: challengesTable.episodeId })
      .from(challengesTable)
      .where(eq(challengesTable.id, challengeIds[0]));
    if (ch) await recalculateEpisodeScores(ch.episodeId);
  }
}

export type VoteWithCouncil = {
  voteId: number;
  voterId: number;
  votedForId: number | null;
  tribalCouncilId: number;
  tribe: string;
  sequence: number;
  eliminatedCastMemberId: number | null;
  blindsided: boolean;
};

export async function getEpisodeVoteData(
  episodeId: number,
): Promise<VoteWithCouncil[]> {
  const rows = await db
    .select()
    .from(tribalVotesTable)
    .innerJoin(
      tribalCouncilsTable,
      eq(tribalCouncilsTable.id, tribalVotesTable.tribalCouncilId),
    )
    .where(eq(tribalCouncilsTable.episodeId, episodeId));

  return rows.map((r) => ({
    voteId: r.tribal_votes_table.id,
    voterId: r.tribal_votes_table.voterId,
    votedForId: r.tribal_votes_table.votedForId,
    tribalCouncilId: r.tribal_votes_table.tribalCouncilId,
    tribe: r.tribal_councils_table.tribe,
    sequence: r.tribal_councils_table.sequence,
    eliminatedCastMemberId: r.tribal_councils_table.eliminatedCastMemberId,
    blindsided: r.tribal_councils_table.blindsided,
  }));
}

export async function updateTribalVotes(
  pendingChanges: Record<number, number | null>,
) {
  await Promise.all(
    Object.entries(pendingChanges).map(([voteId, votedForId]) =>
      db
        .update(tribalVotesTable)
        .set({ votedForId })
        .where(eq(tribalVotesTable.id, parseInt(voteId))),
    ),
  );

  const voteIds = Object.keys(pendingChanges).map(Number);
  if (voteIds.length > 0) {
    const [row] = await db
      .select({ episodeId: tribalCouncilsTable.episodeId })
      .from(tribalVotesTable)
      .innerJoin(
        tribalCouncilsTable,
        eq(tribalCouncilsTable.id, tribalVotesTable.tribalCouncilId),
      )
      .where(eq(tribalVotesTable.id, voteIds[0]));
    if (row) await recalculateEpisodeScores(row.episodeId);
  }
}

export async function deleteTribalVote(voteId: number) {
  const [row] = await db
    .select({ episodeId: tribalCouncilsTable.episodeId })
    .from(tribalVotesTable)
    .innerJoin(
      tribalCouncilsTable,
      eq(tribalCouncilsTable.id, tribalVotesTable.tribalCouncilId),
    )
    .where(eq(tribalVotesTable.id, voteId));

  await db.delete(tribalVotesTable).where(eq(tribalVotesTable.id, voteId));

  if (row) await recalculateEpisodeScores(row.episodeId);
}

export async function updateTribalCouncilBlindsided(
  councilId: number,
  blindsided: boolean,
) {
  await db
    .update(tribalCouncilsTable)
    .set({ blindsided })
    .where(eq(tribalCouncilsTable.id, councilId));

  const [row] = await db
    .select({ episodeId: tribalCouncilsTable.episodeId })
    .from(tribalCouncilsTable)
    .where(eq(tribalCouncilsTable.id, councilId));
  if (row) await recalculateEpisodeScores(row.episodeId);
}

export type IdolOrAdvantage = {
  id: number;
  label: string | null;
  foundByName: string;
  foundInEpisodeId: number;
  currentHolderName: string | null;
  currentHolderId: number | null;
  usedByName: string | null;
  usedByCastMemberId: number | null;
  usedInEpisodeId: number | null;
};

export async function getIdolsAndAdvantages(): Promise<{
  idols: IdolOrAdvantage[];
  advantages: IdolOrAdvantage[];
}> {
  const foundBy = alias(castMembersTable, "found_by");
  const holder = alias(castMembersTable, "holder");
  const usedBy = alias(castMembersTable, "used_by");

  const [idolRows, advantageRows] = await Promise.all([
    db
      .select({
        item: idolsTable,
        foundBy: { name: foundBy.name },
        holder: { name: holder.name },
        usedBy: { name: usedBy.name },
      })
      .from(idolsTable)
      .leftJoin(foundBy, eq(foundBy.id, idolsTable.foundByCastMemberId))
      .leftJoin(holder, eq(holder.id, idolsTable.currentHolderId))
      .leftJoin(usedBy, eq(usedBy.id, idolsTable.usedByCastMemberId)),
    db
      .select({
        item: advantagesTable,
        foundBy: { name: foundBy.name },
        holder: { name: holder.name },
        usedBy: { name: usedBy.name },
      })
      .from(advantagesTable)
      .leftJoin(foundBy, eq(foundBy.id, advantagesTable.foundByCastMemberId))
      .leftJoin(holder, eq(holder.id, advantagesTable.currentHolderId))
      .leftJoin(usedBy, eq(usedBy.id, advantagesTable.usedByCastMemberId)),
  ]);

  const idolsMapped = idolRows.map((r) => ({
    id: r.item.id,
    label: r.item.label,
    foundByName: r.foundBy!.name,
    foundInEpisodeId: r.item.foundInEpisodeId,
    currentHolderName: r.holder?.name ?? null,
    currentHolderId: r.item.currentHolderId,
    usedByName: r.usedBy?.name ?? null,
    usedByCastMemberId: r.item.usedByCastMemberId,
    usedInEpisodeId: r.item.usedInEpisodeId,
  }));

  const advantagesMapped = advantageRows.map((r) => ({
    id: r.item.id,
    label: r.item.label,
    foundByName: r.foundBy!.name,
    foundInEpisodeId: r.item.foundInEpisodeId,
    currentHolderName: r.holder?.name ?? null,
    currentHolderId: r.item.currentHolderId,
    usedByName: r.usedBy?.name ?? null,
    usedByCastMemberId: r.item.usedByCastMemberId,
    usedInEpisodeId: r.item.usedInEpisodeId,
  }));

  return { idols: idolsMapped, advantages: advantagesMapped };
}

export async function updateIdolUsed(
  idolId: number,
  usedByCastMemberId: number | null,
  usedInEpisodeId: number | null,
) {
  const [existing] = await db
    .select()
    .from(idolsTable)
    .where(eq(idolsTable.id, idolId));

  await db
    .update(idolsTable)
    .set({ usedByCastMemberId, usedInEpisodeId })
    .where(eq(idolsTable.id, idolId));

  if (existing) {
    const episodesToRecalc = new Set<number>([existing.foundInEpisodeId]);
    if (existing.usedInEpisodeId) episodesToRecalc.add(existing.usedInEpisodeId);
    if (usedInEpisodeId) episodesToRecalc.add(usedInEpisodeId);
    await Promise.all([...episodesToRecalc].map(recalculateEpisodeScores));
  }
}

export async function updateAdvantageUsed(
  advantageId: number,
  usedByCastMemberId: number | null,
  usedInEpisodeId: number | null,
) {
  await db
    .update(advantagesTable)
    .set({ usedByCastMemberId, usedInEpisodeId })
    .where(eq(advantagesTable.id, advantageId));
}

export async function deleteIdol(idolId: number) {
  const [existing] = await db
    .select()
    .from(idolsTable)
    .where(eq(idolsTable.id, idolId));
  await db.delete(idolsTable).where(eq(idolsTable.id, idolId));
  if (existing) await recalculateEpisodeScores(existing.foundInEpisodeId);
}

export async function createIdol(
  foundByCastMemberId: number,
  foundInEpisodeId: number,
  label: string | null,
  currentHolderId: number | null,
) {
  await db.insert(idolsTable).values({
    foundByCastMemberId,
    foundInEpisodeId,
    label: label || null,
    currentHolderId: currentHolderId ?? foundByCastMemberId,
  });
  await recalculateEpisodeScores(foundInEpisodeId);
}

export type MiscEntry = {
  id: number;
  castMemberId: number;
  castMemberName: string;
  value: string;
};

export async function getMiscEntries(episodeId: number): Promise<MiscEntry[]> {
  const rows = await db
    .select()
    .from(miscTable)
    .innerJoin(
      castMembersTable,
      eq(castMembersTable.id, miscTable.castMemberId),
    )
    .where(eq(miscTable.episodeId, episodeId));
  return rows.map((r) => ({
    id: r.misc_table.id,
    castMemberId: r.misc_table.castMemberId,
    castMemberName: r.cast_members_table.name,
    value: r.misc_table.value,
  }));
}

export async function createMiscEntry(
  episodeId: number,
  castMemberId: number,
  value: string,
) {
  await db.insert(miscTable).values({ episodeId, castMemberId, value });
  await recalculateEpisodeScores(episodeId);
}

export async function deleteMiscEntry(id: number) {
  const [row] = await db
    .select({ episodeId: miscTable.episodeId })
    .from(miscTable)
    .where(eq(miscTable.id, id));
  await db.delete(miscTable).where(eq(miscTable.id, id));
  if (row) await recalculateEpisodeScores(row.episodeId);
}

export async function deleteAdvantage(advantageId: number) {
  const [existing] = await db
    .select()
    .from(advantagesTable)
    .where(eq(advantagesTable.id, advantageId));
  await db.delete(advantagesTable).where(eq(advantagesTable.id, advantageId));
  if (existing) await recalculateEpisodeScores(existing.foundInEpisodeId);
}

export async function createAdvantage(
  foundByCastMemberId: number,
  foundInEpisodeId: number,
  label: string | null,
  currentHolderId: number | null,
) {
  await db.insert(advantagesTable).values({
    foundByCastMemberId,
    foundInEpisodeId,
    label: label || null,
    currentHolderId: currentHolderId ?? foundByCastMemberId,
  });
}

export async function getEpisodes() {
  return (await db.select().from(episodesTable)).sort(
    (a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0),
  );
}
