import type { PlayerStats } from "./actions";

export function PlayerStatsSection({ stats }: { stats: PlayerStats }) {
  const { votesAgainst, challengeWins, rightSideOfVote, idols } = stats;
  const rsovPct = rightSideOfVote.total > 0
    ? Math.round((rightSideOfVote.right / rightSideOfVote.total) * 100)
    : null;

  return (
    <section className="w-full max-w-xl px-4 flex flex-col gap-3">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Votes Against */}
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">Votes Against</p>
          <p className="text-3xl font-black tabular-nums">{votesAgainst.total}</p>
          {(votesAgainst.preMerge > 0 || votesAgainst.postMerge > 0) && (
            <div className="flex gap-3 mt-2 text-xs text-gray-500">
              <span><span className="text-amber-400">{votesAgainst.preMerge}</span> pre</span>
              <span><span className="text-red-400">{votesAgainst.postMerge}</span> post</span>
            </div>
          )}
        </div>

        {/* Challenge Wins */}
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">Challenge Wins</p>
          <p className="text-3xl font-black tabular-nums">{challengeWins.total}</p>
          {challengeWins.total > 0 && (
            <div className="flex gap-3 mt-2 text-xs text-gray-500">
              <span><span className="text-yellow-300">{challengeWins.immunity}</span> immunity</span>
              <span><span className="text-green-400">{challengeWins.reward}</span> reward</span>
            </div>
          )}
        </div>

        {/* Right Side of Vote */}
        <div className="bg-gray-800 rounded-lg p-4 col-span-2">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">Right Side of the Vote</p>
          <div className="flex items-end gap-3">
            <p className="text-3xl font-black tabular-nums">
              {rightSideOfVote.right}
              <span className="text-sm font-normal text-gray-500"> / {rightSideOfVote.total}</span>
            </p>
            {rsovPct !== null && (
              <p
                className="text-xl font-bold tabular-nums mb-0.5"
                style={{ color: rsovPct >= 75 ? "rgb(74,222,128)" : rsovPct >= 50 ? "rgb(251,191,36)" : "rgb(156,163,175)" }}
              >
                {rsovPct}%
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Idols & Advantages */}
      {idols.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">Idols & Advantages</p>
          <div className="flex flex-col gap-2">
            {idols.map((item) => (
              <div key={`${item.type}-${item.foundInEpisode}-${item.label}`} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-300">
                    {item.label ?? (item.type === "idol" ? "Hidden Immunity Idol" : "Advantage")}
                  </span>
                  {item.foundInEpisode != null && (
                    <span className="text-xs text-gray-500">Ep {item.foundInEpisode}</span>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${item.played ? "bg-green-500/20 text-green-300" : "bg-yellow-500/20 text-yellow-300"}`}>
                  {item.played ? "Played" : "Unplayed"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
