import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { getLeaderboard } from "@/app/admin/leaderboard/actions";
import { getComments } from "./actions";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { participantsTable } from "@/db/schema";
import { cn } from "@/lib/utils";
import { CommentSection } from "./comment-section";

export default async function LeaderboardPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");

  const [entries, myParticipant, comments] = await Promise.all([
    getLeaderboard(),
    db
      .select({ id: participantsTable.id })
      .from(participantsTable)
      .where(eq(participantsTable.userId, session.user.id))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    getComments(),
  ]);

  const myParticipantId = myParticipant?.id ?? null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-16 flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Leaderboard</h1>
          <p className="text-gray-400 text-sm mt-1">Season fantasy standings</p>
        </div>

        {entries.length === 0 ? (
          <p className="text-gray-500 text-sm">No participants yet.</p>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden divide-y divide-gray-700">
            {entries.map((entry, i) => {
              const isMe = entry.participantId === myParticipantId;
              const rank = i + 1;
              return (
                <div
                  key={entry.participantId}
                  className={cn(
                    "px-5 py-4",
                    isMe && "bg-white/5 ring-1 ring-inset ring-white/10"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500 w-6 text-right tabular-nums shrink-0">
                      {rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-semibold", isMe ? "text-white" : "text-gray-200")}>
                          {entry.participantName}
                        </span>
                        {isMe && (
                          <span className="text-xs bg-white/10 text-gray-300 px-1.5 py-0.5 rounded-full">
                            you
                          </span>
                        )}
                      </div>
                      {entry.episodeBreakdown.length > 0 && (
                        <div className="hidden sm:flex flex-wrap gap-2 mt-1">
                          {entry.episodeBreakdown.map((ep) => (
                            <span key={ep.episodeId} className="text-xs text-gray-500">
                              Ep {ep.episodeNumber}:{" "}
                              <span className={cn("font-medium", ep.points < 0 ? "text-red-400" : "text-gray-300")}>
                                {ep.points > 0 ? "+" : ""}{ep.points}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className={cn(
                      "text-base font-black tabular-nums shrink-0",
                      entry.totalPoints < 0 ? "text-red-400" : "text-white"
                    )}>
                      {entry.totalPoints.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <CommentSection comments={comments} />
      </div>
    </div>
  );
}
