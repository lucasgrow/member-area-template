import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/server/admin-auth";
import { getDb, subscriptions } from "@/server/db";
import { syncMembership } from "@/server/subscriptions";

const bodySchema = z.object({ status: z.enum(["active", "canceled", "expired"]) });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ subscriptionId: string }> },
) {
  const { subscriptionId } = await params;
  const admin = await requireAdmin();
  if (admin.response) return admin.response;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const subscription = await getDb()
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .then((rows) => rows[0] ?? null);
  if (!subscription) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }
  await getDb()
    .update(subscriptions)
    .set({ status: parsed.data.status })
    .where(eq(subscriptions.id, subscriptionId));
  await syncMembership(subscription.userId);
  return NextResponse.json({ ok: true });
}
