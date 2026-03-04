# Phase 8: Upload Rules Enforcement - Research

**Researched:** 2026-03-03
**Domain:** Next.js API route validation + Vercel Blob `handleUpload` + SWR + React UI state
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Settings that will be enforced:**
- `enable_uploads` (boolean) — global upload on/off toggle
- `max_upload_size_mb` (integer) — per-file size limit
- `max_files_per_upload` (integer) — total files per submission
- `allowed_file_types` (string, comma-separated) — accepted file extensions (e.g. "DOC,DOCX")
- `virus_scanning`, `require_auth`, `auto_delete` — NOT enforced (UI-only decorations; virus scanning requires 3rd party integration out of scope)

**Rules endpoint:**
- New public GET `/api/config/upload-rules` — no authentication required, returns read-only current upload config
- Student submissions page fetches this on load via SWR (same pattern as existing data fetching)
- Server-side upload handler (`/api/submissions/upload`) reads `ConfigSetting` from DB on each request to validate

**Disabled state presentation:**
- When `enable_uploads = false`: amber `Alert` banner displayed above the upload area with a plain message ("File uploads are currently disabled by the administrator.")
- Upload button is **disabled but visible** — not hidden
- Industry standard: always tell users WHY something is unavailable

**Rule violation feedback:**
- Client pre-validates before upload starts:
  - File picker `accept` attribute reflects configured `allowed_file_types`
  - Size checked before Vercel Blob upload begins
  - Count checked before allowing file addition
- On violation: `toast.error()` with a specific reason
- Server is the authoritative enforcement gate — returns `400` with descriptive error message if client validation is bypassed
- Server returns `403` if `enable_uploads = false`

**Rule visibility (upfront display):**
- Inline hint text displayed below the upload dropzone, always visible
- Format: "Accepted: .doc, .docx · Max 10MB · Up to 5 files"
- Derived from the fetched config so it stays in sync with admin settings
- Students see constraints before picking files — no surprises

### Claude's Discretion

- Exact loading/skeleton state while upload rules are being fetched
- Whether to show the hint text during loading or wait for rules to load
- Error state if `/api/config/upload-rules` fetch fails (sensible fallback: use hardcoded defaults or disable upload until config loads)
- Caching strategy for the config (SWR default dedupe interval is fine)

### Deferred Ideas (OUT OF SCOPE)

- Virus scanning — requires ClamAV or VirusTotal integration, own phase if ever prioritised
- `require_auth` enforcement — already handled by auth middleware, no action needed
- `auto_delete` — Vercel Blob manages storage, no temp file concept in current architecture
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UPLOAD-01 | When `enable_uploads` is `false` in ConfigSetting, the upload API rejects file uploads with 403 and the student UI disables the upload control | New public `/api/config/upload-rules` endpoint + `enable_uploads` check in `onBeforeGenerateToken` + UI Alert + disabled state |
| UPLOAD-02 | Uploaded files are validated against the admin-configured `allowed_file_types`, `max_upload_size_mb`, and `max_files_per_upload` at the API level — rejections return 400 with a descriptive message | `allowedContentTypes` and `maximumSizeInBytes` in `onBeforeGenerateToken` return + file count check against DB + extension-to-MIME mapping |
| UPLOAD-03 | The student upload UI reflects admin-configured limits (accepted file types, max size, max file count) instead of hardcoded values | SWR fetch of `/api/config/upload-rules` on page load + dynamic `accept` attribute + hint text + client-side pre-validation |
</phase_requirements>

---

## Summary

Phase 8 wires four admin-configured upload rules into the actual student upload flow. Currently, `/api/submissions/upload/route.ts` hardcodes `ALLOWED_CONTENT_TYPES` and ignores `ConfigSetting` entirely. The student page hardcodes `.doc,.docx,image/*` in the `accept` attribute and `isAcceptedFile()` helper.

The architecture has two enforcement layers: a new public `/api/config/upload-rules` endpoint (no auth required) that the student UI fetches via SWR on load, and the existing `/api/submissions/upload` handler which must read `ConfigSetting` from the DB in `onBeforeGenerateToken` before issuing a Vercel Blob client token. The Vercel Blob SDK's `onBeforeGenerateToken` return type natively supports `allowedContentTypes` (MIME types) and `maximumSizeInBytes` — both are real, typed parameters verified in the installed `@vercel/blob@1.1.1` package. File count (`max_files_per_upload`) cannot be enforced by the Blob SDK; it must be checked by querying existing `SubmissionFile` records from the DB before issuing the token.

