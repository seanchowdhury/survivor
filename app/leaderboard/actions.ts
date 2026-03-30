"use server";

import { auth } from "@/lib/auth/server";
import { db } from "@/db";
import { desc, eq } from "drizzle-orm";
import { leaderboardCommentsTable, participantsTable } from "@/db/schema";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function getComments() {
  return db
    .select()
    .from(leaderboardCommentsTable)
    .orderBy(desc(leaderboardCommentsTable.createdAt))
    .limit(100);
}

export async function postComment(formData: FormData) {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");

  const body = (formData.get("body") as string | null)?.trim();
  if (!body || body.length === 0) return;
  if (body.length > 500) return;

  // Use participant name if they have one, otherwise fall back to user display name
  const participant = await db
    .select({ name: participantsTable.name })
    .from(participantsTable)
    .where(eq(participantsTable.userId, session.user.id))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  const authorName = participant?.name ?? session.user.name ?? "Anonymous";

  await db.insert(leaderboardCommentsTable).values({
    userId: session.user.id,
    authorName,
    body,
  });

  revalidatePath("/leaderboard");
}
