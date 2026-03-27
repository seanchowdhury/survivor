"use server";

import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import {
  castMembersTable,
  episodesTable,
  participantEpisodeRosterTable,
  participantsTable,
} from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function getParticipants() {
  return await db
    .select()
    .from(participantsTable)
    .orderBy(participantsTable.createdAt);
}

export async function createParticipant(name: string) {
  await db.insert(participantsTable).values({ name });
  revalidatePath("/admin/participants");
}

export async function deleteParticipant(id: number) {
  await db.delete(participantsTable).where(eq(participantsTable.id, id));
  revalidatePath("/admin/participants");
}

export async function getEpisodeRoster(
  participantId: number,
  episodeId: number,
) {
  const rows = await db
    .select({ castMemberId: participantEpisodeRosterTable.castMemberId })
    .from(participantEpisodeRosterTable)
    .where(
      and(
        eq(participantEpisodeRosterTable.participantId, participantId),
        eq(participantEpisodeRosterTable.episodeId, episodeId),
      ),
    );
  return rows.map((r) => r.castMemberId);
}

export async function setEpisodeRoster(
  participantId: number,
  episodeId: number,
  castMemberIds: number[],
) {
  // Delete existing roster for this participant + episode, then insert fresh
  await db
    .delete(participantEpisodeRosterTable)
    .where(
      and(
        eq(participantEpisodeRosterTable.participantId, participantId),
        eq(participantEpisodeRosterTable.episodeId, episodeId),
      ),
    );

  if (castMemberIds.length > 0) {
    await db.insert(participantEpisodeRosterTable).values(
      castMemberIds.map((castMemberId) => ({
        participantId,
        episodeId,
        castMemberId,
      })),
    );
  }

  revalidatePath("/admin/participants");
  revalidatePath("/admin/leaderboard");
}

export async function getAllEpisodes() {
  return (await db.select().from(episodesTable)).sort(
    (a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0),
  );
}

export async function getAllCastMembers() {
  return await db
    .select()
    .from(castMembersTable)
    .orderBy(castMembersTable.name);
}

// Returns the cast member IDs for the episode immediately before the given one
export async function getPreviousEpisodeRoster(
  participantId: number,
  episodeId: number,
): Promise<number[]> {
  // Find all episodes sorted
  const episodes = await db
    .select({ id: episodesTable.id, episodeNumber: episodesTable.episodeNumber })
    .from(episodesTable)
    .orderBy(episodesTable.episodeNumber);

  const idx = episodes.findIndex((e) => e.id === episodeId);
  if (idx <= 0) return [];

  const prevEpisodeId = episodes[idx - 1].id;
  return await getEpisodeRoster(participantId, prevEpisodeId);
}
