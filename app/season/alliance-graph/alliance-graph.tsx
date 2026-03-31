"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3Force from "d3-force";
import type { AllianceNode, ConflictEdge } from "../actions";
import type { AllianceEdge } from "./alliance-graph-utils";
import { buildTooltipData } from "./alliance-graph-utils";
import { AllianceGraphTooltip } from "./alliance-graph-tooltip";

const NODE_R = 22;
const NODE_R_ELIM = 16;

type SimNode = d3Force.SimulationNodeDatum & AllianceNode;

function nodeRadius(n: AllianceNode) {
  return n.isEliminated ? NODE_R_ELIM : NODE_R;
}

type XForm = { x: number; y: number; k: number };

export function AllianceGraph({
  nodes,
  allianceEdges,
  conflictEdges,
  tribeColorMap,
  tribePairLinks,
}: {
  nodes: AllianceNode[];
  allianceEdges: AllianceEdge[];
  conflictEdges: ConflictEdge[];
  tribeColorMap: Map<string, string>;
  tribePairLinks: { source: number; target: number; distance: number }[];
}) {
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [xform, setXform] = useState<XForm>({ x: 0, y: 0, k: 1 });
  const defaultXformRef = useRef<XForm>({ x: 0, y: 0, k: 1 });
  const [isPanning, setIsPanning] = useState(false);

  const simRef = useRef<d3Force.Simulation<SimNode, undefined> | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());

  const connectedIds = useCallback(
    (id: number): Set<number> => {
      const s = new Set<number>();
      for (const e of allianceEdges) {
        if (e.playerAId === id) s.add(e.playerBId);
        if (e.playerBId === id) s.add(e.playerAId);
      }
      return s;
    },
    [allianceEdges]
  );

  useEffect(() => {
    if (nodes.length === 0 || !svgRef.current) return;

    const { width, height } = svgRef.current.getBoundingClientRect();
    const w = width || 600;
    const h = height || 500;

    const initK = 2;
    const initXform = { x: (w / 2) * (1 - initK), y: (h / 2) * (1 - initK), k: initK };
    defaultXformRef.current = initXform;
    requestAnimationFrame(() => setXform(initXform));

    type FLink = d3Force.SimulationLinkDatum<SimNode> & { distance: number; strength: number };

    const allianceLinks: FLink[] = allianceEdges.map((e) => ({
      source: e.playerAId,
      target: e.playerBId,
      distance: Math.max(60, 200 - e.weight * 30),
      strength: 0.4,
    }));

    const conflictLinks: FLink[] = conflictEdges.map((e) => ({
      source: e.voterId,
      target: e.votedForId,
      distance: 280 + e.count * 30,
      strength: 0.15,
    }));

    const tribeLinks: FLink[] = tribePairLinks.map((p) => ({
      source: p.source,
      target: p.target,
      distance: p.distance,
      strength: 0.05,
    }));

    const initNodes: SimNode[] = nodes.map((n) => ({
      ...n,
      x: w / 2 + (Math.random() - 0.5) * 200,
      y: h / 2 + (Math.random() - 0.5) * 200,
    }));

    const sim = d3Force
      .forceSimulation<SimNode>(initNodes)
      .force(
        "link",
        d3Force
          .forceLink<SimNode, FLink>([...allianceLinks, ...conflictLinks, ...tribeLinks])
          .id((d) => d.id)
          .distance((d) => d.distance)
          .strength((d) => d.strength)
      )
      .force("charge", d3Force.forceManyBody<SimNode>().strength(-220))
      .force("center", d3Force.forceCenter(w / 2, h / 2))
      .force("collide", d3Force.forceCollide<SimNode>((d) => nodeRadius(d) + 8))
      .force("x", d3Force.forceX(w / 2).strength(0.04))
      .force("y", d3Force.forceY(h / 2).strength(0.04))
      .alphaDecay(0.03);

    sim.on("tick", () => setSimNodes([...sim.nodes()]));

    simRef.current = sim;
    return () => { sim.stop(); };
  }, [nodes, allianceEdges, conflictEdges, tribePairLinks]);

  // ── Zoom (wheel) ────────────────────────────────────────────────────────────

  function onWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const rect = svgRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setXform((prev) => {
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const newK = Math.max(0.2, Math.min(4, prev.k * factor));
      const scale = newK / prev.k;
      return {
        x: mx - scale * (mx - prev.x),
        y: my - scale * (my - prev.y),
        k: newK,
      };
    });
  }

  // ── Pan + pinch (pointer events) ────────────────────────────────────────────

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if ((e.target as Element).closest("g[data-node]")) return;
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    if (activePointersRef.current.size === 1) setIsPanning(true);
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const pointers = activePointersRef.current;
    if (!pointers.has(e.pointerId)) return;

    if (pointers.size === 1) {
      const prev = pointers.get(e.pointerId)!;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      setXform((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
    } else if (pointers.size === 2) {
      const [idA, idB] = [...pointers.keys()];
      const otherId = e.pointerId === idA ? idB : idA;
      const other = pointers.get(otherId)!;
      const prevCurr = pointers.get(e.pointerId)!;
      const newCurr = { x: e.clientX, y: e.clientY };

      const prevDist = Math.hypot(prevCurr.x - other.x, prevCurr.y - other.y);
      const newDist = Math.hypot(newCurr.x - other.x, newCurr.y - other.y);

      if (prevDist > 0) {
        const factor = newDist / prevDist;
        const rect = svgRef.current!.getBoundingClientRect();
        const mx = (newCurr.x + other.x) / 2 - rect.left;
        const my = (newCurr.y + other.y) / 2 - rect.top;
        setXform((prev) => {
          const newK = Math.max(0.2, Math.min(4, prev.k * factor));
          const s = newK / prev.k;
          return { x: mx - s * (mx - prev.x), y: my - s * (my - prev.y), k: newK };
        });
      }
    }

    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  function stopPan(e: React.PointerEvent<SVGSVGElement>) {
    activePointersRef.current.delete(e.pointerId);
    (e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId);
    if (activePointersRef.current.size === 0) setIsPanning(false);
  }

  // ── Rendering helpers ────────────────────────────────────────────────────────

  const maxAllianceWeight = Math.max(...allianceEdges.map((e) => e.weight), 1);

  function edgeOpacity(involvedIds: number[]) {
    if (hoveredId === null) return 1;
    return involvedIds.includes(hoveredId) ? 1 : 0.08;
  }

  function nodeOpacity(id: number) {
    if (hoveredId === null) return 1;
    if (id === hoveredId) return 1;
    return connectedIds(hoveredId).has(id) ? 0.9 : 0.2;
  }

  const tooltipData =
    hoveredId !== null
      ? buildTooltipData(hoveredId, nodes, allianceEdges, conflictEdges)
      : null;

  const posOf = (id: number) => simNodes.find((n) => n.id === id);

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className="block"
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopPan}
        onPointerCancel={stopPan}
        onPointerLeave={stopPan}
        onMouseMove={(e) => {
          const rect = svgRef.current?.getBoundingClientRect();
          if (rect) setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
        onMouseLeave={() => setHoveredId(null)}
      >
        <defs>
          {nodes.map((n) => (
            <clipPath key={n.id} id={`clip-${n.id}`}>
              <circle r={nodeRadius(n)} />
            </clipPath>
          ))}
        </defs>

        <g transform={`translate(${xform.x},${xform.y}) scale(${xform.k})`}>
          {/* Alliance edges */}
          {allianceEdges.map((e) => {
            const a = posOf(e.playerAId);
            const b = posOf(e.playerBId);
            if (!a?.x || !b?.x) return null;
            const strokeW = 1 + (e.weight / maxAllianceWeight) * 6;
            return (
              <line
                key={`ally-${e.playerAId}-${e.playerBId}`}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={e.hasAdvantagePair ? "rgba(245,158,11,0.65)" : "rgba(99,102,241,0.55)"}
                strokeWidth={strokeW}
                strokeLinecap="round"
                opacity={edgeOpacity([e.playerAId, e.playerBId])}
                style={{ transition: "opacity 0.15s" }}
              />
            );
          })}

          {/* Nodes */}
          {simNodes.map((n) => {
            if (!n.x || !n.y) return null;
            const r = nodeRadius(n);
            const color = tribeColorMap.get(n.tribe) ?? "#6b7280";
            return (
              <g
                key={n.id}
                data-node="true"
                transform={`translate(${n.x},${n.y})`}
                style={{ opacity: nodeOpacity(n.id), transition: "opacity 0.15s", cursor: "pointer" }}
                onMouseEnter={() => setHoveredId(n.id)}
                onMouseLeave={(e) => {
                  // only clear if not entering another node
                  if (!(e.relatedTarget as Element)?.closest?.("g[data-node]")) {
                    setHoveredId(null);
                  }
                }}
              >
                <circle r={r + 2.5} fill="none" stroke={color} strokeWidth={2.5} />
                <image
                  href={n.imageUrl}
                  x={-r} y={-r}
                  width={r * 2} height={r * 2}
                  clipPath={`url(#clip-${n.id})`}
                  preserveAspectRatio="xMidYMin slice"
                  style={{ opacity: n.isEliminated ? 0.4 : 1 }}
                />
                <text
                  y={r + 12}
                  textAnchor="middle"
                  fontSize={9}
                  fill="rgb(156,163,175)"
                  style={{ userSelect: "none" }}
                >
                  {n.name.split(" ")[0]}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1">
        <button
          onClick={() => {
            const rect = svgRef.current?.getBoundingClientRect();
            if (!rect) return;
            const mx = rect.width / 2;
            const my = rect.height / 2;
            setXform((prev) => {
              const newK = Math.max(0.2, prev.k / 1.2);
              const s = newK / prev.k;
              return { x: mx - s * (mx - prev.x), y: my - s * (my - prev.y), k: newK };
            });
          }}
          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded transition-colors text-base leading-none"
        >
          −
        </button>
        <button
          onClick={() => setXform(defaultXformRef.current)}
          className="text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded px-2 h-7 transition-colors"
        >
          Reset
        </button>
        <button
          onClick={() => {
            const rect = svgRef.current?.getBoundingClientRect();
            if (!rect) return;
            const mx = rect.width / 2;
            const my = rect.height / 2;
            setXform((prev) => {
              const newK = Math.min(4, prev.k * 1.2);
              const s = newK / prev.k;
              return { x: mx - s * (mx - prev.x), y: my - s * (my - prev.y), k: newK };
            });
          }}
          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded transition-colors text-base leading-none"
        >
          +
        </button>
      </div>

      <AllianceGraphTooltip data={tooltipData} pos={tooltipPos} />
    </div>
  );
}