The critical conversion challenge: `allowed_file_types` stores uppercase extensions (e.g. `"DOC,DOCX,PNG,JPG"`) while `allowedContentTypes` requires MIME types. A lookup map must be defined in the upload route. The UI `accept` attribute needs lowercase dot-prefixed extensions (`.doc,.docx`). Both conversions are straightforward with a map.

**Primary recommendation:** Two tasks — (1) create `/api/config/upload-rules` + update `/api/submissions/upload` with config-aware validation, (2) update the student submissions page to fetch rules via SWR, show the disabled Alert, update the `accept` attribute, add hint text, and add client pre-validation.

---

## Standard Stack

### Core (already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@vercel/blob` | 1.1.1 | Blob client token generation with `allowedContentTypes` + `maximumSizeInBytes` constraints | Already used; native SDK enforcement |
| `swr` | 2.4.0 | Fetch and cache `/api/config/upload-rules` on page load | Already used for comments (same pattern) |
| `prisma` | 7.3.0 | Read `ConfigSetting` from DB in upload route | Already used throughout |
| `sonner` | 2.0.7 | `toast.error()` for client-side rule violation messages | Already used throughout |
| shadcn `Alert` | (installed) | Amber banner when uploads are disabled | Already used for closure alert in student page |

**No new npm packages required for this phase.**

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn `Badge` | (installed) | Display allowed file type tags in hint area | Optional — for visual type display |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SWR for config fetch | plain `useEffect` + `fetch` | SWR gives deduplication and caching for free; consistent with comment thread pattern already in student page |
| `onBeforeGenerateToken` throw for 403 | Separate pre-check endpoint | Single-responsibility; the upload route is already the auth gate — adding config check there is correct |

**Installation:** None required.

---

## Architecture Patterns

### Recommended Project Structure (new/modified files)

```
app/
├── api/
│   ├── config/
│   │   └── upload-rules/
│   │       └── route.ts          # NEW: public GET — returns 4 enforced config values
│   └── submissions/
│       └── upload/
│           └── route.ts          # MODIFIED: onBeforeGenerateToken reads ConfigSetting
│
└── (student)/
    └── submissions/
        └── page.tsx              # MODIFIED: SWR config fetch, Alert, accept attr, hint text, pre-validation
```

### Pattern 1: Public Config Endpoint

**What:** A GET route with no session check that returns only the 4 enforcement-relevant values. Admin-only keys like `virus_scanning` are excluded.

**When to use:** Config data that non-authenticated actors need to see (students see the rules before submitting). Following the least-privilege principle, the endpoint only exposes what students need.

**Example:**
```typescript
// app/api/config/upload-rules/route.ts
// Source: pattern from app/api/admin/upload-rules/route.ts (adapted for public access)
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const ENFORCED_KEYS = [
  "enable_uploads",
  "max_upload_size_mb",
  "max_files_per_upload",
  "allowed_file_types",
] as const;

export async function GET() {
  try {
    const settings = await prisma.configSetting.findMany({
      where: { key: { in: ENFORCED_KEYS.slice() } },
      select: { key: true, value: true },
    });

    const mapped = settings.reduce<Record<string, string>>((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});

    return NextResponse.json({
      enableUploads: mapped.enable_uploads !== "false",
      maxUploadSizeMb: Number(mapped.max_upload_size_mb) || 25,
      maxFilesPerUpload: Number(mapped.max_files_per_upload) || 10,
      allowedFileTypes: mapped.allowed_file_types
        ? mapped.allowed_file_types.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean)
        : ["DOC", "DOCX"],
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load upload rules" },
      { status: 500 }
    );
  }
}
```

Key design choices:
- Returns parsed/typed values (booleans, numbers, arrays) not raw strings
- Provides sensible defaults when ConfigSetting rows are absent
- `enable_uploads !== "false"` means missing row defaults to enabled (safe)

### Pattern 2: Extension-to-MIME Map in Upload Route

**What:** The upload route must convert `allowed_file_types` extensions to MIME types for `allowedContentTypes` and to dot-prefixed extensions for the client `accept` attribute.

