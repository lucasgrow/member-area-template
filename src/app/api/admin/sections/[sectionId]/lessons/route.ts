import { NextResponse } from "next/server";

import { requireAdmin } from "@/server/admin-auth";
import { lessonInputSchema } from "@/server/content-validation";
import { getDb, lessons } from "@/server/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sectionId: string }> },
) {
  const { sectionId } = await params;
  const admin = await requireAdmin();
  if (admin.response) return admin.response;
  const parsed = lessonInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const id = `les_${crypto.randomUUID()}`;
  await getDb().insert(lessons).values({ id, sectionId, ...parsed.data });
  return NextResponse.json({ id }, { status: 201 });
}
