import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/server/admin-auth";
import { projectBillingEvent } from "@/server/billing-projector";
import { billingEvents, getDb } from "@/server/db";

const bodySchema = z.object({ eventId: z.string().min(1) });

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (admin.response) return admin.response;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  await getDb()
    .update(billingEvents)
    .set({ projectionStatus: "pending", processedAt: null, lastError: null })
    .where(eq(billingEvents.id, parsed.data.eventId));
  const status = await projectBillingEvent(parsed.data.eventId);
  return NextResponse.json({ ok: status === "processed", status });
}
