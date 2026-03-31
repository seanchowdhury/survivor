import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TribeBadge } from "@/components/tribe-badge";
import {
  getCastMember,
  getCastMemberProfile,
  getPlayerConfessionals,
  getPlayerStats,
  getPlayerFantasyPoints,
  getPlayerEpisodeBreakdown,
  getPlayerSeasonRank,
} from "./actions";
import { ConfessionalChart } from "./confessional-chart";
import { FantasyChart } from "./fantasy-chart";
import { EpisodeBreakdown } from "./episode-breakdown";
import { PlayerStatsSection } from "./player-stats";
import { PlayerRadarChart } from "./player-radar-chart";

export default async function PlayerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ castMemberId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { castMemberId: castMemberIdStr } = await params;
  const { tab } = await searchParams;
  const castMemberId = parseInt(castMemberIdStr);
  const activeTab = tab === "fantasy" ? "fantasy" : "reality";

  const player = await getCastMember(castMemberId);
  if (!player) notFound();

  const imageUrl = player.portraitImageUrl ?? player.imageUrl;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center py-16 px-4">
      {/* Header */}
      <div className="w-full max-w-sm flex flex-col items-center gap-6 mb-6">
        <div className="relative w-64 h-64 rounded-2xl overflow-hidden bg-gray-800">
          <Image
            src={imageUrl}
            alt={player.name}
            fill
            className="object-cover object-top"
          />
          {player.finalPlacement === 1 && (
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-400 text-yellow-900">
                  🏆 Winner
                </span>
              </div>
            </>
          )}
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{player.name}</h1>
            {player.tribe && (
              <TribeBadge
                tribe={player.tribe}
                size="md"
                suffix={
                  player.eliminatedEpisodeId &&
                  player.eliminatedEpisodeNumber != null
                    ? `Ep ${player.eliminatedEpisodeNumber}`
                    : undefined
                }
              />
            )}
          </div>
          {player.quote && (
            <p className="text-sm text-gray-400 italic mt-2">
              "{player.quote}"
            </p>
          )}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex justify-center mb-6">
        <div className="flex bg-gray-800 rounded-full p-1 gap-1">
          <Link
            href={`/player/${castMemberId}`}
            className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === "reality"
                ? "bg-white text-gray-900"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Reality
          </Link>
          <Link
            href={`/player/${castMemberId}?tab=fantasy`}
            className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === "fantasy"
                ? "bg-white text-gray-900"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Fantasy
          </Link>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "fantasy" ? (
        <FantasyTabContent castMemberId={castMemberId} />
      ) : (
        <RealityTabContent castMemberId={castMemberId} />
      )}
    </div>
  );
}

async function RealityTabContent({ castMemberId }: { castMemberId: number }) {
  const [confessionals, stats, profile] = await Promise.all([
    getPlayerConfessionals(castMemberId),
    getPlayerStats(castMemberId),
    getCastMemberProfile(castMemberId),
  ]);
  return (
    <>
      <div className="w-full max-w-xl px-4 mb-3">
        <ConfessionalChart data={confessionals} />
      </div>
      <PlayerStatsSection stats={stats} />
      <div className="w-full max-w-xl px-4 mt-3">
        <PlayerRadarChart profile={profile} />
      </div>
    </>
  );
}

async function FantasyTabContent({ castMemberId }: { castMemberId: number }) {
  const [fantasyPoints, episodeBreakdown, rank] = await Promise.all([
    getPlayerFantasyPoints(castMemberId),
    getPlayerEpisodeBreakdown(castMemberId),
    getPlayerSeasonRank(castMemberId),
  ]);
  return (
    <div className="w-full max-w-xl px-4 flex flex-col gap-3">
      <div className="bg-gray-800 rounded-lg px-5 py-4 flex items-baseline gap-2">
        <span className="text-3xl font-black tabular-nums">
          {rank.totalPoints.toLocaleString()}
        </span>
        <span className="text-sm text-gray-400">pts</span>
        <span className="text-gray-600 mx-1">·</span>
        <span className="text-lg font-bold text-gray-300">#{rank.rank}</span>
        <span className="text-sm text-gray-500">of {rank.totalPlayers}</span>
      </div>
      <FantasyChart data={fantasyPoints} />
      <EpisodeBreakdown episodes={episodeBreakdown} />
    </div>
  );
}
