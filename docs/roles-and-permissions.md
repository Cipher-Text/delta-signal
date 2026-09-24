# Roles and Permissions

Delta Signal has six database roles plus `guest` (a documentation-only term for unauthenticated visitors). The permission model is DB-backed and runtime-configurable via the admin console — role grants can be changed without a code redeploy.

> **Casing:** role names are written lowercase in this document as product terms. The actual runtime values are **UPPERCASE**, matching the Prisma `UserRole` enum exactly (`CITIZEN`, `RESEARCHER`, `ORGANIZATION_ADMIN`, `GOVERNMENT`, `MODERATOR`, `ADMIN`). Always pass the uppercase form to `@Roles(...)` — a case mismatch between the guard and the enum shipped a bug that rejected every user, including admins (see `docs/progress.md` "Critical RBAC Fix"). `guest` is **not** a Prisma value; unauthenticated requests carry no role at all.

## Roles

| Role | Real-world actor |
| --- | --- |
| `guest` | Unauthenticated public visitor — no DB row, documentation only |
| `citizen` | General public, students, community members submitting reports and observations |
| `researcher` | University faculty, IUCN Bangladesh staff, BCAS researchers, independent scientists |
| `organization_admin` | NGO field officers, factory operators, restoration programme managers |
| `government` | DoE, Forest Department, BWDB, DAE, SRDI officials with regulatory or operational authority |
| `moderator` | Platform content reviewers — reports, observations, alerts, community posts |
| `admin` | Platform operators with full operational access |

## Role-by-Feature Domain Matrix

Current implemented capabilities per domain. `✓` = permitted, `—` = not permitted, `perm` = requires a named DB-backed permission, `own` = permitted for own records only.

| Feature | guest | citizen | researcher | org_admin | government | moderator | admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Reports** | | | | | | | |
| View public (VERIFIED/RESOLVED) reports | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Submit report | — | perm | perm | perm | perm | perm | ✓ |
| View own reports (`/reports/mine`) | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Moderate report status | — | — | — | — | — | perm | ✓ |
| Add comment to report | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Observations** | | | | | | | |
| View public (RESEARCH_GRADE/COMMUNITY) observations | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Submit observation | — | — | perm | perm | perm | — | ✓ |
| Verify/change trust level | — | — | perm | — | — | — | ✓ |
| Delete observation | — | — | — | — | — | perm | ✓ |
| Add measurement to observation | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Alerts** | | | | | | | |
| View active alerts | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Subscribe to alert notifications | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create / update alerts | — | — | — | — | perm | perm | ✓ |
| Cancel alert | — | — | — | — | perm | perm | ✓ |
| **Biodiversity** | | | | | | | |
| View species and occurrences | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Restoration** | | | | | | | |
| View projects | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create restoration project | — | — | — | perm | — | — | ✓ |
| Update own project | — | — | — | own | — | — | ✓ |
| Join project as participant | — | perm | perm | perm | perm | perm | ✓ |
| Log project activity / target / metric | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Community** | | | | | | | |
| View posts | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create post | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create poll (post with poll) | — | — | — | — | — | ✓ | ✓ |
| Delete own post / comment | — | own | own | own | own | own | ✓ |
| Delete any post / comment (moderation) | — | — | — | — | — | ✓ | ✓ |
| Vote on poll | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Emissions** | | | | | | | |
| View national GHG data | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Datasets** | | | | | | | |
| View public dataset summaries | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Download PUBLIC dataset | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Download LOGIN_REQUIRED dataset | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Download RESEARCHER dataset | — | — | ✓ | — | — | — | ✓ |
| Download APPROVED dataset | — | (req) | (req) | (req) | (req) | (req) | ✓ |
| Download GOVERNMENT dataset | — | — | — | — | ✓ | — | ✓ |
| Request dataset access | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Publish dataset version | — | — | — | — | — | — | ✓ |
| **Organizations** | | | | | | | |
| View organizations | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View own memberships | — | — | — | perm | — | — | ✓ |
| Full organization CRUD | — | — | — | — | — | — | perm |
| **Users & Profile** | | | | | | | |
| View and update own profile | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Change own password | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| List all users / change roles / deactivate | — | — | — | — | — | — | ✓ |
| **Analytics** | | | | | | | |
| Platform metrics (public) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Analytics dashboard (`/dashboard`) | — | empty state | researcher view | org view | government view | moderator view | admin view |
| **Ingestion / Admin** | | | | | | | |
| View ingestion job history | — | — | — | — | — | ✓ | ✓ |
| **Social Content** | | | | | | | |
| Create/edit/render/download cards | — | — | — | — | — | perm | ✓ |
| Approve cards and mark external publication | — | — | — | — | — | — | perm |
| View audit log | — | — | — | — | — | — | ✓ |
| Manage permissions matrix | — | — | — | — | — | — | ✓ |

