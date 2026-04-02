"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { FantasyPoint } from "./actions";
import { HugeiconsIcon } from "@hugeicons/react";
import { StarIcon, Apple01Icon } from "@hugeicons/core-free-icons";

function CustomXTick({ x, y, payload, data }: { x: number; y: number; payload: { value: number }; data: FantasyPoint[] }) {
  const ep = data.find((d) => d.episodeNumber === payload.value);
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fill="#9ca3af" fontSize={11}>
        Ep {payload.value}
      </text>
      {ep?.wonImmunity && (
        <foreignObject x={ep?.wonFoodReward ? -16 : -7} y={14} width={14} height={14}>
          <HugeiconsIcon icon={StarIcon} size={14} className="text-yellow-400 fill-yellow-400" />
        </foreignObject>
      )}
      {ep?.wonFoodReward && (
        <foreignObject x={ep?.wonImmunity ? 2 : -7} y={14} width={14} height={14}>
          <HugeiconsIcon icon={Apple01Icon} size={14} className="text-orange-400" />
        </foreignObject>
      )}
    </g>
  );
}

export function FantasyChart({ data }: { data: FantasyPoint[] }) {
  if (data.length === 0) return null;

  const hasAnyImmunity = data.some((d) => d.wonImmunity);
  const hasAnyFoodReward = data.some((d) => d.wonFoodReward);
  const needsExtraMargin = hasAnyImmunity || hasAnyFoodReward;

  return (
    <section className="bg-gray-800 rounded-lg p-5">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
        Fantasy Points per Episode
      </h2>
      <ResponsiveContainer width="100%" height={needsExtraMargin ? 220 : 200}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: needsExtraMargin ? 20 : 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="episodeNumber"
            tick={(props: Record<string, unknown>) => <CustomXTick {...props as { x: number; y: number; payload: { value: number } }} data={data} />}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", fontSize: 12 }}
            labelStyle={{ color: "#9ca3af" }}
            labelFormatter={(v) => `Episode ${v}`}
            formatter={(value, name) => [
              value,
              name === "points" ? "Points" : "Average",
            ]}
          />
          <Line
            type="monotone"
            dataKey="points"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={{ fill: "#60a5fa", r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="avg"
            stroke="#6b7280"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-3 justify-end flex-wrap">
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="inline-block w-4 h-0.5 bg-blue-400 rounded" />
          Points
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="inline-block w-4 border-t border-dashed border-gray-500" />
          Average
        </span>
        {hasAnyImmunity && (
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <HugeiconsIcon icon={StarIcon} size={12} className="text-yellow-400 fill-yellow-400" />
            Immunity
          </span>
        )}
        {hasAnyFoodReward && (
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <HugeiconsIcon icon={Apple01Icon} size={12} className="text-orange-400" />
            Food Reward
          </span>
        )}
      </div>
    </section>
  );
}
