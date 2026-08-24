import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/server/admin-auth";
import { getDb, subscriptions, users } from "@/server/db";
import { createSubscription } from "@/server/subscriptions";

const bodySchema = z.object({
  plan: z.enum(["start", "pro", "ultra"]),
  amount: z.number().int().min(0).default(0),
  expiresAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const admin = await requireAdmin();
  if (admin.response) return admin.response;
  const rows = await getDb()
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt));
  return NextResponse.json({ subscriptions: rows });
}

export async function POST(
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

  const user = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .then((rows) => rows[0] ?? null);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const id = await createSubscription({
    userId,
    plan: parsed.data.plan,
    amount: parsed.data.amount,
    expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    source: "manual",
    notes: parsed.data.notes,
  });
  return NextResponse.json({ id }, { status: 201 });
}
