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
  sequence: number;
  votes: Vote[];
  eliminated: string | null;
};

export type Challenge = {
  isReward: boolean;
  isImmunity: boolean;
  name: string;
  winners: string[];
};

export type IdolEvent = {
  label: string;
  foundBy: string;
  givenTo: string | null;
};

export type AdvantageEvent = {
  label: string;
  foundBy: string;
  givenTo: string | null;
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
      "sequence": <int, 1 for initial vote, 2 for revote after a tie>,
      "eliminated": "<full player name or null if no one was eliminated (e.g. tie on initial vote)>",
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
  ],
  "idols": [
    {
      "label": "<idol name e.g. Hidden Immunity Idol>",
      "foundBy": "<full player name>",
      "givenTo": "<full player name or null if not transferred this episode>"
    }
  ],
  "advantages": [
    {
      "label": "<advantage name e.g. Extra Vote, Steal-a-Vote>",
      "foundBy": "<full player name>",
      "givenTo": "<full player name or null if not transferred this episode>"
    }
  ],
  "evacuated": ["<full player name>"],
  "quit": ["<full player name>"]
}

For tribal challenges, list tribes in the "winners" array in the order they placed (index 0 = 1st place, index 1 = 2nd place, etc.), as they appear in the wiki.
For idols and advantages, only include ones found or transferred in this episode — not previously found ones.
For tribal councils: if a vote ends in a tie and the tribe revotes, emit TWO objects for that tribe — sequence 1 (the initial tied vote, eliminated: null) and sequence 2 (the revote, with the actual eliminated player). If there is no tie, emit one object with sequence 1 and the eliminated player.`;

export async function parseWikiWithClaude(wikitext: string): Promise<{
  episodeInfo: EpisodeInfo | null;
  confessionals: ConfessionalsByPlayer;
  tribalCouncils: TribalCouncil[];
  challenges: Challenge[];
  idols: IdolEvent[];
  advantages: AdvantageEvent[];
  evacuated: string[];
  quit: string[];
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
    idols: IdolEvent[];
    advantages: AdvantageEvent[];
    evacuated: string[];
    quit: string[];
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
    idols: parsed.idols ?? [],
    advantages: parsed.advantages ?? [],
    evacuated: parsed.evacuated ?? [],
    quit: parsed.quit ?? [],
  };
}
