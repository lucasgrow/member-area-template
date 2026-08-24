import { defineConfig } from "drizzle-kit";
import fs from "node:fs";
import path from "node:path";

function getLocalD1DB() {
  const basePath = path.resolve(".wrangler");
  if (!fs.existsSync(basePath)) return ":memory:";

  try {
    const dbFile = fs
      .readdirSync(basePath, { encoding: "utf-8", recursive: true })
      .find((f) => f.endsWith(".sqlite"));

    if (!dbFile) {
      throw new Error(`.sqlite file not found in ${basePath}`);
    }

    return path.resolve(basePath, dbFile);
  } catch (err) {
    throw new Error(`Could not resolve local D1 database: ${String(err)}`);
  }
}

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  ...(process.env.NODE_ENV === "production"
    ? {
        driver: "d1-http",
        dbCredentials: {
          accountId: process.env.CLOUDFLARE_D1_ACCOUNT_ID,
          databaseId: process.env.DATABASE,
          token: process.env.CLOUDFLARE_D1_API_TOKEN,
        },
      }
    : {
        dbCredentials: {
          url: getLocalD1DB(),
        },
      }),
});
