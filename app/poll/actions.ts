import { db } from "@/db";
import { eq, isNull, sql } from "drizzle-orm";
import { castMembersTable, episodesTable, pollVotesTable } from "@/db/schema";

export type PollCastMember = {
  id: number;
  name: string;
  imageUrl: string;
  tribe: string;
};

export type PollResult = {
  castMemberId: number | null;
  answer: boolean | null;
  count: number;
};

export type PollData = {
  episodeId: number;
  episodeNumber: number | null;
  castMembers: PollCastMember[];
  prevEpisodeEliminated: PollCastMember[];
  // select_cast_member questions: keyed by question ("next_boot", etc.)
  // yesno questions: keyed by "blindsided_${castMemberId}"
  results: Record<string, PollResult[]>;
  totalVoters: number;
};

export async function getPollData(): Promise<PollData | null> {
  const [latestEpisode] = await db
    .select({ id: episodesTable.id, episodeNumber: episodesTable.episodeNumber })
    .from(episodesTable)
    .orderBy(sql`${episodesTable.episodeNumber} desc nulls last`)
    .limit(1);

  if (!latestEpisode) return null;

  const [castMembers, prevEpisodeEliminated, voteRows, voterCountRows] = await Promise.all([
    db
      .select({
        id: castMembersTable.id,
        name: castMembersTable.name,
        imageUrl: castMembersTable.imageUrl,
        tribe: castMembersTable.tribe,
      })
      .from(castMembersTable)
      .where(isNull(castMembersTable.eliminatedEpisodeId))
      .orderBy(castMembersTable.name),

    db
      .select({
        id: castMembersTable.id,
        name: castMembersTable.name,
        imageUrl: castMembersTable.imageUrl,
        tribe: castMembersTable.tribe,
      })
      .from(castMembersTable)
      .where(eq(castMembersTable.eliminatedEpisodeId, latestEpisode.id))
      .orderBy(castMembersTable.name),

    db
      .select({
        questionType: pollVotesTable.questionType,
        question: pollVotesTable.question,
        castMemberId: pollVotesTable.castMemberId,
        answer: pollVotesTable.answer,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(pollVotesTable)
      .where(eq(pollVotesTable.episodeId, latestEpisode.id))
      .groupBy(
        pollVotesTable.questionType,
        pollVotesTable.question,
        pollVotesTable.castMemberId,
        pollVotesTable.answer,
      ),

    db
      .select({ count: sql<number>`count(distinct ${pollVotesTable.voterToken})` })
      .from(pollVotesTable)
      .where(eq(pollVotesTable.episodeId, latestEpisode.id)),
  ]);

  const results: Record<string, PollResult[]> = {};
  for (const row of voteRows) {
    // yesno questions are keyed by "blindsided_${castMemberId}" so each
    // eliminated player's question has its own results bucket.
    const key =
      row.questionType === "yesno" && row.castMemberId != null
        ? `${row.question}_${row.castMemberId}`
        : row.question;
    if (!results[key]) results[key] = [];
    results[key].push({
      castMemberId: row.castMemberId,
      answer: row.answer,
      count: Number(row.count),
    });
  }

  const totalVoters = Number(voterCountRows[0]?.count ?? 0);

  return {
    episodeId: latestEpisode.id,
    episodeNumber: latestEpisode.episodeNumber,
    castMembers,
    prevEpisodeEliminated,
    results,
    totalVoters,
  };
}
