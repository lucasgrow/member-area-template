import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb, billingEvents } from "@/server/db";
import { projectBillingEvent } from "@/server/billing-projector";
import { getRuntimeEnv } from "@/server/runtime-env";

const webhookSchema = z.object({
  eventId: z.string().min(1),
  eventType: z.string().min(1),
  status: z.string().min(1),
  source: z.string().min(1).default("generic"),
  externalProductId: z.string().min(1).optional(),
  externalSubscriptionRef: z.string().min(1).optional(),
  externalTransactionRef: z.string().min(1).optional(),
  amount: z.number().int().nonnegative().optional(),
  currency: z.string().min(3).max(3).default("BRL"),
  customer: z.object({
    email: z.string().email(),
    name: z.string().optional(),
  }),
}).strict();

async function secretsMatch(received: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [receivedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(received)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const receivedBytes = new Uint8Array(receivedHash);
  const expectedBytes = new Uint8Array(expectedHash);
  let difference = 0;
  for (let i = 0; i < receivedBytes.length; i += 1) {
    difference |= receivedBytes[i] ^ expectedBytes[i];
  }
  return difference === 0;
}

export async function POST(req: Request) {
  const secret = getRuntimeEnv("BILLING_WEBHOOK_SECRET");
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = req.headers.get("x-webhook-secret") ?? "";
  if (!(await secretsMatch(signature, secret))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const raw = await req.json();
  const parsed = webhookSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const idempotencyKey = `${data.source}:${data.eventId}`;

  const db = getDb();
  await db
    .insert(billingEvents)
    .values({
      source: data.source,
      eventType: data.eventType,
      idempotencyKey,
      payload: JSON.stringify(data),
      amount: data.amount ?? null,
      currency: data.currency,
      externalProductId: data.externalProductId ?? null,
      externalSubscriptionRef: data.externalSubscriptionRef ?? null,
      externalTransactionRef: data.externalTransactionRef ?? null,
      eventOccurredAt: new Date(),
    })
    .onConflictDoNothing();

  const event = await db
    .select({ id: billingEvents.id, projectionStatus: billingEvents.projectionStatus })
    .from(billingEvents)
    .where(eq(billingEvents.idempotencyKey, idempotencyKey))
    .then((rows) => rows[0] ?? null);

  const projectionStatus = event
    ? await projectBillingEvent(event.id)
    : "skipped";

  return NextResponse.json(
    { ok: projectionStatus !== "failed", eventId: event?.id, projectionStatus },
    { status: projectionStatus === "failed" ? 202 : 200 },
  );
}