**When to use:** Inside `onBeforeGenerateToken` in `/api/submissions/upload/route.ts`.

**Example:**
```typescript
// Source: verified against existing ALLOWED_CONTENT_TYPES in upload route
const EXT_TO_MIME: Record<string, string[]> = {
  DOC:  ["application/msword"],
  DOCX: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  PNG:  ["image/png"],
  JPG:  ["image/jpeg"],
  JPEG: ["image/jpeg"],
  GIF:  ["image/gif"],
  SVG:  ["image/svg+xml"],
  WEBP: ["image/webp"],
};

// Wildcard shorthand for "all images":
// If the allowed types include any image ext, also include "image/*" as fallback
function extToMimeTypes(exts: string[]): string[] {
  const mimes = new Set<string>();
  for (const ext of exts) {
    const mapped = EXT_TO_MIME[ext.toUpperCase()];
    if (mapped) mapped.forEach((m) => mimes.add(m));
  }
  return Array.from(mimes);
}
```

Note: `image/*` wildcard IS supported by Vercel Blob's `allowedContentTypes` (per SDK types). Using explicit MIME types rather than `image/*` is stricter and more correct — the admin controls which image types are allowed.

### Pattern 3: Config-Aware onBeforeGenerateToken

**What:** Read `ConfigSetting` from the DB in `onBeforeGenerateToken`, enforce `enable_uploads`, `allowed_file_types`, `max_upload_size_mb`, and `max_files_per_upload` before issuing a Blob token.

**When to use:** Every upload — the server is the authoritative gate.

**Example:**
```typescript
// Source: Vercel Blob SDK types (verified in node_modules/@vercel/blob/dist/client.d.ts)
onBeforeGenerateToken: async (pathname, clientPayload) => {
  // 1. Parse submissionId from payload (existing pattern)
  const parsedPayload = typeof clientPayload === "string"
    ? (JSON.parse(clientPayload) as { submissionId?: string })
    : (clientPayload as { submissionId?: string } | null);
  const submissionId = parsedPayload?.submissionId;

  // 2. Load config (parallel with other checks)
  const [config, closure, submission] = await Promise.all([
    getUploadConfig(),                          // reads ConfigSetting
    isPastFinalClosure(),                       // existing check
    submissionId
      ? prisma.submission.findFirst({
          where: { id: submissionId, userId: session.user.id },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  // 3. enable_uploads gate → throws, handleUpload catches → 400
  if (!config.enableUploads) {
    throw new Error("File uploads are currently disabled.");
  }

  // 4. Closure gate (existing)
  if (closure) {
    throw new Error("Submissions are locked. The final closure date has passed.");
  }

  // 5. File count gate
  const existingCount = await prisma.submissionFile.count({
    where: { submissionId: submissionId ?? "" },
  });
  if (existingCount >= config.maxFilesPerUpload) {
    throw new Error(
      `Maximum ${config.maxFilesPerUpload} files per submission allowed.`
    );
  }

  // 6. Return token constraints
  return {
    allowedContentTypes: extToMimeTypes(config.allowedFileTypes),
    maximumSizeInBytes: config.maxUploadSizeMb * 1024 * 1024,
    addRandomSuffix: true,
    tokenPayload: JSON.stringify({ userId: session.user.id, submissionId }),
  };
},
```

Note: `handleUpload` wraps thrown errors and returns a 400 response — the `enable_uploads` check cannot return a 403 directly from inside `onBeforeGenerateToken`. The outer `try/catch` in the existing route always returns `{ status: 400 }`. The 403 for `enable_uploads` must be returned from a separate early-return check at the top of the POST handler, before calling `handleUpload`.

### Pattern 4: SWR Config Fetch in Student Page

**What:** Fetch `/api/config/upload-rules` via SWR on page load, use the result to drive upload UI state.

**When to use:** In `StudentSubmissionsPage`, alongside the existing comment SWR hook.

