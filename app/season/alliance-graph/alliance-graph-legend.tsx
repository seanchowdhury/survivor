"use client";

import { cn } from "@/lib/utils";
import type { PhaseFilter } from "./alliance-graph-utils";

const PHASES: { label: string; value: PhaseFilter }[] = [
  { label: "All game", value: "all" },
  { label: "Pre-merge", value: "premerge" },
  { label: "Post-merge", value: "postmerge" },
];

export function AllianceGraphLegend({
  phase,
  setPhase,
  minCoVotes,
  setMinCoVotes,
  hasMerge,
}: {
  phase: PhaseFilter;
  setPhase: (p: PhaseFilter) => void;
  minCoVotes: number;
  setMinCoVotes: (n: number) => void;
  hasMerge: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Phase filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex bg-gray-700 rounded-full p-0.5 gap-0.5">
          {PHASES.filter((p) => p.value === "all" || hasMerge).map((p) => (
            <button
              key={p.value}
              onClick={() => setPhase(p.value)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                phase === p.value ? "bg-white text-gray-900" : "text-gray-400 hover:text-white"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Min co-votes filter */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>Min co-votes:</span>
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => setMinCoVotes(n)}
              className={cn(
                "w-6 h-6 rounded-full text-xs font-medium transition-colors",
                minCoVotes === n ? "bg-indigo-500 text-white" : "bg-gray-700 text-gray-400 hover:text-white"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
