import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/server/admin-auth";
import { sectionInputSchema } from "@/server/content-validation";
import { getDb, sections } from "@/server/db";

const updateSchema = sectionInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required",
);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ sectionId: string }> },
) {
  const { sectionId } = await params;
  const admin = await requireAdmin();
  if (admin.response) return admin.response;
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  await getDb().update(sections).set(parsed.data).where(eq(sections.id, sectionId));
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ sectionId: string }> },
) {
  const { sectionId } = await params;
  const admin = await requireAdmin();
  if (admin.response) return admin.response;
  await getDb().delete(sections).where(eq(sections.id, sectionId));
  return NextResponse.json({ ok: true });
}
