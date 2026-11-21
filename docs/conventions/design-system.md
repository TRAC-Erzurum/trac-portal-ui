# Design system

Source of truth: the CSS tokens and shared classes in `src/style.css`. Components use tokens, not literal colors.

## Colors

- Use semantic token classes: `bg-background`, `text-foreground`, `bg-primary`, `text-primary-foreground`, `text-muted-foreground`, `border`, `bg-muted`, `text-destructive`.
- Never hardcode hex/oklch values in templates or `<style>`. Tokens are defined on `:root` and `.dark` in `src/style.css`.
- Brand: TRAC Blue (`#0c0563` in brand material) is the primary token. The base palette is neutral gray.
- `components.json` names the base color `stone`; the actual tokens in `style.css` are authoritative.
- ECharts and Leaflet take literal color strings. Keep them consistent with the token palette and check both themes.
- Dark mode: prefer token classes (they switch automatically). Where a literal is needed, add a `dark:` variant (e.g. `text-red-600 dark:text-red-400`).
- Never rely on color alone to convey state (see `accessibility.md`).

## Typography

- Font: Rajdhani, bundled in `src/assets/fonts/` and declared with `@font-face` in `src/style.css`. Do not load other font families. An Orbitron font file is bundled but not referenced by `style.css`; do not use it without a decision.
- Page title: `text-2xl lg:text-3xl font-bold` (the `AppLayout` title already applies this).
- Section title: `text-sm font-medium text-muted-foreground flex items-center gap-2` with an `h-4 w-4` icon.
- Field label: `text-xs text-muted-foreground`.
- Field value: `font-medium`.

## Shape and depth

- Elements: `rounded-md` or `rounded-lg`. Badges and avatars: `rounded-full`. The base radius token is `--radius` (0.625rem).
- Shadows are minimal. Separate content with borders and `Separator`. The mobile FAB is the one place that uses `shadow-lg`.

## Spacing

- List page wrapper: `space-y-4`. Detail page wrapper: `space-y-6`.
- Section separator: `<Separator class="my-8" />`.
- Grid gap: `gap-3` for card grids, `gap-4 lg:gap-6` on dashboard modules.
- Use the Tailwind spacing scale (multiples of 4px). Avoid arbitrary pixel values unless a layout requires them.

## Icons

- `lucide-vue-next` only. Standard size `h-4 w-4`; FAB icon `h-6 w-6`.
- Icon before text inside a button: `mr-2` (or `gap-2` on the button).
- Icon-only buttons need an accessible name (see `accessibility.md`).

## Shared utility classes (`src/style.css`, `@layer components`)

Use these instead of re-declaring the same class strings:

- `trac-page-action-btn`: create/primary action in a page header.
- `trac-top-actions`: right-hand action group in a list page header.
- `trac-load-more-btn`: "Load more" button width.
- `trac-sheet-actions` and `trac-sheet-btn`: sheet footer row and buttons.
- `trac-btn-destructive-outlined`, `trac-btn-icon-destructive`: destructive actions.
- `trac-mobile-action-row`, `trac-card-action-btn`, `trac-icon-btn-xs`, `trac-chip-remove-btn`: card and chip actions.

Add a new `trac-*` class only when the same class string would otherwise repeat across several components.
