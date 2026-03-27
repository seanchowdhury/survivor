export async function getEpisodeContent(wikiUrl: string): Promise<[string, string]> {
  const match = wikiUrl.match(/survivor\.fandom\.com\/wiki\/(.+)/);
  if (!match) throw new Error('Invalid wiki URL');
  const pageTitle = decodeURIComponent(match[1]);
  const response = await fetch(
    `https://survivor.fandom.com/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2`,
  );
  const data = await response.json();
  const title = data.query.pages[0].title;
  const revisions = data.query.pages[0].revisions;
  if (revisions) return [title, revisions[0].slots.main.content];
  throw new Error('Could not find episode page');
}
