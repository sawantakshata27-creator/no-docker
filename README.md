# 2DS Workflow

A **Jira-like project management app** for document-workflow teams.

Track every sign through creation, preprocessing, association, adjustment and delivery — without leaving your board.

---

## Tech Stack

| Layer        | Tech                                                     |
| ------------ | -------------------------------------------------------- |
| Framework    | **TanStack Start** (file-based routing, SSR-capable)    |
| Language     | **TypeScript** (`.ts` / `.tsx` only)                    |
| UI           | Tailwind CSS v4, shadcn/ui, Radix, `framer-motion`       |
| State        | **Zustand** (`auth-store`, `theme-store`)                |
| Data         | `@tanstack/react-query`                                  |
| Forms        | `react-hook-form` + `zod`                                |
| Drag & drop  | `@dnd-kit/core` + `@dnd-kit/sortable`                    |
| Rich text    | `@tiptap/react`                                          |
| Backend / DB | **Supabase** (Postgres + Auth + Storage + RLS)           |
| Build        | **Vite 7** (`yarn dev` on port 3000)                     |
| Deploy       | Cloudflare (`wrangler.jsonc`)                            |
| Pkg manager  | **Yarn** (never npm — it breaks the lockfile)            |

> **Note:** There is no separate FastAPI / MongoDB / Node backend. Supabase is the entire
> backend. The legacy `backend/` folder has been removed.

---

## Quick start

```bash
yarn install
yarn dev          # http://localhost:3000
yarn build        # production bundle
yarn lint
npx tsc --noEmit  # typecheck
```

### Required env (`.env` at repo root)

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
VITE_SUPABASE_PROJECT_ID=<project>
```

---

## Key features

- Drag-and-drop **Kanban board** with column-scoped card ordering
- **Task details modal** — manual save, delete, process & priority fields
- **Process productivity metrics** — files/hr actual vs target (per stage)
- **Global search** — tasks, boards, documents with keyboard navigation
- **Dashboard** — task distribution, overdue, due-today, throughput charts
- **Document management** — upload / download via Supabase Storage
- **Notifications** — overdue tasks, due-today, pending join requests
- **Multi-tenant** — orgs, memberships (owner / admin / member), org switcher
- **Auth** — email/password + Google OAuth via Supabase

---

## Agent handover

See [`AGENTS.md`](./AGENTS.md) for the full handover guide — tech stack rules,
PR workflow, open follow-up items, and a complete changelog.
