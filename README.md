# 🎓 University Magazine System

> 📰 A collaborative school project for publishing and managing a university magazine.

## ✨ Contributor Setup

### 1. 📦 Install dependencies

```bash
pnpm install
```

### 2. 🗄️ Start a database

Option A: Local Postgres with Docker (Postgres 16)

```bash
docker run --name university-magazine-system \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=magazine_system \
  -p 5432:5432 \
  -d postgres:16
```

Use this local connection string:

```bash
postgresql://postgres:postgres@localhost:5432/magazine_system
```

Option B: Hosted Postgres with Neon

🔗 https://neon.tech

### 3. 🔐 Configure environment variables

Create `.env` with at least:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=change-me
DEFAULT_ADMIN_NAME=Default Admin
```

### 4. 🧬 Prepare Prisma

```bash
pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma db seed
```

### 5. 🚀 Start the app

```bash
pnpm dev
```

Open http://localhost:3000

---

## 🛠️ Prisma Command Reference

| Command | Purpose | When to run |
| --- | --- | --- |
| `pnpm prisma generate` | Generate Prisma Client from `prisma/schema.prisma`. | After schema changes or fresh install. |
| `pnpm prisma migrate dev` | Create and apply a migration locally, then regenerate client. | Development only. |
| `pnpm prisma migrate dev --name init_users` | Create and apply a named migration locally. | When you want explicit migration names. |
| `pnpm prisma migrate deploy` | Apply existing migrations only. | Staging, production, CI. |
| `pnpm prisma migrate reset` | Reset DB, reapply migrations, then seed. | Local only when a clean slate is needed. |
| `pnpm prisma db seed` | Run `prisma/seed.ts` (faculties and default admin). | After migrations or when bootstrapping data. |
| `pnpm prisma studio` | Open Prisma Studio to inspect and edit data. | Any time during development. |

---

## 🤝 Notes for Contributors

- Keep `DATABASE_URL` pointed to the database you intend to modify before running Prisma commands.
- `pnpm prisma migrate deploy` does not create new migrations; it only applies existing ones.
- Seeding is safe to rerun for the current setup and helps keep required starter data available.
