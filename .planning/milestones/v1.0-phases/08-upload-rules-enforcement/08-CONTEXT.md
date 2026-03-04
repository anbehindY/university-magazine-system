# Phase 8: Upload Rules Enforcement - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the 4 realistic admin-configured upload rules (`enable_uploads`, `max_upload_size_mb`, `max_files_per_upload`, `allowed_file_types`) from `ConfigSetting` into the student upload flow. Both the API and the student UI must enforce and reflect these rules. The admin UI and settings storage already exist — this phase enforces them.

</domain>

<decisions>
## Implementation Decisions

### Settings that will be enforced
- `enable_uploads` (boolean) — global upload on/off toggle
- `max_upload_size_mb` (integer) — per-file size limit
- `max_files_per_upload` (integer) — total files per submission
- `allowed_file_types` (string, comma-separated) — accepted file extensions (e.g. "DOC,DOCX")
- `virus_scanning`, `require_auth`, `auto_delete` — NOT enforced (UI-only decorations; virus scanning requires 3rd party integration out of scope)

### Rules endpoint
- New public GET `/api/config/upload-rules` — no authentication required, returns read-only current upload config
- Student submissions page fetches this on load via SWR (same pattern as existing data fetching)
- Server-side upload handler (`/api/submissions/upload`) reads `ConfigSetting` from DB on each request to validate

### Disabled state presentation
- When `enable_uploads = false`: amber `Alert` banner displayed above the upload area with a plain message ("File uploads are currently disabled by the administrator.")
- Upload button is **disabled but visible** — not hidden (hiding causes confusion, students assume breakage)
- Industry standard: always tell users WHY something is unavailable

### Rule violation feedback
- Client pre-validates before upload starts:
  - File picker `accept` attribute reflects configured `allowed_file_types`
  - Size checked before Vercel Blob upload begins
  - Count checked before allowing file addition
- On violation: `toast.error()` with a specific reason (e.g. "Only .doc and .docx files are allowed" / "File exceeds the 10MB limit" / "Maximum 5 files per submission")
- Server is the authoritative enforcement gate — returns `400` with descriptive error message if client validation is bypassed
- Server returns `403` if `enable_uploads = false`

### Rule visibility (upfront display)
- Inline hint text displayed below the upload dropzone, always visible
- Format: "Accepted: .doc, .docx · Max 10MB · Up to 5 files"
- Derived from the fetched config so it stays in sync with admin settings
- Students see constraints before picking files — no surprises

### Claude's Discretion
- Exact loading/skeleton state while upload rules are being fetched
- Whether to show the hint text during loading or wait for rules to load
- Error state if `/api/config/upload-rules` fetch fails (sensible fallback: use hardcoded defaults or disable upload until config loads)
- Caching strategy for the config (SWR default dedupe interval is fine)

</decisions>

<specifics>
## Specific Ideas

- The existing `/api/submissions/upload/route.ts` currently hardcodes `ALLOWED_CONTENT_TYPES` — this must be replaced with dynamic config lookup
- The admin upload rules page is at `/admin/upload-rules` — already saves to `ConfigSetting` via `/api/admin/upload-rules`
- The student submissions page is at `app/(student)/submissions/page.tsx` — this is where the upload UI lives and where the SWR fetch and UI changes go

</specifics>

<deferred>
## Deferred Ideas

- Virus scanning — requires ClamAV or VirusTotal integration, own phase if ever prioritised
- `require_auth` enforcement — already handled by auth middleware, no action needed
- `auto_delete` — Vercel Blob manages storage, no temp file concept in current architecture

</deferred>

---

*Phase: 08-upload-rules-enforcement*
*Context gathered: 2026-03-03*
