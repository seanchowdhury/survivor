"use server";

import { db } from "@/db";
import { eq } from "drizzle-orm";
import {
  parseWikiWithClaude,
  ConfessionalsByPlayer,
  EpisodeInfo,
  TribalCouncil,
  Challenge,
  IdolEvent,
  AdvantageEvent,
} from "./parse";
import {
  castMembersTable,
  challengesTable,
  challengeWinnersTable,
  confessionalCountTable,
  confessionalsTable,
  episodesTable,
  idolsTable,
  advantagesTable,
  InsertChallenge,
  InsertChallengeWinner,
  InsertConfessional,
  InsertConfessionalCount,
  InsertEpisode,
  InsertTribalVotes,
  SelectCastMember,
  SelectChallenge,
  SelectConfessional,
  SelectEpisode,
  SelectTribalVotes,
  tribalVotesTable,
} from "@/db/schema";
import { takeUniqueOrThrow } from "@/db/helpers";
import { redirect } from "next/navigation";
import { getEpisodeContent } from "@/app/admin/lib/wiki";

async function getEpisodeByNumber(
  episodeNumber: number,
): Promise<SelectEpisode> {
  return takeUniqueOrThrow(
    await db
      .select()
      .from(episodesTable)
      .where(eq(episodesTable.episodeNumber, episodeNumber)),
  );
}

async function insertEpisode(episodeInfo: EpisodeInfo, title: string) {
  const episode: InsertEpisode = {
    title,
    seasonNumber: episodeInfo.seasonNumber,
    episodeNumber: episodeInfo.episodeNumber,
    airDate: episodeInfo.airDate,
  };
  await db.insert(episodesTable).values([episode]);
}

async function getConfessionalsByEpisodeId(
  episodeId: number,
): Promise<SelectConfessional[]> {
  return await db
    .select()
    .from(confessionalsTable)
    .where(eq(confessionalsTable.episodeId, episodeId));
}

async function insertConfessionals(
  confessionals: ConfessionalsByPlayer,
  episodeId: number,
) {
  const castMembers = await db.select().from(castMembersTable);
  const confessionalsToInsert: InsertConfessional[] = [];
  const confessionalsPerCastMember: Record<string, { count: number, id: number }> = {};
  castMembers.forEach((castMember) => {
    confessionalsPerCastMember[castMember.id] = { count: 0, id: castMember.id };
  });
  castMembers.forEach((castMember) => {
    confessionals[castMember.name]?.forEach((confessional) => {
      confessionalsToInsert.push({
        castMemberId: castMember.id,
        episodeId,
        tribe: confessional.tribe,
        quote: confessional.quote,
      });
      confessionalsPerCastMember[castMember.id].count += 1;
    });
  });

  await db.insert(confessionalsTable).values(confessionalsToInsert);
  const countsToInsert: InsertConfessionalCount[] = Object.keys(
    confessionalsPerCastMember,
  ).map((castMemberId) => {
    return {
      castMemberId: confessionalsPerCastMember[castMemberId].id,
      episodeId,
      count: confessionalsPerCastMember[castMemberId].count,
    };
  });
  await db.insert(confessionalCountTable).values(countsToInsert);
}

async function getCastMembers(): Promise<SelectCastMember[]> {
  return db.select().from(castMembersTable);
}

async function getTribalVotesByEpisodeId(
  episodeId: number,
): Promise<SelectTribalVotes[]> {
  return await db
    .select()
    .from(tribalVotesTable)
    .where(eq(tribalVotesTable.episodeId, episodeId));
}

async function insertTribalVotes(
  tribalCouncils: TribalCouncil[],
  castMembers: SelectCastMember[],
  episodeId: number,
) {
  const tribalVotesToInsert: InsertTribalVotes[] = [];
  const castHash: Record<string, { id: number; tribe: string }> = {};

  castMembers.forEach(
    (castMember) =>
      (castHash[castMember.name] = {
        id: castMember.id,
        tribe: castMember.tribe,
      }),
  );

  tribalCouncils.forEach((tribalCouncil) => {
    tribalCouncil.votes.forEach((vote) => {
      tribalVotesToInsert.push({
        voterId: castHash[vote.voter].id,
        votedForId: castHash[vote.votedFor].id,
        episodeId,
        tribe: castHash[vote.voter].tribe,
      });
    });
  });

  await db.insert(tribalVotesTable).values(tribalVotesToInsert);
}

