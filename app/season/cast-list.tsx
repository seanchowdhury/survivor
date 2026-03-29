import Image from "next/image";
import Link from "next/link";
import { TribeBadge } from "@/components/tribe-badge";
import type { SeasonCastMemberRow } from "./actions";

function CastListRow({
  member,
  rank,
}: {
  member: SeasonCastMemberRow;
  rank: number;
}) {
  const topStats = member.stats.filter((s) => s.points > 0).slice(0, 2);

  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <span className="text-xs text-gray-500 w-6 text-right shrink-0 tabular-nums">
        {rank}
      </span>
      <Link href={`/player/${member.castMemberId}`} className="flex items-center gap-3 shrink-0 hover:opacity-80 transition-opacity">
        <div className="relative w-10 h-10 shrink-0">
          <Image
            src={member.imageUrl}
            alt={member.name}
            fill
            className={`rounded-full object-cover object-top ${member.isEliminated ? "grayscale opacity-50" : ""}`}
            sizes="40px"
          />
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-medium truncate ${member.isEliminated ? "text-gray-400" : "text-white"}`}>
            {member.name}
          </p>
          <TribeBadge tribe={member.tribe} />
        </div>
      </Link>
      <div className="hidden sm:flex gap-3">
        {topStats.map((s) => (
          <span key={s.label} className="text-xs text-gray-500">
            {s.label}: <span className="text-gray-300">{s.points}</span>
          </span>
        ))}
      </div>
      <span
        className={`text-sm font-bold tabular-nums ml-2 shrink-0 ${
          member.totalPoints < 0 ? "text-red-400" : "text-white"
        }`}
      >
        {member.totalPoints.toLocaleString()} pts
      </span>
    </div>
  );
}

export function SeasonCastList({
  cast,
  startRank,
}: {
  cast: SeasonCastMemberRow[];
  startRank: number;
}) {
  return (
    <section className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="flex flex-col divide-y divide-gray-700">
        {cast.map((member, i) => (
          <CastListRow key={member.castMemberId} member={member} rank={startRank + i} />
        ))}
      </div>
    </section>
  );
}
