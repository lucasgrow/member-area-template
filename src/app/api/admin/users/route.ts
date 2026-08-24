import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/server/admin-auth";
import { getDb, users } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (admin.response) return admin.response;
  const rows = await getDb()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      membership: users.membership,
      onboarded: users.onboarded,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(100);
  return NextResponse.json({ users: rows });
}
