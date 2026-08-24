import { redirect } from "next/navigation";

import { auth } from "@/server/auth";
import { OnboardingClient } from "./onboarding-client";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.onboarded) redirect("/dashboard");
  return <OnboardingClient />;
}
