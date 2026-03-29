"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { PollData, PollResult } from "./actions";

type CastMemberQuestion = {
  key: string; // used as results key and selections key
  type: "castMember";
  questionType: "select_cast_member";
  question: string;
  label: string;
};

type YesNoQuestion = {
  key: string; // "blindsided_${eliminatedId}", used as results key and selections key
  type: "yesno";
  questionType: "yesno";
  question: "blindsided";
  label: string;
  eliminatedId: number;
};

type QuestionDef = CastMemberQuestion | YesNoQuestion;

function buildQuestions(data: PollData): QuestionDef[] {
  const q: QuestionDef[] = [];
  if (data.prevEpisodeEliminated.length > 0) {
    q.push({
      key: "mvp_prev_episode",
      type: "castMember",
      questionType: "select_cast_member",
      question: "mvp_prev_episode",
      label: "Who was the MVP last episode?",
    });
    for (const p of data.prevEpisodeEliminated) {
      q.push({
        key: `blindsided_${p.id}`,
        type: "yesno",
        questionType: "yesno",
        question: "blindsided",
        label: `Do you think ${p.name} was blindsided?`,
        eliminatedId: p.id,
      });
    }
  }
  q.push({
    key: "next_boot",
    type: "castMember",
    questionType: "select_cast_member",
    question: "next_boot",
    label: "Who will be voted out next episode?",
  });
  q.push({
    key: "story_focus",
    type: "castMember",
    questionType: "select_cast_member",
    question: "story_focus",
    label: "Whose story do you want to see featured next episode?",
  });
  q.push({
    key: "biggest_threat",
    type: "castMember",
    questionType: "select_cast_member",
    question: "biggest_threat",
    label: "Who is the biggest perceived threat right now?",
  });
  return q;
}

type Props = {
  data: PollData;
  hasVoted: boolean;
  isClosed: boolean;
  nonce: string;
  jt: string;
};

