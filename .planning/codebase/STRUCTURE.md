# STRUCTURE.md

## Directory Layout

```
next-prisma/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group (no shared layout)
│   │   └── sign-in/page.tsx     # Login page
│   ├── (management)/             # Management route group
│   │   ├── layout.tsx           # Sidebar + header layout (server component)
│   │   ├── page.tsx             # Root dashboard
│   │   ├── admin/
│   │   │   ├── page.tsx         # Academic year / closure date management
│   │   │   └── upload-rules/page.tsx
│   │   └── users/
│   │       ├── page.tsx         # User management (827 lines, ADMINISTRATOR only)
│   │       └── head.tsx
│   ├── (student)/                # Student route group
│   │   ├── layout.tsx           # Sidebar + header layout (shared structure)
│   │   └── submissions/page.tsx # Submission workflow (1126 lines)
│   ├── api/                      # API Route Handlers
│   │   ├── auth/[...all]/route.ts  # Better-Auth catch-all
│   │   ├── academic-years/route.ts
│   │   ├── faculties/route.ts
│   │   ├── submissions/
│   │   │   ├── route.ts         # GET/POST/PUT/DELETE submissions
│   │   │   ├── upload/route.ts  # Vercel Blob upload token handler
│   │   │   └── files/route.ts   # Submission file management
│   │   └── admin/
│   │       ├── academic-years/route.ts
│   │       ├── create-user/route.ts
│   │       ├── upload-rules/route.ts
│   │       └── users/route.ts   # User CRUD + ban/unban
│   ├── globals.css
│   └── layout.tsx               # Root layout (fonts, Toaster)
│
├── components/                   # Shared React components
│   ├── ui/                       # shadcn/ui primitives (generated)
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── sidebar.tsx
│   │   └── ... (20+ ui components)
│   ├── app-sidebar.tsx           # Role-aware navigation sidebar
│   ├── management-header.tsx     # Top header bar
│   ├── nav-main.tsx              # Sidebar nav items
│   ├── nav-user.tsx              # User avatar/menu in sidebar
│   └── team-switcher.tsx
│
├── lib/                          # Server utilities
│   ├── auth.ts                   # Better-Auth server config + plugins
│   ├── auth-client.ts            # Better-Auth client (useSession, etc.)
│   ├── auth-helpers.ts           # getCurrentUser, requireRole, isAdmin, etc.
│   ├── prisma.ts                 # Prisma singleton client
│   ├── getAvatarUrl.ts           # Avatar URL helper
│   └── utils.ts                  # cn() utility (clsx + tailwind-merge)
│
├── hooks/
│   └── use-mobile.ts             # Mobile breakpoint hook
│
├── prisma/
│   ├── schema.prisma             # Database schema
│   ├── seed.ts                   # Database seeder
│   ├── migrations/               # Migration history (6 migrations)
│   └── generated/                # Prisma generated types
│       ├── client.ts
│       ├── enums.ts
│       └── models/               # Per-model type files
│
├── public/                       # Static assets
├── next.config.ts
├── prisma.config.ts
├── tsconfig.json
├── package.json
└── components.json               # shadcn/ui config
```

---

## Key File Locations

| What | Where |
|------|-------|
| Auth config | `lib/auth.ts` |
| Auth client (hooks) | `lib/auth-client.ts` |
| Server auth helpers | `lib/auth-helpers.ts` |
| Prisma client | `lib/prisma.ts` |
| DB schema | `prisma/schema.prisma` |
| Root layout | `app/layout.tsx` |
| Login page | `app/(auth)/sign-in/page.tsx` |
| Submission API | `app/api/submissions/route.ts` |
| User management API | `app/api/admin/users/route.ts` |
| Shadcn UI components | `components/ui/` |

---

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| React components | PascalCase | `AppSidebar`, `LoadingScreen` |
| Page files | `page.tsx` | `app/(student)/submissions/page.tsx` |
| Layout files | `layout.tsx` | `app/(management)/layout.tsx` |
| API route files | `route.ts` | `app/api/submissions/route.ts` |
| Utility functions | camelCase | `getCurrentUser`, `requireRole` |
| Types/interfaces | PascalCase | `UserRow`, `SubmissionPayload` |
| Env variables | UPPER_SNAKE_CASE | `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN` |
| Path aliases | `@/*` maps to project root | `import { auth } from "@/lib/auth"` |

---

## Where to Add New Features

| Feature Type | Location |
|-------------|----------|
| New page (management) | `app/(management)/<name>/page.tsx` |
| New page (student) | `app/(student)/<name>/page.tsx` |
| New API endpoint | `app/api/<name>/route.ts` |
| New admin API | `app/api/admin/<name>/route.ts` |
| Shared UI component | `components/<name>.tsx` |
| UI primitive | `components/ui/<name>.tsx` |
| Server utility | `lib/<name>.ts` |
| New DB table | `prisma/schema.prisma` → run migration |

---

## Database Migrations

Located in `prisma/migrations/`. Key migrations:
- `20260203153132` — Auth models (User, Session, Account, Verification)
- `20260203163230` — Admin plugin tables
- `20260204040614` — Roles and Faculty
- `20260217160034` — (unknown)
- `20260220010502` — (unknown)
- `20260224120000` — Submissions (Submission, SubmissionFile, ConfigSetting)
