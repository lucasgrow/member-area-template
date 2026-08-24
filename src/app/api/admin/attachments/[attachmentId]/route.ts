import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/server/admin-auth";
import { getR2 } from "@/lib/r2";
import { getDb, lessonAttachments } from "@/server/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await params;
  const admin = await requireAdmin();
  if (admin.response) return admin.response;
  const db = getDb();
  const attachment = await db
    .select({ r2Key: lessonAttachments.r2Key })
    .from(lessonAttachments)
    .where(eq(lessonAttachments.id, attachmentId))
    .then((rows) => rows[0] ?? null);
  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }
  if (attachment.r2Key) await getR2().delete(attachment.r2Key);
  await db
    .delete(lessonAttachments)
    .where(eq(lessonAttachments.id, attachmentId));
  return NextResponse.json({ ok: true });
}
