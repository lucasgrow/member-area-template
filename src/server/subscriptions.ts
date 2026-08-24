import { and, desc, eq } from "drizzle-orm";

import { tierLevel } from "@/server/access";
import { getDb } from "@/server/db";
import { subscriptions, users } from "@/server/db/schema";

type PaidPlan = "start" | "pro" | "ultra";

export async function getActiveSubscription(userId: string) {
  const db = getDb();
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  return subscription ?? null;
}

export async function syncMembership(userId: string) {
  const db = getDb();
  const activeSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
    .orderBy(desc(subscriptions.createdAt));
  let membership: "free" | PaidPlan = "free";

  for (const subscription of activeSubscriptions) {
    if (subscription.expiresAt && subscription.expiresAt.getTime() < Date.now()) {
      await db
        .update(subscriptions)
        .set({ status: "expired" })
        .where(eq(subscriptions.id, subscription.id));
      continue;
    }

    if (tierLevel(subscription.plan) > tierLevel(membership)) {
      membership = subscription.plan as PaidPlan;
    }
  }

  await db.update(users).set({ membership }).where(eq(users.id, userId));
  return membership;
}

export async function createSubscription(data: {
  userId: string;
  plan: PaidPlan;
  amount: number;
  startsAt?: Date;
  expiresAt?: Date | null;
  source: string;
  externalRef?: string;
  notes?: string;
}) {
  const db = getDb();

  if (data.externalRef) {
    const existing = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.source, data.source),
          eq(subscriptions.externalRef, data.externalRef),
        ),
      )
      .then((rows) => rows[0] ?? null);

    if (existing) {
      await db
        .update(subscriptions)
        .set({
          userId: data.userId,
          plan: data.plan,
          amount: data.amount,
          startsAt: data.startsAt ?? new Date(),
          expiresAt: data.expiresAt ?? null,
          status: "active",
          notes: data.notes ?? null,
        })
        .where(eq(subscriptions.id, existing.id));
      await syncMembership(data.userId);
      return existing.id;
    }
  }

  const id = `sub_${crypto.randomUUID()}`;

  await db.insert(subscriptions).values({
    id,
    userId: data.userId,
    plan: data.plan,
    amount: data.amount,
    startsAt: data.startsAt ?? new Date(),
    expiresAt: data.expiresAt ?? null,
    status: "active",
    source: data.source,
    externalRef: data.externalRef ?? null,
    notes: data.notes ?? null,
  });

  await syncMembership(data.userId);
  return id;
}

export async function cancelUserSubscriptions(
  userId: string,
  status: "canceled" | "expired" = "canceled",
  scope?: { source?: string; externalRef?: string | null },
) {
  const db = getDb();
  const filters = [
    eq(subscriptions.userId, userId),
    eq(subscriptions.status, "active"),
  ];
  if (scope?.source) filters.push(eq(subscriptions.source, scope.source));
  if (scope?.externalRef) {
    filters.push(eq(subscriptions.externalRef, scope.externalRef));
  }

  const active = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(and(...filters));

  for (const subscription of active) {
    await db
      .update(subscriptions)
      .set({ status })
      .where(eq(subscriptions.id, subscription.id));
  }

  await syncMembership(userId);
}