**Example:**
```typescript
// Source: pattern from existing useSWR for comments in student page
type UploadConfig = {
  enableUploads: boolean;
  maxUploadSizeMb: number;
  maxFilesPerUpload: number;
  allowedFileTypes: string[];   // e.g. ["DOC", "DOCX", "PNG"]
};

const { data: uploadConfig, isLoading: configLoading } = useSWR<UploadConfig>(
  "/api/config/upload-rules",
  fetcher
);

// Derived values for UI
const uploadsEnabled = uploadConfig?.enableUploads ?? true;       // default open
const maxSizeMb = uploadConfig?.maxUploadSizeMb ?? 25;
const maxFiles = uploadConfig?.maxFilesPerUpload ?? 10;
const allowedExts = uploadConfig?.allowedFileTypes ?? ["DOC", "DOCX"];

// accept attribute: ".doc,.docx,.png,.jpg" (lowercase, dot-prefixed)
const acceptAttr = allowedExts
  .map((ext) => `.${ext.toLowerCase()}`)
  .join(",");
```

### Pattern 5: Client-Side Pre-Validation

**What:** Validate file type, file size, and file count client-side before the Blob upload starts, with `toast.error()` on violation.

**When to use:** In `onFilesChange`, `onDropFiles`, and `onSubmit` — replace the hardcoded `isAcceptedFile()` helper.

**Example:**
```typescript
// Source: pattern from existing onSubmit + isAcceptedFile in student page
function validateFiles(
  newFiles: File[],
  existing: number,
  config: UploadConfig
): string | null {
  const totalCount = existing + newFiles.length;
  if (totalCount > config.maxFilesPerUpload) {
    return `Maximum ${config.maxFilesPerUpload} files per submission.`;
  }
  for (const file of newFiles) {
    if (file.size > config.maxUploadSizeMb * 1024 * 1024) {
      return `"${file.name}" exceeds the ${config.maxUploadSizeMb}MB limit.`;
    }
    if (!isFileTypeAllowed(file, config.allowedFileTypes)) {
      const extList = config.allowedFileTypes.map((e) => `.${e.toLowerCase()}`).join(", ");
      return `Only ${extList} files are allowed.`;
    }
  }
  return null;
}
```

### Pattern 6: Disabled Upload UI

**What:** When `enableUploads = false`, show an amber Alert above the dropzone and disable the upload input + submit button.

**When to use:** Whenever `uploadConfig?.enableUploads === false`.

**Example:**
```tsx
// Source: pattern from existing amber closure Alert in student page
{!uploadsEnabled && (
  <Alert className="border-amber-200 bg-amber-50 text-amber-900">
    <Info className="h-4 w-4" />
    <AlertTitle>Uploads disabled</AlertTitle>
    <AlertDescription className="text-amber-800">
      File uploads are currently disabled by the administrator.
    </AlertDescription>
  </Alert>
)}

{/* Hint text below dropzone */}
<p className="text-xs text-slate-500">
  {uploadConfig
    ? `Accepted: ${allowedExts.map((e) => `.${e.toLowerCase()}`).join(", ")} · Max ${maxSizeMb}MB · Up to ${maxFiles} files`
    : "Loading upload rules..."}
</p>
```

### Anti-Patterns to Avoid

- **Checking `enable_uploads` only in `onBeforeGenerateToken`:** The throw inside `onBeforeGenerateToken` always produces a 400, not a 403. The 403 for disabled uploads must be a separate early return at the top of the POST handler.
- **Using wildcard `image/*` in `allowedContentTypes` when specific image types are configured:** Defeats the purpose of admin control. Map extensions to specific MIME types.
- **Checking file count only client-side:** Client can be bypassed. Must count existing `SubmissionFile` rows for the submission in `onBeforeGenerateToken`.
- **Not providing defaults when ConfigSetting rows are missing:** The admin may never have saved upload rules. Default to permissive-but-sensible values (enabled, 25MB, 10 files, DOC+DOCX) so uploads don't break in a fresh install.
- **Storing the enable_uploads 403 check logic in `onBeforeGenerateToken`:** The outer catch always returns 400. The 403 must come from the outer POST handler.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File size enforcement at Blob layer | Custom pre-signed URL validation | `maximumSizeInBytes` in `onBeforeGenerateToken` return | SDK enforces at token generation — Vercel Blob rejects oversized uploads before they land |
| File type enforcement at Blob layer | Filename extension parsing | `allowedContentTypes` in `onBeforeGenerateToken` return | SDK enforces at token generation — validated against MIME type |
| Config caching | Custom TTL cache | SWR default deduplication (1 minute) | SWR dedupes concurrent requests and re-fetches on focus — correct behavior for config |
| MIME type detection | Reading file headers/magic bytes | Extension lookup map + browser MIME type | Sufficient for the admin's intent; browser provides MIME type for File objects |

