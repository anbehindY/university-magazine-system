# Next Prisma App

## Getting Started

1. Install dependencies:

```bash
pnpm install
```

2. Configure environment variables:

Create `.env` with at least:

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=change-me
DEFAULT_ADMIN_NAME=Default Admin
```

3. Run Prisma setup (local development):

```bash
pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma db seed
```

4. Start the dev server:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Prisma Commands

| Command | Purpose | When to Run |
| --- | --- | --- |
| `pnpm prisma generate` | Generates the Prisma Client from `prisma/schema.prisma`. | After schema changes or fresh installs. |
| `pnpm prisma migrate dev` | Creates a new migration from schema changes, applies it locally, and regenerates the client. | Development only. |
| `pnpm prisma migrate dev --name init_users` | Creates a new migration with an explicit name, applies it locally, and regenerates the client. | When you want a named migration. |
| `pnpm prisma migrate deploy` | Applies existing migrations in `prisma/migrations` without creating new ones. | Staging/production/CI (never for creating migrations). |
| `pnpm prisma migrate reset` | Drops and recreates the database, re-applies all migrations, then runs the seed script. | Local/dev only when you need a clean slate. |
| `pnpm prisma db seed` | Runs `prisma/seed.ts` to populate initial data (faculties and default admin). | After migrations, when bootstrapping. |
| `pnpm prisma studio` | Launches Prisma Studio, a local UI to browse and edit data. | Any time you want to inspect data. |
