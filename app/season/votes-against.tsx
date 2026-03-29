import Image from "next/image";
import Link from "next/link";
import { VotesAgainstEntry } from "./actions";

export function VotesAgainst({
  entries,
  hasMerge,
}: {
  entries: VotesAgainstEntry[];
  hasMerge: boolean;
}) {
  if (entries.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        Votes Against
      </h2>

      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex flex-col gap-0.5">
          {hasMerge && (
            <div className="flex items-center gap-3 pb-2 border-b border-gray-700 mb-1">
              <div className="w-8 h-8 shrink-0" />
              <div className="flex-1 text-xs text-gray-500 font-medium truncate" />
              <div className="flex gap-6 shrink-0 text-xs font-semibold w-32 justify-end">
                <span className="text-amber-400 w-8 text-center">Pre</span>
                <span className="text-red-400 w-8 text-center">Post</span>
                <span className="text-gray-300 w-8 text-center">Total</span>
              </div>
            </div>
          )}

          {entries.map((entry) => (
            <div
              key={entry.castMemberId}
              className="flex items-center gap-3 py-1"
            >
              <Link href={`/player/${entry.castMemberId}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 bg-gray-700">
                  <Image
                    src={entry.imageUrl}
                    alt={entry.name}
                    fill
                    className="object-cover object-top"
                    sizes="32px"
                  />
                </div>
                <span className="text-xs text-gray-300 truncate">{entry.name}</span>
              </Link>
              {hasMerge ? (
                <div className="flex gap-6 shrink-0 text-xs tabular-nums w-32 justify-end">
                  <span className="text-amber-400 w-8 text-center">{entry.preMerge}</span>
                  <span className="text-red-400 w-8 text-center">{entry.postMerge}</span>
                  <span className="text-white font-bold w-8 text-center">{entry.total}</span>
                </div>
              ) : (
                <span className="text-white font-bold text-sm tabular-nums shrink-0">
                  {entry.total}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
