# AGENTS.md — trac-portal-ui

Canonical instructions for AI coding agents and humans working in this repo. `CLAUDE.md` only imports this file.

## Purpose & context

Frontend of the TRAC Portal, the web app used by TRAC amateur-radio branches (Erzurum) to manage operators, nets (radio sessions), branches, communication channels, inventory, certificates, disasters and reports.

- Primary UI language is **Turkish**; **English** is supported. Every user-facing string must exist in both `src/i18n/locales/tr.json` and `en.json`.
- The UI talks only to the API (`trac-portal-api`, NestJS). It does not own business rules; the API is the authority for permissions and data.
- Cross-repo contracts (route prefix `/api`, cookie-based JWT auth, Google OAuth, the API's OIDC provider at `/api/oidc`, the role hierarchy shared with the API) live in the root repo: https://github.com/TRAC-Erzurum/trac-portal. Issues are filed only there.

## Stack

Versions are the ranges declared in `package.json`; `yarn.lock` pins the exact versions.

- Vue `^3.5.29` (Composition API, `<script setup lang="ts">`), TypeScript `~5.9.3`, `vue-tsc ^3.2.5`
- Vite `^7.2.4` with `@vitejs/plugin-vue`
- Vue Router `^5.0.3` (lazy-loaded routes), Pinia `^3.0.4`, vue-i18n `^11.3.0`
- Tailwind CSS `^4.2.1` via `@tailwindcss/vite`; shadcn-vue style primitives on `reka-ui ^2.9.0`; `lucide-vue-next` icons; `vue-sonner` toasts; `@vueuse/core`
- Maps: Leaflet `^1.9.4` + `@vue-leaflet/vue-leaflet`; charts: ECharts `^6` + `vue-echarts`
- Lint: ESLint 10 flat config with `typescript-eslint` 8 and `eslint-plugin-vue`
- Package manager: **yarn 1** (`yarn.lock`). Never use npm or pnpm.
- Runtime for Docker/CI: Node 20 (`node:20-alpine`). ESLint 10 needs Node `^20.19 || ^22.13 || >=24`.

## Setup & run

```bash
yarn install
cp .env.example .env.local   # .env.local is git-ignored; never commit env files
yarn dev                     # http://localhost:5173
```

Environment variables (`.env.example`):

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL for every API call (`src/lib/api.ts`). The app throws at startup if it is unset. Example uses `http://localhost:8000/api`; use `/api` to go through the Vite dev proxy instead. |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key for register/login captcha. |
| `VITE_CARTO_API_KEY` | Optional Carto basemap key. Build-time variable: it is baked into the bundle. |

Dev proxy (`vite.config.ts`): `/api` and `/uploads` are proxied to `http://127.0.0.1:8000`, so run the API on port 8000 when using relative URLs.

Other scripts: `yarn build` (type-check + production build), `yarn preview`, `yarn typecheck`, `yarn lint`, `yarn lint:check`.

## Verify

```bash
yarn verify
```

`verify` runs `yarn typecheck` (`vue-tsc -b`), `yarn lint:check` (ESLint, no fixes) and `vite build`. It must pass before a PR is opened. CI runs the same command. Lint warnings are allowed; errors are not. Use `yarn lint` (with `--fix`) to auto-fix locally.

## Project structure

```
src/
  App.vue, main.ts         app shell and bootstrap
  assets/fonts/            bundled Rajdhani and Orbitron fonts
  components/
    ui/                    shadcn-vue primitives (generated; do not hand-edit)
    shared/                cross-feature components (NetCard, OperatorCard, MemberCard, ...)
    layout/                AppLayout, Sidebar, BottomNav, Breadcrumb, UserMenu, ...
    <feature>/             feature components: admin, branches, certificates, dashboard,
                           disasters, feedback, infrastructure, inventory, nets, operators, profile
  composables/             Vue reactive helpers (useX / getX), exported via composables/index.ts
  constants/               static constants (net.ts, upload.ts)
  data/                    static JSON (turkey.json)
  i18n/                    vue-i18n setup, translateError(), locales/tr.json and en.json
  lib/                     pure utilities: api.ts client, formatters, ui-helpers, utils (cn), domain helpers
  pages/                   route-level views, grouped by feature folder
  router/index.ts          routes, typed meta (requiresAuth, minRole, titleKey, ...), guards
  stores/                  Pinia stores (auth, branch, theme, locale, feedback, cookieConsent)
  types/                   shared TypeScript interfaces (disaster, publishing, oidc, communication-channel)
  style.css                Tailwind entry, design tokens, shared utility classes (trac-*)
```

## Conventions index

Read the relevant file before changing that area:

- `docs/conventions/design-system.md`: colors, typography, radius, shadows, shared `trac-*` classes
- `docs/conventions/components.md`: component structure, buttons, sheets, lists, confirmations, imports
- `docs/conventions/page-layouts.md`: list, detail and dashboard page layouts; filter bars; pagination; FAB
- `docs/conventions/i18n.md`: translation keys, locale parity, error messages
- `docs/conventions/accessibility.md`: keyboard, screen readers, contrast
- `docs/conventions/api-client.md`: `api` client, auth and errors, stores, routing meta
- `docs/conventions/file-structure.md`: where new files go, existing utilities, roles

## Testing policy

Tests are expensive; keep them to a minimum. Do not add tests by default and never add "write tests" as a routine acceptance criterion. Add a test only when it rests on a solid reason: authentication/authorization, data integrity or irreversible operations, non-trivial pure logic (parsing, date/time, state machines), or a production bug likely to recur. State that reason in one sentence in the PR description. End-to-end tests and any new test framework/infrastructure require explicit approval from the project owner. Do not write tests for trivial CRUD, getters, rendering/snapshots, or mock-heavy controller code. Existing tests stay and must pass.

This repo currently has no test runner configured, so `yarn verify` is the automated gate.

## PR rules

- Target `main`. Title and commits use conventional commits (`feat:`, `fix:`, `chore:`, `style:`, `refactor:`, `docs:`).
- Use `.github/pull_request_template.md`. Link the root issue (`Closes TRAC-Erzurum/trac-portal#<n>`).
- **UI PRs need screenshots in the PR description** for every changed page or component, in light and dark theme where the change touches colors.
- If you cannot take screenshots, say so explicitly in the PR description and list the pages and flows a human must check.
- `yarn verify` output (pass/fail, and any warnings count) goes in the PR description.
- A test is added only under the testing policy above; state the reason in one sentence if one is added.

## Git & PR workflow

1. Start from up-to-date `main`: `git fetch origin && git checkout main && git pull --ff-only`.
2. Create a task branch (`feat/...`, `fix/...`, `chore/...`). Never commit to `main`.
3. Keep commits focused. Stage files explicitly.
4. Run `yarn verify`. Fix failures before pushing.
5. Push the branch and open a PR against `main`.
6. After this repo's PR merges, the root repo gets a separate PR that bumps the submodule pointer (`chore: move submodules to ...`).

Deployment is performed manually by product owners. Agents never deploy.

## Boundaries

- Never push to `main`, never force-push, never bypass branch protection or use admin merge options.
- Never merge a PR yourself unless the owner explicitly asks for it.
- Never deploy, and never touch the production server.
- Never read, print, or commit `.env*` files or secrets. `.env.example` is the only env template; do not add other env files to git.
- Never run migrations, seeds, or destructive commands against any database. This repo has no database; those belong to the API repo.
- Do not upgrade existing dependencies or change tooling beyond the task.
- Do not edit `src/components/ui/**` (generated) unless the task is explicitly about those primitives.
- If the requested scope cannot be completed safely, or must grow beyond the task, stop and report instead of expanding it.
