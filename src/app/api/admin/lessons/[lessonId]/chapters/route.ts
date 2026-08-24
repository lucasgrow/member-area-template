import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/server/admin-auth";
import { getDb, lessonChapters } from "@/server/db";

const chapterSchema = z.object({
  title: z.string().min(1).max(160),
  startSeconds: z.number().int().min(0),
  endSeconds: z.number().int().min(0),
  summary: z.string().max(2000).nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
}).refine((value) => value.endSeconds >= value.startSeconds, {
  message: "endSeconds must be greater than or equal to startSeconds",
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const { lessonId } = await params;
  const admin = await requireAdmin();
  if (admin.response) return admin.response;
  const rows = await getDb()
    .select()
    .from(lessonChapters)
    .where(eq(lessonChapters.lessonId, lessonId))
    .orderBy(asc(lessonChapters.sortOrder));
  return NextResponse.json({ chapters: rows });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const { lessonId } = await params;
  const admin = await requireAdmin();
  if (admin.response) return admin.response;
  const parsed = chapterSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const id = `chp_${crypto.randomUUID()}`;
  await getDb().insert(lessonChapters).values({
    id,
    lessonId,
    ...parsed.data,
  });
  return NextResponse.json({ id }, { status: 201 });
}
