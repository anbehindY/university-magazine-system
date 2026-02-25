# Coding Conventions

**Analysis Date:** 2026-02-25

## Naming Patterns

**Files:**
- Page components: `page.tsx` (Next.js App Router)
- API routes: `route.ts` (Next.js App Router convention)
- UI components: PascalCase (e.g., `button.tsx`, `card.tsx`, `input.tsx`)
- Utilities: camelCase (e.g., `use-mobile.ts`, `auth-client.ts`, `getAvatarUrl.ts`)
- Hooks: `use*` prefix (e.g., `use-mobile.ts` exported as `useIsMobile`)

**Functions:**
- camelCase throughout (e.g., `formatRole`, `getUserStatus`, `getStatusClasses`, `formatTime`)
- Async functions use camelCase (e.g., `fetchUsers`, `loadSettings`, `refreshUsers`)
- Handler functions use `handle*` prefix (e.g., `handleCreateUser`, `handleEditUser`, `handleDeactivateUser`)

**Variables:**
- Local state: camelCase (e.g., `loading`, `error`, `dialogOpen`, `formLoading`)
- Boolean state: `is*`, `has*`, or simple adjectives (e.g., `isMobile`, `isPending`, `isLoading`, `isMounted`, `cancelled`)
- Component props passed as camelCase (e.g., `className`, `onValueChange`, `htmlFor`)

**Types:**
- PascalCase for types and interfaces (e.g., `UserRow`, `Faculty`, `Role`, `AcademicYearItem`, `SubmissionPayload`)
- Discriminated union types: use string literals (e.g., `"DRAFT" | "SUBMITTED"`, `"Active" | "Pending" | "Inactive"`)
- Props types: `React.ComponentProps<"element">` pattern for DOM components
- Callback function types: descriptive names (e.g., `handleCreateUser`, `onOpenChange`)

## Code Style

**Formatting:**
- Uses Next.js default TypeScript configuration
- Target: ES2017
- Module: esnext
- No external formatter configuration (no .prettierrc)
- Indentation appears to be 2 spaces based on codebase

**Linting:**
- ESLint 9.x with Next.js plugin
- Config: `eslint.config.mjs` (flat config format)
- Extends: `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`

## Import Organization

**Order:**
1. React/Next.js imports (e.g., `import { useEffect, useState } from "react"`)
2. Next.js modules (e.g., `import { headers } from "next/headers"`)
3. Third-party libraries (e.g., `import prisma from "@/lib/prisma"`, `import { betterAuth } from "better-auth"`)
4. Internal utilities and components (e.g., `import { cn } from "@/lib/utils"`)
5. Internal components (e.g., `import { Button } from "@/components/ui/button"`)
6. Types may be destructured inline with `type` prefix (e.g., `import { type VariantProps }`)

**Path Aliases:**
- `@/*` maps to root directory (e.g., `@/lib/prisma`, `@/components/ui/button`)
- Used consistently across all imports instead of relative paths

**Example pattern from `/home/alfie/next-prisma/app/api/submissions/route.ts`:**
```typescript
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
```

## Error Handling

**Patterns:**
- Try/catch blocks wrap async database and network operations
- Errors logged to console with context: `console.error("Error fetching submissions:", error)`
- API routes return `NextResponse.json()` with error messages and appropriate HTTP status codes
- Client components use local state (`error`, `setError`) to track and display errors
- Error messages are user-friendly strings (e.g., "Internal server error", "Failed to load users")
- Validation errors include specific context (e.g., "Missing submission id", "Submission not found")

**Example error handling in API routes (`/home/alfie/next-prisma/app/api/academic-years/route.ts`):**
```typescript
try {
  // operation
} catch (error) {
  console.error("Error fetching academic year:", error);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
```

**Example error handling in client components (`/home/alfie/next-prisma/app/(management)/users/page.tsx`):**
```typescript
const [error, setError] = useState<string | null>(null);

try {
  const res = await fetch("/api/admin/users");
  const data = await res.json();

  if (!res.ok) {
    setError(data.error || "Failed to load users.");
    return;
  }
} catch {
  setError("Failed to load users.");
}
```

## Logging

**Framework:** `console` (native browser/Node.js)

**Patterns:**
- Used in catch blocks for debugging: `console.error("Error context:", error)`
- No structured logging framework
- Minimal logging in production code
- Error logging is the primary logging pattern

## Comments

**When to Comment:**
- Inline comments are absent from the analyzed codebase
- Code is generally self-documenting through clear naming
- Complex logic uses multi-line variable assignments with intermediate steps (not comments)

**JSDoc/TSDoc:**
- Not used in the codebase
- Type annotations provide inline documentation instead

## Function Design

**Size:** Functions are concise and focused
- API route handlers typically 20-50 lines
- Helper functions are short (5-15 lines for utilities like `formatRole`, `getUserStatus`)
- Component functions can be larger (200+ lines) but contain tight, cohesive logic

**Parameters:**
- REST API route handlers: `(req?: NextRequest, context?: RouteContext)` pattern
- React components receive `props` object with spread syntax: `{ className, ...props }`
- Async functions use `await` for Promises
- Optional parameters indicated with `?` in type definitions
- Destructured parameters from request bodies use inline type casting: `(await req.json()) as SubmissionPayload`

**Return Values:**
- API routes return `NextResponse.json()` with typed object and status code
- Component functions return JSX (React.ReactElement)
- Utility functions return typed values (string, boolean, object)
- Async functions return Promise-wrapped return types
- Null coalescing and optional chaining used throughout: `data ?? []`, `user?.banned`

## Module Design

**Exports:**
- Named exports for utilities: `export function cn(...inputs: ClassValue[])`
- Default exports for page components: `export default function UsersPage()`
- Named exports for components: `export { Card, CardHeader, CardFooter, ... }`
- Destructured/wildcard imports: `import * as React from "react"`
- Default imports for singletons: `import prisma from "@/lib/prisma"`

**Barrel Files:**
- UI component directory `components/ui/` exports multiple components from single files
- Example: `/home/alfie/next-prisma/components/ui/card.tsx` exports 7 card-related components
- No index barrel files observed; components imported directly from their source files

**Auth module pattern** (`/home/alfie/next-prisma/lib/auth.ts`):
```typescript
export const auth = betterAuth({
  // configuration
});
```

**Client auth pattern** (`/home/alfie/next-prisma/lib/auth-client.ts`):
```typescript
export const { getSession, signIn, signOut, useSession } = createAuthClient({
  plugins: [adminClient()],
});
```

## Client/Server Boundaries

**"use client" directive:**
- Applied to interactive pages: `app/(management)/users/page.tsx`
- Applied to component files that use React hooks
- Applied to admin pages with forms and state management
- Server components: default for page components without client features

**Data fetching patterns:**
- Client components: `fetch()` with `useEffect` hook and cleanup cancellation
- API routes: Direct Prisma queries with authentication checks

---

*Convention analysis: 2026-02-25*
