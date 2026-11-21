# Components and interaction patterns

## Component structure

- Every component uses `<script setup lang="ts">`. No Options API.
- Props: `defineProps<Props>()` with a TypeScript interface. Emits: `defineEmits<{ ... }>()` with typed payloads.
- Prefer `computed` for derived state; `ref` for primitives and objects.
- Put reusable logic in `src/composables/` (see `file-structure.md`).
- Component file names are PascalCase. New components must have multi-word names (ESLint enforces this; `Captcha`, `Breadcrumb` and `Sidebar` are legacy exceptions).

## Primitives

- Use the existing shadcn-vue primitives from `@/components/ui/` (Button, Input, Select, Sheet, Dialog, DropdownMenu, Checkbox, Skeleton, Separator, Avatar, ...).
- Do not hand-edit files under `src/components/ui/`. They are generated and kept close to upstream.
- Do not add a new UI library. Do not use `Card` for page sections.

## Buttons

- Every button uses `variant="outline"`. Solid (`default`) buttons are not used in pages or feature components.
- Edit and secondary actions: `variant="outline" size="sm"` with an icon and text.
- Destructive actions: `trac-btn-destructive-outlined` (or `text-red-600 hover:text-red-700 dark:text-red-400`).

## Editing: Sheet, not inline or separate pages

- Clicking an item opens a `Sheet` sliding from the right (the `SheetContent` default). The form lives in the sheet body; Save and Cancel are in the sheet footer (`trac-sheet-actions`).
- Do not implement inline editing or a separate edit route for a single record.
- Escape closes the sheet (reka-ui default; do not block it without reason).

## Lists

- Always provide a loading skeleton, an empty state, and the list.
- Use shared card components from `src/components/shared/` (`NetCard`, `OperatorCard`, `BranchCard`, `CommunicationChannelCard`, `MemberCard`, ...) before creating a new card.
- Pagination is "Load more" only (see `page-layouts.md`). No numbered pagination.

## Sections and separators

- Separate major sections with `<Separator class="my-8" />`.
- Do not wrap page sections in `Card`. `Card` is for repeated list items only.
- Avoid `text-center` for content blocks; the empty state is the one exception (`py-8 text-center`).
- Full-width page content. No `max-w-*` on feature pages; auth pages are the exception.

## Confirmations and feedback

- Destructive confirmation: a `Dialog` with explicit confirm and cancel buttons (the codebase has no `AlertDialog` primitive). Several pages still use native `confirm()` (e.g. `OidcClientsPage`, `NetDetailPage`); do not add new ones.
- Success, info and error feedback: `toast` from `vue-sonner`. Error text goes through `translateError()` (see `i18n.md`).
- Show loading state with a `ref<boolean>` and `try/catch/finally`; disable the triggering control while busy.

## Forms

- Client-side validation with `useFormValidation` (`src/composables/useFormValidation.ts`). Show field-level messages next to the field.
- Keep forms short; prefer selects and presets over free text when the domain allows.
