import Image from "next/image";
import { ChallengeWinsEntry } from "./actions";

export function ChallengeWins({ entries }: { entries: ChallengeWinsEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        Challenge Wins
      </h2>

      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex flex-col gap-0.5">
          {entries.map((entry) => (
            <div
              key={entry.castMemberId}
              className={`flex items-center gap-3 py-1 ${entry.isEliminated ? "opacity-50" : ""}`}
            >
              <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 bg-gray-700">
                <Image
                  src={entry.imageUrl}
                  alt={entry.name}
                  fill
                  className="object-cover object-top"
                  sizes="32px"
                />
              </div>
              <span className="flex-1 text-xs text-gray-300 truncate">{entry.name}</span>
              <span className="text-white font-bold text-sm tabular-nums shrink-0">
                {entry.wins}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
