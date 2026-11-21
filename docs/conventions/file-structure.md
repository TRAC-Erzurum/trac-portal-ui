# File structure and imports

## Where things go

| Need | Location |
|---|---|
| Shared UI piece used across features | `src/components/shared/` |
| Feature-specific component | `src/components/<feature>/` |
| shadcn-vue primitive | `src/components/ui/` (generated; do not hand-edit) |
| Vue reactive logic (`useX`, `getX`) | `src/composables/` (export from `index.ts`) |
| Pure function, formatter, API client | `src/lib/` |
| Route-level page | `src/pages/<feature>/` |
| Pinia store | `src/stores/` |
| Shared TypeScript types | `src/types/` |
| Static constants | `src/constants/` |
| Translations | `src/i18n/locales/` |

Check existing utilities before creating new ones:

- `getAvatarUrl`, `useAvatarUrl` (`@/composables`)
- `formatDateTime`, `formatDateShort`, `formatCallSign` (`@/lib/formatters`)
- `getRoleBadgeClass` (`@/lib/ui-helpers`)
- `cn` (`@/lib/utils`): class merging with `clsx` + `tailwind-merge`
- `translateError` (`@/i18n`)
- Shared cards from `@/components/shared`

## Import order (script block)

All imports sit at the top of `<script setup>`, before any other code. Groups, in order:

1. `vue`, `vue-router`, `vue-i18n`
2. `vue-sonner`
3. `lucide-vue-next`
4. `@/components/...` (alphabetical by path)
5. `@/stores/...`, `@/composables/...`
6. `@/i18n`
7. `@/lib/...` (value and `type` imports from the same module together)
8. `@/data/...`, `@/constants/...`

Within a group, sort by imported symbol name (lucide icons A to Z).

## Other rules

- Use the `@/` alias for `src/`. Relative imports are for files in the same folder.
- Do not import from another feature's internals; promote shared pieces to `components/shared/` or `lib/` instead.
- Package manager: yarn only.
