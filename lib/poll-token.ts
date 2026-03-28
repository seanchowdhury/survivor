import { createHash, createHmac } from "crypto";

const POLL_SECRET = process.env.POLL_SECRET ?? "";

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
