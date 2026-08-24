# Cloudflare Member Area Template

Reusable, single-instance member area for Cloudflare. Each project created from this template owns its Worker, D1 database, R2 bucket, domain, secrets, courses, and billing data. It is intentionally not multi-tenant.

## Kernel

- Next.js 16 on Cloudflare Workers through OpenNext.
- Google OAuth and Resend magic-link auth with `role`, `membership`, and first-access onboarding.
- D1 schema for courses, sections, lessons, transcripts, attachments, chapters, progress, subscriptions, product mappings, and idempotent billing events.
- Tier hierarchy: `free < start < pro < ultra`.
- Server-side lesson gates plus protected progress, transcript, and attachment APIs.
- R2 presigned admin uploads and gated attachment downloads.
- Admin console for content, users, memberships, manual subscriptions, product mappings, and billing replay.
- Generic billing webhook with a provider-neutral projector.

CRM, community, funnels, skills marketplace, and Agent API are not part of the kernel. See [Optional modules](docs/OPTIONAL-MODULES.md).

## Verify The Template

These commands do not create Cloudflare resources:

```bash
bun install
bun run setup:check
bun run typecheck
bun test
bun run smoke
```

## Create A Member Area

1. Create a new repository from this template and clone it.
2. Install dependencies with `bun install`.
3. Authenticate Wrangler with `npx wrangler login`.
4. Run `bun run setup`.
5. Review `.dev.vars` and `wrangler.toml`.
6. Start the local app with `bun dev`.

`bun run setup` is intentionally stateful: after a final confirmation it creates a dedicated D1 database and R2 bucket, configures R2 upload CORS for localhost and the app domain, writes local secrets, configures the Worker bindings, and applies migrations to local D1. It gathers all answers before creating resources and refuses to run when the template sentinels have already been consumed.

The user matching `ADMIN_EMAIL` becomes the initial admin when their account is first created. Use a dedicated owner email and protect the corresponding Google/Resend account.

## Billing

Billing can remain manual. Admins can create and cancel subscriptions in `/admin`.

For provider webhooks, configure product mappings first, set `BILLING_WEBHOOK_SECRET`, and send the normalized contract to `/api/webhooks/billing`. Unknown products fail closed and remain replayable from the admin console. See [Billing](docs/BILLING.md).

## Deploy

Setup prints the exact migration command for the project. Before deployment:

```bash
npx wrangler d1 migrations apply <project>-d1 --remote
bun run cf:build
bun run deploy
```

Configure production secrets and the custom domain first. See [Environment](docs/ENVIRONMENT.md) and [Instance checklist](docs/INSTANCE-CHECKLIST.md).

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for boundaries, data flows, and security invariants.
