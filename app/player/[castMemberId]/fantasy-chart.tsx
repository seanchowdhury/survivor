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

export function FantasyChart({ data }: { data: FantasyPoint[] }) {
  if (data.length === 0) return null;

  return (
    <section className="bg-gray-800 rounded-lg p-5">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
        Fantasy Points per Episode
      </h2>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="episodeNumber"
            tickFormatter={(v) => `Ep ${v}`}
            tick={{ fill: "#9ca3af", fontSize: 11 }}
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
            formatter={(value: number, name: string) => [
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
      <div className="flex gap-4 mt-3 justify-end">
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="inline-block w-4 h-0.5 bg-blue-400 rounded" />
          Points
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="inline-block w-4 border-t border-dashed border-gray-500" />
          Average
        </span>
      </div>
    </section>
  );
}
