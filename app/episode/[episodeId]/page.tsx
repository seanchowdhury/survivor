import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getEpisodePage,
  getConfessionalCounts,
  getChallenges,
  getTribalVotes,
} from "./actions";

function TribeBadge({ tribe }: { tribe: string }) {
  const styles: Record<string, string> = {
    cila: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
    kalo: "bg-teal-500/20 text-teal-300 border border-teal-500/30",
    vatu: "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30",
  };
  const cls = styles[tribe.toLowerCase()] ?? "bg-gray-600/40 text-gray-300 border border-gray-500/30";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-sm font-semibold capitalize ${cls}`}>
      {tribe}
    </span>
  );
}

export default async function EpisodeShowPage({
  params,
}: {
  params: Promise<{ episodeId: string }>;
}) {
  const { episodeId: episodeIdStr } = await params;
  const episodeId = parseInt(episodeIdStr);

  const episode = await getEpisodePage(episodeId);
  if (!episode) notFound();

  const [confessionals, challenges, tribalVotes] = await Promise.all([
    getConfessionalCounts(episodeId, episode.episodeNumber ?? 0),
    getChallenges(episodeId),
    getTribalVotes(episodeId),
  ]);

  const maxCount = confessionals[0]?.count ?? 1;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Header */}
        <div>
          <p className="text-sm text-gray-400 uppercase tracking-wider mb-1">
            Episode {episode.episodeNumber}
          </p>
          <h1 className="text-2xl font-bold">{episode.title}</h1>
          <div className="flex justify-between mt-3">
            {episode.prevId ? (
              <Link
                href={`/episode/${episode.prevId}`}
                className="text-sm text-gray-400 hover:text-white"
              >
                ← Episode {episode.prevNumber}
              </Link>
            ) : (
              <span />
            )}
            {episode.nextId && (
              <Link
                href={`/episode/${episode.nextId}`}
                className="text-sm text-gray-400 hover:text-white"
              >
                Episode {episode.nextNumber} →
              </Link>
            )}
          </div>
        </div>

        {/* Confessionals */}
        <section className="bg-gray-800 rounded-lg p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
            Confessionals
          </h2>
          {confessionals.length === 0 ? (
            <p className="text-gray-500 text-sm">No confessionals recorded.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {confessionals.map((c) => (
                <div key={c.name} className="flex items-center gap-3">
                  {c.imageUrl ? (
                    <Image
                      src={c.imageUrl}
                      alt={c.name}
                      width={32}
                      height={32}
                      className="rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-700 shrink-0" />
                  )}
                  <span className="w-32 text-sm truncate">{c.name}</span>
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(c.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-300 w-4 text-right">{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Challenges */}
        <section className="bg-gray-800 rounded-lg p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
            Challenges
          </h2>
          {challenges.length === 0 ? (
            <p className="text-gray-500 text-sm">No challenges recorded.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {challenges.map((c) => {
                const firstPlace = c.winners.filter((w) => w.placement === 1);
                const secondPlace = c.winners.filter((w) => w.placement === 2);
                return (
                  <div
                    key={c.id}
                    className="bg-gray-700 rounded-lg p-4 flex-1 min-w-48"
                  >
                    <p className="font-medium text-sm mb-2">{c.challengeName}</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {c.isImmunity && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">
                          Immunity
                        </span>
                      )}
                      {c.isReward && (
                        <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">
                          Reward
                        </span>
                      )}
                      <span className="text-xs bg-gray-600 text-gray-300 px-2 py-0.5 rounded-full">
                        {c.individualChallenge ? "Individual" : "Tribal"}
                      </span>
                    </div>
                    {firstPlace.length > 0 && (
                      <div className="mt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-400">1st</span>
                          {c.tribes?.[0] && <TribeBadge tribe={c.tribes[0]} />}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {firstPlace.map((w) => w.castMemberName).join(", ")}
                        </p>
                      </div>
                    )}
                    {secondPlace.length > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-400">2nd</span>
                          {c.tribes?.[1] && <TribeBadge tribe={c.tribes[1]} />}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {secondPlace.map((w) => w.castMemberName).join(", ")}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Tribal Council */}
        <section className="bg-gray-800 rounded-lg p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
            Tribal Council
          </h2>
          {tribalVotes.length === 0 ? (
            <p className="text-gray-500 text-sm">No tribal council recorded.</p>
          ) : (
            <div className="flex flex-col gap-6">
              {tribalVotes.map((council) => (
                <div key={council.councilId}>
                  <div className="flex items-center gap-2 mb-2">
                    <TribeBadge tribe={council.tribe} />
                    {council.sequence > 1 && (
                      <span className="text-xs text-gray-500">(Revote)</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {council.votes.map((v, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="w-36 truncate">{v.voterName}</span>
                        <span className="text-gray-500">→</span>
                        <span className="text-gray-300">
                          {v.votedForName ?? <span className="text-gray-600">—</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                  {council.eliminatedName && (
                    <p className="mt-3 text-sm text-red-400">
                      ✗ Eliminated: {council.eliminatedName}
                      {council.blindsided && (
                        <span className="ml-2 text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">
                          Blindsided
                        </span>
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
