import { redirect } from "next/navigation";
import { db } from "@/db";
import { episodesTable } from "@/db/schema";
import { desc } from "drizzle-orm";

export default async function Home() {
  const [latest] = await db
    .select({ id: episodesTable.id })
    .from(episodesTable)
    .orderBy(desc(episodesTable.episodeNumber))
    .limit(1);

  if (latest) redirect(`/episode/${latest.id}`);

  return (
    <main className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
      <p className="text-zinc-500">No episodes yet.</p>
    </main>
  );
}
