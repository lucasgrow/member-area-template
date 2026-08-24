import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/server/admin-auth";
import { getDb, lessonChapters } from "@/server/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ chapterId: string }> },
) {
  const { chapterId } = await params;
  const admin = await requireAdmin();
  if (admin.response) return admin.response;
  await getDb().delete(lessonChapters).where(eq(lessonChapters.id, chapterId));
  return NextResponse.json({ ok: true });
}
