import Anthropic from "@anthropic-ai/sdk";

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

export type Challenge = {
  isReward: boolean;
  isImmunity: boolean;
  name: string;
  winners: string[];
};

const SYSTEM_PROMPT = `You are a data extraction assistant. You will be given raw MediaWiki markup from the Survivor fandom wiki for a single episode page.

Extract the following data and return a single raw JSON object with NO markdown code fences, NO explanation, just the JSON.

Rules:
- Strip all wiki markup from text values (remove [[ ]], {{ }}, '' ''', <tags>, etc.)
- Use exact full player names as they appear in the cast list
- Return tribe names in lowercase
- Return null or [] for absent/unknown sections — do NOT hallucinate data
- For confessionals, the key is the player's full name

JSON schema to return:
{
  "episodeInfo": {
    "seasonNumber": <int or null>,
    "episodeNumber": <int or null>,
    "totalEpisodes": <int or null>,
    "airDate": <string or null>,
    "viewership": <string or null>
  },
  "confessionals": {
    "<PlayerFullName>": [{ "tribe": "<lowercase tribe name>", "quote": "<plain text quote>" }]
  },
  "tribalCouncils": [
    {
      "tribe": "<lowercase tribe name>",
      "eliminated": "<full player name>",
      "votes": [{ "voter": "<full player name>", "votedFor": "<full player name>" }]
    }
  ],
  "challenges": [
    {
      "name": "<challenge name>",
      "isReward": <bool>,
      "isImmunity": <bool>,
      "winners": ["<full player name or lowercase tribe name>"]
    }
  ]
}`;

export async function parseWikiWithClaude(wikitext: string): Promise<{
  episodeInfo: EpisodeInfo | null;
  confessionals: ConfessionalsByPlayer;
  tribalCouncils: TribalCouncil[];
  challenges: Challenge[];
}> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: wikitext,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  let parsed: {
    episodeInfo: EpisodeInfo | null;
    confessionals: ConfessionalsByPlayer;
    tribalCouncils: TribalCouncil[];
    challenges: Challenge[];
  };

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      `Claude returned invalid JSON. Raw response:\n${text.slice(0, 500)}`
    );
  }

  return {
    episodeInfo: parsed.episodeInfo ?? null,
    confessionals: parsed.confessionals ?? {},
    tribalCouncils: parsed.tribalCouncils ?? [],
    challenges: parsed.challenges ?? [],
  };
}
