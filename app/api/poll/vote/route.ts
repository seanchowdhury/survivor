import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import { pollVotesTable } from "@/db/schema";
import { makeJt } from "@/lib/poll-token";

const VOTER_COOKIE = "voter_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const SELECT_CAST_MEMBER_QUESTIONS = ["next_boot", "story_focus", "biggest_threat", "mvp_prev_episode"];

function getIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export async function POST(req: NextRequest) {
  const voterToken =
    req.cookies.get(VOTER_COOKIE)?.value ?? crypto.randomUUID();

  const ip = getIp(req);
  const ipHash = hashIp(ip);

  let body: {
    questionType?: unknown;
    question?: unknown;
    castMemberId?: unknown;
    answer?: unknown;
    honeypot?: unknown;
    jt?: unknown;
    nonce?: unknown;
    episodeId?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const { questionType, question, castMemberId, answer, honeypot, jt, nonce, episodeId } = body;

  const isSelectCastMember =
    questionType === "select_cast_member" &&
    typeof question === "string" &&
    SELECT_CAST_MEMBER_QUESTIONS.includes(question) &&
    typeof castMemberId === "number";

  const isYesNo =
    questionType === "yesno" &&
    question === "blindsided" &&
    typeof castMemberId === "number" &&
    typeof answer === "boolean";

  if (
    typeof episodeId !== "number" ||
    (!isSelectCastMember && !isYesNo)
  ) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const ok = NextResponse.json({ ok: true });
  ok.cookies.set(VOTER_COOKIE, voterToken, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  // Silent drop: honeypot filled
  if (typeof honeypot === "string" && honeypot.length > 0) return ok;

  // Silent drop: JS token missing or invalid
  if (
    typeof jt !== "string" ||
    typeof nonce !== "string" ||
    jt !== makeJt(episodeId, nonce)
  ) {
    return ok;
  }

  // For yesno questions, dedup includes castMemberId (the subject player) since
  // multiple blindside questions can exist per episode.
  // For select_cast_member, dedup is by question alone.
  const dedupWhere = isYesNo
    ? and(
        eq(pollVotesTable.episodeId, episodeId),
        eq(pollVotesTable.question, question as string),
        eq(pollVotesTable.castMemberId, castMemberId as number),
      )
    : and(
        eq(pollVotesTable.episodeId, episodeId),
        eq(pollVotesTable.question, question as string),
      );

  // Silent drop: already voted by this token
  const existingToken = await db
    .select({ id: pollVotesTable.id })
    .from(pollVotesTable)
    .where(and(dedupWhere, eq(pollVotesTable.voterToken, voterToken)))
    .limit(1);
  if (existingToken.length > 0) return ok;

  // Silent drop: already voted by this IP
  const existingIp = await db
    .select({ id: pollVotesTable.id })
    .from(pollVotesTable)
    .where(and(dedupWhere, eq(pollVotesTable.ipHash, ipHash)))
    .limit(1);
  if (existingIp.length > 0) return ok;

  await db.insert(pollVotesTable).values({
    episodeId,
    questionType: questionType as string,
    question: question as string,
    castMemberId: castMemberId as number,
    answer: isYesNo ? (answer as boolean) : null,
    voterToken,
    ipHash,
  });
  return ok;
}
