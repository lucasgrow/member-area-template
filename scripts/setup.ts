import * as p from "@clack/prompts";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const wranglerPath = resolve(root, "wrangler.toml");

type Palette = {
  label: string;
  light: Record<string, string>;
  dark: Record<string, string>;
};

const palettes: Record<string, Palette> = {
  zinc: {
    label: "Black and white (zinc)",
    light: {
      50: "#FAFAFA", 100: "#F4F4F5", 200: "#E4E4E7", 300: "#D4D4D8",
      400: "#A1A1AA", 500: "#71717A", 600: "#52525B", 700: "#3F3F46",
      800: "#27272A", 900: "#18181B", DEFAULT: "#18181B", foreground: "#FAFAFA",
    },
    dark: {
      50: "#18181B", 100: "#27272A", 200: "#3F3F46", 300: "#52525B",
      400: "#71717A", 500: "#A1A1AA", 600: "#D4D4D8", 700: "#E4E4E7",
      800: "#F4F4F5", 900: "#FAFAFA", DEFAULT: "#FAFAFA", foreground: "#18181B",
    },
  },
  emerald: {
    label: "Green (emerald)",
    light: {
      50: "#ECFDF5", 100: "#D1FAE5", 200: "#A7F3D0", 300: "#6EE7B7",
      400: "#34D399", 500: "#10B981", 600: "#059669", 700: "#047857",
      800: "#065F46", 900: "#064E3B", DEFAULT: "#059669", foreground: "#FFFFFF",
    },
    dark: {
      50: "#064E3B", 100: "#065F46", 200: "#047857", 300: "#059669",
      400: "#10B981", 500: "#34D399", 600: "#6EE7B7", 700: "#A7F3D0",
      800: "#D1FAE5", 900: "#ECFDF5", DEFAULT: "#34D399", foreground: "#064E3B",
    },
  },
  orange: {
    label: "Orange",
    light: {
      50: "#FFF7ED", 100: "#FFEDD5", 200: "#FED7AA", 300: "#FDBA74",
      400: "#FB923C", 500: "#F97316", 600: "#EA580C", 700: "#C2410C",
      800: "#9A3412", 900: "#7C2D12", DEFAULT: "#EA580C", foreground: "#FFFFFF",
    },
    dark: {
      50: "#7C2D12", 100: "#9A3412", 200: "#C2410C", 300: "#EA580C",
      400: "#F97316", 500: "#FB923C", 600: "#FDBA74", 700: "#FED7AA",
      800: "#FFEDD5", 900: "#FFF7ED", DEFAULT: "#FB923C", foreground: "#7C2D12",
    },
  },
  violet: {
    label: "Purple (violet)",
    light: {
      50: "#F5F3FF", 100: "#EDE9FE", 200: "#DDD6FE", 300: "#C4B5FD",
      400: "#A78BFA", 500: "#8B5CF6", 600: "#7C3AED", 700: "#6D28D9",
      800: "#5B21B6", 900: "#4C1D95", DEFAULT: "#7C3AED", foreground: "#FFFFFF",
    },
    dark: {
      50: "#4C1D95", 100: "#5B21B6", 200: "#6D28D9", 300: "#7C3AED",
      400: "#8B5CF6", 500: "#A78BFA", 600: "#C4B5FD", 700: "#DDD6FE",
      800: "#EDE9FE", 900: "#F5F3FF", DEFAULT: "#A78BFA", foreground: "#4C1D95",
    },
  },
  amber: {
    label: "Yellow (amber)",
    light: {
      50: "#FFFBEB", 100: "#FEF3C7", 200: "#FDE68A", 300: "#FCD34D",
      400: "#FBBF24", 500: "#F59E0B", 600: "#D97706", 700: "#B45309",
      800: "#92400E", 900: "#78350F", DEFAULT: "#D97706", foreground: "#FFFFFF",
    },
    dark: {
      50: "#78350F", 100: "#92400E", 200: "#B45309", 300: "#D97706",
      400: "#F59E0B", 500: "#FBBF24", 600: "#FCD34D", 700: "#FDE68A",
      800: "#FEF3C7", 900: "#FFFBEB", DEFAULT: "#FBBF24", foreground: "#78350F",
    },
  },
};

