import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/server/admin-auth";
import { getDb, lessonTranscripts } from "@/server/db";

const transcriptSchema = z.object({
  language: z.string().min(2).max(12).regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/),
  content: z.string().min(1).max(200_000),
  vttContent: z.string().max(200_000).nullable().optional(),
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
    .from(lessonTranscripts)
    .where(eq(lessonTranscripts.lessonId, lessonId))
    .orderBy(asc(lessonTranscripts.language));
  return NextResponse.json({ transcripts: rows });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const { lessonId } = await params;
  const admin = await requireAdmin();
  if (admin.response) return admin.response;
  const parsed = transcriptSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  await getDb()
    .insert(lessonTranscripts)
    .values({
      id: `trs_${crypto.randomUUID()}`,
      lessonId,
      ...parsed.data,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [lessonTranscripts.lessonId, lessonTranscripts.language],
      set: {
        content: parsed.data.content,
        vttContent: parsed.data.vttContent ?? null,
        updatedAt: new Date(),
      },
    });
  return NextResponse.json({ ok: true }, { status: 201 });
}
