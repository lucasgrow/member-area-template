import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/server/auth";
import { getDb, userLessonProgress } from "@/server/db";
import { verifyLessonAccess } from "@/server/lesson-access";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ courseSlug: string; lessonId: string }> },
) {
  const { courseSlug, lessonId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await verifyLessonAccess(lessonId, session.user.membership);
  if (!access || access.course.slug !== courseSlug) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const existing = await db
    .select()
    .from(userLessonProgress)
    .where(
      and(
        eq(userLessonProgress.userId, session.user.id),
        eq(userLessonProgress.lessonId, lessonId),
      ),
    )
    .then((rows) => rows[0] ?? null);

  if (existing) {
    await db
      .update(userLessonProgress)
      .set({ completed: true, completedAt: new Date() })
      .where(eq(userLessonProgress.id, existing.id));
  } else {
    await db.insert(userLessonProgress).values({
      userId: session.user.id,
      lessonId,
      completed: true,
      completedAt: new Date(),
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ courseSlug: string; lessonId: string }> },
) {
  const { courseSlug, lessonId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await verifyLessonAccess(lessonId, session.user.membership);
  if (!access || access.course.slug !== courseSlug) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  await db
    .delete(userLessonProgress)
    .where(
      and(
        eq(userLessonProgress.userId, session.user.id),
        eq(userLessonProgress.lessonId, lessonId),
      ),
    );

  return NextResponse.json({ ok: true });
}