**Key insight:** The Vercel Blob SDK `onBeforeGenerateToken` is the server-authoritative enforcement point for type and size. File count (not supported by SDK) must be enforced by a DB query in the same callback. The pattern is: throw an Error for any violation — `handleUpload` converts throws to 400 responses.

---

## Common Pitfalls

### Pitfall 1: 403 vs 400 Response Code for Disabled Uploads

**What goes wrong:** The user expects UPLOAD-01 to return 403 for disabled uploads, but `onBeforeGenerateToken` throws always produce a 400 (the outer try/catch in the POST handler catches it).

**Why it happens:** The `handleUpload` function from `@vercel/blob/client` wraps `onBeforeGenerateToken` in its own error handling and returns a JSON 400 for any thrown Error. There's no way to return a 403 from inside the callback.

**How to avoid:** Add an early return at the top of the POST handler, BEFORE calling `handleUpload`, that checks `enable_uploads` and returns 403:
```typescript
// Check before handleUpload, not inside onBeforeGenerateToken
const config = await getUploadConfig();
if (!config.enableUploads) {
  return NextResponse.json(
    { error: "File uploads are currently disabled by the administrator." },
    { status: 403 }
  );
}
```
The `onBeforeGenerateToken` still gets the enable_uploads check for defense in depth.

**Warning signs:** Test expects 403 but gets 400 for disabled uploads.

### Pitfall 2: Missing ConfigSetting Rows

**What goes wrong:** If the admin has never visited the upload rules page and saved, `ConfigSetting` has no rows for these keys. `prisma.configSetting.findMany()` returns an empty array. The mapped object has no keys. `Number(undefined)` is `NaN`. The upload route throws on `NaN * 1024 * 1024`.

**Why it happens:** The DB starts empty. ConfigSetting is only populated when the admin saves the form.

**How to avoid:** Always provide defaults in the config loader:
```typescript
maxUploadSizeMb: Number(mapped.max_upload_size_mb) || 25,
maxFilesPerUpload: Number(mapped.max_files_per_upload) || 10,
enableUploads: mapped.enable_uploads !== "false",  // absent = enabled
allowedFileTypes: mapped.allowed_file_types
  ? mapped.allowed_file_types.split(",").map(s => s.trim().toUpperCase()).filter(Boolean)
  : ["DOC", "DOCX"],
```

**Warning signs:** NaN in `maximumSizeInBytes`, empty `allowedContentTypes` array blocking all uploads.

### Pitfall 3: Extension Format Mismatch

**What goes wrong:** Admin stores `"DOC,DOCX"` (uppercase, no dots). The `accept` attribute needs `".doc,.docx"` (lowercase, dot-prefixed). The `allowedContentTypes` needs full MIME types. Three different formats from one source value.

**Why it happens:** Different systems have different conventions.

**How to avoid:** Centralize the conversion. The public API endpoint should return the raw uppercase array (canonical form). All consumers transform as needed:
- Accept attribute: `ext => .${ext.toLowerCase()}`
- MIME types: `ext => EXT_TO_MIME[ext]` (lookup map)
- Hint text: `ext => .${ext.toLowerCase()}`

**Warning signs:** File picker accepts all files (missing `accept` attr), or Blob tokens reject valid files (wrong MIME mapping).

### Pitfall 4: File Count Race Condition

**What goes wrong:** Two parallel uploads for the same submission both check `submissionFile.count` before either creates records. Both see count = 3, both think they're within the limit of 5. But together they add 4 files, bringing the total to 7.

**Why it happens:** The check and insert are not atomic.

**How to avoid:** This is acceptable for this use case — the admin-configured `max_files_per_upload` is a soft limit to prevent abuse, not a hard transactional constraint. The client pre-validates count before starting uploads. The server check catches most cases. Document this as a known limitation; a full solution would require a DB-level constraint or advisory lock which is out of scope.

**Warning signs:** Not a bug to fix — acknowledge as acceptable behavior.

### Pitfall 5: SWR Fetch Before Config Loads — Upload Button State

