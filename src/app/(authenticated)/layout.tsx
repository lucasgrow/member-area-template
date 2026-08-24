import { auth } from "@/server/auth";
import { getRuntimeEnv } from "@/server/runtime-env";
import { redirect } from "next/navigation";
import { AuthenticatedLayoutClient } from "./layout-client";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <AuthenticatedLayoutClient
      user={{
        name: session.user.name ?? "User",
        email: session.user.email ?? "",
        image: session.user.image ?? null,
        role: session.user.role,
        membership: session.user.membership,
      }}
      appName={getRuntimeEnv("APP_NAME") ?? "Member Area"}
    >
      {children}
    </AuthenticatedLayoutClient>
  );
}
