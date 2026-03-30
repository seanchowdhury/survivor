"use client";

import { useRef } from "react";
import { postComment } from "./actions";
import type { SelectLeaderboardComment } from "@/db/schema";

function formatRelativeTime(date: Date) {
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function CommentSection({
  comments,
}: {
  comments: SelectLeaderboardComment[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    await postComment(formData);
    formRef.current?.reset();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight">Trash Talk</h2>
      </div>

      <form ref={formRef} action={handleSubmit} className="flex flex-col gap-2">
        <textarea
          name="body"
          required
          maxLength={500}
          rows={2}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-1 focus:ring-white/20"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-white text-gray-900 text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Post
          </button>
        </div>
      </form>

      {comments.length === 0 ? (
        <p className="text-gray-600 text-sm">
          No comments yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-gray-800 rounded-lg px-4 py-3">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm font-semibold text-white">
                  {comment.authorName}
                </span>
                <span className="text-xs text-gray-500">
                  {formatRelativeTime(new Date(comment.createdAt))}
                </span>
              </div>
              <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">
                {comment.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
