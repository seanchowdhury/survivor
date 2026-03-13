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
import { Switch } from '@/components/ui/switch';
import { Field, FieldLabel } from '@/components/ui/field';
import { Button } from '@/components/ui/button';

export type PendingChallengeChanges = Record<
  string,
  {
    isReward?: boolean;
    isImmunity?: boolean;
    individualChallenge?: boolean;
    firstPlace?: string[];
    secondPlace?: string[];
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
};

function formatChallenges(
  challenges: Record<number, Challenge>,
): FormattedChallenge[] {
  return Object.entries(challenges).map(
    ([challengeId, challenge]) => {
      const firstPlace: Winner[] = [];
      const secondPlace: Winner[] = [];
      challenge.winners.forEach((winner) => {
        if (winner.placement == 1) {
          firstPlace.push(winner);
        } else {
          secondPlace.push(winner);
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
              <Field orientation="horizontal" className="w-fit">
                <FieldLabel
                  htmlFor={`switch-reward-${challenge.challengeId}`}
                >
                  Reward Challenge?
                </FieldLabel>
                <Switch
                  defaultChecked={challenge.isReward}
                  onCheckedChange={(checked) =>
                    updateChallenge(challenge.challengeId, {
                      isReward: checked,
                    })
                  }
                />
              </Field>
              <Field orientation="horizontal" className="w-fit">
                <FieldLabel
                  htmlFor={`switch-immunity-${challenge.challengeId}`}
                >
                  Immunity Challenge?
                </FieldLabel>
                <Switch
                  defaultChecked={challenge.isImmunity}
                  onCheckedChange={(checked) =>
                    updateChallenge(challenge.challengeId, {
                      isImmunity: checked,
                    })
                  }
                />
              </Field>
              <Field orientation="horizontal" className="w-fit">
                <FieldLabel
                  htmlFor={`switch-individual-${challenge.challengeId}`}
                >
                  Individual Challenge?
                </FieldLabel>
                <Switch
                  defaultChecked={challenge.individualChallenge}
                  onCheckedChange={(checked) =>
                    updateChallenge(challenge.challengeId, {
                      individualChallenge: checked,
                    })
                  }
                />
              </Field>
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
