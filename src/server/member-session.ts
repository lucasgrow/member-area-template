import { redirect } from "next/navigation";

import { auth } from "@/server/auth";

export async function requireMemberPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!session.user.onboarded && session.user.role !== "admin") {
    redirect("/onboarding");
  }
  return session;
}
