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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  IdolOrAdvantage,
  updateIdolUsed,
  updateAdvantageUsed,
  deleteIdol,
  deleteAdvantage,
  createIdol,
  createAdvantage,
} from "./actions";

type Props = {
  idols: IdolOrAdvantage[];
  advantages: IdolOrAdvantage[];
  castMembers: SelectCastMember[];
  episodeId: number;
};

function ItemRow({
  item,
  castMembers,
  episodeId,
  value,
  onChange,
  onDelete,
}: {
  item: IdolOrAdvantage;
  castMembers: SelectCastMember[];
  episodeId: number;
  value: string;
  onChange: (val: string) => void;
  onDelete?: (id: number) => Promise<void>;
}) {
  const router = useRouter();

  async function handleDelete() {
    await onDelete!(item.id);
    router.refresh();
  }

  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-4 py-3">
      <div className="flex-1">
        <div className="font-medium">{item.label ?? "Unnamed"}</div>
        <div className="text-sm text-muted-foreground">
          Found by: {item.foundByName}
          {item.currentHolderName && ` · Holder: ${item.currentHolderName}`}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Used by</span>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full max-w-48">
            <SelectValue placeholder="Not used" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— Not used —</SelectItem>
            {castMembers.map((cm) => (
              <SelectItem key={cm.id} value={String(cm.id)}>
                {cm.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {item.usedInEpisodeId !== null &&
          item.usedInEpisodeId !== episodeId && (
            <span className="text-xs text-muted-foreground">
              Used in ep. {item.usedInEpisodeId}
            </span>
          )}
      </div>
      {onDelete && (
        <Button size="sm" variant="destructive" onClick={handleDelete}>
          Delete
        </Button>
      )}
      </CardContent>
    </Card>
  );
}

function AddItemForm({
  castMembers,
  episodeId,
  onCreate,
  onCancel,
}: {
  castMembers: SelectCastMember[];
  episodeId: number;
  onCreate: (
    foundByCastMemberId: number,
    foundInEpisodeId: number,
    label: string | null,
    currentHolderId: number | null,
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [foundById, setFoundById] = useState<string>("");
  const [holderId, setHolderId] = useState<string>("same");

  async function handleSubmit() {
    if (!foundById) return;
    const currentHolderId = holderId === "same" ? null : parseInt(holderId);
    await onCreate(
      parseInt(foundById),
      episodeId,
      label.trim() || null,
      currentHolderId,
    );
    router.refresh();
    setLabel("");
    setFoundById("");
    setHolderId("same");
    onCancel();
  }

  return (
    <Card className="mt-2">
      <CardContent className="flex flex-col gap-2 pt-4">
      <Input
        placeholder="Label (optional)"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <Select value={foundById} onValueChange={setFoundById}>
        <SelectTrigger>
          <SelectValue placeholder="Found by (required)" />
        </SelectTrigger>
        <SelectContent>
          {castMembers.map((cm) => (
            <SelectItem key={cm.id} value={String(cm.id)}>
              {cm.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={holderId} onValueChange={setHolderId}>
        <SelectTrigger>
          <SelectValue placeholder="Current holder" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="same">Same as finder</SelectItem>
          {castMembers.map((cm) => (
            <SelectItem key={cm.id} value={String(cm.id)}>
              {cm.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={!foundById}>
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  items,
  castMembers,
  episodeId,
  onUpdate,
  onCreate,
  onDelete,
}: {
  title: string;
  items: IdolOrAdvantage[];
  castMembers: SelectCastMember[];
  episodeId: number;
  onUpdate: (
    id: number,
    usedByCastMemberId: number | null,
    usedInEpisodeId: number | null,
  ) => Promise<void>;
  onCreate: (
    foundByCastMemberId: number,
    foundInEpisodeId: number,
    label: string | null,
    currentHolderId: number | null,
  ) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<number, string>>({});

  function selectValue(item: IdolOrAdvantage): string {
    if (item.id in pendingChanges) return pendingChanges[item.id];
    return item.usedByCastMemberId ? String(item.usedByCastMemberId) : "none";
  }

  async function handleSave() {
    await Promise.all(
      Object.entries(pendingChanges).map(([idStr, val]) => {
        const id = parseInt(idStr);
        const castMemberId = val === "none" ? null : parseInt(val);
        return onUpdate(id, castMemberId, castMemberId ? episodeId : null);
      }),
    );
    setPendingChanges({});
    router.refresh();
  }

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
          + Add
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            castMembers={castMembers}
            episodeId={episodeId}
            value={selectValue(item)}
            onChange={(val) =>
              setPendingChanges((prev) => ({ ...prev, [item.id]: val }))
            }
            onDelete={onDelete}
          />
        ))}
      </div>
      <div className="mt-2">
        <Button
          disabled={Object.keys(pendingChanges).length === 0}
          onClick={handleSave}
        >
          Save Changes
        </Button>
      </div>
      {open && (
        <AddItemForm
          castMembers={castMembers}
          episodeId={episodeId}
          onCreate={onCreate}
          onCancel={() => setOpen(false)}
        />
      )}
    </div>
  );
}

export default function EpisodeIdols({
  idols,
  advantages,
  castMembers,
  episodeId,
}: Props) {
  return (
    <div>
      <Section
        title="Idols"
        items={idols}
        castMembers={castMembers}
        episodeId={episodeId}
        onUpdate={(id, usedByCastMemberId, usedInEpisodeId) =>
          updateIdolUsed(id, usedByCastMemberId, usedInEpisodeId)
        }
        onCreate={createIdol}
        onDelete={deleteIdol}
      />
      <Section
        title="Advantages"
        items={advantages}
        castMembers={castMembers}
        episodeId={episodeId}
        onUpdate={(id, usedByCastMemberId, usedInEpisodeId) =>
          updateAdvantageUsed(id, usedByCastMemberId, usedInEpisodeId)
        }
        onCreate={createAdvantage}
        onDelete={deleteAdvantage}
      />
    </div>
  );
}
