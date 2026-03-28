import Image from "next/image";
import { TribeBadge } from "@/components/tribe-badge";
import type { SeasonCastMemberRow } from "./actions";

const RANK_STYLES: Record<number, { badge: string; glow: string; label: string }> = {
  1: {
    badge: "bg-yellow-400 text-yellow-900",
    glow: "ring-2 ring-yellow-400/40 shadow-[0_0_30px_rgba(250,204,21,0.15)]",
    label: "🥇",
  },
  2: {
    badge: "bg-gray-300 text-gray-800",
    glow: "ring-2 ring-gray-400/30 shadow-[0_0_20px_rgba(156,163,175,0.1)]",
    label: "🥈",
  },
  3: {
    badge: "bg-amber-700 text-amber-100",
    glow: "ring-2 ring-amber-700/30 shadow-[0_0_20px_rgba(180,83,9,0.1)]",
    label: "🥉",
  },
};

const CARD_HEIGHTS: Record<number, string> = {
  1: "min-h-[500px]",
  2: "min-h-[440px]",
  3: "min-h-[400px]",
};

function PodiumCard({ member, rank }: { member: SeasonCastMemberRow; rank: number }) {
  const style = RANK_STYLES[rank];
  const imageUrl = member.portraitImageUrl ?? member.imageUrl;
  const nonZeroStats = member.stats.filter((s) => s.points !== 0);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gray-800 ${CARD_HEIGHTS[rank]} ${style.glow} flex flex-col`}
    >
      {/* Portrait */}
      <div className="absolute inset-0">
        <Image
          src={imageUrl}
          alt={member.name}
          fill
          className="object-cover object-top"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

      {/* Rank badge */}
      <div className="absolute top-3 left-3 z-10">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${style.badge}`}
        >
          {style.label} #{rank}
        </span>
      </div>

      {/* Content — pinned to bottom */}
      <div className="relative z-10 mt-auto p-4 flex flex-col gap-2">
        <div>
          <p className="text-xl font-bold leading-tight">{member.name}</p>
          <div className="mt-1">
            <TribeBadge tribe={member.tribe} size="md" />
          </div>
        </div>

        <p
          className={`text-3xl font-black tabular-nums ${rank === 1 ? "text-yellow-400" : "text-white"}`}
        >
          {member.totalPoints.toLocaleString()}
          <span className="text-sm font-normal text-gray-400 ml-1">pts</span>
        </p>

        {/* Stats breakdown */}
        {nonZeroStats.length > 0 && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 pt-1 border-t border-white/10">
            {nonZeroStats.map((s) => (
              <div key={s.label} className="flex justify-between text-xs">
                <span className="text-gray-400 truncate">{s.label}</span>
                <span className={s.points < 0 ? "text-red-400" : "text-gray-200"}>
                  {s.points > 0 ? "+" : ""}
                  {s.points}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function SeasonPodium({ top3 }: { top3: SeasonCastMemberRow[] }) {
  const [first, second, third] = top3;

  return (
    <div className="flex flex-col sm:grid sm:grid-cols-3 sm:items-end gap-4">
      {/* Rank 1 first in DOM for mobile; order-1 on desktop (center) */}
      <div className="sm:order-1 order-0">
        {first && <PodiumCard member={first} rank={1} />}
      </div>
      {/* Rank 2 — left on desktop */}
      <div className="sm:order-0 order-1">
        {second && <PodiumCard member={second} rank={2} />}
      </div>
      {/* Rank 3 — right on desktop */}
      <div className="sm:order-2 order-2">
        {third && <PodiumCard member={third} rank={3} />}
      </div>
    </div>
  );
}
