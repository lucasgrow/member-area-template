# Environment And Cloudflare Resources

## Required Application Values

| Variable | Purpose |
|---|---|
| `APP_NAME` | Public name shown in authenticated navigation and login. |
| `APP_DOMAIN` | Production hostname without protocol. |
| `ADMIN_EMAIL` | Email promoted to admin when its account is first created. |
| `AUTH_SECRET` | NextAuth signing secret. |
| `AUTH_GOOGLE_ID` | Google OAuth client ID. |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret. |
| `AUTH_RESEND_KEY` | Resend API key for magic links. |
| `AUTH_EMAIL_FROM` | Verified sender used by Resend. |

## Optional Values

| Variable | Purpose |
|---|---|
| `BILLING_WEBHOOK_SECRET` | Enables the generic billing webhook. Manual billing does not need it. |
| `R2_ACCOUNT_ID` | Account used for S3-compatible presigned URLs. |
| `R2_ACCESS_KEY_ID` | R2 API token access key. |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret. |
| `R2_BUCKET_NAME` | Project-specific bucket name used for presigning. |

The `STORAGE` binding is sufficient for protected reads inside the Worker. The four R2 values are additionally required for browser-to-R2 presigned uploads. Setup configures `PUT` CORS for `http://localhost:3000` and `https://<APP_DOMAIN>`.

## Per-Instance Resource Contract

For project slug `academy-one`, setup creates/configures:

```text
Worker: academy-one
D1:     academy-one-d1
R2:     academy-one-storage
Domain: operator-selected custom hostname
```

Do not reuse a D1 database, R2 bucket, domain, `.dev.vars`, or production secret set across member areas. The template does not implement runtime tenancy.

## Auth Provider URLs

Google OAuth must allow both callbacks:

```text
http://localhost:3000/api/auth/callback/google
https://<APP_DOMAIN>/api/auth/callback/google
```

The Resend sender must belong to a verified domain for production delivery.

## Production Secrets

Use Cloudflare secret management for credentials. Set each secret explicitly for the new Worker, for example:

```bash
npx wrangler secret put AUTH_SECRET
npx wrangler secret put AUTH_GOOGLE_SECRET
npx wrangler secret put AUTH_RESEND_KEY
npx wrangler secret put BILLING_WEBHOOK_SECRET
npx wrangler secret put R2_SECRET_ACCESS_KEY
```

Non-secret configuration can be added as Worker variables or through the deployment environment. Never commit `.dev.vars`; it is ignored by Git.

## Migrations And Deploy

Setup applies migrations only to Wrangler's local D1 state. Apply them remotely as a separate reviewed operation:

```bash
npx wrangler d1 migrations apply <project>-d1 --remote
bun run cf:build
bun run deploy
```

Configure the production custom domain before treating an instance as ready.
