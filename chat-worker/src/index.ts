import { DurableObjectNamespace } from "@cloudflare/workers-types";

type Env = {
  CHAT_ROOM: DurableObjectNamespace;
  CHAT_SECRET: string;
};

async function verifyToken(
  token: string,
  secret: string,
): Promise<{ sub: string; name: string } | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [data, sig] = parts;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const sigBytes = Uint8Array.from(atob(sig), (c) => c.charCodeAt(0));
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    encoder.encode(data),
  );
  if (!valid) return null;

  const payload = JSON.parse(atob(data));
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  return { sub: payload.sub, name: payload.name };
}

const worker = {
  async fetch(req: Request, env: Env) {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response("Missing token", { status: 401 });
    }

    const user = await verifyToken(token, env.CHAT_SECRET);
    if (!user) {
      return new Response("Invalid or expired token", { status: 401 });
    }

    const leagueId = url.pathname.split("/")[2];
    if (!leagueId) {
      return new Response("Missing league ID", { status: 400 });
    }
    const id = env.CHAT_ROOM.idFromName(leagueId);
    const room = env.CHAT_ROOM.get(id);

    // Forward the verified username via a header
    const headers = new Headers(req.headers);
    headers.set("X-Chat-Username", user.name);
    const authedReq = new Request(req.url, {
      method: req.method,
      headers,
    });

    return room.fetch(authedReq);
  },
};

export default worker;

export { ChatRoom } from "./chat-room";
