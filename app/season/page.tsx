import { getSeasonTotals } from "./actions";
import { SeasonPodium } from "./podium";
import { SeasonCastList } from "./cast-list";

export default async function SeasonPage() {
  const cast = await getSeasonTotals();
  const top3 = cast.slice(0, 3);
  const rest = cast.slice(3);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-5xl mx-auto px-4 py-16 flex flex-col gap-10">
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight">Season Totals</h1>
          <p className="text-gray-400 text-sm mt-2">Fantasy points earned by each castaway</p>
        </div>

        {top3.length > 0 && <SeasonPodium top3={top3} />}
        {rest.length > 0 && <SeasonCastList cast={rest} startRank={4} />}
      </div>
    </div>
  );
}
