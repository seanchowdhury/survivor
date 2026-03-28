import { cookies } from "next/headers";
import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import { pollVotesTable } from "@/db/schema";
import { getPollData } from "./actions";
import { PollClient } from "./poll-client";
import { makeNonce, makeJt } from "@/lib/poll-token";

function isPollClosed(): boolean {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  return weekday === "Wednesday" && hour >= 19;
}

export default async function PollPage() {
  const data = await getPollData();

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-gray-400">No active poll yet.</p>
      </div>
    );
  }

  // Check if this browser has already voted (by cookie)
  const cookieStore = await cookies();
  const voterToken = cookieStore.get("voter_token")?.value ?? null;

  let hasVoted = false;
  if (voterToken) {
    const existing = await db
      .select({ id: pollVotesTable.id })
      .from(pollVotesTable)
      .where(
        and(
          eq(pollVotesTable.episodeId, data.episodeId),
          eq(pollVotesTable.voterToken, voterToken)
        )
      )
      .limit(1);
    hasVoted = existing.length > 0;
  }

  const closed = isPollClosed();

  // Generate JS token for spam protection
  const nonce = makeNonce();
  const jt = makeJt(data.episodeId, nonce);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-16 flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Community Poll</h1>
          <p className="text-gray-400 text-sm mt-1">
            {closed
              ? "Voting is closed — here's how everyone voted"
              : data.episodeNumber != null
              ? `Episode ${data.episodeNumber + 1}`
              : "What do you think?"}
          </p>
        </div>
        <PollClient
          data={data}
          hasVoted={hasVoted}
          isClosed={closed}
          nonce={nonce}
          jt={jt}
        />
      </div>
    </div>
  );
}
