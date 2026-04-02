import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getEpisodeChallengeWinners,
  getEpisodeConfessionalCounts,
  getCastMembers,
  getEpisodeVoteData,
  getIdolsAndAdvantages,
  getMiscEntries,
  getEpisodes,
} from "./actions";
import EpisodeChallengeWinners from "./episode-challenge-winners";
import EpisodeConfessionalCount from "./episode-confessional-count";
import EpisodeTribal from "./episode-tribal";
import EpisodeIdols from "./episode-idols";
import EpisodeMisc from "./episode-misc";
import EpisodeSelector from "./episode-selector";

export default async function EpisodePage({
  params,
}: {
  params: { episodeId: number };
}) {
  const { episodeId } = await params;
  const { confessionalsByPlayer } =
    await getEpisodeConfessionalCounts(episodeId);
  const challenges = await getEpisodeChallengeWinners(episodeId);
  const voteData = await getEpisodeVoteData(episodeId);
  const castMembers = await getCastMembers();
  const { idols, advantages } = await getIdolsAndAdvantages();
  const miscEntries = await getMiscEntries(episodeId);
  const episodes = await getEpisodes();

  return (
    <div>
      <div>
        <EpisodeSelector episodes={episodes} currentEpisodeId={episodeId} />
      </div>
      <Tabs defaultValue="confessionals" className="w-[400px]">
        <TabsList>
          <TabsTrigger value="confessionals">Confessionals</TabsTrigger>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="tribal">Tribal</TabsTrigger>
          <TabsTrigger value="idols">Idols/Advantages</TabsTrigger>
          <TabsTrigger value="misc">Misc</TabsTrigger>
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
        <TabsContent value="tribal">
          <EpisodeTribal voteData={voteData} castMembers={castMembers} />
        </TabsContent>
        <TabsContent value="idols">
          <EpisodeIdols
            idols={idols}
            advantages={advantages}
            castMembers={castMembers}
            episodeId={episodeId}
          />
        </TabsContent>
        <TabsContent value="misc">
          <EpisodeMisc entries={miscEntries} castMembers={castMembers} episodeId={episodeId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
