# Documentation

Use this page to find the maintained reference for each area. The progress log
records implementation history; it is not the source of truth for current
architecture or API behavior.

## Start here

- [Project brief](product/project-brief.md) — mission, audience, and product scope
- [Tech stack](operations/tech-stack.md) — tools and runtime choices
- [Roadmap](planning/roadmap.md) — current phases and planned work
- [Progress log](progress.md) — dated implementation history

## Product behavior

- [Business logic](product/business-logic.md) — domain rules and rationale
- [Access model](product/access-model.md) — public, signed-in, and role-gated actions
- [Roles and permissions](product/roles-and-permissions.md) — role matrix and permission behavior
- [User and system flows](product/flows.md) — end-to-end workflows
- [Dashboard guide](product/dashboard.md) — public board and role-scoped dashboard
- [Web design system](design/DESIGN.md) — `apps/web` visual and interaction guidance

The access model explains **which actions are gated**; roles and permissions
explains **which actors may perform them**. These documents cover related
questions but serve different purposes.

## Current technical references

- [Architecture overview](architecture/README.md)
- [Feature map](architecture/feature-map.md) — implementation status by feature
- [API modules](architecture/modules.md) — module responsibilities and routes
- [Data model](architecture/data-model.md) — current Prisma schema reference
- [API route catalog](api/backend-api-links.md) — current endpoint surface
- [API contracts](../packages/contracts/README.md) — canonical frontend/API contracts
- [Integrations](integrations/README.md) — provider behavior and provenance
- [Architecture decisions](decisions/README.md) — accepted and proposed ADRs
- [Operations guides](operations/) — Docker, Nginx, Terraform, and runtime references

## Plans and historical material

- [Implementation plan](planning/implementation-plan.md) — completed milestone record; consult the roadmap and current references for present state
- [Ingestion plan](planning/ingestion-plan.md) — historical provider analysis and implementation deviations
- [Initial API baseline](api/initial-api.md) — historical proposal; superseded by the current [API route catalog](api/backend-api-links.md)
- [Refactor plan](architecture/refactor-plan.md) — deferred architectural work
- [Public list UX audit](audits/public-list-ux-2026-09-02.md) and [filter audit](audits/public-list-filter-2026-09-02.md) — dated snapshots; findings need current-state verification, and the filter audit holds the more detailed requirements

Social-content planning notes are grouped under [planning/social-content](planning/social-content/)
because they are feature design artifacts. [The data/feature audit](planning/social-content/existing-data-and-feature-audit.md)
and [capability matrix](planning/social-content/capability-matrix.md) overlap in
their inventory of possible source data; both are dated assessments, while
their editorial constraints can still be useful. The [architecture proposal](planning/social-content/architecture.md)
and [implementation roadmap](planning/social-content/implementation-roadmap.md) also overlap and
predate the shipped workflow. The [Admin UX proposal](planning/social-content/admin-ux.md)
and [photocard types](planning/social-content/photocard-types.md) retain design recommendations.
These files are planning context, not current implementation status. Current
behavior is documented in the [feature map](architecture/feature-map.md),
[API module reference](architecture/modules.md),
[API route catalog](api/backend-api-links.md), and [progress log](progress.md).
