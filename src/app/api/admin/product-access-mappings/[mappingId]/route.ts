import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/server/admin-auth";
import { getDb, productAccessMappings } from "@/server/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ mappingId: string }> },
) {
  const { mappingId } = await params;
  const admin = await requireAdmin();
  if (admin.response) return admin.response;
  await getDb()
    .delete(productAccessMappings)
    .where(eq(productAccessMappings.id, mappingId));
  return NextResponse.json({ ok: true });
}
