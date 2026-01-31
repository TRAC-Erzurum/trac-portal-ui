# TRAC Portal UI Modernization

## Project Overview

| Item | Value |
|------|-------|
| **Goal** | Modern, responsive, dark-first UI |
| **Tech Stack** | Vue 3 + Vite + shadcn-vue + Tailwind CSS |
| **Start Date** | January 2026 |
| **New App Path** | `v2/` |
| **Legacy Path** | `app/` (Nuxt + Vuetify, to be removed) |

***

## Key Decisions

### 2026-01-31: Initial Planning

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Vue 3 + Vite | Lighter than Nuxt, no SSR needed |
| UI Library | shadcn-vue | Modern, accessible, full code ownership |
| Styling | Tailwind CSS | Utility-first, dark mode native |
| Color Scheme | Zinc Neutral | Clean, professional |
| Primary Color | TRAC Blue (#0c0563) | Brand color |
| Navigation (Desktop) | Collapsible Sidebar | 2025 standard pattern |
| Navigation (Mobile) | Bottom Navigation Bar | Touch-friendly |
| Editing Pattern | Sheet/Drawer | Consistent UX, no modals for forms |
| Responsive Strategy | Single codebase | Easier maintenance than separate views |
| State Management | Pinia | Official Vue recommendation |
| Icons | Lucide Vue | Tree-shakeable, consistent |

***

## Page Inventory

### Auth Pages (Standalone layout, no sidebar)

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Login | `/login` | DONE | Split screen design |
| Register | `/register` | DONE | Same layout as login |
| Forgot Password | `/forgot-password` | DONE | Call sign based request |

### App Pages (With sidebar layout)

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Dashboard | `/dashboard` | TODO | Bento grid, stats, recent nets |
| Net List | `/nets` | TODO | DataTable, filters, create via Sheet |
| Net Detail | `/nets/:id` | TODO | Combined view/manage/report, edit via Sheet |
| Operators | `/operators` | TODO | Search, list |
| Settings | `/settings` | TODO | Profile, account, preferences |

### Static Pages

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Landing | `/` | DONE | Unauthenticated homepage |
| Privacy Policy | `/privacy` | DONE | Placeholder, content TODO |
| Not Found | `/404` | DONE | Minimal |
| Forbidden | `/403` | TODO | Minimal |

***

## Development Phases

### Phase 1: Foundation - COMPLETE

* \[x] Create v2/ folder structure
* \[x] Vue 3 + Vite setup
* \[x] Tailwind CSS v4 installation
* \[x] shadcn-vue installation (New York style)
* \[x] Dark mode as default
* \[x] Base components (Button, Card, Input, Label, Sonner)
* \[x] Rajdhani font (local)

### Phase 2: Authentication - COMPLETE

* \[x] Auth store (Pinia)
* \[x] Login page
* \[x] Register page
* \[x] Forgot password page
* \[x] Route guards
* \[x] API client with cookie auth

### Phase 3: App Layout

* \[ ] Sidebar component (desktop)
* \[ ] Bottom navigation (mobile)
* \[ ] Page header component
* \[x] Theme store (system/dark/light, localStorage)
* \[x] Locale store (system/tr/en, localStorage)
* \[x] ThemeToggle component
* \[x] LangToggle component
* \[ ] User menu
* \[ ] Settings page (theme/locale selection UI)

### Phase 4: Dashboard

* \[ ] Stats cards
* \[ ] Recent nets widget
* \[ ] Quick actions
* \[ ] Empty/loading states

### Phase 5: Nets Module

* \[ ] Net list with DataTable
* \[ ] Filters and search
* \[ ] Net detail page with tabs
* \[ ] Net create/edit Sheet
* \[ ] Attendee management panel

### Phase 6: Operators & Settings

* \[ ] Operator list
* \[ ] Settings page
* \[ ] Profile management
* \[ ] Operator create/edit

### Phase 7: Polish

* \[ ] Error boundaries
* \[ ] Skeleton loaders
* \[ ] Accessibility audit
* \[ ] Performance optimization

### Phase 8: Migration

* \[ ] Final testing
* \[ ] Remove legacy `app/` folder
* \[ ] Update build/deploy scripts
* \[ ] DNS/routing switch

***

## Backend Implementation Notes

### Password Reset Flow - DONE

* `POST /api/auth/password-reset-request` endpoint
* `password_reset_requests` table with migration
* Links to operator if call sign exists in database
* Duplicate pending requests prevented (silent skip)
* Logging for unknown call signs and duplicate requests
* **TODO**: Admin feature to process requests

### Cloudflare Turnstile CAPTCHA - DONE

* `TurnstileService` implementing `CaptchaService` interface
* Integrated into login, register, password-reset-request endpoints
* Auto-disabled when `TURNSTILE_SECRET_KEY` env is empty
* Frontend `Captcha.vue` component with theme sync

### Internationalization (i18n) - DONE

* vue-i18n with Turkish (tr) and English (en)
* Locale store: system/tr/en modes
* Saved to localStorage (`trac-locale`)
* Default: system, fallback: Turkish
* `translateError()` helper for API errors
* Backend errors return i18n keys
* `LangToggle` component ready
* **TODO**: Language selection UI in settings

### Theme System - DONE

* Theme store: system/dark/light modes
* Saved to localStorage (`trac-theme`)
* Default: system, fallback: dark
* `ThemeToggle` component ready
* **TODO**: Theme selection UI in settings

### Google Login

* **TODO**: Callback URL redirect to v2

***

## Changelog

### 2026-01-31

* Initial roadmap created
* v2/ folder created with Vite + Vue 3
* Tailwind CSS v4 + shadcn-vue installed
* Auth pages completed (Login, Register, Forgot Password)
* Toast notifications configured (vue-sonner)
* i18n support added (tr/en)
* Theme/Locale stores with persistence
* Landing page, 404 page, Privacy page created
* Login/Logout functionality working
