import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/server/admin-auth";
import { billingEvents, getDb } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (admin.response) return admin.response;
  const rows = await getDb()
    .select()
    .from(billingEvents)
    .orderBy(desc(billingEvents.createdAt))
    .limit(100);
  return NextResponse.json({ events: rows });
}
