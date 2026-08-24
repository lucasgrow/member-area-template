import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/server/auth";
import { getDb, userExerciseProgress } from "@/server/db";
import { verifyLessonAccess } from "@/server/lesson-access";

const bodySchema = z.object({
  completedSteps: z.array(z.number().int().min(0)).default([]),
  quizAnswers: z.record(z.array(z.number().int())).default({}),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const { lessonId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await verifyLessonAccess(lessonId, session.user.membership);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const row = await db
    .select()
    .from(userExerciseProgress)
    .where(
      and(
        eq(userExerciseProgress.userId, session.user.id),
        eq(userExerciseProgress.lessonId, lessonId),
      ),
    )
    .then((rows) => rows[0] ?? null);

  return NextResponse.json({
    completedSteps: row ? JSON.parse(row.completedSteps) : [],
    quizAnswers: row ? JSON.parse(row.quizAnswers) : {},
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const { lessonId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await verifyLessonAccess(lessonId, session.user.membership);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const db = getDb();
  const existing = await db
    .select()
    .from(userExerciseProgress)
    .where(
      and(
        eq(userExerciseProgress.userId, session.user.id),
        eq(userExerciseProgress.lessonId, lessonId),
      ),
    )
    .then((rows) => rows[0] ?? null);

  const values = {
    completedSteps: JSON.stringify(parsed.data.completedSteps),
    quizAnswers: JSON.stringify(parsed.data.quizAnswers),
    updatedAt: new Date(),
  };

  if (existing) {
    await db
      .update(userExerciseProgress)
      .set(values)
      .where(eq(userExerciseProgress.id, existing.id));
  } else {
    await db.insert(userExerciseProgress).values({
      userId: session.user.id,
      lessonId,
      ...values,
    });
  }

  return NextResponse.json(parsed.data);
}
