import Image from "next/image";
import { HeatmapData } from "./actions";

export function ConfessionalHeatmap({ data }: { data: HeatmapData }) {
  const { episodes, castaways, maxCount } = data;

  if (castaways.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          Confessional Heat Map
        </h2>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 overflow-x-auto">
        <table className="border-separate border-spacing-0">
          <thead>
            <tr>
              {/* Name column header */}
              <th className="w-36 shrink-0" />
              {episodes.map((ep, i) => {
                const prevEp = episodes[i - 1];
                const showMergeLine = ep.mergeOccurred && !prevEp?.mergeOccurred;
                return (
                  <th
                    key={ep.id}
                    className="pb-2 text-center"
                    style={showMergeLine ? { borderLeft: "2px solid rgba(255,255,255,0.15)" } : undefined}
                  >
                    <span className="text-xs text-gray-500 font-normal whitespace-nowrap px-1">
                      {ep.episodeNumber != null ? `Ep ${ep.episodeNumber}` : "—"}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {castaways.map((castaway) => {
              const isEliminated = castaway.eliminatedEpisodeId !== null;
              return (
                <tr key={castaway.castMemberId}>
                  {/* Name cell */}
                  <td className="pr-3 py-0.5">
                    <div className={`flex items-center gap-2 ${isEliminated ? "opacity-50" : ""}`}>
                      <div className="relative w-6 h-6 rounded-full overflow-hidden shrink-0 bg-gray-700">
                        <Image
                          src={castaway.imageUrl}
                          alt={castaway.name}
                          fill
                          className="object-cover object-top"
                          sizes="24px"
                        />
                      </div>
                      <span className="text-xs text-gray-300 truncate max-w-[88px]">
                        {castaway.name}
                      </span>
                    </div>
                  </td>

                  {/* Count cells */}
                  {castaway.counts.map((count, epIdx) => {
                    const ep = episodes[epIdx];
                    const prevEp = episodes[epIdx - 1];
                    const showMergeLine = ep.mergeOccurred && !prevEp?.mergeOccurred;

                    let bg: string;
                    let title: string;

                    if (count === null) {
                      bg = "rgba(55,65,81,0.3)";
                      title = `${castaway.name} — Ep ${ep.episodeNumber ?? "?"}: no data`;
                    } else if (count === 0) {
                      bg = "rgba(55,65,81,0.5)";
                      title = `${castaway.name} — Ep ${ep.episodeNumber ?? "?"}: 0 confessionals`;
                    } else {
                      const intensity = 0.15 + (count / maxCount) * 0.85;
                      bg = `rgba(251,146,60,${intensity.toFixed(3)})`;
                      title = `${castaway.name} — Ep ${ep.episodeNumber ?? "?"}: ${count} confessional${count === 1 ? "" : "s"}`;
                    }

                    return (
                      <td
                        key={ep.id}
                        className="p-0.5"
                        style={showMergeLine ? { borderLeft: "2px solid rgba(255,255,255,0.15)" } : undefined}
                      >
                        <div
                          className="w-8 h-8 rounded-sm"
                          style={{ backgroundColor: bg }}
                          title={title}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
