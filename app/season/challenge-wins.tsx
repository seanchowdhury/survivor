"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChallengeWinsEntry } from "./actions";

export function ChallengeWins({ entries }: { entries: ChallengeWinsEntry[] }) {
  const [separate, setSeparate] = useState(false);

  if (entries.length === 0) return null;

  const active = entries.filter((e) => !e.isEliminated);
  const eliminated = entries.filter((e) => e.isEliminated);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          Challenge Wins
        </h2>
        <button
          onClick={() => setSeparate((s) => !s)}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          {separate ? "See eliminated" : "Remove eliminated"}
        </button>
      </div>

      {separate ? (
        <div className="flex flex-col gap-3">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex flex-col gap-0.5">
              {active.map((entry) => (
                <Row key={entry.castMemberId} entry={entry} />
              ))}
            </div>
          </div>
          {eliminated.length > 0 && (
            <>
              <p className="text-xs text-gray-600 uppercase tracking-widest px-1">Eliminated</p>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex flex-col gap-0.5">
                  {eliminated.map((entry) => (
                    <Row key={entry.castMemberId} entry={entry} dim />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex flex-col gap-0.5">
            {entries.map((entry) => (
              <Row key={entry.castMemberId} entry={entry} dim={entry.isEliminated} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Row({ entry, dim }: { entry: ChallengeWinsEntry; dim?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3 py-1", dim && "opacity-50")}>
      <Link href={`/player/${entry.castMemberId}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 bg-gray-700">
          <Image
            src={entry.imageUrl}
            alt={entry.name}
            fill
            className="object-cover object-top"
            sizes="32px"
          />
        </div>
        <span className="text-xs text-gray-300 truncate">{entry.name}</span>
      </Link>
      <span className="text-white font-bold text-sm tabular-nums shrink-0">{entry.wins}</span>
    </div>
  );
}