**What goes wrong:** The upload button is enabled before `uploadConfig` resolves. Student picks files immediately and submits before the rules check completes. Client validation skips because `uploadConfig` is undefined.

**Why it happens:** SWR returns `undefined` until the first fetch completes.

**How to avoid:** While `configLoading` is true, use safe defaults that don't block the student. Accept attribute can show broad defaults. If the config fetch fails, fall back to permissive defaults rather than blocking. The server is the authoritative gate — a missed client pre-validation is caught server-side.

**Warning signs:** Upload fails with confusing server error when config endpoint returns 500.

### Pitfall 6: The `handleUpload` Request Body Shape

**What goes wrong:** The `enable_uploads` early-return check reads `ConfigSetting` from DB, then `onBeforeGenerateToken` reads it again for the token constraints. Two DB queries on every upload.

**Why it happens:** The early return is in the POST handler; the token constraints are in the callback.

**How to avoid:** Extract a shared `getUploadConfig()` helper that queries once. Pass the result as a closure variable into `onBeforeGenerateToken`:
```typescript
const config = await getUploadConfig();
if (!config.enableUploads) { return 403; }

const response = await handleUpload({
  // ...
  onBeforeGenerateToken: async (pathname, clientPayload) => {
    // config is already loaded — no second DB query
    return {
      allowedContentTypes: extToMimeTypes(config.allowedFileTypes),
      maximumSizeInBytes: config.maxUploadSizeMb * 1024 * 1024,
      // ...
    };
  },
});
```

---

## Code Examples

Verified patterns from official sources and installed package types:

### Vercel Blob onBeforeGenerateToken Return Type (verified from installed package)

```typescript
// Source: /home/alfie/next-prisma/node_modules/@vercel/blob/dist/client.d.ts line 300
// onBeforeGenerateToken must return:
Pick<GenerateClientTokenOptions,
  'allowedContentTypes'    // string[] — MIME types, wildcards supported (image/*)
  | 'maximumSizeInBytes'   // number — bytes (e.g. 10 * 1024 * 1024 for 10MB)
  | 'validUntil'           // number — ms timestamp for token expiry
  | 'addRandomSuffix'      // boolean
  | 'allowOverwrite'       // boolean
  | 'cacheControlMaxAge'   // number
> & { tokenPayload?: string | null }
```

### Reading ConfigSetting from DB (Prisma pattern)

```typescript
// Source: pattern from lib/closure-guard.ts and app/api/admin/upload-rules/route.ts
type UploadConfig = {
  enableUploads: boolean;
  maxUploadSizeMb: number;
  maxFilesPerUpload: number;
  allowedFileTypes: string[];
};

async function getUploadConfig(): Promise<UploadConfig> {
  const rows = await prisma.configSetting.findMany({
    where: {
      key: { in: ["enable_uploads", "max_upload_size_mb", "max_files_per_upload", "allowed_file_types"] },
    },
    select: { key: true, value: true },
  });

  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  return {
    enableUploads: m.enable_uploads !== "false",
    maxUploadSizeMb: Number(m.max_upload_size_mb) || 25,
    maxFilesPerUpload: Number(m.max_files_per_upload) || 10,
    allowedFileTypes: m.allowed_file_types
      ? m.allowed_file_types.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean)
      : ["DOC", "DOCX"],
  };
}
```

### SWR Fetch Pattern (from existing student page)

```typescript
// Source: existing useSWR pattern in app/(student)/submissions/page.tsx line 171-176
const { data: uploadConfig } = useSWR<UploadConfig>(
  "/api/config/upload-rules",
  fetcher  // const fetcher = (url: string) => fetch(url).then((r) => r.json())
);
```

### Current Hardcoded State to Replace

```typescript
// Source: app/(student)/submissions/page.tsx lines 41-51 — MUST BE REPLACED
const ACCEPTED_MIME_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function isAcceptedFile(file: File) {
  if (file.type.startsWith("image/")) return true;
  if (ACCEPTED_MIME_TYPES.has(file.type)) return true;
  const lowerName = file.name.toLowerCase();
  return lowerName.endsWith(".doc") || lowerName.endsWith(".docx");
}

// Source: app/(student)/submissions/page.tsx line 818 — accept attr MUST BE DYNAMIC
// <Input accept=".doc,.docx,image/*" ... />   ← becomes: accept={acceptAttr}
```

