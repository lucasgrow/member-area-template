# Optional Modules

The repository contains only the member-area kernel. The following domains are intentionally absent:

| Module | Status | Kernel boundary |
|---|---|---|
| Skills marketplace | Optional | May depend on auth, admin, and R2; owns skill tables, routes, reviews, and install behavior. |
| Agent API | Optional | May read member/content contracts; owns token hashing, scopes, rate limits, and audit logs. |
| Funnels | Optional | May emit/consume domain events; cannot be required by billing projection. |
| CRM | Optional, preferably separate | Consumes commercial signals; auth and billing must not call it directly. |
| Community | Optional | Owns posts, comments, votes, moderation, notifications, and optional DMs/leaderboards. |

## Installation Contract

Every optional module must declare:

- migrations and rollback/removal behavior;
- routes, layouts, and navigation entries;
- environment variables and external services;
- R2 prefixes and retention rules;
- domain events consumed/emitted;
- authorization rules and tests;
- proof that removing it leaves auth, courses, progress, billing, and admin working.

Optional migrations should not be folded into `0000_initial_member_area.sql`. A module cannot add side effects to `createUser` or the billing projector without an explicit adapter boundary.
