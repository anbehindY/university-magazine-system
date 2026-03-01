# 🎓 University Magazine System

> 📰 A web-based submission and review platform for a university annual magazine. Students submit articles and supporting files to their faculty; Marketing Coordinators review, comment on, and select contributions for publication; a Marketing Manager oversees all faculties and downloads selected work; Guests can browse selected articles for their assigned faculty; and Administrators manage users, faculties, and academic-year settings.

## 🛠️ Tech Stack

- **Framework** — Next.js 16 (App Router, React 19)
- **Database** — PostgreSQL with Prisma ORM
- **Auth** — Better Auth (email/password, role-based access)
- **Storage** — Vercel Blob (file uploads)
- **Email** — Nodemailer (SMTP notifications)
- **UI** — Tailwind CSS 4, Radix UI, shadcn/ui components, Lucide icons

## 👥 User Roles

| Role | Capabilities |
| --- | --- |
| 🎒 **Student** | Submit articles with file uploads during the open submission period; add/remove submissions before the final closure date |
| 📋 **Marketing Coordinator** | Review submissions for their faculty; leave comments; select or deselect articles for publication |
| 📊 **Marketing Manager** | View submissions across all faculties and academic years; download selected submissions as ZIP archives; access cross-faculty reports |
| 👀 **Guest** | View selected articles for their assigned faculty (read-only) |
| ⚙️ **Administrator** | Manage users, faculties, academic years, closure dates, and upload rules; full system configuration |

## ✨ Key Features

- 📅 Academic-year-based submission periods with configurable first and final closure dates
- 📎 File upload with configurable rules (max file size, allowed types, max files per submission)
- ✅ Coordinator review workflow with selection confirmation and commenting
- 📈 Reports dashboard with per-faculty statistics and exception tracking (submissions without comments)
- 📦 Per-year ZIP download of selected submissions for the Marketing Manager
- 📧 Email notifications for submission events
- 🔒 Role-based navigation and access control throughout

---

## 🚀 Contributor Setup

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

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

See `.env.example` for all required variables (database URL, auth secret, Vercel Blob token, SMTP credentials, and seed data).

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
