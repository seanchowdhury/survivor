import { getEpisodeChallengeWinners, getEpisodeConfessionalCounts, getEpisodeDetails } from "./actions";
import EpisodeChallengeWinners from "./episode-challenge-winners";
import EpisodeConfessionalCount from "./episode-confessional-count";

export default async function EpisodePage({
  params,
}: {
  params: { episodeId: number };
}) {
  const { episodeId } = await params;
  const episodeDetails = await getEpisodeDetails(episodeId);
    const { confessionalsByPlayer } =
    await getEpisodeConfessionalCounts(episodeId);
  const challenges = await getEpisodeChallengeWinners(episodeId);

  return (
    <div>
      <div>
        Episode {episodeDetails.episodeNumber}: {episodeDetails.episodeTitle}
      </div>
      <EpisodeConfessionalCount confessionalsByPlayer={confessionalsByPlayer} />
      <EpisodeChallengeWinners challenges={challenges} />
    </div>
  );
}
