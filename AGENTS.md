# AGENTS.md — Handover Guide for AI Coding Agents

> **Purpose:** Single source of truth for any AI agent (Emergent, Cursor, Claude Code, Codex, etc.)
> picking up work on this repository. Read this first before touching any code.

**Repo:** https://github.com/sawantakshata27-creator/no-docker
**Last updated:** 2026-01 (initial creation)

---

## 1. What this app is

A **Jira-like project management web app** with:

- 🔐 Supabase Auth (email + Google OAuth)
- 📋 Drag-and-drop **Kanban board** (`@dnd-kit`)
- 📊 Dashboard + analytics
- 📝 Task details drawer with rich text (`@tiptap`)
- 📄 Document management (Supabase Storage)
- 👥 Multi-tenant: orgs, memberships (owner / admin / member)
- 🎨 shadcn/ui + Radix primitives + Tailwind v4 design system

There is **no separate FastAPI / MongoDB / Node backend**. Supabase is the entire backend.
(The legacy `backend/` folder and the `README.md` describing FastAPI are **outdated** —
do not follow them. See section 4.)

---

## 2. Tech stack (stay consistent — do not introduce new frameworks)

| Layer            | Tech                                                  |
| ---------------- | ----------------------------------------------------- |
| Framework        | **TanStack Start** (file-based routing, SSR-capable)  |
| Language         | **TypeScript** (`.ts` / `.tsx` only — no `.js`)       |
| UI               | Tailwind CSS v4, shadcn/ui, Radix, `framer-motion`    |
| State            | **Zustand** (`auth-store`, `theme-store`)             |
| Data fetching    | `@tanstack/react-query`                               |
| Forms            | `react-hook-form` + `zod`                             |
| Drag & drop      | `@dnd-kit/core` + `@dnd-kit/sortable`                 |
| Rich text        | `@tiptap/react`                                       |
| Backend / DB     | **Supabase** (Postgres + Auth + Storage + RLS)        |
| Build / dev      | **Vite 7** (`yarn dev` on port 3000)                  |
| Deploy           | Cloudflare (`wrangler.jsonc`, `@cloudflare/vite-plugin`) |
| Package manager  | **Yarn** (never npm — it breaks the lockfile)         |

---

## 3. Repo layout (essentials only)

```
no-docker/
├── src/
│   ├── routes/                       # TanStack file-based routes
│   │   ├── __root.tsx                # Root layout
│   │   ├── login.tsx                 # Auth entry
│   │   ├── auth.callback.tsx         # OAuth PKCE exchange
│   │   ├── _authenticated.tsx        # Guard (redirects if not signed in)
│   │   └── _authenticated/
│   │       ├── dashboard.tsx
│   │       ├── board.tsx             # Kanban page
│   │       ├── tasks.tsx
│   │       ├── analytics.tsx
│   │       ├── documents.tsx
│   │       ├── team.tsx
│   │       ├── settings.tsx
│   │       └── onboarding.tsx
│   ├── components/
│   │   ├── kanban/KanbanBoard.tsx    # Core drag-drop board
│   │   ├── tasks/TaskDetailsDrawer.tsx
│   │   ├── layout/                   # Sidebar, Topbar, GlobalSearch...
│   │   └── ui/                       # shadcn primitives
│   ├── lib/
│   │   ├── auth-store.ts             # Zustand auth state
│   │   ├── task-model.ts             # TaskRecord / ColumnRecord types + seed data
│   │   ├── task-cache.ts
│   │   └── theme-store.ts
│   ├── integrations/supabase/        # supabase client + generated types
│   ├── router.tsx                    # TanStack router config
│   └── styles.css                    # Design tokens (Tailwind v4 @theme)
├── supabase/                         # SQL migrations
├── public/
├── package.json
├── vite.config.ts
├── wrangler.jsonc                    # Cloudflare deploy config
├── AGENTS.md                         # ← you are here
├── EMERGENT_HANDOVER.md              # Older handover (pre-AGENTS.md)
└── README.md                         # ⚠️ OUTDATED — do not trust
```

---

## 4. ⚠️ Known stale / misleading files

These exist for historical reasons. **Do not follow their instructions.**

- **`README.md`** — claims FastAPI + MongoDB. Wrong. There is no Python backend.
- **`backend/`** folder — vestigial leftover, not used at runtime.
- **`CODE_REVIEW_TOOL_ISSUE.md`** / **`OUTDATED_CODE_REVIEW_EXPLANATION.md`** —
  context for an external code-review tool that flagged the deleted FastAPI files.

If in doubt: `package.json` + `vite.config.ts` + `wrangler.jsonc` are the truth.

---

## 5. Owner's working agreement (read before doing anything)

These are the rules **the human owner has set for AI agents** working on this repo.
Keep working within them.

1. **Stay on the current tech stack.** No refactors to Next.js, no swapping out
   Supabase, no introducing a new backend service.
2. **Ship features one at a time.** One feature = one feature branch = one PR = merge.
   Then move to the next. Never bundle unrelated changes.
