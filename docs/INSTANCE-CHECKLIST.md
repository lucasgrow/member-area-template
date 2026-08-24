# New Instance Checklist

## Before Setup

- [ ] New repository and Git remote belong to this member area.
- [ ] Project slug, public app name, production domain, and owner email are decided.
- [ ] Wrangler is authenticated to the intended Cloudflare account.
- [ ] Google OAuth and Resend credentials belong to this app/account.
- [ ] `bun run setup:check` passes.

## Setup

- [ ] `bun run setup` creates `<project>-d1` and `<project>-storage` only after confirmation.
- [ ] `wrangler.toml` contains the new Worker, D1 ID/name, and R2 bucket.
- [ ] `.dev.vars` contains no secrets copied from another member area.
- [ ] Local D1 migrations apply successfully.
- [ ] `ADMIN_EMAIL` signs in and receives `role=admin`.

## Content And Access

- [ ] Admin creates one active free course, section, and lesson.
- [ ] Admin creates one paid course and assigns its required tier.
- [ ] Transcript, chapter, and attachment appear only on an unlocked lesson.
- [ ] Free member receives no video/content/transcript/attachment payload for the paid lesson.
- [ ] Completion, watch state, and exercise endpoints reject users below the course tier.

## Billing

- [ ] Manual subscription upgrades and cancellation recompute membership.
- [ ] Every provider product has an explicit product access mapping.
- [ ] Invalid webhook secret returns `401`.
- [ ] Duplicate provider event does not duplicate subscriptions.
- [ ] Failed event is visible and replayable in admin.

## R2

- [ ] Upload presign is admin-only and rejects unknown prefixes.
- [ ] Bucket name is project-specific and comes from configuration.
- [ ] Missing R2 object returns `404`.
- [ ] Attachment download rejects users below the course tier.

## Release Gates

- [ ] `bun run typecheck` passes.
- [ ] `bun test` passes.
- [ ] `bun run smoke` passes.
- [ ] `bun run lint` passes.
- [ ] `bun run cf:build` passes with production-like env.
- [ ] Remote D1 migration is reviewed and applied deliberately.
- [ ] Production secrets and custom domain are configured for this Worker only.
- [ ] No CRM, community, funnels, skills marketplace, or Agent API route/table entered the kernel.
- [ ] `git diff --check` passes.
