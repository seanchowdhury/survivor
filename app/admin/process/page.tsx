"use client";

import { useActionState } from "react";
import { processEpisodeWiki } from "./actions";

export default function ProcessWiki() {
  const [state, formAction, isPending] = useActionState(processEpisodeWiki, null);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5 min-h-screen items-center justify-center bg-gray-900"
    >
      <div className="w-sm">
        <h1 className="mt-10 text-center text-2xl/9 font-bold text-white">
          Process Episode Wiki
        </h1>
      </div>

      <div className="flex flex-col gap-1.5 w-sm">
        <label
          htmlFor="url"
          className="block text-sm font-medium text-gray-100"
        >
          Episode Name
        </label>
        <input
          id="episode"
          name="episode"
          type="text"
          required
          placeholder="Epic Party"
          className="block rounded-md w-full bg-white/5 px-2 py-1.5 placeholder:text-gray-500 text-white outline-1 outline-white/10 focus:outline-indigo-500"
        />
      </div>

      {state?.error && (
        <div className="rounded-md px-3 py-2 text-sm text-red-500">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex w-sm justify-center rounded-md bg-indigo-500 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-indigo-400"
      >
        {isPending ? "Processing..." : "Process Episode"}
      </button>
    </form>
  );
}
