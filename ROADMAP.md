# TRAC Portal UI Modernization

## Project Overview

| Item | Value |
|------|-------|
| **Goal** | Modern, responsive, dark-first UI |
| **Tech Stack** | Vue 3 + Vite + shadcn-vue + Tailwind CSS |
| **Start Date** | January 2026 |
| **New App Path** | `v2/` |
| **Legacy Path** | `app/` (Nuxt + Vuetify, to be removed) |

---

## Key Decisions

### 2026-01-31: Initial Planning

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Vue 3 + Vite | Lighter than Nuxt, no SSR needed |
| UI Library | shadcn-vue | Modern, accessible, full code ownership |
| Styling | Tailwind CSS | Utility-first, dark mode native |
| Color Scheme | Slate Professional | Dark-first, WCAG AAA compliant |
| Primary Color | Sky Blue (#38BDF8) | Modern, accessible |
| Navigation (Desktop) | Collapsible Sidebar | 2025 standard pattern |
| Navigation (Mobile) | Bottom Navigation Bar | Touch-friendly |
| Editing Pattern | Sheet/Drawer | Consistent UX, no modals for forms |
| Responsive Strategy | Single codebase | Easier maintenance than separate views |
| State Management | Pinia | Official Vue recommendation |
| Form Validation | VeeValidate | Best Vue integration |
| HTTP Client | TanStack Query + fetch | Caching, optimistic updates |
| Icons | Lucide Vue | Tree-shakeable, consistent |

---

## Page Inventory

### Auth Pages (Standalone layout, no sidebar)

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Login | `/login` | ✅ DONE | Split screen design |
| Register | `/register` | ✅ DONE | Same layout as login |
| Forgot Password | `/forgot-password` | ✅ DONE | Call sign based request |

### App Pages (With sidebar layout)

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Dashboard | `/` | 🔲 TODO | Bento grid, stats, recent nets |
| Net List | `/nets` | 🔲 TODO | DataTable, filters, create via Sheet |
| Net Detail | `/nets/:id` | 🔲 TODO | Combined view/manage/report, edit via Sheet |
| Operators | `/operators` | 🔲 TODO | Search, list |
| Settings | `/settings` | 🔲 TODO | Profile, account, preferences |

### Static Pages

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Privacy Policy | `/privacy` | 🔲 TODO | Static |
| Not Found | `/404` | 🔲 TODO | Minimal |
| Forbidden | `/403` | 🔲 TODO | Minimal |

### Consolidated/Removed Pages

| Legacy Route | New Location | Notes |
|--------------|--------------|-------|
| `/nets/create` | Sheet in `/nets` | No separate page |
| `/nets/:id/edit` | Sheet in `/nets/:id` | No separate page |
| `/nets/:id/manage` | Tab in `/nets/:id` | Combined |
| `/nets/:id/report` | Tab in `/nets/:id` | Combined |
| `/users/:id/edit` | `/settings` | Moved |
| `/users/:id/profile` | `/settings` | Moved |
| `/users/:id/operator/create` | Sheet in `/settings` | No separate page |
| `/users/:id/operator/edit` | Sheet in `/settings` | No separate page |

---

## Development Phases

### Phase 1: Foundation ✅ COMPLETE

- [x] Create v2/ folder structure
- [x] Vue 3 + Vite setup
- [x] Tailwind CSS v4 installation
- [x] shadcn-vue installation (New York style, Slate base)
- [x] Dark mode as default
- [x] Base components (Button, Card, Input, Label, Sonner)
- [ ] Custom color theme (Sky blue primary) - TODO
- [ ] Base layout components - Moving to Phase 3

### Phase 2: Authentication ✅ COMPLETE

- [x] Auth store (Pinia)
- [x] Login page
- [x] Register page
- [x] Forgot password page
- [x] Route guards

### Phase 3: App Layout

- [ ] Sidebar component (desktop)
- [ ] Bottom navigation (mobile)
- [ ] Page header component
- [ ] Theme toggle persistence
- [ ] User menu

### Phase 4: Dashboard

- [ ] Stats cards
- [ ] Recent nets widget
- [ ] Quick actions
- [ ] Empty/loading states

### Phase 5: Nets Module

- [ ] Net list with DataTable
- [ ] Filters and search
- [ ] Net detail page with tabs
- [ ] Net create/edit Sheet
- [ ] Attendee management panel

### Phase 6: Operators & Settings

- [ ] Operator list
- [ ] Settings page
- [ ] Profile management
- [ ] Operator create/edit
- [ ] Theme toggle (dark/light/system) in settings
- [ ] Language selection (tr/en) in settings

### Phase 7: Polish

- [ ] Error boundaries
- [ ] Toast notifications
- [ ] Skeleton loaders
- [ ] Accessibility audit
- [ ] Performance optimization

### Phase 8: Migration

- [ ] Final testing
- [ ] Remove legacy `app/` folder
- [ ] Update build/deploy scripts
- [ ] DNS/routing switch

---

## Changelog

### 2026-01-31
- Initial roadmap created
- Technology stack decided
- Page inventory defined
- Phase plan established
- v2/ folder created with Vite + Vue 3
- Tailwind CSS v4 + shadcn-vue installed
- Dark mode configured as default
- Test page working successfully
- Auth pages completed (Login, Register, Forgot Password)
- Toast notifications configured (vue-sonner)

---

## Backend Implementation Notes

### Password Reset Flow ✅ DONE

- `POST /api/auth/password-reset-request` endpoint created
- `password_reset_requests` table with migration
- Links to operator if call sign exists in database
- Admin feature to process requests (pending)

### Cloudflare Turnstile CAPTCHA ✅ DONE

- `TurnstileService` for token verification
- Integrated into login, register, password-reset-request endpoints
- Auto-disabled when env key is empty
- `TURNSTILE_SECRET_KEY` env variable added

### Internationalization (i18n) ✅ DONE

- vue-i18n configured with Turkish (tr) and English (en)
- Default language: browser preference
- `translateError()` helper for API error messages
- All backend errors return i18n keys (e.g., `error.invalidCredentials`)
- **TODO**: Language selection in settings page
