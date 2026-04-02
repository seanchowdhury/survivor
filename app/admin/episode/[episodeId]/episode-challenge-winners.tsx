'use client';

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox';
import { Challenge, Winner, updateChallenges } from './actions';
import { SelectCastMember } from '@/db/schema';
import React, { useMemo, useState } from 'react';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Tick03Icon } from '@hugeicons/core-free-icons';

export type PendingChallengeChanges = Record<
  string,
  {
    isReward?: boolean;
    isImmunity?: boolean;
    individualChallenge?: boolean;
    firstPlace?: string[];
    secondPlace?: string[];
    rewardRecipients?: string[];
  }
>;

type FormattedChallenge = {
  challengeId: string;
  challengeName: string;
  isReward: boolean;
  isImmunity: boolean;
  individualChallenge: boolean;
  firstPlace: Winner[];
  secondPlace: Winner[];
  rewardRecipients: Winner[];
};

function formatChallenges(
  challenges: Record<number, Challenge>,
): FormattedChallenge[] {
  return Object.entries(challenges).map(
    ([challengeId, challenge]) => {
      const firstPlace: Winner[] = [];
      const secondPlace: Winner[] = [];
      const rewardRecipients: Winner[] = [];
      challenge.winners.forEach((winner) => {
        if (winner.placement == 1) {
          firstPlace.push(winner);
        } else {
          secondPlace.push(winner);
        }
        if (winner.gotReward) {
          rewardRecipients.push(winner);
        }
      });
      return {
        challengeId: challengeId,
        challengeName: challenge.challengeName,
        isImmunity: challenge.isImmunity,
        isReward: challenge.isReward,
        individualChallenge: challenge.individualChallenge,
        firstPlace,
        secondPlace,
        rewardRecipients,
      };
    },
  );
}

export default function EpisodeChallengeWinners({
  challenges,
  castMembers,
}: {
  challenges: Record<number, Challenge>;
  castMembers: SelectCastMember[];
}) {
  const formattedChallenges = useMemo(
    () => formatChallenges(challenges),
    [challenges],
  );

  const castMemberNames = useMemo(
    () => castMembers.map((c) => c.name),
    [castMembers],
  );

  const [pendingChanges, setPendingChanges] =
    useState<PendingChallengeChanges>({});

  function updateChallenge(
    challengeId: string,
    change: PendingChallengeChanges[string],
  ) {
    setPendingChanges((prev) => ({
      ...prev,
      [challengeId]: { ...prev[challengeId], ...change },
    }));
  }

  async function handleUpdate() {
    await updateChallenges(pendingChanges, castMembers);
    setPendingChanges({});
  }

  return (
    <div>
      Challenges
      <div>
        {formattedChallenges.map((challenge) => {
          return (
            <div
              key={challenge.challengeId + challenge.challengeName}
            >
              <h1>{challenge.challengeName}</h1>
              <div className="flex gap-2">
                <Toggle
                  variant="outline"
                  size="sm"
                  defaultPressed={challenge.isReward}
                  onPressedChange={(pressed) =>
                    updateChallenge(challenge.challengeId, { isReward: pressed })
                  }
                >
                  <HugeiconsIcon icon={Tick03Icon} className="group-data-[state=on]/toggle:fill-foreground" />
                  Reward
                </Toggle>
                <Toggle
                  variant="outline"
                  size="sm"
                  defaultPressed={challenge.isImmunity}
                  onPressedChange={(pressed) =>
                    updateChallenge(challenge.challengeId, { isImmunity: pressed })
                  }
                >
                  <HugeiconsIcon icon={Tick03Icon} className="group-data-[state=on]/toggle:fill-foreground" />
                  Immunity
                </Toggle>
                <Toggle
                  variant="outline"
                  size="sm"
                  defaultPressed={challenge.individualChallenge}
                  onPressedChange={(pressed) =>
                    updateChallenge(challenge.challengeId, { individualChallenge: pressed })
                  }
                >
                  <HugeiconsIcon icon={Tick03Icon} className="group-data-[state=on]/toggle:fill-foreground" />
                  Individual
                </Toggle>
              </div>
              <WinnersComboBox
                challenge={challenge}
                castMemberNames={castMemberNames}
                firstPlace={true}
                onValueChange={(names) =>
                  updateChallenge(challenge.challengeId, {
                    firstPlace: names,
                  })
                }
              />
              <WinnersComboBox
                challenge={challenge}
                castMemberNames={castMemberNames}
                firstPlace={false}
                onValueChange={(names) =>
                  updateChallenge(challenge.challengeId, {
                    secondPlace: names,
                  })
                }
              />
              {(pendingChanges[challenge.challengeId]?.isReward ?? challenge.isReward) && (
                <div>
                  <p className="text-sm text-muted-foreground mt-2">Reward recipients</p>
                  <RewardRecipientsComboBox
                    challenge={challenge}
                    castMemberNames={castMemberNames}
                    onValueChange={(names) =>
                      updateChallenge(challenge.challengeId, {
                        rewardRecipients: names,
                      })
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Button
        disabled={Object.keys(pendingChanges).length === 0}
        onClick={handleUpdate}
      >
        Save Changes
      </Button>
    </div>
  );
}

function RewardRecipientsComboBox({
  challenge,
  castMemberNames,
  onValueChange,
}: {
  challenge: FormattedChallenge;
  castMemberNames: string[];
  onValueChange: (names: string[]) => void;
}) {
  const anchor = useComboboxAnchor();
  const defaultValue = challenge.rewardRecipients.map((w) => w.castMemberName);

  return (
    <Combobox
      multiple
      autoHighlight
      defaultValue={defaultValue}
      items={castMemberNames}
      itemToStringValue={(name) => name}
      onValueChange={onValueChange}
    >
      <ComboboxChips ref={anchor} className="w-full max-w-xs">
        <ComboboxValue>
          {(values) => (
            <React.Fragment>
              {values.map((name: string) => (
                <ComboboxChip key={name}>{name}</ComboboxChip>
              ))}
              <ComboboxChipsInput />
            </React.Fragment>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent>
        <ComboboxEmpty>No items found.</ComboboxEmpty>
        <ComboboxList>
          {(name: string) => (
            <ComboboxItem key={name} value={name}>
              {name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function WinnersComboBox({
  challenge,
  castMemberNames,
  firstPlace,
  onValueChange,
}: {
  challenge: FormattedChallenge;
  castMemberNames: string[];
  firstPlace: boolean;
  onValueChange: (names: string[]) => void;
}) {
  const anchor = useComboboxAnchor();

  const defaultValue = (
    firstPlace ? challenge.firstPlace : challenge.secondPlace
  ).map((w) => w.castMemberName);

  return (
    <Combobox
      multiple
      autoHighlight
      defaultValue={defaultValue}
      items={castMemberNames}
      itemToStringValue={(name) => name}
      onValueChange={onValueChange}
    >
      <ComboboxChips ref={anchor} className="w-full max-w-xs">
        <ComboboxValue>
          {(values) => (
            <React.Fragment>
              {values.map((name: string) => (
                <ComboboxChip key={name}>{name}</ComboboxChip>
              ))}
              <ComboboxChipsInput />
            </React.Fragment>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent>
        <ComboboxEmpty>No items found.</ComboboxEmpty>
        <ComboboxList>
          {(name: string) => (
            <ComboboxItem key={name} value={name}>
              {name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}