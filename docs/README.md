# Documentation

Use this page to find the maintained reference for each area. The progress log
records implementation history; it is not the source of truth for current
architecture or API behavior.

## Start here

- [Project brief](project-brief.md) — mission, audience, and product scope
- [Tech stack](tech-stack.md) — tools and runtime choices
- [Roadmap](roadmap.md) — current phases and planned work
- [Progress log](progress.md) — dated implementation history

## Product behavior

- [Business logic](business-logic.md) — domain rules and rationale
- [Access model](access-model.md) — public, signed-in, and role-gated actions
- [Roles and permissions](roles-and-permissions.md) — role matrix and permission behavior
- [User and system flows](flows.md) — end-to-end workflows
- [Dashboard guide](dashboard.md) — public board and role-scoped dashboard
- [Web design system](DESIGN.md) — `apps/web` visual and interaction guidance

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

## Plans and historical material

- [Implementation plan](implementation-plan.md) — completed milestone record; consult the roadmap and current references for present state
- [Initial API baseline](api/initial-api.md) — historical proposal; superseded by the current [API route catalog](api/backend-api-links.md)
- [Refactor plan](architecture/refactor-plan.md) — deferred architectural work
- [Public list UX audit](PUBLIC_LIST_UX_AUDIT.md) and [filter audit](PUBLIC_LIST_FILTER_AUDIT.md) — dated 2026-09-02 snapshots; findings need current-state verification, and the filter audit holds the more detailed requirements

Social-content planning notes live at the repository root because they are
feature design artifacts. [The data/feature audit](../EXISTING_DATA_AND_FEATURE_AUDIT.md)
and [capability matrix](../SOCIAL_CONTENT_CAPABILITY_MATRIX.md) overlap in
their inventory of possible source data; both are dated assessments, while
their editorial constraints can still be useful. The [architecture proposal](../SOCIAL_CONTENT_ARCHITECTURE.md)
and [implementation roadmap](../IMPLEMENTATION_ROADMAP.md) also overlap and
predate the shipped workflow. The [Admin UX proposal](../SOCIAL_CONTENT_ADMIN_UX.md)
and [photocard types](../PHOTOCARD_TYPES.md) retain design recommendations.
These files are planning context, not current implementation status. Current
behavior is documented in the [feature map](architecture/feature-map.md),
[API module reference](architecture/modules.md),
[API route catalog](api/backend-api-links.md), and [progress log](progress.md).
