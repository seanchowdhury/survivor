import type { TooltipData } from "./alliance-graph-utils";

export function AllianceGraphTooltip({
  data,
  pos,
}: {
  data: TooltipData | null;
  pos: { x: number; y: number };
}) {
  if (!data) return null;

  return (
    <div
      className="pointer-events-none absolute z-10 bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl text-sm min-w-40"
      style={{ left: pos.x + 12, top: pos.y - 12 }}
    >
      <p className="font-semibold text-white">{data.node.name}</p>
      <p className="text-gray-400 text-xs mb-2">{data.node.currentTribe ?? data.node.tribe}</p>
      <div className="flex flex-col gap-1 text-xs text-gray-300">
        <span>{data.allyCount} alliance{data.allyCount !== 1 ? "s" : ""} · {data.totalCoVotes} co-votes</span>
        <span>{data.timesVotedAgainst} vote{data.timesVotedAgainst !== 1 ? "s" : ""} against them</span>
        <span>{data.timesVotedFor} vote{data.timesVotedFor !== 1 ? "s" : ""} cast by them</span>
      </div>
    </div>
  );
}
