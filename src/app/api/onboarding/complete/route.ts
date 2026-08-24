import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/server/auth";
import { getDb, userOnboarding, users } from "@/server/db";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const now = new Date();
  await db.update(users).set({ onboarded: true }).where(eq(users.id, session.user.id));

  const existing = await db
    .select({ id: userOnboarding.id })
    .from(userOnboarding)
    .where(eq(userOnboarding.userId, session.user.id))
    .then((rows) => rows[0] ?? null);
  if (existing) {
    await db
      .update(userOnboarding)
      .set({ status: "completed", completedAt: now, updatedAt: now })
      .where(eq(userOnboarding.id, existing.id));
  } else {
    await db.insert(userOnboarding).values({
      userId: session.user.id,
      status: "completed",
      startedAt: now,
      completedAt: now,
    });
  }

  return NextResponse.json({ ok: true });
}
