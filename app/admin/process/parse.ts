export type EpisodeInfo = {
  seasonNumber: number | null;
  episodeNumber: number | null;
  totalEpisodes: number | null;
  airDate: string | null;
  viewership: string | null;
};

type Confessional = {
  tribe: string;
  quote: string;
};

export type ConfessionalsByPlayer = Record<string, Confessional[]>;

type Vote = {
  voter: string;
  votedFor: string;
};

export type TribalCouncil = {
  tribe: string;
  votes: Vote[];
  eliminated: string;
};

type MedicalEvac = {
  tribe: string;
  player: string;
};

export type Challenge = {
  isReward: boolean;
  isImmunity: boolean;
  name: string;
  winners: string[];
};

function cleanText(s: string): string {
  return s
    .replace(/\[\[.*?\|(.*?)\]\]/g, "$1") // [[Link|text]] → text
    .replace(/\[\[(.*?)\]\]/g, "$1")      // [[Link]] → Link
    .replace(/'{2,3}/g, "")              // ''italic'' / '''bold''' → plain
    .replace(/<.*?>/g, "")               // strip html tags
    .trim();
}

export function parseMedicalEvacs(wikitext: string): MedicalEvac[] {
  const results: MedicalEvac[] = [];

  // {{tribebox|tribe|EVACUATED:<br />[[image:...|link=Player Name]]<br />Player Name}}
  const regex = /\{\{tribebox\|([^|]+)\|EVACUATED:[\s\S]*?link=([^\]|]+)/g;
  for (const m of wikitext.matchAll(regex)) {
    results.push({ tribe: m[1].trim(), player: m[2].trim() });
  }

  return results;
}

export function parseEpisodeInfo(wikitext: string): EpisodeInfo | null {
  // Extract key=value pairs from {{Episode\n| key = value\n...}}
  const templateMatch = wikitext.match(/\{\{Episode([\s\S]*?)\n\}\}/);
  if (!templateMatch) return null;

  const fields: Record<string, string> = {};
  for (const m of templateMatch[1].matchAll(/\|\s*([\w]+)\s*=\s*([^\n|]*)/g)) {
    fields[m[1].trim()] = m[2].trim();
  }

  // episodenumber = "2/14 (727)" → episodeNumber=2, totalEpisodes=14
  let episodeNumber: number | null = null;
  let totalEpisodes: number | null = null;
  const epNumMatch = fields.episodenumber?.match(/^(\d+)\/(\d+)/);
  if (epNumMatch) {
    episodeNumber = parseInt(epNumMatch[1]);
    totalEpisodes = parseInt(epNumMatch[2]);
  }

  // season = "{{S2|50}}" → 50
  let seasonNumber: number | null = null;
  const seasonMatch = fields.season?.match(/\|(\d+)\}\}/);
  if (seasonMatch) seasonNumber = parseInt(seasonMatch[1]);

  return {
    seasonNumber,
    episodeNumber,
    totalEpisodes,
    airDate: fields.firstbroadcast ?? null,
    viewership: fields.viewership ?? null,
  };
}

export function parseConfessionals(wikitext: string): ConfessionalsByPlayer {
  const result: ConfessionalsByPlayer = {};
  const regex = /\{\{Confessional\|([^|]*)\|([^|]+)\|([^|]+)\|([^|]+)\|([^}]+)\}\}/g;

  let match;
  while ((match = regex.exec(wikitext)) !== null) {
    const [, tribe, quote, fullName] = match;
    const player = cleanText(fullName);

    if (!result[player]) result[player] = [];

    result[player].push({
      tribe: tribe.trim(),
      quote: cleanText(quote),
    });
  }

  return result;
}

// Extracts names from [[File:...|link=Full Name]] patterns
function extractLinks(s: string): string[] {
  const matches = [...s.matchAll(/link=([^\]|]+)/g)];
  return matches.map((m) => m[1].trim());
}

export function parseTribalCouncils(wikitext: string): TribalCouncil[] {
  const results: TribalCouncil[] = [];

  const tcBlockRegex = /\{\{tribebox3\|([\w]+)\|Tribal Council[^}]+\}\}([\s\S]*?)(?=\{\{tribebox3\|[\w]+\|Tribal Council|\n==)/g;
  let tcMatch;

  while ((tcMatch = tcBlockRegex.exec(wikitext)) !== null) {
    const [, tribe, block] = tcMatch;
    const votes: Vote[] = [];

    // Split into row segments by |-
    for (const segment of block.split(/\n\|-\n/)) {
      // Each segment should have two tribebox3 cells: votedFor and voters
      const cells = [...segment.matchAll(/\{\{tribebox3\|[^|]+\|([\s\S]*?)\}\}/g)].map(m => m[1]);
      if (cells.length < 2) continue;

      const [votedForCell, votersCell] = cells;
      if (votedForCell.includes("VOTED OUT")) continue;

      const votedFor = extractLinks(votedForCell)[0];
      if (!votedFor) continue;

      for (const voter of extractLinks(votersCell)) {
        votes.push({ voter, votedFor });
      }
    }

    const eliminatedMatch = block.match(/VOTED OUT:[^[]*\[\[File:[^\]]*link=([^\]]+)\]/);
    const eliminated = eliminatedMatch ? eliminatedMatch[1].trim() : "";

    results.push({ tribe, votes, eliminated });
  }

  return results;
}

export function parseChallenges(wikitext: string): Challenge[] {
  const results: Challenge[] = [];

  // Challenges are inside <tabber>...</tabber>
  const tabberMatch = wikitext.match(/<tabber>([\s\S]*?)<\/tabber>/);
  if (!tabberMatch) return results;

  const tabberContent = tabberMatch[1];

  // Each tab is separated by |-|, starts with "Type="
  const tabs = tabberContent.split(/\|-\|/);

  for (const tab of tabs) {
    const tabHeader = tab.match(/^[^=\n]*/)?.[0] ?? "";
    const isReward = /reward/i.test(tabHeader);
    const isImmunity = /immunity/i.test(tabHeader);
    if (!isReward && !isImmunity) continue;

    // Challenge name: try link first, then italic text before first <br />
    const nameLinkMatch = tab.match(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\](?=.*?<br)/);
    const nameItalicMatch = tab.match(/''+([^'<\n]+)''+/);
    const name = nameLinkMatch ? nameLinkMatch[1].trim() : (nameItalicMatch ? nameItalicMatch[1].trim() : "");

    // Winners — capture everything after the label until the next bold marker or end
    const winnersMatch = tab.match(/'''Winners?[^']*:'''\s*([\s\S]*?)(?='''|$)/);
    const winners: string[] = [];
    if (winnersMatch) {
      const winnersStr = winnersMatch[1];
      // Tribe winners: {{tribeicon|tribename}}
      for (const m of winnersStr.matchAll(/\{\{tribeicon\|([^}]+)\}\}/g)) {
        winners.push(m[1].trim());
      }
      // Individual winners: [[link|name]] or [[name]]
      for (const m of winnersStr.matchAll(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g)) {
        winners.push(m[1].trim());
      }
      // Plain text winner (no link or template)
      if (winners.length === 0) {
        const plain = cleanText(winnersStr).trim();
        if (plain) winners.push(plain);
      }
    }

    results.push({ isReward, isImmunity, name, winners });
  }

  return results;
}
