import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/server/admin-auth";
import { getDb, lessonAttachments } from "@/server/db";

const attachmentSchema = z
  .object({
    type: z.enum(["pdf", "image", "video", "link", "file"]),
    title: z.string().min(1).max(160),
    description: z.string().max(2000).nullable().optional(),
    r2Key: z.string().startsWith("attachments/").nullable().optional(),
    externalUrl: z.string().url().nullable().optional(),
    filename: z.string().max(255).nullable().optional(),
    fileSizeBytes: z.number().int().min(0).nullable().optional(),
    mimeType: z.string().max(120).nullable().optional(),
    sortOrder: z.number().int().min(0).default(0),
  })
  .refine((value) => Boolean(value.r2Key) !== Boolean(value.externalUrl), {
    message: "Provide exactly one of r2Key or externalUrl",
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
    .from(lessonAttachments)
    .where(eq(lessonAttachments.lessonId, lessonId))
    .orderBy(asc(lessonAttachments.sortOrder));
  return NextResponse.json({ attachments: rows });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const { lessonId } = await params;
  const admin = await requireAdmin();
  if (admin.response) return admin.response;
  const parsed = attachmentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const id = `att_${crypto.randomUUID()}`;
  await getDb().insert(lessonAttachments).values({
    id,
    lessonId,
    ...parsed.data,
  });
  return NextResponse.json({ id }, { status: 201 });
}
