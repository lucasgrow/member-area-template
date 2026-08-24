import { and, eq } from "drizzle-orm";

import {
  billingEvents,
  productAccessMappings,
  userOnboarding,
  users,
} from "@/server/db/schema";
import { getDb } from "@/server/db";
import { createSubscription, cancelUserSubscriptions } from "@/server/subscriptions";
import type { MembershipTier } from "@/server/access";

type BillingStatus = "active" | "started" | "approved" | "upgraded" | "restarted";
type CancelStatus = "canceled" | "expired" | "overdue" | "suspended" | "refunded" | "chargeback";

const ACTIVE_STATUSES = new Set<BillingStatus>([
  "active",
  "started",
  "approved",
  "upgraded",
  "restarted",
]);

const CANCEL_STATUSES = new Set<CancelStatus>([
  "canceled",
  "expired",
  "overdue",
  "suspended",
  "refunded",
  "chargeback",
]);

export type BillingEventProjectionInput = {
  source: string;
  eventType: string;
  externalProductId: string | null;
  externalSubscriptionRef: string | null;
  externalTransactionRef: string | null;
  amount: number | null;
  payload: Record<string, unknown>;
};

export type ProductAccessMappingInput = {
  source: string;
  externalProductId: string;
  plan: MembershipTier;
  requiresOnboarding: boolean;
};

export type BillingProjection =
  | {
      kind: "activate";
      email: string;
      name: string | null;
      plan: Exclude<MembershipTier, "free">;
      requiresOnboarding: boolean;
      externalRef: string | null;
      amount: number;
    }
  | {
      kind: "cancel";
      email: string;
      cancelStatus: "canceled" | "expired";
      externalRef: string | null;
    }
  | {
      kind: "ignore";
      email: string;
      status: string;
    };

type BillingPayloadCustomer = {
  email?: unknown;
  name?: unknown;
};

function getPayloadStatus(eventType: string, payload: Record<string, unknown>): string {
  const rawStatus = payload.status;
  if (typeof rawStatus === "string" && rawStatus.trim()) {
    return rawStatus.toLowerCase().trim();
  }
  return eventType.split(".").pop()?.toLowerCase().trim() ?? "";
}

function getPayloadCustomer(payload: Record<string, unknown>): BillingPayloadCustomer {
  const customer = payload.customer ?? payload.subscriber ?? payload.contact;
  return customer && typeof customer === "object" ? customer : {};
}

function normalizeEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const email = input.toLowerCase().trim();
  return email.includes("@") ? email : null;
}

function normalizeName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const name = input.trim();
  return name ? name : null;
}

function resolveMapping(
  event: BillingEventProjectionInput,
  mappings: ProductAccessMappingInput[],
): ProductAccessMappingInput | null {
  if (!event.externalProductId) return null;
  return (
    mappings.find(
      (mapping) =>
        mapping.source === event.source &&
        mapping.externalProductId === event.externalProductId,
    ) ?? null
  );
}

export function projectBillingEventData(
  event: BillingEventProjectionInput,
  opts: { productMappings: ProductAccessMappingInput[] },
): BillingProjection {
  const customer = getPayloadCustomer(event.payload);
  const email = normalizeEmail(customer.email);
  if (!email) throw new Error("Billing payload is missing customer email");

  const status = getPayloadStatus(event.eventType, event.payload);
  const mapping = resolveMapping(event, opts.productMappings);

  if (ACTIVE_STATUSES.has(status as BillingStatus)) {
    if (!mapping || mapping.plan === "free") {
      throw new Error(
        `No product access mapping for ${event.source}:${event.externalProductId ?? "missing-product"}`,
      );
    }

    const plan = mapping.plan as Exclude<MembershipTier, "free">;
    return {
      kind: "activate",
      email,
      name: normalizeName(customer.name),
      plan,
      requiresOnboarding: mapping?.requiresOnboarding ?? false,
      externalRef: event.externalSubscriptionRef ?? event.externalTransactionRef,
      amount: event.amount ?? 0,
    };
  }

  if (CANCEL_STATUSES.has(status as CancelStatus)) {
    const externalRef = event.externalSubscriptionRef ?? event.externalTransactionRef;
    if (!externalRef) {
      throw new Error(
        "Cancellation payload is missing an external subscription or transaction reference",
      );
    }
    return {
      kind: "cancel",
      email,
      cancelStatus: status === "expired" ? "expired" : "canceled",
      externalRef,
    };
  }

  return { kind: "ignore", email, status };
}

