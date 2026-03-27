"use client";

import { useState, useTransition } from "react";
import { setEpisodeRoster, getPreviousEpisodeRoster } from "./actions";

type CastMember = { id: number; name: string };
type Episode = { id: number; episodeNumber: number | null; title: string };

export default function ParticipantRosterEditor({
  participantId,
  participantName,
  episodes,
  castMembers,
  initialEpisodeId,
  initialRoster,
}: {
  participantId: number;
  participantName: string;
  episodes: Episode[];
  castMembers: CastMember[];
  initialEpisodeId: number;
  initialRoster: number[];
}) {
  const [episodeId, setEpisodeId] = useState(initialEpisodeId);
  const [selected, setSelected] = useState<Set<number>>(new Set(initialRoster));
  const [isPending, startTransition] = useTransition();

  function handleEpisodeChange(newEpisodeId: number) {
    setEpisodeId(newEpisodeId);
    // Fetch roster for new episode — optimistic: clear until loaded
    startTransition(async () => {
      const { getEpisodeRoster } = await import("./actions");
      const ids = await getEpisodeRoster(participantId, newEpisodeId);
      setSelected(new Set(ids));
    });
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function copyFromPrevious() {
    startTransition(async () => {
      const ids = await getPreviousEpisodeRoster(participantId, episodeId);
      setSelected(new Set(ids));
    });
  }

  function save() {
    startTransition(async () => {
      await setEpisodeRoster(participantId, episodeId, Array.from(selected));
    });
  }

  const currentEpisode = episodes.find((e) => e.id === episodeId);

  return (
    <div className="border rounded p-4 space-y-3">
      <h3 className="font-semibold">{participantName}</h3>

      <div className="flex items-center gap-2">
        <label className="text-sm">Episode:</label>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={episodeId}
          onChange={(e) => handleEpisodeChange(Number(e.target.value))}
        >
          {episodes.map((ep) => (
            <option key={ep.id} value={ep.id}>
              Ep {ep.episodeNumber}: {ep.title}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          onClick={copyFromPrevious}
          disabled={isPending || currentEpisode === episodes[0]}
          className="text-xs px-2 py-1 border rounded hover:bg-muted disabled:opacity-50"
        >
          Copy from previous episode
        </button>
        <button
          onClick={() => setSelected(new Set())}
          className="text-xs px-2 py-1 border rounded hover:bg-muted"
        >
          Clear all
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1 max-h-64 overflow-y-auto">
        {castMembers.map((cm) => (
          <label key={cm.id} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={selected.has(cm.id)}
              onChange={() => toggle(cm.id)}
            />
            {cm.name}
          </label>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={isPending}
          className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save roster"}
        </button>
        <span className="text-xs text-muted-foreground">
          {selected.size} cast member{selected.size !== 1 ? "s" : ""} selected
        </span>
      </div>
    </div>
  );
}
