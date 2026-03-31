"use client";

import { useState, useMemo } from "react";
import { Dialog } from "radix-ui";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import type { AllianceGraphData } from "./actions";
import type { PhaseFilter } from "./alliance-graph/alliance-graph-utils";
import {
  buildTribeColorMap,
  buildAllianceEdges,
  filterAllianceEdges,
  getActiveNodeIds,
  buildTribeLinks,
} from "./alliance-graph/alliance-graph-utils";
import { AllianceGraph } from "./alliance-graph/alliance-graph";
import { AllianceGraphLegend } from "./alliance-graph/alliance-graph-legend";

function AllianceGraphModal({ data }: { data: AllianceGraphData }) {
  const [phase, setPhase] = useState<PhaseFilter>("all");
  const [minCoVotes, setMinCoVotes] = useState(1);

  const tribeColorMap = useMemo(() => buildTribeColorMap(data.nodes), [data.nodes]);
  const activeNodeIds = useMemo(() => getActiveNodeIds(data.nodes), [data.nodes]);

  const allAllianceEdges = useMemo(
    () => buildAllianceEdges(data.coVoteEdges, data.advantagePairs, phase),
    [data.coVoteEdges, data.advantagePairs, phase]
  );

  const filteredAllianceEdges = useMemo(
    () => filterAllianceEdges(allAllianceEdges, activeNodeIds, minCoVotes),
    [allAllianceEdges, activeNodeIds, minCoVotes]
  );

  const tribePairLinks = useMemo(
    () => buildTribeLinks(data.currentTribePairs, activeNodeIds),
    [data.currentTribePairs, activeNodeIds]
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      <AllianceGraphLegend
        phase={phase}
        setPhase={setPhase}
        minCoVotes={minCoVotes}
        setMinCoVotes={setMinCoVotes}
        hasMerge={data.mergeEpisodeNumber !== null}
      />
      <div className="flex-1 min-h-0 overflow-hidden">
        <AllianceGraph
          nodes={data.nodes}
          allianceEdges={filteredAllianceEdges}
          conflictEdges={data.conflictEdges}
          tribeColorMap={tribeColorMap}
          tribePairLinks={tribePairLinks}
        />
      </div>
    </div>
  );
}

export function AllianceNetwork({ data }: { data: AllianceGraphData }) {
  const totalEdges =
    data.coVoteEdges.length + data.conflictEdges.length + data.advantagePairs.length;
  if (totalEdges < 3) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        Alliance Network
      </h2>

      <Dialog.Root>
        <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Force-directed graph of voting alliances and conflicts
          </p>
          <Dialog.Trigger asChild>
            <button className="shrink-0 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
              View graph →
            </button>
          </Dialog.Trigger>
        </div>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed inset-8 sm:inset-20 z-50 flex flex-col bg-gray-900 rounded-xl border border-gray-700 shadow-2xl p-6 gap-4 overflow-hidden focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            <div className="flex items-center justify-between shrink-0">
              <Dialog.Title className="text-base font-semibold text-white">
                Alliance Network
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-gray-700">
                  <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} size={18} />
                  <span className="sr-only">Close</span>
                </button>
              </Dialog.Close>
            </div>
            <AllianceGraphModal data={data} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
