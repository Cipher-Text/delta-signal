# Access Model

Delta Signal should be useful before login. The root public site is not only a marketing page; it is a single-page public environmental board with summaries, maps, alerts, verified reports, biodiversity highlights, restoration work, and community activity. The authenticated `/dashboard` route is a separate role-scoped analytics workspace.

## Public Without Login

The root web page `/` should show a complete public overview:

- mission and platform purpose
- national/environmental dashboard metrics
- public map preview
- active public alerts
- recent verified reports
- biodiversity highlights
- restoration project highlights
- public dataset summaries
- community campaigns and education highlights
- calls to action for sign in, report submission, contribution, and advanced data access

Public users can browse and understand what is happening, but sensitive actions and deep data access are gated.

## Login Required

Authentication is required for:

- submitting citizen reports
- submitting observations
- uploading media
- saving/following locations
- subscribing to alert channels
- joining campaigns/challenges
- viewing personal profile/activity
- requesting organization membership

## Advanced Access Required

Logged-in users with the right role or approval can:

- download datasets
- access full dataset detail
- use advanced filters/export
- request API keys
- contribute datasets
- validate observations
- manage organization projects
- access researcher/government workflows

## Admin/Moderator Required

Moderator or admin access is required for:

- reviewing reports
- verifying observations
- publishing/cancelling alerts
- managing datasets
- managing organizations
- managing users and roles
- viewing audit logs

## Route Direction

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Single-page public environmental board |
| `/dashboard` | Role-gated | Analytics workspace tailored to the authenticated platform role |
| `/data` | Public preview, login for advanced/download | Dataset catalog and summaries |
| `/alerts` | Public | Active alerts and warning map |
| `/reports` | Public verified list, login to submit | Citizen reports |
| `/observations` | Public verified list, login to submit | Environmental observations |
| `/biodiversity` | Public | Species and habitat highlights |
| `/restoration` | Public | Restoration project highlights |
| `/community` | Public | Campaigns, articles, challenges |
| `/profile` | Login required | User profile and activity |
| `/contribute` | Login required | Reports, observations, datasets, media |
| `/downloads` | Login/role gated | Dataset downloads and exports |
| `apps/admin` | Moderator/admin only | Operations console |