## Implemented Role Gates

What the code enforces today (`@Roles`, `@RequirePermissions`, service-layer ownership checks):

| Endpoint | Roles / Permissions |
| --- | --- |
| `POST /alerts`, `PATCH /alerts/:id` | `GOVERNMENT`, `MODERATOR`, `ADMIN` (also requires `alerts.manage` permission) |
| `PATCH /reports/:id/status` | `MODERATOR`, `ADMIN` (also requires `reports.moderate` permission) |
| `PATCH /observations/:id/trust` | `RESEARCHER`, `ADMIN` — **not** moderator (trust is domain-expertise judgment, not content moderation) |
| `POST /restoration/projects` | `ORGANIZATION_ADMIN`, `ADMIN` (also requires `restoration.create` permission) |
| `PATCH /restoration/projects/:id` | any authenticated user at the guard; creator-or-`ADMIN` enforced inside the service |
| All `/users/*` routes | `ADMIN` (controller-level `@Roles('ADMIN')`) |
| `POST /reports`, `POST /observations`, `POST /restoration/projects/:id/join` | any authenticated user |
| `/admin/organizations*` | `organizations.manage` permission (via `PermissionsGuard`) |
| `/admin/permissions*` | `ADMIN` role |
| `/analytics/admin` | `ADMIN` role |
| `/analytics/moderator` | `MODERATOR` role — **exact match**; ADMIN cannot access this endpoint |
| `/analytics/government` | `GOVERNMENT` role |
| `/analytics/researcher` | `RESEARCHER` role |
| `POST /researcher-applications`, `GET /researcher-applications/mine` | Authenticated `CITIZEN`; application review does not grant permissions until admin approval |
| `/analytics/orgadmin` | `ORGANIZATION_ADMIN` role |
| `GET /ingestion/jobs`, `GET /ingestion/jobs/:id` | `MODERATOR`, `ADMIN` |
| `/social-content/drafts*` create/list/read | `social_content.create` |
| `/social-content/drafts/:id` edit/archive | `social_content.edit` |
| `/social-content/drafts/:id/render` | `social_content.render` |
| `/social-content/drafts/:id/approve`, `/mark-published` | `social_content.approve` |
| `/social-content/drafts/:id/download` | `social_content.download` |

Everything else public-facing uses `@Public()`. Dataset downloads and access requests are enforced via policy checks in the service layer.

## DB-Backed Permission Model

`PermissionsGuard` checks DB-backed permission grants for routes decorated with `@RequirePermissions(...)`. Results are cached per role for 5 minutes. `ADMIN` bypasses every check regardless of DB state.

Named permissions seeded on first boot (17 total):

| Permission key | Purpose | Default role holders |
| --- | --- | --- |
| `reports.create` | Submit citizen reports | CITIZEN, RESEARCHER, ORGANIZATION_ADMIN, GOVERNMENT, MODERATOR |
| `reports.moderate` | Verify, reject, and resolve citizen reports | MODERATOR |
| `alerts.manage` | Create, update, and cancel environmental alerts | GOVERNMENT, MODERATOR |
| `restoration.create` | Register restoration projects | ORGANIZATION_ADMIN |
| `restoration.join` | Join restoration projects as a participant | CITIZEN, RESEARCHER, ORGANIZATION_ADMIN, GOVERNMENT, MODERATOR |
| `observations.create` | Log wildlife and environmental observations | RESEARCHER, ORGANIZATION_ADMIN, GOVERNMENT |
| `observations.verify` | Change trust level on observations | RESEARCHER |
| `observations.delete` | Permanently delete observations | MODERATOR |
| `organizations.access` | View own organization memberships | ORGANIZATION_ADMIN |
| `organizations.manage` | Full organization CRUD in admin console | *(none — ADMIN bypasses guard)* |
| `users.manage` | Manage user roles and deactivate accounts | *(none — ADMIN bypasses guard)* |
| `social_content.create` | Create source-backed social drafts | MODERATOR |
| `social_content.edit` | Edit and archive social drafts | MODERATOR |
| `social_content.render` | Render deterministic card assets | MODERATOR |
| `social_content.approve` | Approve cards and record external publication | *(none — ADMIN only by default)* |
| `social_content.download` | Download approved cards | MODERATOR |
| `social_content.manage` | Manage future templates and rules | *(none — ADMIN bypasses guard)* |

