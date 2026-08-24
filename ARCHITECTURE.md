# Architecture

## Deployment Model

The template produces one member area per deployment. A deployed instance owns one Next.js app/Worker, one D1 database, one R2 bucket, one domain, and one set of secrets. Source patterns are reusable; runtime data and resources are not shared. There is no `tenant_id` isolation layer.

## Runtime

```text
Browser
  -> Next.js App Router on Cloudflare Worker
       -> NextAuth -> Google / Resend
       -> Drizzle -> D1
       -> R2 binding for protected reads
       -> S3-compatible R2 endpoint for presigned admin uploads
       -> Generic billing event store and projector
```

OpenNext builds the Next.js 16 app as a Worker. `wrangler.toml` binds `DATABASE`, `STORAGE`, assets, and the Worker self-reference. `src/server/db/index.ts` selects D1 in the Worker and the Wrangler SQLite file in local development.

## Layers

- `src/app`: member pages and authenticated route handlers.
- `src/components`: client interaction for lessons and the admin console.
- `src/server`: auth, D1 schema/queries, tier access, billing, subscriptions, and authorization helpers.
- `src/lib`: runtime-neutral helpers and R2 integration.
- `drizzle`: the executable D1 baseline and Drizzle snapshots.
- `scripts`: setup preflight/provisioning and local kernel smoke.

## Identity And Access

NextAuth supports Google OAuth and Resend magic links. Every new user starts with `membership=free`, `onboarded=false`, and `role=user`, except the configured `ADMIN_EMAIL`, which starts as `role=admin`. The session callback reloads role, membership, and onboarding state from D1 so access changes take effect without issuing a new account.

`src/server/access.ts` is the only tier ordering authority. `verifyLessonAccess` joins lesson to course and applies that helper. Member pages and every progress, transcript, and attachment endpoint repeat the access check. The locked lesson page queries only safe metadata; protected lesson fields and related rows are fetched only after access succeeds.

Admin pages redirect non-admin users. Every admin mutation independently calls `requireAdmin`; navigation visibility is not treated as authorization.

## Content And Progress

The content graph is:

```text
courses
  -> sections
       -> lessons
            -> lesson_transcripts
            -> lesson_attachments
            -> lesson_chapters
            -> user_lesson_progress
            -> user_lesson_watch_state
            -> user_exercise_progress
```

Course slugs are globally unique. Section slugs are unique per course, and lesson slugs are unique per section. Foreign keys cascade when content is removed. Progress keys are unique per user and lesson.

## Storage

Protected attachments store either an `attachments/...` R2 key or one external URL, never both. Downloads first authenticate, apply the lesson tier gate, verify the attachment belongs to the lesson, then read the `STORAGE` binding. Presigned uploads are admin-only and accept only `courses`, `attachments`, `thumbnails`, or `uploads` prefixes. Bucket names and credentials come from bindings/environment.

## Billing

The generic webhook validates a shared secret and strict Zod contract, then stores the raw normalized payload under a unique provider event key. The projector resolves `product_access_mappings`, creates the buyer when needed, upserts the provider subscription, synchronizes the highest active membership, and records `processed` or `failed` state.

Unknown active products fail closed. Cancellation is scoped to the source and external subscription reference so one provider cannot revoke an unrelated subscription. Replays are safe because provider subscriptions are unique by source and external reference.

Manual subscriptions use the same membership synchronization path. CRM, funnels, email campaigns, DMs, and other side effects are not called by auth or billing.

## Setup Boundary

`bun run setup:check` is read-only. `bun run setup` creates Cloudflare resources only after Wrangler authentication, complete input collection, and explicit final confirmation. It replaces valid, inert template sentinels with a project-specific Worker/D1/R2 configuration and cannot be reused to silently reconfigure an initialized instance.

Production resource creation, secrets, migrations, and deployment remain operator-controlled steps. The repository itself contains no real Cloudflare IDs or credentials.

## Optional Module Contract

An optional module must own its migrations, routes, navigation, environment variables, R2 prefixes, tests, and removal instructions. It may depend on kernel interfaces but the kernel cannot import the module. Current excluded domains are documented in `docs/OPTIONAL-MODULES.md`.
