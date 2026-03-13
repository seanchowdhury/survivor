export async function getEpisodeContent(episode: string): Promise<[string, string]> {
  const response = await fetch(
    `https://survivor.fandom.com/api.php?action=query&titles=${episode}&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2`,
  );
  const data = await response.json();
  const title = data.query.pages[0].title;
  const revisions = data.query.pages[0].revisions;
  if (revisions) return [title, revisions[0].slots.main.content];
  throw new Error('Could not find episode by title');
}
