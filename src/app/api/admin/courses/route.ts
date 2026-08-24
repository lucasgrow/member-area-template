import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/server/admin-auth";
import { courseInputSchema } from "@/server/content-validation";
import { courses, getDb } from "@/server/db";

export async function GET() {
  const admin = await requireAdmin();
  if (admin.response) return admin.response;
  const rows = await getDb().select().from(courses).orderBy(asc(courses.sortOrder));
  return NextResponse.json({ courses: rows });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (admin.response) return admin.response;
  const parsed = courseInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const id = `crs_${crypto.randomUUID()}`;
  await getDb().insert(courses).values({
    id,
    ...parsed.data,
    isFree: parsed.data.requiredTier === "free",
  });
  return NextResponse.json({ id }, { status: 201 });
}
