# Project memory

## Product intent & audience

- Internal admin tooling for a Supabase-backed application (appears to be a client/app-form management system with profiles, clients, forms, images, notifications, and admin activity logging).
- Includes temporary one-off admin utilities (e.g. full DB snapshot export) intended to be removed after use.

## Brand personality & voice

- Responses in Brazilian Portuguese.
- Tone is direct, security-conscious, and pragmatic; ends with reminders to clean up privileged/temp tooling.

## Visual design & UX direction

- Admin dashboard has a top header/nav with a notification bell and action buttons (e.g. "Novo Admin"); new admin features are added as buttons/links there.
- Admin pages use a simple generate-then-download flow with per-table record counts and a download button.
- Routes are admin-gated; privileged operations run on the backend, never exposing service role keys to the browser.

## Decisions, constraints & rationale

- Backend: Supabase with Edge Functions (`supabase/functions/...`) and `supabase/config.toml` per-function config entries.
- Snapshot export reads all rows (ignoring RLS) via a deployed edge function that first verifies the caller is a logged-in admin, then uses the service role key server-side; the browser only receives finished JSON.
- Exported JSON uses exact DB column names (snake_case, no conversion) and a fixed top-level object shape keyed by table name.
- Tables in scope: `profiles`, `clients`, `app_forms`, `form_images`, `notifications`, `client_notifications`, `admin_activity_logs`, `admin_notifications`.
- Temporary export route lives at `/admin/export-snapshot` via `src/components/ExportSnapshot.tsx` + route in `src/App.tsx`; to remove: delete the component, route, edge function, and `config.toml` entry.
- Stack: Vite + React.

## Open questions & assumptions

- Assumes admin auth/role check is available and reusable inside edge functions.
- Assumes the listed eight tables are the complete set relevant to a "full" snapshot.
- Snapshot export is expected to be removed after the admin downloads the file (pending confirmation/execution).