export function PollClient({ data, hasVoted, isClosed, nonce, jt }: Props) {
  const questions = buildQuestions(data);
  const allCastMembers = [...data.castMembers, ...data.prevEpisodeEliminated]
    .sort((a, b) => a.name.localeCompare(b.name));

  // castMember questions: value is the selected castMemberId (number)
  // yesno questions: value is the answer (boolean)
  const [selections, setSelections] = useState<Partial<Record<string, number | boolean>>>({});
  const [submitted, setSubmitted] = useState(hasVoted || isClosed);
  const [submitting, setSubmitting] = useState(false);
  const [liveResults, setLiveResults] = useState(data.results);

  const anySelected = Object.keys(selections).length > 0;

  async function handleSubmit() {
    if (!anySelected || submitting) return;
    setSubmitting(true);

    await Promise.all(
      questions
        .filter((q) => q.key in selections)
        .map((q) => {
          const body =
            q.type === "yesno"
              ? {
                  episodeId: data.episodeId,
                  questionType: "yesno",
                  question: "blindsided",
                  castMemberId: q.eliminatedId,
                  answer: selections[q.key] as boolean,
                  honeypot: "",
                  jt,
                  nonce,
                }
              : {
                  episodeId: data.episodeId,
                  questionType: "select_cast_member",
                  question: q.question,
                  castMemberId: selections[q.key] as number,
                  honeypot: "",
                  jt,
                  nonce,
                };
          return fetch("/api/poll/vote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        })
    );

    // Optimistic results update
    const updated = { ...liveResults };
    for (const q of questions) {
      if (!(q.key in selections)) continue;
      if (q.type === "yesno") {
        const ans = selections[q.key] as boolean;
        const existing = (updated[q.key] ?? []).find((r) => r.answer === ans);
        if (existing) {
          updated[q.key] = (updated[q.key] ?? []).map((r) =>
            r.answer === ans ? { ...r, count: r.count + 1 } : r
          );
        } else {
          updated[q.key] = [
            ...(updated[q.key] ?? []),
            { castMemberId: q.eliminatedId, answer: ans, count: 1 },
          ];
        }
      } else {
        const voted = selections[q.key] as number;
        const existing = (updated[q.key] ?? []).find((r) => r.castMemberId === voted);
        if (existing) {
          updated[q.key] = (updated[q.key] ?? [])
            .map((r) => (r.castMemberId === voted ? { ...r, count: r.count + 1 } : r))
            .sort((a, b) => b.count - a.count);
        } else {
          updated[q.key] = [...(updated[q.key] ?? []), { castMemberId: voted, answer: null, count: 1 }]
            .sort((a, b) => b.count - a.count);
        }
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
          {!isClosed && (
            <button
              onClick={() => setSubmitted(false)}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              ← Back to voting
            </button>
          )}
        </div>
        {questions.map((q) =>
          q.type === "yesno" ? (
            <YesNoResultsSection
              key={q.key}
              label={q.label}
              results={liveResults[q.key] ?? []}
              myVote={q.key in selections ? (selections[q.key] as boolean) : undefined}
            />
          ) : (
            <ResultsSection
              key={q.key}
              label={q.label}
              results={liveResults[q.key] ?? []}
              castMembers={q.key === "mvp_prev_episode" ? allCastMembers : data.castMembers}
              myVote={q.key in selections ? (selections[q.key] as number) : undefined}
            />
          )
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Honeypot */}
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }}
        readOnly
        value=""
      />

      {questions.map((q) => (
        <section key={q.key} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-gray-200">{q.label}</h2>
          {q.type === "yesno" ? (
            <YesNoInput
              selection={q.key in selections ? (selections[q.key] as boolean) : undefined}
              onSelect={(val) => setSelections((s) => ({ ...s, [q.key]: val }))}
            />
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {(q.key === "mvp_prev_episode" ? allCastMembers : data.castMembers).map((member) => {
                const selected = selections[q.key] === member.id;
                return (
                  <button
                    key={member.id}
                    onClick={() => setSelections((s) => ({ ...s, [q.key]: member.id }))}
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
          )}
        </section>
      ))}

      <div className="flex flex-col gap-2">
        <button
          onClick={handleSubmit}
          disabled={!anySelected || submitting}
          className={cn(
            "w-full py-3 rounded-xl font-bold text-sm transition-colors",
            anySelected && !submitting
              ? "bg-orange-500 hover:bg-orange-400 text-white"
              : "bg-gray-800 text-gray-500 cursor-not-allowed"
          )}
        >
          {submitting ? "Submitting…" : "Submit"}
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

function YesNoInput({
  selection,
  onSelect,
}: {
  selection: boolean | undefined;
  onSelect: (val: boolean) => void;
}) {
  return (
    <div className="flex gap-3">
      <button
        onClick={() => onSelect(true)}
        className={cn(
          "flex-1 py-3 rounded-xl font-semibold text-sm transition-colors",
          selection === true
            ? "bg-orange-500/20 ring-2 ring-orange-400 text-orange-300"
            : "bg-gray-800 hover:bg-gray-700 text-gray-400"
        )}
      >
        Yes
      </button>
      <button
        onClick={() => onSelect(false)}
        className={cn(
          "flex-1 py-3 rounded-xl font-semibold text-sm transition-colors",
          selection === false
            ? "bg-orange-500/20 ring-2 ring-orange-400 text-orange-300"
            : "bg-gray-800 hover:bg-gray-700 text-gray-400"
        )}
      >
        No
      </button>
    </div>
  );
}

function YesNoResultsSection({
  label,
  results,
  myVote,
}: {
  label: string;
  results: PollResult[];
  myVote: boolean | undefined;
}) {
  const yesCount = results.find((r) => r.answer === true)?.count ?? 0;
  const noCount = results.find((r) => r.answer === false)?.count ?? 0;
  const total = yesCount + noCount;

  const yesPct = total > 0 ? Math.round((yesCount / total) * 100) : 0;
  const noPct = total > 0 ? Math.round((noCount / total) * 100) : 0;

  const rows = [
    { label: "Yes", pct: yesPct, count: yesCount, isMyVote: myVote === true },
    { label: "No", pct: noPct, count: noCount, isMyVote: myVote === false },
  ];

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-gray-200">{label}</h2>
      <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-3">
        {total === 0 ? (
          <p className="text-gray-500 text-sm">No votes yet.</p>
        ) : (
          rows.map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <span className={cn("text-sm font-medium w-8 shrink-0", row.isMyVote ? "text-orange-300" : "text-gray-300")}>
                {row.label}
                {row.isMyVote && <span className="ml-1 text-orange-400">✓</span>}
              </span>
              <div className="flex-1 min-w-0">
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", row.isMyVote ? "bg-orange-400" : "bg-gray-500")}
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-gray-500 tabular-nums ml-2 shrink-0">{row.pct}%</span>
            </div>
          ))
        )}
        {total > 0 && (
          <p className="text-xs text-gray-600 mt-1">{total} vote{total === 1 ? "" : "s"}</p>
        )}
      </div>
    </section>
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
  myVote: number | undefined;
}) {
  const total = results.reduce((s, r) => s + r.count, 0);
  const memberMap = new Map(castMembers.map((m) => [m.id, m]));

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
            const member = result.castMemberId != null ? memberMap.get(result.castMemberId) : null;
            if (!member) return null;
            const pct = total > 0 ? Math.round((result.count / total) * 100) : 0;
            const isMyVote = result.castMemberId === myVote;
            return (
              <div key={result.castMemberId} className="flex items-center gap-3">
                <Link href={`/player/${member.id}`} className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-700 shrink-0 hover:opacity-80 transition-opacity">
                  <Image
                    src={member.imageUrl}
                    alt={member.name}
                    fill
                    className="object-cover object-top"
                    sizes="32px"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn("text-xs font-medium truncate", isMyVote ? "text-orange-300" : "text-gray-300")}>
                      {member.name.split(" ")[0]}
                      {isMyVote && <span className="ml-1.5 text-orange-400">✓</span>}
                    </span>
                    <span className="text-xs text-gray-500 tabular-nums ml-2 shrink-0">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", isMyVote ? "bg-orange-400" : "bg-gray-500")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
        {total > 0 && (
          <p className="text-xs text-gray-600 mt-1">{total} vote{total === 1 ? "" : "s"}</p>
        )}
      </div>
    </section>
  );
}
