import Image from "next/image";
import { ContentionEntry } from "./actions";

function Portrait({ src, name }: { src: string; name: string }) {
  return (
    <div className="flex flex-col items-center gap-1 w-14">
      <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 bg-gray-700">
        <Image src={src} alt={name} fill className="object-cover object-top" sizes="40px" />
      </div>
      <span className="text-xs text-gray-400 truncate w-full text-center">{name.split(" ")[0]}</span>
    </div>
  );
}

export function Contention({ entries }: { entries: ContentionEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        The Beef Zone
      </h2>

      <div className="bg-gray-800 rounded-lg p-4 flex flex-col gap-3">
        {entries.map((entry) => (
          <div
            key={`${entry.voterId}-${entry.votedForId}`}
            className="flex items-center gap-3"
          >
            <Portrait src={entry.voterImageUrl} name={entry.voterName} />
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              <span className="text-gray-500 text-xs">→</span>
            </div>
            <Portrait src={entry.votedForImageUrl} name={entry.votedForName} />
            <span className="ml-auto text-white font-bold text-sm tabular-nums shrink-0">
              {entry.count}× votes
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
