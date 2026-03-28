"use server";

import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { eq } from 'drizzle-orm';
import { db } from '@/db/index';
import { InsertErrorLog, SelectInvite, errorLogs, invitesTable  } from '@/db/schema';
import { takeUniqueOrThrow } from "@/db/helpers";
import { resend } from '@/email/resend';

async function getInviteCodeValid(inviteCode: SelectInvite['code']): Promise<SelectInvite> {
  return takeUniqueOrThrow(await db.select().from(invitesTable).where(eq(invitesTable.code, inviteCode)))
}

async function updateInviteCode(inviteCode: SelectInvite, userId: string): Promise<void> {
  try {
    await db.update(invitesTable).set({ claimedByUserId: userId }).where(eq(invitesTable.id, inviteCode.id))
  } catch (e) {
    const errorLog: InsertErrorLog = { message: `Error updating invite code: ${inviteCode.id}, ${e}`, context: "updatingInviteCode" }
    await db.insert(errorLogs).values(errorLog)
  }
}

export async function signUpWithEmail(
  _prevState: { error: string } | null,
  formData: FormData,
) {

  const code = formData.get("code") as string;
  const email = formData.get("email") as string;
  const name = formData.get('name') as string;
  const password = formData.get('password') as string
  
  let inviteCode;
  try {
    inviteCode = await getInviteCodeValid(code);
  } catch(_) {
    return { error: "Invalid invite code.", fields: { name, email, password, code: undefined }}
  }
  if(inviteCode.claimedByUserId) return { error: "Invalid invite code.", fields: { name, email, password, code: undefined }}
  
  const { data, error } = await auth.signUp.email({
    email,
    name,
    password,
  });



  if (error) {
    return { error: error.message || 'Failed to create account', fields: { name, email, password, code } };
  }

  await updateInviteCode(inviteCode, data.user.id);

  void resend.emails.send({
    from: 'no-reply@contact.seanc.how',
    to: [email],
    subject: 'Come on in guys',
    html: `<p>Welcome, ${name} to the Survivor 50 excel spreadsheet but as an app</p>`
  });

  redirect("/");
}
