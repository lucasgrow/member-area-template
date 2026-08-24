import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getR2, sanitizeR2Filename } from "@/lib/r2";
import { auth } from "@/server/auth";
import { getDb, lessonAttachments } from "@/server/db";
import { verifyLessonAccess } from "@/server/lesson-access";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ lessonId: string; attachmentId: string }> },
) {
  const { lessonId, attachmentId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await verifyLessonAccess(lessonId, session.user.membership);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const attachment = await db
    .select()
    .from(lessonAttachments)
    .where(eq(lessonAttachments.id, attachmentId))
    .then((rows) => rows[0] ?? null);

  if (!attachment || attachment.lessonId !== lessonId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (attachment.externalUrl) {
    return NextResponse.redirect(attachment.externalUrl);
  }

  if (!attachment.r2Key) {
    return NextResponse.json({ error: "Attachment has no file location" }, { status: 404 });
  }

  const object = await getR2().get(attachment.r2Key);
  if (!object) {
    return NextResponse.json({ error: "File not found in storage" }, { status: 404 });
  }

  const headers = new Headers();
  headers.set("Content-Type", attachment.mimeType ?? "application/octet-stream");
  if (attachment.filename) {
    const safeFilename = sanitizeR2Filename(attachment.filename);
    const asciiFilename = safeFilename.replace(/[^\x20-\x7e]/g, "_");
    headers.set(
      "Content-Disposition",
      `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`,
    );
  }

  return new Response(object.body, { headers });
}
