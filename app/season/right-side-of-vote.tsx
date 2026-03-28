import Image from "next/image";
import { RightSideEntry } from "./actions";

export function RightSideOfVote({ entries }: { entries: RightSideEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        Right Side of the Vote
      </h2>

      <div className="bg-gray-800 rounded-lg p-4 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="pb-2 text-left text-xs font-medium text-gray-500 w-full">Player</th>
              <th className="pb-2 text-right text-xs font-medium text-gray-500 pl-6 whitespace-nowrap">Correct</th>
              <th className="pb-2 text-right text-xs font-medium text-gray-500 pl-6 whitespace-nowrap">%</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const pct = entry.totalVotes > 0
                ? Math.round((entry.rightVotes / entry.totalVotes) * 100)
                : 0;
              return (
                <tr key={entry.castMemberId} className="border-b border-gray-700/50 last:border-0">
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="relative w-7 h-7 rounded-full overflow-hidden shrink-0 bg-gray-700">
                        <Image
                          src={entry.imageUrl}
                          alt={entry.name}
                          fill
                          className="object-cover object-top"
                          sizes="28px"
                        />
                      </div>
                      <span className="text-xs text-gray-300 truncate">{entry.name}</span>
                    </div>
                  </td>
                  <td className="py-2 pl-6 text-right text-sm font-bold text-white tabular-nums whitespace-nowrap">
                    {entry.rightVotes}
                    <span className="text-gray-500 font-normal text-xs"> / {entry.totalVotes}</span>
                  </td>
                  <td className="py-2 pl-6 text-right text-sm font-bold tabular-nums whitespace-nowrap"
                    style={{ color: pct >= 75 ? "rgb(74,222,128)" : pct >= 50 ? "rgb(251,191,36)" : "rgb(156,163,175)" }}
                  >
                    {pct}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