3. **Always raise a PR — never push directly to `main`.** Open the PR, merge it, delete
   the branch.
4. **Keep changes small** so a single agent run never exhausts the credit budget
   mid-feature. If a feature feels >300 LOC across many files, slice it smaller first.
5. **Write the analysis / handover into a file** (this `AGENTS.md`) so the next agent
   has full context when credits reset. Update this file at the end of each feature.
6. **Don't touch unrelated files** while implementing a feature.

---

## 6. Standard workflow for the next agent

```bash
# 1. Sync
git checkout main && git pull origin main

# 2. Create a focused branch
git checkout -b feat/<short-feature-name>     # or fix/, docs/, refactor/, chore/

# 3. Implement (TypeScript only, reuse /src/components/ui/, follow design tokens
#    in src/styles.css). Add data-testid on every interactive element.

# 4. Lint + typecheck before committing
yarn lint
npx tsc --noEmit

# 5. Commit (conventional commits)
git add -A
git commit -m "feat(board): <what changed>"

# 6. Push and open PR
git push -u origin feat/<short-feature-name>
gh pr create --base main --head feat/<short-feature-name> \
  --title "feat(board): <what changed>" \
  --body "<short description + screenshots if UI>"

# 7. Merge (squash) and clean up
gh pr merge --squash --delete-branch

# 8. Update this AGENTS.md "Changelog" section with what you shipped.
```

If `gh` is unavailable, use the GitHub REST API with the user's PAT:

```bash
curl -X POST \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/sawantakshata27-creator/no-docker/pulls \
  -d '{"title":"...","head":"branch","base":"main","body":"..."}'
```

---

## 7. Local dev quickstart

```bash
yarn install
yarn dev             # http://localhost:3000
yarn build           # production bundle
yarn lint            # eslint
npx tsc --noEmit     # typecheck
```

Required env (`.env` at repo root, NOT inside `frontend/`):

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
VITE_SUPABASE_PROJECT_ID=<project>
```

Supabase project currently in use: `phfloudgwzbnawmzshlg` (see `.env`).

---

## 8. Design-system rules (don't break visual consistency)

- **Animations:** 150–200ms range, `cubic-bezier(0.25, 1, 0.5, 1)` easing.
- **Drag activation:** keep at small distance (≤6px) for snappy feel.
- **Spacing:** prefer scale (`gap-4`, `gap-5`, `p-3.5`) over arbitrary values.
- **Radius:** 0.75–1.25rem for cards/buttons.
- **Shadows:** multi-layer (`shadow-sm` + custom). See `src/styles.css`.
- **Fonts:** Inter + Cal Sans already wired in `styles.css`. Don't swap.
- **Icons:** `lucide-react` only. No emoji in product UI.
- **Test IDs:** every interactive element gets a unique kebab-case `data-testid`.

---

## 9. Database / Supabase notes

- Schema lives in `supabase/` migrations.
- Core tables: `boards`, `board_columns`, `tasks`, `organizations`, `memberships`,
  `documents`, plus `document-files` storage bucket.
- **RLS is on** for every table. When adding a new table, write the RLS policies in
  the same migration, or rows will appear missing in the UI.
- Generated TS types: `src/integrations/supabase/types.ts` — regenerate after schema
  changes with `supabase gen types typescript`.

---

## 10. Owner Q&A (verbatim answers given to the agent on 2026-01)

These are the human owner's exact answers to setup questions. Treat as binding.

**Q: Where should the repo analysis / handover live?**
> "you can create one for agents to refer" → this `AGENTS.md` file.

**Q: How should PRs flow?**
> "raise PRs one by one to make changes and improve … create a PR and merge … improve a feature one by one."
→ One feature per branch per PR, merge before starting the next.

**Q: Improvements scope?**
> "implement a small feature (should not exhaust credit before completing it)."
→ Small, contained, end-to-end-shippable features only. No mega refactors.

**Q: Tech stack flexibility?**
> "stay consistent with current tech stack."
→ TanStack Start + TS + Tailwind v4 + Supabase. No replacements.

**Q: Handover doc requirement?**
> "add these answers to that agent readme properly for agent handover later when
> credits exhaust."
→ This section exists for that reason. Keep it updated.

---

## 11. Changelog (append at the top of the list)

- **2026-01 — `docs/agents-handover-guide`**: Added this `AGENTS.md` so future agents
  have a single, accurate handover doc (README is outdated, EMERGENT_HANDOVER.md is
  Emergent-specific).

---

## 12. Quick agent self-check before opening a PR

- [ ] Branch name follows `feat/` `fix/` `docs/` `refactor/` `chore/` prefix.
- [ ] Only files relevant to the feature were touched.
- [ ] `yarn lint` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] Every new interactive element has a `data-testid`.
- [ ] No new top-level dependency was added unless truly needed.
- [ ] `AGENTS.md` § 11 Changelog updated.
- [ ] PR description explains the *why*, not just the *what*.

Welcome aboard — keep the diffs small and the commits clean. 🛠️
