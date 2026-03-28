import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { eq, isNull, sql } from "drizzle-orm";
import { castMembersTable, episodesTable, pollVotesTable } from "@/db/schema";

export type PollQuestion = "next_boot" | "story_focus" | "biggest_threat";

export type PollCastMember = {
  id: number;
  name: string;
  imageUrl: string;
  tribe: string;
};

export type PollResult = {
  castMemberId: number;
  count: number;
};

export type PollData = {
  episodeId: number;
  episodeNumber: number | null;
  castMembers: PollCastMember[];
  results: Record<PollQuestion, PollResult[]>;
  totalVoters: number;
};

export const getPollData = unstable_cache(
  async (): Promise<PollData | null> => {
  const [latestEpisode] = await db
    .select({ id: episodesTable.id, episodeNumber: episodesTable.episodeNumber })
    .from(episodesTable)
    .orderBy(sql`${episodesTable.episodeNumber} desc nulls last`)
    .limit(1);

  if (!latestEpisode) return null;

  const [castMembers, voteRows] = await Promise.all([
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
        question: pollVotesTable.question,
        castMemberId: pollVotesTable.castMemberId,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(pollVotesTable)
      .where(eq(pollVotesTable.episodeId, latestEpisode.id))
      .groupBy(pollVotesTable.question, pollVotesTable.castMemberId),
  ]);

  const results: Record<PollQuestion, PollResult[]> = {
    next_boot: [],
    story_focus: [],
    biggest_threat: [],
  };

  for (const row of voteRows) {
    const q = row.question as PollQuestion;
    if (q in results) {
      results[q].push({ castMemberId: row.castMemberId, count: Number(row.count) });
    }
  }

  // Sort each question's results by count desc
  for (const q of Object.keys(results) as PollQuestion[]) {
    results[q].sort((a, b) => b.count - a.count);
  }

  const totalVoters = voteRows.reduce((sum, r) => {
    // count distinct voters across all questions by summing next_boot votes
    // (each voter votes once per question, so next_boot total = unique voters)
    return r.question === "next_boot" ? sum + Number(r.count) : sum;
  }, 0);

  return {
    episodeId: latestEpisode.id,
    episodeNumber: latestEpisode.episodeNumber,
    castMembers,
    results,
    totalVoters,
  };
  },
  ["poll-data"],
  { revalidate: 30, tags: ["poll"] }
);
