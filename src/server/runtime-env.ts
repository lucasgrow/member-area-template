import { getCloudflareContext } from "@opennextjs/cloudflare";

export function getRuntimeEnv(name: keyof CloudflareEnv): string | undefined {
  try {
    const value = getCloudflareContext().env[name];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  } catch {
    const value = process.env[name];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }
}
