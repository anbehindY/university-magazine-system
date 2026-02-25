# Technology Stack

**Analysis Date:** 2026-02-25

## Languages

**Primary:**
- TypeScript 5 - Full codebase (app, lib, components, API routes)
- JSX/TSX - React components and server components in `app/` and `components/`

**Secondary:**
- JavaScript - Build configuration files (postcss.config.mjs, eslint.config.mjs)
- SQL - Database migrations in `prisma/migrations/`

## Runtime

**Environment:**
- Node.js (version not specified in .nvmrc, inferred from dependencies)

**Package Manager:**
- pnpm - Used for dependency management
- Lockfile: `pnpm-lock.yaml` present
- Workspace: `pnpm-workspace.yaml` configured

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack framework
  - Features: App Router, API routes, server components, Turbopack build system
  - Config: `next.config.ts`

**UI & Styling:**
- React 19.2.3 - View layer
- Tailwind CSS 4 - Utility-first styling
  - PostCSS plugin: `@tailwindcss/postcss` 4
  - Config: `tailwind.css` (generated), `postcss.config.mjs`
- Radix UI 1.4.3 - Headless UI components
- Lucide React 0.563.0 - Icon library

**Form Handling:**
- React Hook Form 7.71.1 - Form state management
  - Resolvers: `@hookform/resolvers` 5.2.2 for schema validation

**Validation:**
- Zod 4.3.6 - TypeScript-first schema validation

**Utilities:**
- clsx 2.1.1 - Conditional class composition
- tailwind-merge 3.4.0 - Tailwind class conflict resolution
- date-fns 3.6.0 - Date manipulation
- class-variance-authority 0.7.1 - Component variant management
- next-themes 0.4.6 - Dark mode theme switching
- sonner 2.0.7 - Toast notifications
- react-day-picker 9.4.2 - Calendar component

## Testing & Build Tools

**Linting:**
- ESLint 9 - Code quality
  - Next.js presets: `eslint-config-next` 16.1.6
  - TypeScript support: `eslint-config-next/typescript`
  - Web Vitals: `eslint-config-next/core-web-vitals`
  - Config: `eslint.config.mjs` (new flat config format)

**Build/Dev:**
- tsx 4.21.0 - TypeScript execution for scripts (Prisma seed)
- Turbopack - Bundler (via Next.js 16)

**TypeScript:**
- @types/node 20 - Node.js type definitions
- @types/react 19 - React type definitions
- @types/react-dom 19 - ReactDOM type definitions
- @types/pg 8.16.0 - PostgreSQL driver type definitions

## Key Dependencies

**Critical:**
- @prisma/client 7.3.0 - ORM and database client
  - Adapter: @prisma/adapter-pg 7.3.0 (PostgreSQL edge adapter)
  - Generator output: `prisma/generated/`
- better-auth 1.4.18 - Authentication framework
  - Adapters: Prisma adapter for database integration
  - Plugins: Admin role management plugin
  - Client: Client-side auth utilities with React hooks
- @vercel/blob 1.1.1 - File storage and handling
  - Used for file uploads with token-based access control
- pg 8.18.0 - PostgreSQL Node.js driver

**HTTP & Fetch:**
- @better-fetch/fetch 1.1.21 - Fetch utility (better-auth dependency)

## Configuration

**Environment:**
- Variables in `.env` file
- Loaded via `dotenv` 17.2.3 in Prisma config
- Critical vars:
  - `DATABASE_URL` - PostgreSQL connection string
  - `BETTER_AUTH_SECRET` - Auth session signing key
  - `BETTER_AUTH_URL` - Auth base URL
  - `BLOB_READ_WRITE_TOKEN` - Vercel Blob API token
  - `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`, `DEFAULT_ADMIN_NAME` - Seed data

**Build:**
- `tsconfig.json` - TypeScript configuration with path alias `@/*` → root
- `next.config.ts` - Next.js config with Turbopack enabled
- `prisma.config.ts` - Prisma configuration with PostgreSQL datasource
- `.env` - Environment variables (not committed)

## Platform Requirements

**Development:**
- Node.js (LTS version recommended)
- PostgreSQL database
- Vercel account for Blob storage (optional, can use different storage)
- pnpm package manager

**Production:**
- Deployment target: Vercel (via next/vercel integrations)
- PostgreSQL database
- Vercel Blob storage for file uploads (configured via `BLOB_READ_WRITE_TOKEN`)
- Better Auth requires `BETTER_AUTH_URL` pointing to production domain

## Database

**Provider:** PostgreSQL
**Connection:** Via `@prisma/adapter-pg` edge adapter
**ORM:** Prisma
**Schema Location:** `prisma/schema.prisma`
**Migrations:** `prisma/migrations/`
**Client Generation:** `prisma/generated/`

---

*Stack analysis: 2026-02-25*
