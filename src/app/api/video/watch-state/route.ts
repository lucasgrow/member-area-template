import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/server/auth";
import { getDb, userLessonWatchState } from "@/server/db";
import { verifyLessonAccess } from "@/server/lesson-access";

const bodySchema = z.object({
  lessonId: z.string().min(1),
  lastPositionSeconds: z.number().int().min(0),
  maxPositionSeconds: z.number().int().min(0),
  maxPercentWatched: z.number().int().min(0).max(100),
  totalWatchTimeDelta: z.number().int().min(0),
  playCountDelta: z.number().int().min(0),
  watchedToEnd: z.boolean(),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const access = await verifyLessonAccess(parsed.data.lessonId, session.user.membership);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const existing = await db
    .select()
    .from(userLessonWatchState)
    .where(
      and(
        eq(userLessonWatchState.userId, session.user.id),
        eq(userLessonWatchState.lessonId, parsed.data.lessonId),
      ),
    )
    .then((rows) => rows[0] ?? null);

  if (existing) {
    await db
      .update(userLessonWatchState)
      .set({
        lastPositionSeconds: parsed.data.lastPositionSeconds,
        maxPositionSeconds: sql`max(${userLessonWatchState.maxPositionSeconds}, ${parsed.data.maxPositionSeconds})`,
        maxPercentWatched: sql`max(${userLessonWatchState.maxPercentWatched}, ${parsed.data.maxPercentWatched})`,
        totalWatchTimeSeconds: sql`${userLessonWatchState.totalWatchTimeSeconds} + ${parsed.data.totalWatchTimeDelta}`,
        playCount: sql`${userLessonWatchState.playCount} + ${parsed.data.playCountDelta}`,
        watchedToEnd: parsed.data.watchedToEnd || existing.watchedToEnd,
        updatedAt: new Date(),
      })
      .where(eq(userLessonWatchState.id, existing.id));
  } else {
    await db.insert(userLessonWatchState).values({
      userId: session.user.id,
      lessonId: parsed.data.lessonId,
      lastPositionSeconds: parsed.data.lastPositionSeconds,
      maxPositionSeconds: parsed.data.maxPositionSeconds,
      maxPercentWatched: parsed.data.maxPercentWatched,
      totalWatchTimeSeconds: parsed.data.totalWatchTimeDelta,
      playCount: parsed.data.playCountDelta,
      watchedToEnd: parsed.data.watchedToEnd,
    });
  }

  return NextResponse.json({ ok: true });
}
