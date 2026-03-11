"use server";

import { db } from "@/db";
import { eq } from "drizzle-orm";
import {
  parseConfessionals,
  parseTribalCouncils,
  parseChallenges,
  parseMedicalEvacs,
  ConfessionalsByPlayer,
  parseEpisodeInfo,
  EpisodeInfo,
  TribalCouncil,
  Challenge,
} from "./parse";
import {
  castMembersTable,
  challengesTable,
  challengeWinnersTable,
  confessionalCountTable,
  confessionalsTable,
  episodesTable,
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
      challengeWinners.forEach((tribe) => {
        tribeHash[tribe].forEach((castMemberId) => {
          winnersToInsert.push({ castMemberId, challengeId: challenge.id });
        });
      });
    } else {
      challengeWinners.forEach((individual) => {
        winnersToInsert.push({
          castMemberId: castHash[individual],
          challengeId: challenge.id,
        });
      });
    }
  });

  await db.insert(challengeWinnersTable).values(winnersToInsert);
}

async function getEpisodeContent(episode: string): Promise<[string, string]> {
  const response = await fetch(
    `https://survivor.fandom.com/api.php?action=query&titles=${episode}&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2`,
  );
  const data = await response.json();
  const title = data.query.pages[0].title;
  const content = data.query.pages[0].revisions[0].slots.main.content;
  return [title, content];
}

export async function processEpisodeWiki(
  _prevState: { error: string; fields?: { episode: string } } | null,
  formData: FormData,
) {
  const episode = formData.get("episode") as string;

  const [title, contentString] = await getEpisodeContent(episode);
  const confessionals = parseConfessionals(contentString);
  const tribalCouncils = parseTribalCouncils(contentString);
  const challenges = parseChallenges(contentString);
  const medicalEvacs = parseMedicalEvacs(contentString);
  const episodeInfo = parseEpisodeInfo(contentString);

  //Parse episode number and query for episode in db
  const episodeNumber = episodeInfo?.episodeNumber;
  if (!episodeNumber) return { error: "Could not parse episode number." };

  let episodeRecord: SelectEpisode = await getEpisodeByNumber(episodeNumber);
  if (!episodeRecord) {
    try {
      await insertEpisode(episodeInfo, title);
      episodeRecord = await getEpisodeByNumber(episodeNumber);
    } catch (_) {
      //handle insertError
      return { error: "Error adding episode to database" };
    }
  }

  const episodeConfessionals = await getConfessionalsByEpisodeId(
    episodeRecord.id,
  );
  if (!episodeConfessionals.length) {
    try {
      await insertConfessionals(confessionals, episodeRecord.id);
    } catch (_) {
      // handle insert error
      return { error: "Error adding confessionals to database" };
    }
  }

  const castMembers = await getCastMembers();
  const tribalVotes = await getTribalVotesByEpisodeId(episodeRecord.id);
  if (!tribalVotes.length) {
    try {
      await insertTribalVotes(tribalCouncils, castMembers, episodeRecord.id);
    } catch (_) {
      // handle insert error
      return { error: "Error adding tribal votes to db" };
    }
  }

  const queriedChallenges = await getChallengesByEpisodeId(episodeRecord.id);
  if (!queriedChallenges.length) {
    try {
      await insertChallenges(challenges, castMembers, episodeRecord.id);
    } catch (_) {
      //handle insert error
      return { error: "Error adding challenges to db" };
    }
  }

  redirect("/admin/episode/" + episodeRecord.id);
}