async function getChallengesByEpisodeId(
  episodeId: number,
): Promise<SelectChallenge[]> {
  return await db
    .select()
    .from(challengesTable)
    .where(eq(challengesTable.episodeId, episodeId));
}

async function insertChallenges(
  challenges: Challenge[],
  castMembers: SelectCastMember[],
  episodeId: number,
) {
  const challengesToInsert: InsertChallenge[] = [];
  challenges.forEach((challenge) => {
    let individualChallenge = true;
    if (
      challenge.winners.includes("kalo") ||
      challenge.winners.includes("cila") ||
      challenge.winners.includes("vatu")
    ) {
      individualChallenge = false;
    }
    challengesToInsert.push({
      episodeId,
      name: challenge.name,
      isReward: challenge.isReward,
      isImmunity: challenge.isImmunity,
      individualChallenge,
    });
  });

  await db.insert(challengesTable).values(challengesToInsert);

  const tribeHash: Record<string, number[]> = {};
  const castHash: Record<string, number> = {};
  castMembers.forEach((castMember) => {
    if (tribeHash[castMember.tribe.toLowerCase()]) {
      tribeHash[castMember.tribe.toLowerCase()].push(castMember.id);
    } else {
      tribeHash[castMember.tribe.toLowerCase()] = [castMember.id];
    }

    castHash[castMember.name] = castMember.id;
  });

  const winnersToInsert: InsertChallengeWinner[] = [];
  const persistedChallenges = await db
    .select()
    .from(challengesTable)
    .where(eq(challengesTable.episodeId, episodeId));
  persistedChallenges.forEach((challenge) => {
    const challengeWinners =
      challenges.find((c) => c.name == challenge.name)?.winners || [];
    if (!challenge.individualChallenge) {
      challengeWinners.forEach((tribe, index) => {
        tribeHash[tribe].forEach((castMemberId) => {
          winnersToInsert.push({ castMemberId, challengeId: challenge.id, placement: index + 1 });
        });
      });
    } else {
      challengeWinners.forEach((individual) => {
        winnersToInsert.push({
          castMemberId: castHash[individual],
          challengeId: challenge.id,
          placement: 1,
        });
      });
    }
  });

  await db.insert(challengeWinnersTable).values(winnersToInsert);
}


async function insertIdols(
  idols: IdolEvent[],
  castMembers: SelectCastMember[],
  episodeId: number,
) {
  if (!idols.length) return;
  const castHash: Record<string, number> = Object.fromEntries(castMembers.map((c) => [c.name, c.id]));
  await db.insert(idolsTable).values(
    idols.map((idol) => ({
      label: idol.label,
      foundByCastMemberId: castHash[idol.foundBy],
      foundInEpisodeId: episodeId,
      currentHolderId: idol.givenTo ? castHash[idol.givenTo] : castHash[idol.foundBy],
    })),
  );
}

async function insertAdvantages(
  advantages: AdvantageEvent[],
  castMembers: SelectCastMember[],
  episodeId: number,
) {
  if (!advantages.length) return;
  const castHash: Record<string, number> = Object.fromEntries(castMembers.map((c) => [c.name, c.id]));
  await db.insert(advantagesTable).values(
    advantages.map((advantage) => ({
      label: advantage.label,
      foundByCastMemberId: castHash[advantage.foundBy],
      foundInEpisodeId: episodeId,
      currentHolderId: advantage.givenTo ? castHash[advantage.givenTo] : castHash[advantage.foundBy],
    })),
  );
}

async function updateEvacuatedAndQuit(
  evacuated: string[],
  quit: string[],
  castMembers: SelectCastMember[],
  episodeId: number,
) {
  const castHash: Record<string, number> = Object.fromEntries(castMembers.map((c) => [c.name, c.id]));
  const ops: Promise<unknown>[] = [];
  evacuated.forEach((name) => {
    const id = castHash[name];
    if (id) ops.push(db.update(castMembersTable).set({ evacuated: true, eliminatedEpisodeId: episodeId }).where(eq(castMembersTable.id, id)));
  });
  quit.forEach((name) => {
    const id = castHash[name];
    if (id) ops.push(db.update(castMembersTable).set({ quit: true, eliminatedEpisodeId: episodeId }).where(eq(castMembersTable.id, id)));
  });
  await Promise.all(ops);
}

async function getEpisodeByTitle(episodeTitle: string): Promise<SelectEpisode> {
  return takeUniqueOrThrow(await db.select().from(episodesTable).where(eq(episodesTable.title, episodeTitle)))
}

