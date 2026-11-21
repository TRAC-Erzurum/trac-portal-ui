# Page layouts

Every page is one of three types. Copy the structure of a working page of the same type: `NetsPage.vue`, `OperatorsPage.vue` or `BranchesPage.vue` for lists; `BranchDetailPage.vue`, `ProfilePage.vue` or `AccountPage.vue` for detail; `DashboardPage.vue` for the home page.

## 1. List page

Structure, top to bottom, inside `<AppLayout :title="t('nav.<resource>')">`:

1. Wrapper `div` with `space-y-4`.
2. Filter bar and header actions.
3. Count line (only when not loading).
4. `<Separator />` (default spacing).
5. Content: loading skeletons, empty state, or the grid.
6. Load-more container (only when more pages exist).

**Header**
- Use the `title` prop with a `nav.*` key. The title is rendered as-is (not uppercased).
- Do not set `breadcrumb-label` or `breadcrumb-items` on list pages; the breadcrumb is generated from the route.

**Filter bar**
- Container: `flex flex-wrap items-center gap-2`.
- Search first: `relative w-full sm:flex-1 sm:max-w-xs`, with the `Search` icon positioned absolutely and `pl-9` on the input.
- Select filters: `w-full sm:w-auto flex-1 min-w-[120px]` (NetsPage), or `flex-1 sm:flex-none sm:w-[120px]` to `sm:w-[180px]` when a fixed width reads better. Keep widths consistent within one page.
- Header actions sit in `trac-top-actions`; the create button uses `trac-page-action-btn` with `variant="outline"` and an icon with `gap-2`.
- Some pages place filters in two rows on desktop; if you do, keep the same `gap-2` rhythm.

**Count line**
- Format: `{{ items.length }}/{{ total }} {{ t('<feature>.nameEntity') }}`, shown as `text-sm text-muted-foreground` when `!isLoading`. The "shown / total" form is the convention on list pages.

**Content grid**
- Loading and loaded grids use the same classes: `grid grid-cols-1 lg:grid-cols-3 gap-3` on list pages. Some pages use `lg:grid-cols-2 xl:grid-cols-3`; prefer `lg:grid-cols-3` for new list pages.
- Loading: render skeleton cards (`<...CardSkeleton v-for>`), not a spinner.
- Empty: `py-8 text-center` with a `text-muted-foreground` message.

**Load more**
- Show only when `hasMore && !isLoading`. Container `pt-4 pb-16 lg:pb-0` (room above the mobile FAB and bottom nav).
- Button: `trac-load-more-btn` (or `w-full lg:w-auto lg:px-8`), `variant="outline"`, disabled while loading more. Never numbered pagination.

**Mobile FAB** (create action only; mobile only)
- `<Button variant="outline" size="icon" class="lg:hidden fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40 bg-background">` with a `Plus` icon (`h-6 w-6`).
- Hidden on desktop (`lg:hidden`). Omit it on pages without a create action.

## 2. Detail page

- Wrapper `div` with `space-y-6`.
- Header: `AppLayout` with the `title` prop or a custom `#title` slot, plus `:breadcrumb-label` set to the record name or identifier.
- A custom title slot is acceptable when badges or status are needed (e.g. `BranchDetailPage`). A page-specific header component (e.g. `NetHeader`) is also acceptable.
- Action buttons: in the header (`variant="outline" size="sm"`, `flex-shrink-0`) or in a section header.
- Sections: `<section>` blocks separated by `<Separator class="my-8" />`. Section titles use the section-title classes from `design-system.md`.
- Info grids: `grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-8`, each field a label (`text-xs text-muted-foreground`) over a value (`font-medium`).
- Filtered list sections (e.g. members, memberships): section header with the action on the right, then a filter row `flex flex-wrap items-center gap-2 mb-4` with a search input (`flex-1 min-w-[200px]`) and fixed-width selects.
- Loading state: skeleton blocks that match the final layout (`bg-muted rounded animate-pulse`).
- No `Card` wrappers around sections.

## 3. Dashboard (home) page

- `DashboardPage.vue` composes feature modules from `src/components/dashboard/` in a responsive grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6`.
- Reuse feature components (`NetsModule`, `ActivityFeed`, `PersonalStatsModule`) instead of duplicating their markup.
- Banners and alerts sit above the grid with `mb-4 lg:mb-6`.

## Breakpoints

- Mobile: default (below 640px). `sm:` 640px, `md:` 768px, `lg:` 1024px, `xl:` 1280px.
- Mobile only: `lg:hidden`. Desktop only: `hidden lg:flex`.
