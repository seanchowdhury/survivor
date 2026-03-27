"use server";

import { db } from "@/db";
import { eq, isNotNull } from "drizzle-orm";
import { sql } from "drizzle-orm";
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
  castMemberEpisodeTribeTable,
  challengesTable,
  challengeWinnersTable,
  confessionalCountTable,
  confessionalsTable,
  episodesTable,
  idolsTable,
  advantagesTable,
  tribalCouncilsTable,
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
  const confessionalsPerCastMember: Record<
    string,
    { count: number; id: number }
  > = {};
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

async function getTribalCouncilsByEpisodeId(episodeId: number) {
  return await db
    .select()
    .from(tribalCouncilsTable)
    .where(eq(tribalCouncilsTable.episodeId, episodeId));
}

async function insertTribalVotes(
  tribalCouncils: TribalCouncil[],
  castMembers: SelectCastMember[],
  episodeId: number,
) {
  const castHash: Record<string, { id: number }> = {};
  castMembers.forEach((c) => (castHash[c.name] = { id: c.id }));

  for (const tc of tribalCouncils) {
    const eliminatedId = tc.eliminated
      ? (castHash[tc.eliminated]?.id ?? null)
      : null;

    const [council] = await db
      .insert(tribalCouncilsTable)
      .values({
        episodeId,
        tribe: tc.tribe,
        sequence: tc.sequence,
        eliminatedCastMemberId: eliminatedId,
      })
      .returning({ id: tribalCouncilsTable.id });

    const votesToInsert: InsertTribalVotes[] = tc.votes
      .filter((v) => castHash[v.voter] && castHash[v.votedFor])
      .map((v) => ({
        tribalCouncilId: council.id,
        voterId: castHash[v.voter].id,
        votedForId: castHash[v.votedFor].id,
      }));

    if (votesToInsert.length)
      await db.insert(tribalVotesTable).values(votesToInsert);

    // Insert null-votedFor rows for tribe members who didn't vote (e.g. shot in the dark)
    const voterIds = new Set(votesToInsert.map((v) => v.voterId));
    const tribeRoster = castMembers.filter(
      (c) => c.tribe === tc.tribe && c.eliminatedEpisodeId === null,
    );
    const nonVoters: InsertTribalVotes[] = tribeRoster
      .filter((c) => !voterIds.has(c.id))
      .map((c) => ({
        tribalCouncilId: council.id,
        voterId: c.id,
        votedForId: null,
      }));
    if (nonVoters.length) await db.insert(tribalVotesTable).values(nonVoters);
  }
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
  const TRIBE_NAMES = ["kalo", "cila", "vatu"];
  challenges.forEach((challenge) => {
    const winningTribes = challenge.winners.filter((w) => TRIBE_NAMES.includes(w));
    const individualChallenge = winningTribes.length === 0;
    challengesToInsert.push({
      episodeId,
      name: challenge.name,
      isReward: challenge.isReward,
      isImmunity: challenge.isImmunity,
      individualChallenge,
      tribe: winningTribes.length > 0 ? winningTribes : null,
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
          winnersToInsert.push({
            castMemberId,
            challengeId: challenge.id,
            placement: index + 1,
          });
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
  const castHash: Record<string, number> = Object.fromEntries(
    castMembers.map((c) => [c.name, c.id]),
  );
  await db.insert(idolsTable).values(
    idols.map((idol) => ({
      label: idol.label,
      foundByCastMemberId: castHash[idol.foundBy],
      foundInEpisodeId: episodeId,
      currentHolderId: idol.givenTo
        ? castHash[idol.givenTo]
        : castHash[idol.foundBy],
    })),
  );
}

async function insertAdvantages(
  advantages: AdvantageEvent[],
  castMembers: SelectCastMember[],
  episodeId: number,
) {
  if (!advantages.length) return;
  const castHash: Record<string, number> = Object.fromEntries(
    castMembers.map((c) => [c.name, c.id]),
  );
  await db.insert(advantagesTable).values(
    advantages.map((advantage) => ({
      label: advantage.label,
      foundByCastMemberId: castHash[advantage.foundBy],
      foundInEpisodeId: episodeId,
      currentHolderId: advantage.givenTo
        ? castHash[advantage.givenTo]
        : castHash[advantage.foundBy],
    })),
  );
}

async function getNextPlacement(): Promise<number> {
  const placed = await db
    .select({ finalPlacement: castMembersTable.finalPlacement })
    .from(castMembersTable)
    .where(isNotNull(castMembersTable.finalPlacement));
  if (!placed.length) {
    const all = await db
      .select({ id: castMembersTable.id })
      .from(castMembersTable);
    return all.length;
  }
  return Math.min(...placed.map((r) => r.finalPlacement!)) - 1;
}

async function processEliminations(
  tribalCouncils: TribalCouncil[],
  castMembers: SelectCastMember[],
  episodeId: number,
) {
  const eliminated = tribalCouncils
    .map((tc) => tc.eliminated)
    .filter((e): e is string => !!e);
  if (!eliminated.length) return;

  const castHash: Record<string, number> = Object.fromEntries(
    castMembers.map((c) => [c.name, c.id]),
  );
  const alreadySet = castMembers.filter(
    (c) => c.eliminatedEpisodeId === episodeId && eliminated.includes(c.name),
  );
  if (alreadySet.length === eliminated.length) return;

  let nextPlacement = await getNextPlacement();
  for (const name of eliminated) {
    const id = castHash[name];
    if (!id) continue;
    await db
      .update(castMembersTable)
      .set({
        eliminatedEpisodeId: episodeId,
        finalPlacement: nextPlacement,
        tribe: "Eliminated",
      })
      .where(eq(castMembersTable.id, id));
    nextPlacement -= 1;
  }
}

async function updateEvacuatedAndQuit(
  evacuated: string[],
  quit: string[],
  castMembers: SelectCastMember[],
  episodeId: number,
) {
  const castHash: Record<string, number> = Object.fromEntries(
    castMembers.map((c) => [c.name, c.id]),
  );
  const all = [
    ...evacuated.map((name) => ({ name, evac: true, quit: false })),
    ...quit.map((name) => ({ name, evac: false, quit: true })),
  ];
  let nextPlacement = await getNextPlacement();
  for (const { name, evac, quit: isQuit } of all) {
    const id = castHash[name];
    if (!id) continue;
    await db
      .update(castMembersTable)
      .set({
        evacuated: evac,
        quit: isQuit,
        eliminatedEpisodeId: episodeId,
        finalPlacement: nextPlacement,
      })
      .where(eq(castMembersTable.id, id));
    nextPlacement -= 1;
  }
}

async function getEpisodeByTitle(episodeTitle: string): Promise<SelectEpisode> {
  return takeUniqueOrThrow(
    await db
      .select()
      .from(episodesTable)
      .where(eq(episodesTable.title, episodeTitle)),
  );
}

async function processConfessionals(
  confessionals: ConfessionalsByPlayer,
  episodeId: number,
) {
  const existing = await getConfessionalsByEpisodeId(episodeId);
  if (existing.length) return;
  await insertConfessionals(confessionals, episodeId);
}

async function processTribalVotes(
  tribalCouncils: TribalCouncil[],
  castMembers: SelectCastMember[],
  episodeId: number,
) {
  const existing = await getTribalCouncilsByEpisodeId(episodeId);
  if (existing.length) return;
  await insertTribalVotes(tribalCouncils, castMembers, episodeId);
}

async function processChallenges(
  challenges: Challenge[],
  castMembers: SelectCastMember[],
  episodeId: number,
) {
  const existing = await getChallengesByEpisodeId(episodeId);
  if (existing.length) return;
  await insertChallenges(challenges, castMembers, episodeId);
}

async function processIdols(
  idols: IdolEvent[],
  castMembers: SelectCastMember[],
  episodeId: number,
) {
  const existing = await db
    .select()
    .from(idolsTable)
    .where(eq(idolsTable.foundInEpisodeId, episodeId));
  if (existing.length) return;
  await insertIdols(idols, castMembers, episodeId);
}

async function processAdvantages(
  advantages: AdvantageEvent[],
  castMembers: SelectCastMember[],
  episodeId: number,
) {
  const existing = await db
    .select()
    .from(advantagesTable)
    .where(eq(advantagesTable.foundInEpisodeId, episodeId));
  if (existing.length) return;
  await insertAdvantages(advantages, castMembers, episodeId);
}

async function insertEpisodeTribeSnapshot(
  confessionals: ConfessionalsByPlayer,
  castMembers: SelectCastMember[],
  episodeId: number,
) {
  const rows = castMembers
    .filter((c) => c.tribe !== "Eliminated")
    .map((c) => ({
      castMemberId: c.id,
      episodeId,
      tribe: confessionals[c.name]?.[0]?.tribe ?? c.tribe,
    }));

  if (!rows.length) return;

  await db
    .insert(castMemberEpisodeTribeTable)
    .values(rows)
    .onConflictDoUpdate({
      target: [castMemberEpisodeTribeTable.castMemberId, castMemberEpisodeTribeTable.episodeId],
      set: { tribe: sql`excluded.tribe` },
    });
}

export async function processEpisodeWiki(
  _prevState: { error: string; fields?: { episode: string } } | null,
  formData: FormData,
) {
  const episode = formData.get("episode") as string;

  let title: string;
  let contentString: string;
  try {
    [title, contentString] = await getEpisodeContent(episode);
  } catch (e: unknown) {
    const error = e as { message: string };
    return { error: error.message };
  }

  let episodeByTitle;
  try {
    episodeByTitle = await getEpisodeByTitle(title);
  } catch (e) {
    console.log("Did not find episode in DB");
  }
  if (episodeByTitle) redirect("/admin/episode/" + episodeByTitle.id);

  const {
    confessionals,
    tribalCouncils,
    challenges,
    episodeInfo,
    idols,
    advantages,
    evacuated,
    quit,
  } = await parseWikiWithClaude(contentString);

  const episodeNumber = episodeInfo?.episodeNumber;
  if (!episodeNumber) return { error: "Could not parse episode number." };
  if (episodeInfo.seasonNumber !== 50) return { error: "Wrong season" };

  let episodeRecord: SelectEpisode;
  try {
    episodeRecord = await getEpisodeByNumber(episodeNumber);
  } catch (e: unknown) {
    const error = e as { message: string };
    if (error.message == "Found no value") {
      try {
        await insertEpisode(episodeInfo, title);
        episodeRecord = await getEpisodeByNumber(episodeNumber);
      } catch (_) {
        return { error: "Error adding episode to database" };
      }
    }
    return { error: "Error getting episode from database" };
  }

  const castMembers = await getCastMembers();

  try {
    await processConfessionals(confessionals, episodeRecord.id);
  } catch (_) {
    return { error: "Error adding confessionals to database" };
  }

  try {
    await insertEpisodeTribeSnapshot(confessionals, castMembers, episodeRecord.id);
  } catch (_) {
    return { error: "Error inserting tribe snapshot" };
  }

  try {
    await processTribalVotes(tribalCouncils, castMembers, episodeRecord.id);
  } catch (_) {
    return { error: "Error adding tribal votes to db" };
  }

  try {
    await processChallenges(challenges, castMembers, episodeRecord.id);
  } catch (_) {
    return { error: "Error adding challenges to db" };
  }

  try {
    await processIdols(idols, castMembers, episodeRecord.id);
  } catch (_) {
    return { error: "Error adding idols to db" };
  }

  try {
    await processAdvantages(advantages, castMembers, episodeRecord.id);
  } catch (_) {
    return { error: "Error adding advantages to db" };
  }

  try {
    await updateEvacuatedAndQuit(
      evacuated,
      quit,
      castMembers,
      episodeRecord.id,
    );
  } catch (_) {
    return { error: "Error updating evacuated/quit players" };
  }

  try {
    await processEliminations(tribalCouncils, castMembers, episodeRecord.id);
  } catch (_) {
    return { error: "Error processing eliminations" };
  }

  redirect("/admin/episode/" + episodeRecord.id);
}