const LOWERCASE_WORDS = new Set(["a", "an", "the", "and", "but", "or", "nor", "on", "at", "to", "by", "in", "of", "up", "as", "with"]);

function toTitleCase(str: string): string {
  return str
    .toLocaleLowerCase()
    .split(" ")
    .map((word, i) => (i === 0 || !LOWERCASE_WORDS.has(word) ? word.replace(/^\w/, (c) => c.toUpperCase()) : word))
    .join(" ");
}

async function processConfessionals(confessionals: ConfessionalsByPlayer, episodeId: number) {
  const existing = await getConfessionalsByEpisodeId(episodeId);
  if (existing.length) return;
  await insertConfessionals(confessionals, episodeId);
}

async function processTribalVotes(tribalCouncils: TribalCouncil[], castMembers: SelectCastMember[], episodeId: number) {
  const existing = await getTribalVotesByEpisodeId(episodeId);
  if (existing.length) return;
  await insertTribalVotes(tribalCouncils, castMembers, episodeId);
}

async function processChallenges(challenges: Challenge[], castMembers: SelectCastMember[], episodeId: number) {
  const existing = await getChallengesByEpisodeId(episodeId);
  if (existing.length) return;
  await insertChallenges(challenges, castMembers, episodeId);
}

async function processIdols(idols: IdolEvent[], castMembers: SelectCastMember[], episodeId: number) {
  const existing = await db.select().from(idolsTable).where(eq(idolsTable.foundInEpisodeId, episodeId));
  if (existing.length) return;
  await insertIdols(idols, castMembers, episodeId);
}

async function processAdvantages(advantages: AdvantageEvent[], castMembers: SelectCastMember[], episodeId: number) {
  const existing = await db.select().from(advantagesTable).where(eq(advantagesTable.foundInEpisodeId, episodeId));
  if (existing.length) return;
  await insertAdvantages(advantages, castMembers, episodeId);
}

export async function processEpisodeWiki(
  _prevState: { error: string; fields?: { episode: string } } | null,
  formData: FormData,
) {
  const episode = toTitleCase(formData.get("episode") as string);

  let title: string;
  let contentString: string;
  try {
    [title, contentString] = await getEpisodeContent(episode);
  } catch (e: unknown) {
    const error = e as { message: string };
    return { error: error.message };
  }

  const episodeByTitle = await getEpisodeByTitle(title);
  if (episodeByTitle) redirect("/admin/episode/" + episodeByTitle.id);

  const { confessionals, tribalCouncils, challenges, episodeInfo, idols, advantages, evacuated, quit } = await parseWikiWithClaude(contentString);

  const episodeNumber = episodeInfo?.episodeNumber;
  if (!episodeNumber) return { error: "Could not parse episode number." };
  if (episodeInfo.seasonNumber !== 50) return { error: "Wrong season" };

  let episodeRecord: SelectEpisode;
  try {
    episodeRecord = await getEpisodeByNumber(episodeNumber);
  } catch (e: unknown) {
    const error = e as { message: string };
    if (error.message == 'Found no value') {
      try {
        await insertEpisode(episodeInfo, title);
        episodeRecord = await getEpisodeByNumber(episodeNumber);
      } catch (_) {
        return { error: "Error adding episode to database" };
      }
    }
    return { error: "Error adding episode to database" };
  }

  const castMembers = await getCastMembers();

  try { await processConfessionals(confessionals, episodeRecord.id); }
  catch (_) { return { error: "Error adding confessionals to database" }; }

  try { await processTribalVotes(tribalCouncils, castMembers, episodeRecord.id); }
  catch (_) { return { error: "Error adding tribal votes to db" }; }

  try { await processChallenges(challenges, castMembers, episodeRecord.id); }
  catch (_) { return { error: "Error adding challenges to db" }; }

  try { await processIdols(idols, castMembers, episodeRecord.id); }
  catch (_) { return { error: "Error adding idols to db" }; }

  try { await processAdvantages(advantages, castMembers, episodeRecord.id); }
  catch (_) { return { error: "Error adding advantages to db" }; }

  try { await updateEvacuatedAndQuit(evacuated, quit, castMembers, episodeRecord.id); }
  catch (_) { return { error: "Error updating evacuated/quit players" }; }

  redirect("/admin/episode/" + episodeRecord.id);
}
