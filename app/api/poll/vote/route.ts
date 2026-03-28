import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import { pollVotesTable } from "@/db/schema";
import { makeJt } from "@/lib/poll-token";

const VOTER_COOKIE = "voter_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const VALID_QUESTIONS = ["next_boot", "story_focus", "biggest_threat"] as const;
type PollQuestion = (typeof VALID_QUESTIONS)[number];

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
    episodeId?: unknown;
    question?: unknown;
    castMemberId?: unknown;
    honeypot?: unknown;
    jt?: unknown;
    nonce?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const { episodeId, question, castMemberId, honeypot, jt, nonce } = body;

  if (
    typeof episodeId !== "number" ||
    typeof question !== "string" ||
    typeof castMemberId !== "number" ||
    !VALID_QUESTIONS.includes(question as PollQuestion)
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

  // Silent drop: already voted by this token
  const existingToken = await db
    .select({ id: pollVotesTable.id })
    .from(pollVotesTable)
    .where(
      and(
        eq(pollVotesTable.episodeId, episodeId),
        eq(pollVotesTable.question, question),
        eq(pollVotesTable.voterToken, voterToken)
      )
    )
    .limit(1);
  if (existingToken.length > 0) return ok;

  // Silent drop: already voted by this IP
  const existingIp = await db
    .select({ id: pollVotesTable.id })
    .from(pollVotesTable)
    .where(
      and(
        eq(pollVotesTable.episodeId, episodeId),
        eq(pollVotesTable.question, question),
        eq(pollVotesTable.ipHash, ipHash)
      )
    )
    .limit(1);
  if (existingIp.length > 0) return ok;

  await db.insert(pollVotesTable).values({
    episodeId,
    question,
    castMemberId,
    voterToken,
    ipHash,
  });
  return ok;
}
