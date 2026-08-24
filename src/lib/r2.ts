import { getCloudflareContext } from "@opennextjs/cloudflare";

export function getR2(): R2Bucket {
  const { env } = getCloudflareContext();
  const bucket = env.STORAGE;
  if (!bucket) throw new Error("STORAGE (R2) binding not available");
  return bucket;
}

interface PresignOptions {
  filename: string;
  contentType: string;
  prefix?: string;
  expiresIn?: number;
}

interface PresignResult {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

const ALLOWED_UPLOAD_PREFIXES = new Set([
  "courses",
  "attachments",
  "thumbnails",
  "uploads",
]);

async function getR2Credentials() {
  let cfEnv: Partial<CloudflareEnv> | null = null;
  try {
    cfEnv = getCloudflareContext().env as Partial<CloudflareEnv>;
  } catch {
    // local dev fallback
  }

  if (
    cfEnv?.R2_ACCOUNT_ID &&
    cfEnv.R2_ACCESS_KEY_ID &&
    cfEnv.R2_SECRET_ACCESS_KEY &&
    cfEnv.R2_BUCKET_NAME
  ) {
    return {
      accountId: cfEnv.R2_ACCOUNT_ID,
      accessKeyId: cfEnv.R2_ACCESS_KEY_ID,
      secretAccessKey: cfEnv.R2_SECRET_ACCESS_KEY,
      bucketName: cfEnv.R2_BUCKET_NAME,
    };
  }

  const { env: validatedEnv } = await import("@/env");
  return {
    accountId: cfEnv?.R2_ACCOUNT_ID ?? validatedEnv.R2_ACCOUNT_ID,
    accessKeyId: cfEnv?.R2_ACCESS_KEY_ID ?? validatedEnv.R2_ACCESS_KEY_ID,
    secretAccessKey: cfEnv?.R2_SECRET_ACCESS_KEY ?? validatedEnv.R2_SECRET_ACCESS_KEY,
    bucketName: cfEnv?.R2_BUCKET_NAME ?? validatedEnv.R2_BUCKET_NAME,
  };
}

export function sanitizeR2Filename(name: string): string {
  const sanitized = name
    .replace(/[\/\\:*?"<>|]/g, "_")
    .replace(/[\u0000-\u001f\u007f]/g, "_")
    .replace(/\.\./g, "_")
    .trim()
    .slice(0, 200);
  return sanitized || "file";
}

export function assertAllowedR2Prefix(prefix: string | undefined) {
  if (!prefix) return;
  if (!ALLOWED_UPLOAD_PREFIXES.has(prefix)) {
    throw new Error(`Invalid upload prefix: ${prefix}`);
  }
}

export async function generatePresignedUploadUrl(
  opts: PresignOptions
): Promise<PresignResult> {
  const { AwsClient } = await import("aws4fetch");

  const { accountId, accessKeyId, secretAccessKey, bucketName } = await getR2Credentials();

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error(
      "R2 not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME in .dev.vars."
    );
  }

  const client = new AwsClient({ accessKeyId, secretAccessKey });
  const expiresIn = opts.expiresIn ?? 600;
  assertAllowedR2Prefix(opts.prefix);
  const prefix = opts.prefix ?? "uploads";
  const key = `${prefix}/${Date.now()}-${sanitizeR2Filename(opts.filename)}`;

  const url = new URL(
    `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}`
  );
  url.searchParams.set("X-Amz-Expires", String(expiresIn));

  const signed = await client.sign(
    new Request(url.toString(), {
      method: "PUT",
      headers: { "Content-Type": opts.contentType },
    }),
    { aws: { signQuery: true } }
  );

  return {
    uploadUrl: signed.url,
    key,
    expiresIn,
  };
}

export async function generateSignedReadUrl(key: string, expiresIn = 3600): Promise<string> {
  const { AwsClient } = await import("aws4fetch");

  const { accountId, accessKeyId, secretAccessKey, bucketName } = await getR2Credentials();

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error(
      "R2 not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME in .dev.vars."
    );
  }

  const client = new AwsClient({ accessKeyId, secretAccessKey });
  const url = new URL(
    `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}`,
  );
  url.searchParams.set("X-Amz-Expires", String(expiresIn));

  const signed = await client.sign(
    new Request(url.toString(), { method: "GET" }),
    { aws: { signQuery: true } },
  );

  return signed.url;
}
