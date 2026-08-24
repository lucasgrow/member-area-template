import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/server/admin-auth";
import { membershipSchema } from "@/server/content-validation";
import { getDb, users } from "@/server/db";

const bodySchema = z.object({ membership: membershipSchema });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const admin = await requireAdmin();
  if (admin.response) return admin.response;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  await getDb()
    .update(users)
    .set({ membership: parsed.data.membership })
    .where(eq(users.id, userId));
  return NextResponse.json({ ok: true });
}
