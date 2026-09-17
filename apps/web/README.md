# Delta Signal Web

Next.js 15 frontend for Delta Signal's public environmental board and authenticated app shell.

## Route surfaces

- `/` — anonymous public environmental board with live summaries, alerts, reports, biodiversity, restoration, and dataset previews.
- `/dashboard` — authenticated, role-scoped analytics workspace. `ADMIN`, `MODERATOR`, `GOVERNMENT`, `RESEARCHER`, and `ORGANIZATION_ADMIN` receive tailored views; citizens receive an explanatory empty state.
- Other app-shell routes — public collection pages where permitted, plus authenticated contribution and profile workflows.

The dashboard is documented in [../../docs/dashboard.md](../../docs/dashboard.md). Its current presentation uses shared dashboard primitives and responsive CSS; analytics responses also carry provider freshness metadata, without changing metric access rules.
