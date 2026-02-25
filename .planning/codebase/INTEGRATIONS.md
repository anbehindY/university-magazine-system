# External Integrations

**Analysis Date:** 2026-02-25

## APIs & External Services

**File Storage:**
- Vercel Blob - Cloud file storage for submission documents
  - SDK/Client: `@vercel/blob` 1.1.1
  - Auth: `BLOB_READ_WRITE_TOKEN` environment variable
  - Usage: `app/api/submissions/upload/route.ts` handles file uploads with token validation
  - Client-side: `app/(student)/submissions/page.tsx` uses `@vercel/blob/client` for uploads
  - Allowed content types: `.docx`, `.doc`, images (`image/*`)
  - Pathname pattern: `submissions/{userId}/{submissionId}/{filename}`

## Data Storage

**Databases:**
- PostgreSQL (Neon)
  - Connection: `DATABASE_URL` environment variable
  - Connection pooler: Neon serverless pooler (ap-southeast-1 AWS region)
  - Client: `@prisma/client` 7.3.0 with `@prisma/adapter-pg` edge adapter
  - Schema: `prisma/schema.prisma`
  - Migrations: Stored in `prisma/migrations/`

**File Storage:**
- Vercel Blob (primary)
- Local filesystem reference in database via `SubmissionFile` model
  - Stores URL, pathname, content type, and file size

**Caching:**
- Not detected - No Redis or memcached integration

## Authentication & Identity

**Auth Provider:**
- Better Auth (self-hosted authentication framework)
  - Implementation: `better-auth` 1.4.18 package
  - Server: `lib/auth.ts` - BetterAuth instance with Prisma adapter
  - Client: `lib/auth-client.ts` - Client-side auth utilities with React hooks
  - Route handler: `app/api/auth/[...all]/route.ts` - Catches all auth API routes
  - Method: Email/password authentication enabled
  - Database adapter: Prisma adapter for PostgreSQL
  - Secrets: `BETTER_AUTH_SECRET` environment variable
  - Base URL: `BETTER_AUTH_URL` environment variable (http://localhost:3000 in dev)

**Database Hooks:**
- Session creation validates user is not banned before allowing login
- Implementation: `databaseHooks.session.create.before` in `lib/auth.ts`

**Admin Plugin:**
- Uses `better-auth/plugins/admin` for role-based access control
- Roles configured: ADMINISTRATOR, MARKETING_MANAGER, MARKETING_COORDINATOR, STUDENT, GUEST
- Admin role: ADMINISTRATOR
- Default role: STUDENT
- Access control rules via `adminAc` and `userAc` from `better-auth/plugins/admin/access`

## Monitoring & Observability

**Error Tracking:**
- Not detected - No Sentry, DataDog, or similar integration

**Logs:**
- Console logging only
- Example: `app/api/submissions/upload/route.ts` logs upload errors to console

**Database Debugging:**
- Prisma Client logs (configurable but not explicitly set)

## CI/CD & Deployment

**Hosting:**
- Vercel (implied by Next.js setup and Vercel Blob integration)
- Deployment: `npm run build && npm start` (standard Next.js)

**CI Pipeline:**
- Not detected - No GitHub Actions, GitLab CI, or similar configuration

## Environment Configuration

**Required env vars:**
```
# Database
DATABASE_URL=postgresql://...

# Authentication
BETTER_AUTH_SECRET=[hex-string]
BETTER_AUTH_URL=http://localhost:3000  # or production domain

# File Storage
BLOB_READ_WRITE_TOKEN=[vercel-token]

# Seed Data (optional, for initial setup)
DEFAULT_ADMIN_EMAIL=...
DEFAULT_ADMIN_PASSWORD=...
DEFAULT_ADMIN_NAME=...
```

**Secrets location:**
- `.env` file (local development, not committed)
- Environment variables in hosting platform (Vercel dashboard)

## Webhooks & Callbacks

**Incoming:**
- `app/api/submissions/upload/route.ts` - File upload webhook handler
  - Receives: Multipart form data with file content and metadata
  - Validates: User session, submission ownership, file path, content types
  - Callback: `onBeforeGenerateToken` - Validates upload before token generation
  - Callback: `onUploadCompleted` - Saves file metadata to database after upload

**Outgoing:**
- Not detected - No outbound webhooks to external services

## Data Synchronization

**Prisma Seed:**
- Seed script: `prisma/seed.ts` (referenced in prisma.config.ts)
- Executed via: `tsx prisma/seed.ts`
- Purpose: Initialize database with default admin user and configuration

## API Route Handlers

**Auth Routes:**
- `app/api/auth/[...all]/route.ts` - Catch-all for BetterAuth endpoints
  - Uses: `toNextJsHandler` from `better-auth/next-js`
  - Session management, sign-in/sign-out, token refresh

**Submission Routes:**
- `app/api/submissions/route.ts` - List/create submissions
- `app/api/submissions/upload/route.ts` - File upload with token validation
- `app/api/submissions/files/route.ts` - Manage submission files

**Academic Year Routes:**
- `app/api/academic-years/route.ts` - Student-facing academic year endpoints
- `app/api/admin/academic-years/route.ts` - Admin management endpoints

**Faculty Routes:**
- `app/api/faculties/route.ts` - Faculty list endpoint

**User Management Routes:**
- `app/api/admin/users/route.ts` - Admin user management
- `app/api/admin/create-user/route.ts` - Bulk/manual user creation
- `app/(management)/users/page.tsx` - User management UI

**Config Routes:**
- `app/api/admin/upload-rules/route.ts` - File upload configuration

---

*Integration audit: 2026-02-25*
