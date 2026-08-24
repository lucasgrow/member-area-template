import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/server/admin-auth";
import { getDb, productAccessMappings } from "@/server/db";

const mappingSchema = z.object({
  source: z.string().min(1).max(80),
  externalProductId: z.string().min(1).max(200),
  plan: z.enum(["start", "pro", "ultra"]),
  requiresOnboarding: z.boolean().default(false),
  label: z.string().max(160).nullable().optional(),
});

export async function GET() {
  const admin = await requireAdmin();
  if (admin.response) return admin.response;
  const rows = await getDb()
    .select()
    .from(productAccessMappings)
    .orderBy(asc(productAccessMappings.source), asc(productAccessMappings.externalProductId));
  return NextResponse.json({ mappings: rows });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (admin.response) return admin.response;
  const parsed = mappingSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  await getDb()
    .insert(productAccessMappings)
    .values({ id: `pam_${crypto.randomUUID()}`, ...parsed.data })
    .onConflictDoUpdate({
      target: [productAccessMappings.source, productAccessMappings.externalProductId],
      set: {
        plan: parsed.data.plan,
        requiresOnboarding: parsed.data.requiresOnboarding,
        label: parsed.data.label ?? null,
      },
    });
  return NextResponse.json({ ok: true }, { status: 201 });
}
