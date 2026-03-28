"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { PollData, PollQuestion, PollResult } from "./actions";

const QUESTIONS: { key: PollQuestion; label: string }[] = [
  { key: "next_boot", label: "Who will be voted out next episode?" },
  { key: "story_focus", label: "Whose story do you want to see featured next episode?" },
  { key: "biggest_threat", label: "Who is the biggest perceived threat right now?" },
];

type Props = {
  data: PollData;
  hasVoted: boolean;
  isClosed: boolean;
  nonce: string;
  jt: string;
};

export function PollClient({ data, hasVoted, isClosed, nonce, jt }: Props) {
  const [selections, setSelections] = useState<Partial<Record<PollQuestion, number>>>({});
  const [submitted, setSubmitted] = useState(hasVoted || isClosed);
  const [submitting, setSubmitting] = useState(false);
  const [liveResults, setLiveResults] = useState(data.results);

  const allSelected = QUESTIONS.every((q) => selections[q.key] != null);

  async function handleSubmit() {
    if (!allSelected || submitting) return;
    setSubmitting(true);

    await Promise.all(
      QUESTIONS.map(({ key }) =>
        fetch("/api/poll/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            episodeId: data.episodeId,
            question: key,
            castMemberId: selections[key],
            honeypot: "",
            jt,
            nonce,
          }),
        })
      )
    );

    // Optimistically update results with our selections
    const updated = { ...liveResults };
    for (const { key } of QUESTIONS) {
      const voted = selections[key]!;
      const existing = updated[key].find((r) => r.castMemberId === voted);
      if (existing) {
        updated[key] = updated[key]
          .map((r) => r.castMemberId === voted ? { ...r, count: r.count + 1 } : r)
          .sort((a, b) => b.count - a.count);
      } else {
        updated[key] = [...updated[key], { castMemberId: voted, count: 1 }]
          .sort((a, b) => b.count - a.count);
      }
    }
    setLiveResults(updated);
    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            {data.totalVoters > 0
              ? `${data.totalVoters.toLocaleString()} vote${data.totalVoters === 1 ? "" : "s"} cast so far`
              : "No votes yet"}
          </p>
          {!hasVoted && !isClosed && (
            <button
              onClick={() => setSubmitted(false)}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              ← Back to voting
            </button>
          )}
        </div>
        {QUESTIONS.map(({ key, label }) => (
          <ResultsSection
            key={key}
            label={label}
            results={liveResults[key]}
            castMembers={data.castMembers}
            myVote={selections[key] ?? null}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Honeypot — invisible to real users */}
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }}
        readOnly
        value=""
      />

      {QUESTIONS.map(({ key, label }) => (
        <section key={key} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-gray-200">{label}</h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {data.castMembers.map((member) => {
              const selected = selections[key] === member.id;
              return (
                <button
                  key={member.id}
                  onClick={() => setSelections((s) => ({ ...s, [key]: member.id }))}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-2 rounded-xl transition-colors",
                    selected
                      ? "bg-orange-500/20 ring-2 ring-orange-400"
                      : "bg-gray-800 hover:bg-gray-700"
                  )}
                >
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-700 shrink-0">
                    <Image
                      src={member.imageUrl}
                      alt={member.name}
                      fill
                      className="object-cover object-top"
                      sizes="48px"
                    />
                  </div>
                  <span className={cn(
                    "text-xs text-center leading-tight w-full truncate",
                    selected ? "text-orange-300 font-semibold" : "text-gray-400"
                  )}>
                    {member.name.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <div className="flex flex-col gap-2">
        <button
          onClick={handleSubmit}
          disabled={!allSelected || submitting}
          className={cn(
            "w-full py-3 rounded-xl font-bold text-sm transition-colors",
            allSelected && !submitting
              ? "bg-orange-500 hover:bg-orange-400 text-white"
              : "bg-gray-800 text-gray-500 cursor-not-allowed"
          )}
        >
          {submitting ? "Submitting…" : allSelected ? "Submit Predictions" : "Select all three to submit"}
        </button>
        <button
          onClick={() => setSubmitted(true)}
          className="w-full py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          View current results
        </button>
      </div>
    </div>
  );
}

function ResultsSection({
  label,
  results,
  castMembers,
  myVote,
}: {
  label: string;
  results: PollResult[];
  castMembers: PollData["castMembers"];
  myVote: number | null;
}) {
  const total = results.reduce((s, r) => s + r.count, 0);
  const memberMap = new Map(castMembers.map((m) => [m.id, m]));

  // Show top 5, always include my vote if outside top 5
  const top = results.slice(0, 5);
  const myVoteInTop = myVote == null || top.some((r) => r.castMemberId === myVote);
  const myVoteResult = !myVoteInTop ? results.find((r) => r.castMemberId === myVote) : null;
  const rows = myVoteResult ? [...top, myVoteResult] : top;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-gray-200">{label}</h2>
      <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-3">
        {rows.length === 0 ? (
          <p className="text-gray-500 text-sm">No votes yet.</p>
        ) : (
          rows.map((result) => {
            const member = memberMap.get(result.castMemberId);
            if (!member) return null;
            const pct = total > 0 ? Math.round((result.count / total) * 100) : 0;
            const isMyVote = result.castMemberId === myVote;
            return (
              <div key={result.castMemberId} className="flex items-center gap-3">
                <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-700 shrink-0">
                  <Image
                    src={member.imageUrl}
                    alt={member.name}
                    fill
                    className="object-cover object-top"
                    sizes="32px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn("text-xs font-medium truncate", isMyVote ? "text-orange-300" : "text-gray-300")}>
                      {member.name.split(" ")[0]}
                      {isMyVote && <span className="ml-1.5 text-orange-400">✓</span>}
                    </span>
                    <span className="text-xs text-gray-500 tabular-nums ml-2 shrink-0">
                      {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        isMyVote ? "bg-orange-400" : "bg-gray-500"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
        {total > 0 && (
          <p className="text-xs text-gray-600 mt-1">
            {total} vote{total === 1 ? "" : "s"}
          </p>
        )}
      </div>
    </section>
  );
}