function run(command: string): string {
  return execSync(command, {
    encoding: "utf-8",
    cwd: root,
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

function runSafe(command: string): string | null {
  try {
    return run(command);
  } catch {
    return null;
  }
}

function ensureNotCancelled<T>(value: T | symbol): asserts value is T {
  if (p.isCancel(value)) {
    p.cancel("Setup cancelled before provisioning.");
    process.exit(0);
  }
}

function envLine(name: string, value: string) {
  return `${name}=${JSON.stringify(value)}`;
}

function patchTailwindConfig(paletteKey: string) {
  const file = resolve(root, "tailwind.config.ts");
  let content = readFileSync(file, "utf-8");
  content = content.replace(/const PALETTE = "[^"]+"/, `const PALETTE = "${paletteKey}"`);
  if (paletteKey === "zinc") {
    writeFileSync(file, content);
    return;
  }

  const palette = palettes[paletteKey];
  const lightRegex = /(themes:\s*\{\s*light:\s*\{\s*colors:\s*\{[\s\S]*?)primary:\s*\{[^}]+\}/;
  const light = Object.entries(palette.light)
    .map(([key, value]) => `              ${key}: "${value}",`)
    .join("\n");
  content = content.replace(lightRegex, `$1primary: {\n${light}\n            }`);

  const darkStart = content.indexOf("dark: {");
  if (darkStart !== -1) {
    const prefix = content.slice(0, darkStart);
    const dark = content.slice(darkStart);
    const darkRegex = /(colors:\s*\{[\s\S]*?)primary:\s*\{[^}]+\}/;
    const colors = Object.entries(palette.dark)
      .map(([key, value]) => `              ${key}: "${value}",`)
      .join("\n");
    content = prefix + dark.replace(darkRegex, `$1primary: {\n${colors}\n            }`);
  }
  writeFileSync(file, content);
}

function runPreflight() {
  const failures: string[] = [];
  if (!existsSync(wranglerPath)) failures.push("wrangler.toml is missing");
  if (!existsSync(resolve(root, "drizzle", "0000_initial_member_area.sql"))) {
    failures.push("initial D1 migration is missing");
  }
  if (existsSync(wranglerPath)) {
    const wrangler = readFileSync(wranglerPath, "utf-8");
    if (
      !wrangler.includes('name = "member-area-template"') ||
      !wrangler.includes('database_id = "00000000-0000-0000-0000-000000000000"') ||
      !wrangler.includes('bucket_name = "member-area-template-storage"')
    ) {
      failures.push("wrangler.toml is already configured or has invalid template sentinels");
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) p.log.error(failure);
    process.exit(1);
  }
  p.log.success("Template preflight passed. No resources were created.");
}

async function main() {
  p.intro("member-area-template setup");
  if (process.argv.includes("--check")) {
    runPreflight();
    return;
  }

  runPreflight();
  const whoami = runSafe("npx wrangler whoami");
  if (!whoami || whoami.includes("Not logged in")) {
    p.log.error("Wrangler is not authenticated. Run `npx wrangler login`, then run setup again.");
    process.exit(1);
  }
  p.log.success(`Wrangler: ${whoami.split("\n").pop()}`);

  const projectName = await p.text({
    message: "Project slug (Worker, D1, and R2 prefix):",
    placeholder: "my-member-area",
    validate: (value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
      ? undefined
      : "Use lowercase letters, numbers, and single hyphens",
  });
  ensureNotCancelled(projectName);

  const appName = await p.text({
    message: "Public app name:",
    placeholder: "My Academy",
    validate: (value) => value.trim().length > 0 ? undefined : "App name is required",
  });
  ensureNotCancelled(appName);

  const appDomain = await p.text({
    message: "Production domain:",
    placeholder: "members.example.com",
    validate: (value) => /^[a-z0-9.-]+$/i.test(value) && value.includes(".")
      ? undefined
      : "Enter a hostname without protocol or path",
  });
  ensureNotCancelled(appDomain);

  const adminEmail = await p.text({
    message: "Initial admin email:",
    placeholder: "owner@example.com",
    validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ? undefined
      : "Enter a valid email address",
  });
  ensureNotCancelled(adminEmail);

  const palette = await p.select({
    message: "Color palette:",
    options: Object.entries(palettes).map(([value, item]) => ({ value, label: item.label })),
  });
  ensureNotCancelled(palette);

  const googleId = await p.text({ message: "Google OAuth Client ID:" });
  ensureNotCancelled(googleId);
  const googleSecret = await p.password({ message: "Google OAuth Client Secret:" });
  ensureNotCancelled(googleSecret);
  const resendKey = await p.password({ message: "Resend API key:" });
  ensureNotCancelled(resendKey);
  const emailFrom = await p.text({
    message: "Magic-link sender:",
    placeholder: `login@${appDomain}`,
  });
  ensureNotCancelled(emailFrom);

  const billingEnabled = await p.confirm({
    message: "Enable the generic billing webhook?",
    initialValue: true,
  });
  ensureNotCancelled(billingEnabled);

  const r2AccountId = await p.text({
    message: "R2 Account ID (optional; required for presigned uploads):",
    defaultValue: "",
  });
  ensureNotCancelled(r2AccountId);
  const r2AccessKey = await p.text({
    message: "R2 Access Key ID (optional):",
    defaultValue: "",
  });
  ensureNotCancelled(r2AccessKey);
  const r2Secret = await p.password({
    message: "R2 Secret Access Key (optional):",
  });
  ensureNotCancelled(r2Secret);

  const confirmed = await p.confirm({
    message: `Create isolated Cloudflare resources for ${projectName}?`,
    initialValue: false,
  });
  ensureNotCancelled(confirmed);
  if (!confirmed) {
    p.cancel("Setup cancelled. No resources were created.");
    return;
  }

  p.log.step(`Creating D1 database ${projectName}-d1`);
  const d1Output = run(`npx wrangler d1 create ${projectName}-d1`);
  const databaseId = d1Output.match(/database_id\s*=\s*"([^"]+)"/)?.[1];
  if (!databaseId) {
    p.log.error(`D1 was created but its database ID could not be parsed.\n${d1Output}`);
    process.exit(1);
  }

  p.log.step(`Creating R2 bucket ${projectName}-storage`);
  run(`npx wrangler r2 bucket create ${projectName}-storage`);

  const corsPath = resolve(tmpdir(), `${projectName}-r2-cors.json`);
  writeFileSync(corsPath, JSON.stringify({
    rules: [{
      allowed: {
        origins: ["http://localhost:3000", `https://${appDomain}`],
        methods: ["PUT"],
        headers: ["Content-Type"],
      },
      exposeHeaders: ["ETag"],
      maxAgeSeconds: 3600,
    }],
  }, null, 2));
  try {
    run(`npx wrangler r2 bucket cors set ${projectName}-storage --file ${corsPath} --force`);
  } finally {
    unlinkSync(corsPath);
  }

  const authSecret = crypto.randomBytes(32).toString("base64url");
  const billingSecret = billingEnabled
    ? crypto.randomBytes(32).toString("base64url")
    : "";
  const devVars = [
    envLine("APP_NAME", String(appName)),
    envLine("APP_DOMAIN", String(appDomain)),
    envLine("ADMIN_EMAIL", String(adminEmail).toLowerCase()),
    envLine("AUTH_SECRET", authSecret),
    envLine("AUTH_GOOGLE_ID", String(googleId)),
    envLine("AUTH_GOOGLE_SECRET", String(googleSecret)),
    envLine("AUTH_RESEND_KEY", String(resendKey)),
    envLine("AUTH_EMAIL_FROM", String(emailFrom)),
    envLine("BILLING_WEBHOOK_SECRET", billingSecret),
    envLine("R2_ACCOUNT_ID", String(r2AccountId)),
    envLine("R2_ACCESS_KEY_ID", String(r2AccessKey)),
    envLine("R2_SECRET_ACCESS_KEY", String(r2Secret)),
    envLine("R2_BUCKET_NAME", `${projectName}-storage`),
  ].join("\n");
  writeFileSync(resolve(root, ".dev.vars"), `${devVars}\n`);

  let wrangler = readFileSync(wranglerPath, "utf-8");
  wrangler = wrangler.replaceAll("member-area-template-storage", `${projectName}-storage`);
  wrangler = wrangler.replaceAll("member-area-template-d1", `${projectName}-d1`);
  wrangler = wrangler.replaceAll('"member-area-template"', `"${projectName}"`);
  wrangler = wrangler.replace("00000000-0000-0000-0000-000000000000", databaseId);
  writeFileSync(wranglerPath, wrangler);
  patchTailwindConfig(String(palette));

  p.log.step("Applying D1 migrations to the local development database");
  run(`npx wrangler d1 migrations apply ${projectName}-d1 --local`);

  p.outro([
    "Setup complete.",
    "Run locally: bun dev",
    "Apply production migrations: npx wrangler d1 migrations apply " + projectName + "-d1 --remote",
    "Configure production secrets: see docs/ENVIRONMENT.md",
    "Deploy after review: bun run deploy",
  ].join("\n"));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  p.log.error(message);
  process.exit(1);
});
