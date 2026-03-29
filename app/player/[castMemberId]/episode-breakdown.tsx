"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { PlayerEpisodeBreakdown } from "./actions";

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

export function EpisodeBreakdown({ episodes }: { episodes: PlayerEpisodeBreakdown[] }) {
  if (episodes.length === 0) return null;

  return (
    <section className="bg-gray-800 rounded-lg p-5">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
        Points by Episode
      </h2>
      <Accordion type="multiple" className="flex flex-col gap-1 border-0">
        {episodes.map((ep) => (
          <AccordionItem
            key={ep.episodeId}
            value={String(ep.episodeId)}
            className="border-gray-600 rounded-lg bg-gray-700/50 px-3"
          >
            <AccordionTrigger className="py-3 hover:no-underline [&>svg]:text-gray-400 border-0">
              <div className="flex items-center gap-3 flex-1 mr-3">
                <span className="text-xs text-gray-500 w-12 shrink-0">Ep {ep.episodeNumber}</span>
                <span className="flex-1 text-sm text-left truncate text-gray-300">{ep.episodeTitle}</span>
                <span className={`text-sm font-semibold tabular-nums ${ep.totalPoints < 0 ? "text-red-400" : "text-white"}`}>
                  {ep.totalPoints > 0 ? "+" : ""}{ep.totalPoints}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="flex flex-col gap-1 pl-3">
                {ep.breakdown.map((b) => (
                  <div key={b.eventType} className="flex justify-between text-xs">
                    <span className="text-gray-400">{EVENT_LABELS[b.eventType] ?? b.eventType}</span>
                    <span className={`tabular-nums font-medium ${b.points < 0 ? "text-red-400" : "text-gray-200"}`}>
                      {b.points > 0 ? "+" : ""}{b.points}
                    </span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
