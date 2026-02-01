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
| Dashboard | `/dashboard` | DONE | StatusBar, ActivityFeed, NetsModule, CommunityModule |
| Net List | `/nets` | DONE | Responsive grid, filters, search, create via Sheet |
| Net Detail | `/nets/:id` | WIP | View, attendee management, edit via Sheet |
| Operators | `/operators` | DONE | Search, 3-column grid, pagination |
| Operator Profile | `/operators/:id` | DONE | Profile, stats, recent nets, admin edit |
| Account | `/account` | DONE | Personal info, operator info, password (renamed from Profile) |

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

### Phase 3: App Layout - COMPLETE

* \[x] Sidebar component (desktop, collapsible)
* \[x] Bottom navigation (mobile)
* \[x] Page header component with UserMenu
* \[x] Theme store (system/dark/light, localStorage)
* \[x] Locale store (system/tr/en, localStorage)
* \[x] ThemeToggle + LangToggle components
* \[x] UserMenu dropdown (avatar, profile link, logout)
* \[x] Profile page (account info, operator info, password change, preferences)
* \[x] AuthLayout component (shared layout for login/register/forgot-password)

### Phase 4: Dashboard - COMPLETE

* \[x] StatusBar (call sign + active nets indicator)
* \[x] ActivityFeed (timeline with events)
* \[x] NetsModule (active nets, recent completed, personal stats)
* \[x] CommunityModule (last 3 months stats, leaderboards)
* \[x] Activity system (backend EventEmitter + Activity entity)
* \[x] Dashboard v2 API endpoints
* \[x] Consistent card-based grid design for all lists/stats
* \[x] Clickable leaderboards (operators → profile, nets → detail)
* \[x] Totals link to list pages (participants → operators, nets → nets)

### Phase 5: Nets Module - IN PROGRESS

* \[x] Net list page (responsive grid, search, status/date filters)
* \[x] Net create Sheet (searchable operator select)
* \[x] Net detail page (header, status, actions)
* \[x] Net edit Sheet (for pending nets)
* \[x] Attendee management panel (search, add, edit, delete)
* \[x] Unified attendee entry flow (existing + new operators)
* \[x] QTH editing for attendees
* \[x] Dashboard: pending nets display
* \[x] Dashboard: max 3 nets with priority (active > pending > completed)
* \[x] Consistent status indicators (green pulse=active, yellow=pending, gray=completed)
* \[ ] Attendee panel UX refinements (ongoing)
* \[ ] Keyboard shortcuts for fast attendee entry

### Phase 6: Operators Module - COMPLETE

* \[x] Operator list with search (responsive 1/2/3 column grid)
* \[x] Operator detail page (profile, stats, recent nets)
* \[x] Admin edit operator (EditOperatorAdminSheet)
* \[x] Backend: `/operator/:id/stats` endpoint
* \[x] Backend: `/operator/:id/recent-nets` endpoint
* \[x] Guest restriction (toast + redirect)
* \[x] Profile → Account rename (`/profile` → `/account`)

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

## Future Features (Planned)

These are potential future enhancements beyond the core modernization:

| Feature | Description | Status |
|---------|-------------|--------|
| QTH Locator | Map-based locator visualization for operators | Idea |
| Inventory Management | Operators can list/manage their radio equipment | Idea |
| Forum/Discussion | Community knowledge sharing area | Idea |

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
* `LangToggle` component in header and settings
* Language selection UI in Settings page

### Theme System - DONE

* Theme store: system/dark/light modes
* Saved to localStorage (`trac-theme`)
* Default: system, fallback: dark
* `ThemeToggle` component in header and settings
* Theme selection UI in Settings page

### Google Login

* **TODO**: Callback URL redirect to v2

***

## Design System

### Core Principles

| Principle | Description |
|-----------|-------------|
| Flat Design | No heavy cards, use subtle borders and separators |
| Consistency | Same design language across all pages |
| Mobile-first | Responsive grids (1 col mobile, 2-3 cols desktop) |
| Full Width | Utilize entire screen width, no cramped layouts |

### Component Patterns

| Pattern | Usage |
|---------|-------|
| Card Grid | Lists use `border border-border/50` with hover effects |
| Page Size | Always divisible by grid columns (e.g., 24 for 2/3 col) |
| Edit Forms | Sheet/Drawer, pre-filled with current data |
| Navigation | Breadcrumb for drill-down pages |
| Stats | Card grid with centered content, icons + numbers |

### Color Usage

| Element | Color |
|---------|-------|
| Primary Accent | TRAC Blue (#0c0563) - sparingly |
| Background | Zinc neutral grays |
| Borders | `border-border/50` (subtle) |
| Hover | `hover:border-border hover:bg-muted/30` |
| Active State | Green accent for active nets |

***

## Known Issues

| Issue | Severity | Notes |
|-------|----------|-------|
| District name mismatch | Minor | Some DB records have Turkish chars (Palandöken) vs API (Palandoken) |
| City trailing spaces | Minor | Some DB records have trailing spaces, fixed with `.trim()` in UI |

***

## Changelog

### 2026-01-31 (Session 2)

* Phase 5 (Nets Module) major progress:
  * Net list page with responsive grid, search, status/date filters
  * Net detail page with status header and action buttons
  * CreateNetSheet with searchable operator selection (debounced, role-filtered)
  * EditNetSheet for pending nets
  * Attendee management panel completely refactored:
    * Unified flow for existing and new operators
    * QTH (city/district) always editable
    * Same panel design for both flows
    * Click outside to close dropdown
    * Keyboard navigation (arrows, enter, escape)
  * EditAttendeeSheet with proper padding
* Dashboard enhancements:
  * Pending nets endpoint and display
  * Priority-based display (active > pending > completed, max 3)
  * Consistent card heights across all net types
  * Status indicator consistency (green pulse, yellow static, gray)
  * StatusBar active indicator changed from blue to green
* Backend:
  * `/v2/dashboard/nets/pending` endpoint
  * `getPendingNets()` service method
* i18n keys added for nets module
* Multiple bug fixes in attendee management

### 2026-02-01

* Phase 6 (Operators Module) completed:
  * Operator list page with search, responsive grid (1/2/3 cols)
  * Operator profile page with stats, recent nets, breadcrumb
  * Admin edit operator via Sheet
  * Backend endpoints for stats and recent nets
* Phase 4 (Dashboard) enhancements:
  * Consistent card-based design across all modules
  * Leaderboards now clickable (navigate to profile/net detail)
  * Total stats link to corresponding list pages
  * Backend returns `operatorId` and `netId` for leaderboard entries
* Guest user restrictions with toast message
* Profile renamed to Account (`/profile` → `/account`)
* Navigation updated (Sidebar, BottomNav, UserMenu)
* i18n keys added for operators module
* Design language unified: all lists use card grid with subtle borders

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
* Phase 3 completed:
  * Sidebar (collapsible, desktop)
  * Bottom navigation (mobile)
  * PageHeader component with UserMenu
  * UserMenu dropdown (avatar, profile link, logout)
  * AuthLayout for auth pages (login/register/forgot-password)
  * Profile page (account, operator, password change, preferences)
  * Settings page removed (merged into Profile)
  * shadcn avatar + dropdown-menu components added
