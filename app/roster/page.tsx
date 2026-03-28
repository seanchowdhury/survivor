import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { getMyRoster } from "./actions";
import { TribeBadge } from "@/components/tribe-badge";

export default async function RosterPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");

  const data = await getMyRoster(session.user.id);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-3xl mx-auto px-4 py-16 flex flex-col gap-10">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black tracking-tight">My Roster</h1>
          <p className="text-gray-400 text-sm mt-1">{session.user.name}</p>
        </div>

        {!data ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-400">Your account hasn&apos;t been linked to a roster yet.</p>
            <p className="text-gray-500 text-sm mt-1">Ask an admin to link your account.</p>
          </div>
        ) : (
          <>
            {/* Season stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800 rounded-lg p-5">
                <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Season Points</p>
                <p className="text-4xl font-black tabular-nums">{data.totalPoints.toLocaleString()}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-5">
                <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Rank</p>
                <p className="text-4xl font-black tabular-nums">#{data.rank}</p>
              </div>
            </div>

            {/* Current roster */}
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
                Current Roster
              </h2>
              {data.currentRoster.length === 0 ? (
                <p className="text-gray-500 text-sm">No cast members on roster yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {data.currentRoster.map((member) => {
                    const imageUrl = member.portraitImageUrl ?? member.imageUrl;
                    return (
                      <div
                        key={member.castMemberId}
                        className={`relative overflow-hidden rounded-xl bg-gray-800 aspect-[3/4] ${member.isEliminated ? "opacity-50" : ""}`}
                      >
                        <Image
                          src={imageUrl}
                          alt={member.name}
                          fill
                          className="object-cover object-top"
                          sizes="(max-width: 640px) 50vw, 33vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-sm font-bold leading-tight">{member.name}</p>
                          <div className="flex items-center justify-between mt-1">
                            <TribeBadge tribe={member.tribe} />
                            <span className={`text-xs font-bold tabular-nums ${member.totalPoints < 0 ? "text-red-400" : "text-white"}`}>
                              {member.totalPoints} pts
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Episode breakdown */}
            {data.episodeBreakdown.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
                  Episode Breakdown
                </h2>
                <div className="bg-gray-800 rounded-lg overflow-hidden divide-y divide-gray-700">
                  {data.episodeBreakdown.map((ep) => (
                    <div key={ep.episodeId} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <span className="text-xs text-gray-500 mr-2">Ep {ep.episodeNumber}</span>
                        <span className="text-sm">{ep.title}</span>
                      </div>
                      <span className={`text-sm font-bold tabular-nums ${ep.points < 0 ? "text-red-400" : "text-white"}`}>
                        {ep.points > 0 ? "+" : ""}{ep.points}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
