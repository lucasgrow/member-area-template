import { NextResponse } from "next/server";

import { requireAdmin } from "@/server/admin-auth";
import { sectionInputSchema } from "@/server/content-validation";
import { getDb, sections } from "@/server/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;
  const admin = await requireAdmin();
  if (admin.response) return admin.response;
  const parsed = sectionInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const id = `sec_${crypto.randomUUID()}`;
  await getDb().insert(sections).values({ id, courseId, ...parsed.data });
  return NextResponse.json({ id }, { status: 201 });
}
