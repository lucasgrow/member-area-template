import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/server/admin-auth";
import { getDb, lessonTranscripts } from "@/server/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ transcriptId: string }> },
) {
  const { transcriptId } = await params;
  const admin = await requireAdmin();
  if (admin.response) return admin.response;
  await getDb()
    .delete(lessonTranscripts)
    .where(eq(lessonTranscripts.id, transcriptId));
  return NextResponse.json({ ok: true });
}
