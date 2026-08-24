import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/server/auth";
import { getDb, lessonTranscripts } from "@/server/db";
import { verifyLessonAccess } from "@/server/lesson-access";

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

  const transcripts = await getDb()
    .select()
    .from(lessonTranscripts)
    .where(eq(lessonTranscripts.lessonId, lessonId))
    .orderBy(asc(lessonTranscripts.language));

  return NextResponse.json({ transcripts });
}
