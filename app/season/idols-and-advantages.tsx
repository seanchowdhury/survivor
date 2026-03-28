import Image from "next/image";
import { IdolEntry } from "./actions";

function Portrait({ src, name }: { src: string; name: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-7 h-7 rounded-full overflow-hidden shrink-0 bg-gray-700">
        <Image src={src} alt={name} fill className="object-cover object-top" sizes="28px" />
      </div>
      <span className="text-xs text-gray-300">{name}</span>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-16 shrink-0">{label}</span>
      {children}
    </div>
  );
}

export function IdolsAndAdvantages({ entries }: { entries: IdolEntry[] }) {
  const visible = entries.filter(
    (entry) => entry.currentHolderName === null || !entry.currentHolderIsEliminated
  );
  if (visible.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        Active Idols & Advantages
      </h2>

      <div className="flex flex-col gap-3">
        {visible.map((entry) => {
          const holderActive = entry.currentHolderName !== null && !entry.currentHolderIsEliminated;
          const isGone = !holderActive && entry.usedByName === null;
          const displayLabel =
            entry.label ?? (entry.type === "idol" ? "Hidden Immunity Idol" : "Advantage");

          return (
            <div key={`${entry.type}-${entry.id}`} className="bg-gray-800 rounded-lg p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    entry.type === "idol"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-purple-500/20 text-purple-400"
                  }`}
                >
                  {entry.type === "idol" ? "Idol" : "Advantage"}
                </span>
                <span className="text-sm font-medium text-white">{displayLabel}</span>
              </div>

              <Row label="Found">
                <Portrait src={entry.foundByImageUrl} name={entry.foundByName} />
                {entry.foundInEpisodeNumber != null && (
                  <span className="text-xs text-gray-500 ml-1">Ep {entry.foundInEpisodeNumber}</span>
                )}
              </Row>

              {holderActive && entry.currentHolderImageUrl ? (
                <Row label="Held by">
                  <Portrait src={entry.currentHolderImageUrl} name={entry.currentHolderName!} />
                </Row>
              ) : isGone ? (
                <Row label="Status">
                  <span className="text-xs text-gray-500 italic">Gone</span>
                </Row>
              ) : null}

              {entry.usedByName && (
                <Row label="Played by">
                  <span className="text-xs text-gray-300">{entry.usedByName}</span>
                  {entry.usedInEpisodeNumber != null && (
                    <span className="text-xs text-gray-500 ml-1">Ep {entry.usedInEpisodeNumber}</span>
                  )}
                </Row>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
