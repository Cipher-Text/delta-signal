# User and System Flows

## Public Discovery Flow

```text
Visitor opens /
  -> sees mission and platform purpose
  -> scans public metrics, map preview, active alerts, verified reports
  -> reviews dataset summaries, biodiversity/restoration/community highlights
  -> chooses a next action:
       - keep browsing public pages
       - sign in to contribute
       - sign in/request access for downloads and advanced datasets
```

## Advanced Dataset Access Flow

```text
Visitor opens public data preview
  -> sees summary charts and catalog metadata
  -> clicks advanced filters, download, export, or API access
  -> system asks for login
  -> role/access policy is checked
  -> approved user can download/export/contribute
  -> denied user can request access or organization/researcher verification
```

## Citizen Report Flow

```text
Visitor opens public Reports
  -> sees verified public reports
  -> clicks Submit Report
  -> system asks for login
  -> citizen opens report form
  -> selects report type
  -> enters description and location
  -> optionally uploads media
  -> submits report
  -> report status becomes submitted
  -> moderator reviews
  -> report becomes verified, rejected, or resolved
  -> verified/resolved records appear in public analytics
```

## Observation Flow

```text
Visitor opens public Observations
  -> sees RESEARCH_GRADE and COMMUNITY observations (FLAGGED hidden by default)
  -> clicks Add Observation
  -> system asks for login
  -> user adds observation type, location, date, and evidence
  -> system stores observation as UNVERIFIED
  -> researcher or admin validates (PATCH /observations/:id/trust)
  -> observation trust level updated to COMMUNITY or RESEARCH_GRADE (audit event written)
  -> observation contributes to maps, biodiversity records, or datasets
```

## Dataset Ingestion Flow

```text
Cron scheduler fires (weather every 15min/2h/12h; GBIF and flood daily/6h)
  -> IngestionService.startJob() creates IngestionJob with RUNNING status
  -> provider HTTP client fetches data (3-attempt retry with fixed backoff)
  -> records upserted into typed tables (no raw JSON stored)
  -> IngestionService.completeJob() marks SUCCEEDED, updates Dataset.lastSyncedAt
  -> on outer failure: IngestionService.failJob() marks FAILED with error message
  -> admin can view job history at GET /ingestion/jobs
```

No job queue or manual trigger exists — scheduled crons serve as periodic retry. `QUEUED` and `CANCELLED` statuses are defined in the schema but not yet written by any code.

## Alert Publishing Flow

```text
Government/moderator/admin creates draft alert
  -> selects type, severity, affected location/zone, source, validity window
  -> reviewer checks message and geography
  -> alert status active
  -> public web displays alert
  -> notification rules run
  -> alert expires or is cancelled
```

## Admin Moderation Flow

```text
Moderator opens admin queue
  -> filters by type, severity, age, location, or assignee
  -> opens item detail
  -> reviews metadata, map, media, and history
  -> updates status and notes
  -> system writes audit entry
```

## Data Worker Flow

```text
API creates ingestion/processing job
  -> queue dispatches work (BullMQ is now wired for email and gamification; Python data-worker jobs remain unqueued)
  -> Python worker receives job or polls job table
  -> worker reads source data
  -> worker performs GIS/scientific processing
  -> worker writes outputs or artifacts
  -> API exposes results through datasets/alerts/observations
```

## Google OAuth Sign-in Flow

```text
User clicks "Continue with Google" on /login or /register
  -> browser navigates to Next.js /auth/google (Route Handler)
  -> Next.js Route Handler redirects to API GET /api/v1/auth/google
  -> Passport intercepts, redirects browser to Google's consent screen
  -> user approves, Google redirects to API GET /api/v1/auth/google/callback
  -> Passport validates profile; AuthService.handleGoogleUser():
       - finds user by googleId       → link and return
       - no match, finds by email     → auto-link account (sets googleId + GOOGLE provider)
       - no match at all              → create new user (isEmailVerified: true, passwordHash: null)
  -> AuthService.createExchangeCode() issues a 30-second single-use opaque code
  -> API redirects browser to APP_URL/auth/callback?code=<code>
  -> Next.js Route Handler POSTs code to POST /api/v1/auth/exchange (server-side)
  -> API redeems code, issues access + refresh tokens
  -> Route Handler sets httpOnly cookies, redirects to /reports
```

Why the exchange code? The OAuth callback lands on the NestJS API (port 3001). Setting
httpOnly cookies on the Next.js origin (port 3000) from a server-side redirect requires an
intermediary step — the 30-second exchange code is that bridge. It never travels to the client
as a cookie or localStorage value.

Google users have `authProvider = GOOGLE` and `passwordHash = null`. They cannot use the
`POST /auth/login` (email/password) endpoint. Password reset, change-password, and
forgot-password endpoints all reject `GOOGLE` provider accounts.

## Frontend Integration Flow

```text
API route is designed
  -> contract schema is added in packages/contracts
  -> backend implements controller/service
  -> web/admin apps consume typed contract
  -> mock data is removed from the UI module
```
