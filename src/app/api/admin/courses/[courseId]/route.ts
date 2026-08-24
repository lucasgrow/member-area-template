import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/server/admin-auth";
import { courseInputSchema } from "@/server/content-validation";
import { courses, getDb } from "@/server/db";

const updateSchema = courseInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required",
);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;
  const admin = await requireAdmin();
  if (admin.response) return admin.response;
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  await getDb()
    .update(courses)
    .set({
      ...parsed.data,
      ...(parsed.data.requiredTier
        ? { isFree: parsed.data.requiredTier === "free" }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(courses.id, courseId));
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;
  const admin = await requireAdmin();
  if (admin.response) return admin.response;
  await getDb().delete(courses).where(eq(courses.id, courseId));
  return NextResponse.json({ ok: true });
}
