"use client";

import { SelectCastMember } from "@/db/schema";
import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { updateTribalVotes, updateTribalCouncilBlindsided, VoteWithCouncil } from "./actions";

export default function EpisodeTribal({
  voteData,
  castMembers,
}: {
  voteData: VoteWithCouncil[];
  castMembers: SelectCastMember[];
}) {
  const castMembersById = useMemo(() => {
    const castHash: Record<number, string> = {};
    castMembers.forEach((c) => (castHash[c.id] = c.name));
    return castHash;
  }, [castMembers]);

  const councilGroups = () => {
    const groups: Record<number, VoteWithCouncil[]> = {};
    voteData.forEach((vote) => {
      if (!groups[vote.tribalCouncilId]) groups[vote.tribalCouncilId] = [];
      groups[vote.tribalCouncilId].push(vote);
    });
    return groups;
  };

  const [committedValues, setCommittedValues] = useState<Record<number, number | null>>(
    () => Object.fromEntries(voteData.map((v) => [v.voteId, v.votedForId])),
  );
  const [pendingChanges, setPendingChanges] = useState<Record<number, number | null>>({});

  return (
    <div className="p-2 space-y-6">
      {Object.entries(councilGroups()).map(([councilId, votes]) => {
        const { tribe, sequence, eliminatedCastMemberId, blindsided } = votes[0];
        const label = sequence > 1 ? `${tribe} (revote)` : tribe;
        const eliminatedName = eliminatedCastMemberId ? castMembersById[eliminatedCastMemberId] : null;
        return (
          <div key={councilId}>
            <h3 className="font-semibold text-lg mb-1">{label}</h3>
            {eliminatedName && (
              <div className="flex items-center gap-3 mb-2">
                <p className="text-sm text-muted-foreground">Eliminated: {eliminatedName}</p>
                <Toggle
                  variant="outline"
                  size="sm"
                  defaultPressed={blindsided}
                  onPressedChange={(pressed) => updateTribalCouncilBlindsided(parseInt(councilId), pressed)}
                >
                  <HugeiconsIcon icon={Tick02Icon} className="group-data-[state=on]/toggle:fill-foreground" />
                  Blindsided
                </Toggle>
              </div>
            )}
            <div className="space-y-2">
              {votes.map((vote) => {
                const currentVotedForId = vote.voteId in pendingChanges ? pendingChanges[vote.voteId] : committedValues[vote.voteId];
                return (
                  <div key={vote.voteId} className="flex items-center gap-2">
                    <span>{castMembersById[vote.voterId]} voted for</span>
                    <Select
                      value={currentVotedForId != null ? `${currentVotedForId}` : ""}
                      onValueChange={(val) =>
                        setPendingChanges((prev) => ({
                          ...prev,
                          [vote.voteId]: parseInt(val),
                        }))
                      }
                    >
                      <SelectTrigger className="w-full max-w-48">
                        <SelectValue placeholder="Did not vote" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Survivors</SelectLabel>
                          {castMembers.map((castMember) => (
                            <SelectItem
                              key={castMember.id}
                              value={`${castMember.id}`}
                            >
                              {castMember.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setPendingChanges((prev) => ({ ...prev, [vote.voteId]: null }))
                      }
                    >
                      ×
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <Button
        disabled={Object.keys(pendingChanges).length === 0}
        onClick={async () => {
          await updateTribalVotes(pendingChanges);
          setCommittedValues((prev) => ({ ...prev, ...pendingChanges }));
          setPendingChanges({});
        }}
      >
        Save Changes
      </Button>
    </div>
  );
}
