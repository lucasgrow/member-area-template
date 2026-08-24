import { getRuntimeEnv } from "@/server/runtime-env";
import { LoginClient } from "./login-client";

export default function LoginPage() {
  return <LoginClient appName={getRuntimeEnv("APP_NAME") ?? "Member Area"} />;
}