export async function projectBillingEvent(
  eventId: string,
): Promise<"processed" | "failed" | "skipped"> {
  const db = getDb();

  try {
    const event = await db
      .select()
      .from(billingEvents)
      .where(eq(billingEvents.id, eventId))
      .then((rows) => rows[0] ?? null);

    if (!event || event.projectionStatus === "processed") return "skipped";

    const mappings = await db
      .select({
        source: productAccessMappings.source,
        externalProductId: productAccessMappings.externalProductId,
        plan: productAccessMappings.plan,
        requiresOnboarding: productAccessMappings.requiresOnboarding,
      })
      .from(productAccessMappings);

    const projection = projectBillingEventData(
      {
        source: event.source,
        eventType: event.eventType,
        externalProductId: event.externalProductId,
        externalSubscriptionRef: event.externalSubscriptionRef,
        externalTransactionRef: event.externalTransactionRef,
        amount: event.amount,
        payload: JSON.parse(event.payload) as Record<string, unknown>,
      },
      {
        productMappings: mappings.map((mapping) => ({
          ...mapping,
          plan: mapping.plan as MembershipTier,
          requiresOnboarding: Boolean(mapping.requiresOnboarding),
        })),
      },
    );

    if (projection.kind === "ignore") {
      await db
        .update(billingEvents)
        .set({ projectionStatus: "processed", processedAt: new Date() })
        .where(eq(billingEvents.id, eventId));
      return "processed";
    }

    if (projection.kind === "activate") {
      const user = await findOrCreateUser(projection.email, projection.name);
      const subscriptionId = await createSubscription({
        userId: user.id,
        plan: projection.plan,
        amount: projection.amount,
        source: event.source,
        externalRef: projection.externalRef ?? undefined,
      });

      await db
        .update(billingEvents)
        .set({ subscriptionId })
        .where(eq(billingEvents.id, eventId));

      if (projection.requiresOnboarding) {
        await db
          .update(users)
          .set({ onboarded: false })
          .where(eq(users.id, user.id));

        const existing = await db
          .select({ id: userOnboarding.id })
          .from(userOnboarding)
          .where(eq(userOnboarding.userId, user.id))
          .then((rows) => rows[0] ?? null);

        if (!existing) {
          await db.insert(userOnboarding).values({
            userId: user.id,
            flowVariant: "default",
          });
        } else {
          await db
            .update(userOnboarding)
            .set({
              status: "pending",
              completedAt: null,
              updatedAt: new Date(),
            })
            .where(eq(userOnboarding.userId, user.id));
        }
      }
    } else {
      const user = await findUserByEmail(projection.email);
      if (user) {
        await cancelUserSubscriptions(user.id, projection.cancelStatus, {
          source: event.source,
          externalRef: projection.externalRef,
        });
      }
    }

    await db
      .update(billingEvents)
      .set({ projectionStatus: "processed", processedAt: new Date() })
      .where(eq(billingEvents.id, eventId));
    return "processed";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(billingEvents)
      .set({ projectionStatus: "failed", lastError: message })
      .where(eq(billingEvents.id, eventId));
    return "failed";
  }
}

async function findUserByEmail(email: string) {
  return getDb()
    .select()
    .from(users)
    .where(eq(users.email, email))
    .then((rows) => rows[0] ?? null);
}

async function findOrCreateUser(email: string, name: string | null) {
  const db = getDb();
  const existing = await findUserByEmail(email);

  if (existing) return existing;

  const id = crypto.randomUUID();
  await db.insert(users).values({
    id,
    email,
    name,
    membership: "free",
    role: "user",
    onboarded: false,
  });

  return db
    .select()
    .from(users)
    .where(and(eq(users.id, id), eq(users.email, email)))
    .then((rows) => rows[0]);
}
