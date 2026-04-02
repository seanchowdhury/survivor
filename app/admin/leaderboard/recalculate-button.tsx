"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function RecalculateButton({ action }: { action: () => Promise<void> }) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    await action();
    setPending(false);
  }

  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={handleClick}>
      {pending ? "Recalculating…" : "Recalculate all"}
    </Button>
  );
}
