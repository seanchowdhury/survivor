"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SelectCastMember } from "@/db/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MiscEntry, createMiscEntry, deleteMiscEntry } from "./actions";

const MISC_EVENT_OPTIONS = ["Cancelled Christmas", "Hunted for food", "Drank wine"] as const;

type Props = {
  entries: MiscEntry[];
  castMembers: SelectCastMember[];
  episodeId: number;
};

export default function EpisodeMisc({ entries, castMembers, episodeId }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [castMemberId, setCastMemberId] = useState("");
  const [value, setValue] = useState("");

  async function handleAdd() {
    if (!castMemberId || !value.trim()) return;
    await createMiscEntry(episodeId, parseInt(castMemberId), value.trim());
    router.refresh();
    setCastMemberId("");
    setValue("");
    setShowForm(false);
  }

  async function handleDelete(id: number) {
    await deleteMiscEntry(id);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Misc Events</h3>
        <Button variant="outline" size="sm" onClick={() => setShowForm((v) => !v)}>
          + Add
        </Button>
      </div>

      {showForm && (
        <Card className="mb-4">
          <CardContent className="flex flex-col gap-2 pt-4">
          <Select value={castMemberId} onValueChange={setCastMemberId}>
            <SelectTrigger>
              <SelectValue placeholder="Cast member (required)" />
            </SelectTrigger>
            <SelectContent>
              {castMembers.map((cm) => (
                <SelectItem key={cm.id} value={String(cm.id)}>
                  {cm.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger>
              <SelectValue placeholder="Event (required)" />
            </SelectTrigger>
            <SelectContent>
              {MISC_EVENT_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!castMemberId || !value.trim()}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setCastMemberId("");
                setValue("");
              }}
            >
              Cancel
            </Button>
          </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-1">
        {entries.map((entry) => (
          <Card key={entry.id} size="sm">
            <CardContent className="flex items-center justify-between py-2">
              <span className="text-sm">
                <span className="font-medium">{entry.castMemberName}</span>
                {" — "}
                {entry.value}
              </span>
              <button
                onClick={() => handleDelete(entry.id)}
                className="ml-2 text-muted-foreground hover:text-destructive"
                aria-label="Delete"
              >
                ×
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
