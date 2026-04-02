"use server";

import { auth } from "@/lib/auth/server";
import { db } from "@/db";
import { episodesTable } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function getChatToken(): Promise<string | null> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return null;

  const secret = process.env.CHAT_SECRET!;
  const payload = {
    sub: session.user.id,
    name: session.user.name,
    exp: Math.floor(Date.now() / 1000) + 60,
  };

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const data = btoa(JSON.stringify(payload));
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(data),
  );
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)));

  return `${data}.${sig}`;
}

export async function getNextEpisodeNumber(): Promise<number> {
  const [latest] = await db
    .select({ episodeNumber: episodesTable.episodeNumber })
    .from(episodesTable)
    .orderBy(desc(episodesTable.episodeNumber))
    .limit(1);

  return (latest?.episodeNumber ?? 0) + 1;
}
