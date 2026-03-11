import { Challenge } from "./actions";

export default function EpisodeChallengeWinners({
  challenges,
}: {
  challenges: Record<number, Challenge>;
}) {
  const challengesKeys: number[] = Object.keys(challenges).map((challengeId) =>
    parseInt(challengeId),
  );

  return (
    <div>
      Challenges
      <div>
        {challengesKeys.map((challenge) => {
          return (
            <div key={challenge}>{challenges[challenge].challengeName}</div>
          );
        })}
      </div>
    </div>
  );
}
