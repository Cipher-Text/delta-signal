# 0001. Monorepo With Independent Apps

## Status

Accepted

## Decision

Delta Signal will use a pnpm workspace and Nx monorepo containing independently deployable applications:

- `apps/web`
- `apps/admin`
- `apps/api`
- `apps/data-worker`

The core API starts as a NestJS modular monolith. Domains can be extracted into separate services later if load, ownership, or runtime requirements justify it.

## Rationale

This keeps development, shared contracts, and code ownership simple while avoiding a single deployable monolith. It also lets data-heavy workflows move into Python or another service later without splitting the repository too early.