```typescript
// Source: app/api/submissions/upload/route.ts lines 8-12 — MUST BE REMOVED
const ALLOWED_CONTENT_TYPES = [   // ← DELETE this constant
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/*",
];
// Line 62: allowedContentTypes: ALLOWED_CONTENT_TYPES  ← becomes dynamic
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded `ALLOWED_CONTENT_TYPES` array in upload route | Dynamic from `ConfigSetting` | This phase | Admin changes take effect immediately |
| Hardcoded `isAcceptedFile()` in student page | Config-driven `validateFiles()` | This phase | File picker and validation reflect admin settings |
| No upload enable/disable check | `enable_uploads` gate at API + UI | This phase | Closes UPLOAD-01 gap |

**Deprecated/outdated after this phase:**
- `ALLOWED_CONTENT_TYPES` constant in `app/api/submissions/upload/route.ts` — replaced by `getUploadConfig()`
- `isAcceptedFile()` function and `ACCEPTED_MIME_TYPES` set in student page — replaced by config-driven validation
- Hardcoded `accept=".doc,.docx,image/*"` on the file input — replaced by dynamic `acceptAttr`
- The badge display at top of dialog showing `.doc / .docx` and `PNG / JPG / GIF / SVG` hardcoded — replaced by config-derived list

---

## Open Questions

1. **What happens when the 403 early-return fires mid-upload sequence?**
   - What we know: The client calls `upload()` → `upload()` calls `handleUploadUrl` → the POST handler checks `enable_uploads` → returns 403 → `upload()` throws in the client
   - What's unclear: Does the Vercel Blob `upload()` client function propagate the 403 as a thrown Error with a message the UI can display?
   - Recommendation: Test this during implementation. If the error message is swallowed, the client can detect upload failure and show "Uploads are currently disabled" based on the pre-fetched `uploadConfig.enableUploads`. Client-side check should fire before the Blob upload attempt, so this is defense in depth only.

2. **Does `allowedContentTypes: []` (empty array) block all uploads or allow all?**
   - What we know: The SDK does not document the empty array case explicitly
   - What's unclear: If admin clears all allowed types (empty `allowed_file_types`), does `allowedContentTypes: []` block everything or is it treated as "no restriction"?
   - Recommendation: Defensive fallback — if `allowedFileTypes` is empty after parsing, default to `["DOC", "DOCX"]` and log a warning. Never pass an empty array to `allowedContentTypes`.

---

## Sources

### Primary (HIGH confidence)
- `/home/alfie/next-prisma/node_modules/@vercel/blob/dist/client.d.ts` — verified `onBeforeGenerateToken` return type includes `maximumSizeInBytes` and `allowedContentTypes`
- Vercel official docs (https://vercel.com/docs/vercel-blob/client-upload) — confirmed `handleUpload` pattern, `onBeforeGenerateToken` callback
- `/home/alfie/next-prisma/app/api/submissions/upload/route.ts` — confirmed existing hardcoded `ALLOWED_CONTENT_TYPES`, `onBeforeGenerateToken` structure
- `/home/alfie/next-prisma/app/(student)/submissions/page.tsx` — confirmed hardcoded `ACCEPTED_MIME_TYPES`, `isAcceptedFile()`, `accept=".doc,.docx,image/*"`, existing SWR pattern
- `/home/alfie/next-prisma/app/api/admin/upload-rules/route.ts` — confirmed `ConfigSetting` storage format (comma-separated string, uppercase, no dots)
- `/home/alfie/next-prisma/prisma/schema.prisma` — confirmed `ConfigSetting` model, `SubmissionFile` model
- `/home/alfie/next-prisma/lib/closure-guard.ts` — confirmed pattern for shared async DB helpers

### Secondary (MEDIUM confidence)
- WebSearch: Vercel Blob `maximumSizeInBytes` and `allowedContentTypes` confirmed to exist (then verified via installed package types — elevated to HIGH)

### Tertiary (LOW confidence)
- Behavior of `allowedContentTypes: []` (empty array) — not documented; flagged as Open Question

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, types verified directly in node_modules
- Architecture: HIGH — verified against existing codebase patterns; no speculative calls
- Pitfalls: HIGH — 403 vs 400 issue verified by reading Vercel Blob source types; others derived from direct code inspection

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable stack; 30 days)