Admins can grant or revoke any permission from any role via `POST/DELETE /admin/permissions/roles` — audited, runtime-configurable, no redeploy needed.

## Planned Permissions for Phase 7 / 8

These keys will be added to `packages/shared/src/index.ts` and the permission seed in `permissions.service.ts` before each feature is built. Agreed here so the names are stable across schema, API, and frontend.

| Permission key | Purpose | Planned default holders |
| --- | --- | --- |
| `facilities.register` | Register industrial facilities in the directory | GOVERNMENT |
| `facilities.inspect` | Log inspection records and update compliance status | GOVERNMENT |
| `forests.manage` | Create and update forest and protected area registry records | GOVERNMENT |
| `forests.verify` | Validate forest condition indicators | RESEARCHER, GOVERNMENT |
| `surveys.create` | Create structured survey campaigns | RESEARCHER, GOVERNMENT |
| `surveys.respond` | Submit survey responses | CITIZEN, RESEARCHER, ORGANIZATION_ADMIN, GOVERNMENT |
| `agricultural.manage` | Manage crop catalog, AEZ definitions, and soil reference data | GOVERNMENT |
| `datasets.publish` | Publish new dataset versions | RESEARCHER, GOVERNMENT |

These are not yet seeded. Do not add `@RequirePermissions` for them until the seed is deployed.

## Design Decisions

**Why 6 roles, not more?**
Three roles that might seem missing are deliberately absent:

- *FARMER* — A farmer submitting crop damage observations is a CITIZEN using agricultural observation categories. The form determines what can be submitted, not the role. Adding a FARMER role would require a separate signup flow for the same outcome.
- *FIELD_INSPECTOR* — A government field officer inspecting a facility is a GOVERNMENT user with `facilities.inspect` permission. Not every GOVERNMENT user needs inspection rights — grant selectively via the admin matrix, which already supports this.
- *DATA_STEWARD* — Someone managing reference datasets (forest registry, crop catalog, AEZ) without full ADMIN access. GOVERNMENT extended with `forests.manage` and `agricultural.manage` permissions covers this without a new role.

Add a new role only when a user genuinely cannot be described by any current role. The permission system handles granularity; roles should map to real organisational archetypes.

**Why ADMIN bypasses `PermissionsGuard` at the guard level?**
`ADMIN` is the platform operator role — restricting an admin via the same DB-backed grants that other roles use would allow a misconfigured grant to lock admins out of platform operations. The bypass is intentional and documented. Individual `ADMIN` actions remain audited via `AuditEvent`.

**Why does `observations.verify` belong to RESEARCHER and not MODERATOR?**
Trust-level promotion (`UNVERIFIED` → `RESEARCH_GRADE`) requires domain expertise to assess scientific validity — species identification, measurement methodology, ecological context. A moderator's role is content review (spam, harassment, accuracy of the report as a report), not scientific validation. Separating the two prevents moderators from inadvertently promoting low-quality data to research grade.

**Why does `/analytics/moderator` reject ADMIN?**
Analytics endpoints use exact role checks (`@Roles('MODERATOR')`) rather than hierarchical privilege. This is intentional: each analytics view is scoped to a specific operational context. An admin who needs moderation queue data should use the admin analytics endpoint, which aggregates across all contexts. Exact-role enforcement also prevents privilege escalation from making role-specific dashboards meaningless. The `/dashboard` visual refresh is presentation-only; it does not broaden access to analytics data. The organization-admin view is additionally scoped to organizations where the authenticated user has an `ADMIN` membership; it never returns all platform restoration projects.

**Government alert authority**
Government users hold `alerts.manage` by default, allowing them to issue public alerts directly without moderator approval. This matches Bangladesh's regulatory structure where government agencies (DoE, BWDB, Bangladesh Meteorological Department) are the authoritative sources for environmental alerts. Per-agency or per-district scoping of this permission is a future configurable option before production use.

**ORGANIZATION_ADMIN dual nature**
`ORGANIZATION_ADMIN` covers two distinct real-world actors: an NGO manager running restoration projects and an organization representative creating content on behalf of their org. Both are `ORGANIZATION_ADMIN` at the platform level and linked to their respective organizations via `OrganizationMembership`. Phase 8's industrial facility model will link facilities to organizations via org ownership.
