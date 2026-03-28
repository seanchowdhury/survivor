import { createHash, createHmac } from "crypto";

const POLL_SECRET = process.env.POLL_SECRET ?? "";
if (!POLL_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("POLL_SECRET env var is not set");
  } else {
    console.warn("POLL_SECRET is not set — poll token validation is disabled");
  }
}

export function makeNonce(): string {
  return createHash("sha256")
    .update(String(Date.now()) + Math.random())
    .digest("hex")
    .slice(0, 16);
}

export function makeJt(episodeId: number, nonce: string): string {
  return createHmac("sha256", POLL_SECRET)
    .update(`${nonce}:${episodeId}`)
    .digest("hex");
}
