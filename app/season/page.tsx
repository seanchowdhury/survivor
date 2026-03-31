import Link from "next/link";
import { getSeasonTotals, getConfessionalHeatmap, getVotesAgainst, getChallengeWins, getContention, getRightSideOfVote, getIdolsAndAdvantages, getAllianceGraphData } from "./actions";
import { SeasonPodium } from "./podium";
import { SeasonCastList } from "./cast-list";
import { ConfessionalHeatmap } from "./confessional-heatmap";
import { VotesAgainst } from "./votes-against";
import { ChallengeWins } from "./challenge-wins";
import { Contention } from "./contention";
import { RightSideOfVote } from "./right-side-of-vote";
import { IdolsAndAdvantages } from "./idols-and-advantages";
import { AllianceNetwork } from "./alliance-network";
import { cn } from "@/lib/utils";

export default async function SeasonPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === "fantasy" ? "fantasy" : "reality";

  const [cast, heatmapData, votesAgainst, challengeWins, contention, rightSide, idolsAndAdvantages, allianceGraph] = await Promise.all([
    getSeasonTotals(),
    getConfessionalHeatmap(),
    getVotesAgainst(),
    getChallengeWins(),
    getContention(),
    getRightSideOfVote(),
    getIdolsAndAdvantages(),
    getAllianceGraphData(),
  ]);

  const top3 = cast.slice(0, 3);
  const rest = cast.slice(3);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-5xl mx-auto px-4 py-16 flex flex-col gap-10">
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight">Season</h1>
        </div>

        {/* Tab switcher */}
        <div className="flex justify-center">
          <div className="flex bg-gray-800 rounded-full p-1 gap-1">
            <Link
              href="/season"
              className={cn(
                "px-5 py-1.5 rounded-full text-sm font-medium transition-colors",
                activeTab === "reality"
                  ? "bg-white text-gray-900"
                  : "text-gray-400 hover:text-white"
              )}
            >
              Reality
            </Link>
            <Link
              href="/season?tab=fantasy"
              className={cn(
                "px-5 py-1.5 rounded-full text-sm font-medium transition-colors",
                activeTab === "fantasy"
                  ? "bg-white text-gray-900"
                  : "text-gray-400 hover:text-white"
              )}
            >
              Fantasy
            </Link>
          </div>
        </div>

        {activeTab === "reality" ? (
          <>
            <ConfessionalHeatmap data={heatmapData} />
            <VotesAgainst entries={votesAgainst.entries} hasMerge={votesAgainst.hasMerge} />
            <RightSideOfVote entries={rightSide} />
            <Contention entries={contention} />
            <AllianceNetwork data={allianceGraph} />
            <ChallengeWins entries={challengeWins} />
            <IdolsAndAdvantages entries={idolsAndAdvantages} />
          </>
        ) : (
          <>
            {top3.length > 0 && <SeasonPodium top3={top3} />}
            {rest.length > 0 && <SeasonCastList cast={rest} startRank={4} />}

          </>
        )}
      </div>
    </div>
  );
}
