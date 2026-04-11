import { getLeaderboard, seedScoringRules, recalculateAllEpisodes } from "./actions";
import { RecalculateButton } from "./recalculate-button";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  // Ensure scoring rules are seeded
  await seedScoringRules();

  const entries = await getLeaderboard();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Fantasy Leaderboard</h1>
        <RecalculateButton action={recalculateAllEpisodes} />
      </div>

      {entries.length === 0 ? (
        <p className="text-muted-foreground">
          No participants yet. Add participants and assign draft picks at{" "}
          <a href="/admin/participants" className="underline">
            /admin/participants
          </a>
          .
        </p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 pr-4 w-8">Rank</th>
              <th className="text-left py-2 pr-4">Participant</th>
              <th className="text-right py-2">Total Points</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <LeaderboardRow key={entry.participantId} rank={i + 1} entry={entry} />
            ))}
          </tbody>
        </table>
      )}

      <p className="mt-6 text-sm text-muted-foreground">
        Scores update automatically when confessional counts are saved on the episode page.
      </p>
    </div>
  );
}

function LeaderboardRow({
  rank,
  entry,
}: {
  rank: number;
  entry: Awaited<ReturnType<typeof getLeaderboard>>[number];
}) {
  return (
    <>
      <tr className="border-b hover:bg-muted/50">
        <td className="py-2 pr-4 text-muted-foreground">{rank}</td>
        <td className="py-2 pr-4 font-medium">{entry.participantName}</td>
        <td className="py-2 text-right font-bold">{entry.totalPoints}</td>
      </tr>
      {entry.episodeBreakdown.length > 0 && (
        <tr className="border-b bg-muted/20">
          <td />
          <td colSpan={2} className="py-1 pb-2">
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {entry.episodeBreakdown.map((ep) => (
                <span key={ep.episodeId}>
                  Ep {ep.episodeNumber}: <span className="font-medium text-foreground">{ep.points} pts</span>
                </span>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
