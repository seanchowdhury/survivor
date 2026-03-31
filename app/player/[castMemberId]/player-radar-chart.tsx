"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import type { SelectCastMemberProfile } from "@/db/schema";

function placementScore(placement: number): number {
  return placement <= 10 ? Math.max(0, 11 - placement) : 0;
}

export function PlayerRadarChart({
  profile,
}: {
  profile: SelectCastMemberProfile | null;
}) {
  const hasData =
    profile &&
    (profile.physical != null ||
      profile.strategic != null ||
      profile.social != null ||
      profile.threatLevel != null ||
      profile.highestPlacement != null);

  if (!hasData) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 w-full max-w-xl px-4">
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">
          Subjectivity Zone: Pre-season Player Attributes
        </p>
        <p className="text-sm text-gray-600 mt-3">No ratings available yet.</p>
      </div>
    );
  }

  const data = [
    { attribute: "Physical", value: profile.physical ?? 0 },
    { attribute: "Strategic", value: profile.strategic ?? 0 },
    { attribute: "Social", value: profile.social ?? 0 },
    { attribute: "Threat Level", value: profile.threatLevel ?? 0 },
    { attribute: "Highest Placement", value: profile.highestPlacement != null ? placementScore(profile.highestPlacement) : 0 },
  ];

  return (
    <div className="bg-gray-800 rounded-lg p-4 w-full max-w-xl px-4">
      <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">
        Subjectivity Zone: Pre-season Player Attributes
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke="#374151" />
          <PolarRadiusAxis domain={[0, 10]} tickCount={11} tick={false} axisLine={false} />
          <PolarAngleAxis
            dataKey="attribute"
            tick={{ fill: "#9ca3af", fontSize: 12 }}
          />
          <Radar
            dataKey="value"
            stroke="#f59e0b"
            fill="#f59e0b"
            fillOpacity={0.35}
            dot={{ fill: "#f59e0b", r: 3 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
