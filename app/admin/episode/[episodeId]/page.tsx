import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getEpisodeChallengeWinners, getEpisodeConfessionalCounts, getEpisodeDetails, getCastMembers } from "./actions";
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
  const castMembers = await getCastMembers();

  return (
    <div>
      <div>
        Episode {episodeDetails.episodeNumber}:{' '}
        {episodeDetails.episodeTitle}
      </div>
      <Tabs defaultValue="confessionals" className="w-[400px]">
        <TabsList>
          <TabsTrigger value="confessionals">
            Confessionals
          </TabsTrigger>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="tribal">Tribal</TabsTrigger>
          <TabsTrigger value="idols">Idols/Advantages</TabsTrigger>
        </TabsList>
        <TabsContent value="confessionals">
          <EpisodeConfessionalCount
            confessionalsByPlayer={confessionalsByPlayer}
          />
        </TabsContent>
        <TabsContent value="challenges">
          <EpisodeChallengeWinners
            challenges={challenges}
            castMembers={castMembers}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
