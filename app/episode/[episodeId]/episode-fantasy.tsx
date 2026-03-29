"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { EpisodeFantasyRow } from "./actions";

const EVENT_LABELS: Record<string, string> = {
  winner: "Won the game",
  medical_evac: "Medical evacuation",
  final_3: "Made Final 3",
  makes_merge: "Survived to merge",
  won_individual_immunity: "Won individual immunity",
  found_idol: "Found hidden immunity idol",
  not_eliminated_per_episode: "Survived episode",
  effectively_blindsided_vote: "Voted in a blindside",
  played_idol: "Played hidden immunity idol",
  confessional_per_count: "Confessionals",
  drinks_wine: "Drank wine",
  hunted_for_food: "Hunted for food",
  voted_for_winner: "Voted for the winner",
  right_side_of_vote: "Right side of vote",
  won_tribal_immunity: "Won tribal immunity",
  won_reward: "Won reward",
  cancels_christmas: "Cancelled Christmas",
  premerge_tribal_council: "Pre-merge tribal council",
  blindsided_and_eliminated: "Blindsided and eliminated",
  went_home_with_idol: "Went home with idol",
  quit: "Quit",
};

type Props = {
  players: EpisodeFantasyRow[];
  currentEpisodeNumber: number;
};

export default function EpisodeFantasy({ players, currentEpisodeNumber }: Props) {
  if (players.length === 0) {
    return <p className="text-gray-500 text-sm">No scores recorded yet.</p>;
  }

  return (
    <Accordion type="multiple" className="flex flex-col gap-1 border-0">
      {players.map((p, i) => {
        const eliminated =
          p.eliminatedEpisodeNumber !== null &&
          p.eliminatedEpisodeNumber <= currentEpisodeNumber;

        return (
          <AccordionItem
            key={p.castMemberId}
            value={String(p.castMemberId)}
            className={`border-gray-600 rounded-lg bg-gray-700/50 px-3 ${eliminated ? "opacity-40" : ""}`}
          >
            <AccordionTrigger className="py-3 hover:no-underline [&>svg]:text-gray-400">
              <div className="flex items-center gap-3 flex-1 mr-3">
                <span className="text-xs text-gray-500 w-4 text-right shrink-0">{i + 1}</span>
                {p.imageUrl ? (
                  <Image
                    src={p.imageUrl}
                    alt={p.name}
                    width={32}
                    height={32}
                    className={`rounded-full object-cover shrink-0 ${eliminated ? "grayscale" : ""}`}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-600 shrink-0" />
                )}
                <span className="flex-1 text-sm text-left truncate">{p.name}</span>
                <span className={`text-sm font-semibold tabular-nums ${p.totalPoints < 0 ? "text-red-400" : "text-white"}`}>
                  {p.totalPoints > 0 ? "+" : ""}{p.totalPoints}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              {p.breakdown.length === 0 ? (
                <p className="text-xs text-gray-500 pl-10">No points this episode.</p>
              ) : (
                <div className="flex flex-col gap-1 pl-10">
                  {p.breakdown.map((b) => (
                    <div key={b.eventType} className="flex justify-between text-xs">
                      <span className="text-gray-400">
                        {EVENT_LABELS[b.eventType] ?? b.eventType}
                      </span>
                      <span className={`tabular-nums font-medium ${b.points < 0 ? "text-red-400" : "text-gray-200"}`}>
                        {b.points > 0 ? "+" : ""}{b.points}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <Link href={`/player/${p.castMemberId}`} className="text-xs text-gray-500 hover:text-gray-300 transition-colors pl-10 mt-1 inline-block">
                View profile →
              </Link>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
