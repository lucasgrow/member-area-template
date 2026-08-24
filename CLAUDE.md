# Member Area Template

Cloudflare-native, single-instance member area. Every derived app owns separate Worker, D1, R2, domain, secrets, users, content, and billing data. Do not introduce `tenant_id` as a substitute for that isolation model.

## Commands

```bash
bun install
bun run setup:check
bun run typecheck
bun test
bun run smoke
bun run lint
bun run cf:build
```

`bun run setup` creates real D1/R2 resources after explicit confirmation. Do not run setup, remote migrations, or deploy commands without operator approval.

## Kernel Boundaries

- Auth: Google OAuth, Resend magic link, `role`, `membership`, and onboarding.
- Content: courses, sections, lessons, transcripts, attachments, chapters.
- Progress: completion, watch state, and exercise state.
- Access: `free < start < pro < ultra`, centralized in `src/server/access.ts`.
- Storage: project-configured R2, admin presign, protected attachment download.
- Billing: idempotent normalized events, product mappings, projector, subscriptions.
- Admin: content, users, memberships, subscriptions, mappings, event replay.

CRM, community, funnels, skills marketplace, and Agent API are optional modules and must not be imported by kernel auth/billing/content code.

## Required Patterns

- Member lesson APIs call `verifyLessonAccess` before reading or mutating protected data.
- Locked server pages do not fetch or serialize video, content, summary, transcript, attachment, chapter, or exercise payloads.
- Admin navigation is cosmetic; every admin handler calls `requireAdmin`.
- Mutable handler inputs are validated with Zod.
- R2 bucket names, credentials, domains, secrets, and brand names come from config.
- Billing activation requires an explicit product mapping and fails closed otherwise.
- Provider-specific parsing/signature logic stays outside the generic projector.
- D1 schema changes require generated migrations plus typecheck, tests, and smoke.

See `README.md`, `ARCHITECTURE.md`, and `docs/` for the current operational contract.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
