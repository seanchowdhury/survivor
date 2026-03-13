"use client";

import { useActionState } from "react";
import { processEpisodeWiki } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
        <Input
          id="episode"
          name="episode"
          type="text"
          required
          placeholder="Epic Party"
        />
      </div>

      {state?.error && (
        <div className="rounded-md px-3 py-2 text-sm text-red-500">
          {state.error}
        </div>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="w-sm"
      >
        {isPending ? "Processing..." : "Process Episode"}
      </Button>
    </form>
  );
}
