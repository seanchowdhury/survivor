import type { AllianceNode, CoVoteEdge, AdvantagePairEdge, ConflictEdge, CurrentTribePair } from "../actions";

export type PhaseFilter = "all" | "premerge" | "postmerge";

// ── Tribe color palette ───────────────────────────────────────────────────────

const PALETTE = [
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f97316", // orange
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
];

const TRIBE_OVERRIDES: Record<string, string> = {
  Vatu: "#8b5cf6", // purple
};

export function buildTribeColorMap(nodes: AllianceNode[]): Map<string, string> {
  const tribes = [...new Set(nodes.map((n) => n.tribe))].sort();
  const map = new Map<string, string>();
  let paletteIndex = 0;
  for (const tribe of tribes) {
    if (TRIBE_OVERRIDES[tribe]) {
      map.set(tribe, TRIBE_OVERRIDES[tribe]);
    } else {
      map.set(tribe, PALETTE[paletteIndex++ % PALETTE.length]);
    }
  }
  return map;
}

// ── Edge weight calculation ───────────────────────────────────────────────────

// Co-vote raw count → visual weight (log scale so early tribal blocs don't dominate)
export function coVoteWeight(count: number): number {
  return Math.log(count + 1);
}

// Advantage pass → equivalent to 3 co-votes
export const ADVANTAGE_PASS_WEIGHT = Math.log(3 + 1);

// ── Merged alliance edges (co-votes + advantage passes combined) ──────────────

export type AllianceEdge = {
  playerAId: number;
  playerBId: number;
  weight: number;       // combined visual weight
  coVoteCount: number;
  hasAdvantagePair: boolean;
};

export function buildAllianceEdges(
  coVoteEdges: CoVoteEdge[],
  advantagePairs: AdvantagePairEdge[],
  phase: PhaseFilter
): AllianceEdge[] {
  const key = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`;
  const map = new Map<string, AllianceEdge>();

  for (const e of coVoteEdges) {
    const count =
      phase === "premerge" ? e.preMergeCount :
      phase === "postmerge" ? e.postMergeCount :
      e.coVoteCount;
    if (count === 0) continue;
    const k = key(e.playerAId, e.playerBId);
    const existing = map.get(k);
    if (existing) {
      existing.coVoteCount += count;
      existing.weight += coVoteWeight(count);
    } else {
      map.set(k, {
        playerAId: e.playerAId,
        playerBId: e.playerBId,
        weight: coVoteWeight(count),
        coVoteCount: count,
        hasAdvantagePair: false,
      });
    }
  }

  for (const p of advantagePairs) {
    const k = key(p.giverId, p.receiverId);
    const existing = map.get(k);
    if (existing) {
      existing.weight += ADVANTAGE_PASS_WEIGHT;
      existing.hasAdvantagePair = true;
    } else {
      map.set(k, {
        playerAId: Math.min(p.giverId, p.receiverId),
        playerBId: Math.max(p.giverId, p.receiverId),
        weight: ADVANTAGE_PASS_WEIGHT,
        coVoteCount: 0,
        hasAdvantagePair: true,
      });
    }
  }

  return [...map.values()];
}

// ── Second-order conflict derivation ─────────────────────────────────────────

export type SecondOrderConflict = {
  playerAId: number; // the aggressor
  playerBId: number; // ally of the target
  weight: number;
};

export function buildSecondOrderConflicts(
  conflictEdges: ConflictEdge[],
  allianceEdges: AllianceEdge[],
  activeNodeIds: Set<number>
): SecondOrderConflict[] {
  // Build alliance lookup: nodeId → list of {peerId, weight}
  const allianceMap = new Map<number, { peerId: number; weight: number }[]>();
  for (const e of allianceEdges) {
    if (!allianceMap.has(e.playerAId)) allianceMap.set(e.playerAId, []);
    if (!allianceMap.has(e.playerBId)) allianceMap.set(e.playerBId, []);
    allianceMap.get(e.playerAId)!.push({ peerId: e.playerBId, weight: e.weight });
    allianceMap.get(e.playerBId)!.push({ peerId: e.playerAId, weight: e.weight });
  }

  const key = (a: number, b: number) => `${a}-${b}`;
  const map = new Map<string, SecondOrderConflict>();

  for (const conflict of conflictEdges) {
    const { voterId: aggressor, votedForId: target, count } = conflict;
    if (!activeNodeIds.has(aggressor) || !activeNodeIds.has(target)) continue;
    const allies = allianceMap.get(target) ?? [];
    for (const { peerId, weight: allianceW } of allies) {
      if (peerId === aggressor) continue;
      if (!activeNodeIds.has(peerId)) continue;
      const secondaryWeight = count * allianceW * 0.3;
      const k = key(aggressor, peerId);
      const existing = map.get(k);
      if (existing) {
        existing.weight += secondaryWeight;
      } else {
        map.set(k, { playerAId: aggressor, playerBId: peerId, weight: secondaryWeight });
      }
    }
  }

  return [...map.values()];
}

// ── Node / edge filtering ─────────────────────────────────────────────────────

export function getActiveNodeIds(nodes: AllianceNode[]): Set<number> {
  return new Set(nodes.map((n) => n.id));
}

export function filterAllianceEdges(
  edges: AllianceEdge[],
  activeNodeIds: Set<number>,
  minCoVotes: number
): AllianceEdge[] {
  return edges.filter(
    (e) =>
      activeNodeIds.has(e.playerAId) &&
      activeNodeIds.has(e.playerBId) &&
      (e.coVoteCount >= minCoVotes || e.hasAdvantagePair)
  );
}

// ── Tooltip data ──────────────────────────────────────────────────────────────

export type TooltipData = {
  node: AllianceNode;
  allyCount: number;
  totalCoVotes: number;
  timesVotedAgainst: number;
  timesVotedFor: number; // times this player voted against others
};

export function buildTooltipData(
  nodeId: number,
  nodes: AllianceNode[],
  allianceEdges: AllianceEdge[],
  conflictEdges: ConflictEdge[]
): TooltipData | null {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  const myAlliances = allianceEdges.filter(
    (e) => e.playerAId === nodeId || e.playerBId === nodeId
  );
  const totalCoVotes = myAlliances.reduce((s, e) => s + e.coVoteCount, 0);
  const timesVotedAgainst = conflictEdges
    .filter((e) => e.votedForId === nodeId)
    .reduce((s, e) => s + e.count, 0);
  const timesVotedFor = conflictEdges
    .filter((e) => e.voterId === nodeId)
    .reduce((s, e) => s + e.count, 0);

  return {
    node,
    allyCount: myAlliances.length,
    totalCoVotes,
    timesVotedAgainst,
    timesVotedFor,
  };
}

// ── d3-force link data builders ───────────────────────────────────────────────

// Tribe-pair links (invisible, weak attraction)
export function buildTribeLinks(
  tribePairs: CurrentTribePair[],
  activeNodeIds: Set<number>
): { source: number; target: number; distance: number }[] {
  return tribePairs
    .filter((p) => activeNodeIds.has(p.playerAId) && activeNodeIds.has(p.playerBId))
    .map((p) => ({ source: p.playerAId, target: p.playerBId, distance: 120 }));
}
