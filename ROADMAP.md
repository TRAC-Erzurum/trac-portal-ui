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
| Dashboard | `/dashboard` | DONE | ActivityFeed, NetsModule, PersonalStats, CommunityModule |
| Net List | `/nets` | DONE | Responsive grid, filters, search, create via Sheet |
| Net Detail | `/nets/:id` | DONE | View, attendee management, edit via Sheet |
| Net Report | `/nets/:id/report` | DONE | Attendee list table, export to PDF/PNG/CSV |
| Operators | `/operators` | DONE | Search, 3-column grid, pagination, membership filter |
| Operator Profile | `/operators/:id` | DONE | Profile, stats, recent nets, admin edit, account info (admin) |
| Account | `/account` | DONE | Personal info, operator info, password (renamed from Profile) |

### Static Pages

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Landing | `/` | DONE | Unauthenticated homepage |
| Privacy Policy | `/privacy` | DONE | Placeholder, content TODO |
| Not Found | `/404` | DONE | Minimal |
| Forbidden | `/403` | DONE | Minimal |
| Server Error | `/500` | DONE | Minimal |

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

* \[x] ActivityFeed (timeline with events, load more pagination)
* \[x] NetsModule (active/pending/completed nets with priority display)
* \[x] PersonalStatsModule (attended, managed, streak - personal labels)
* \[x] CommunityModule (last 3 months stats, leaderboards with dividers)
* \[x] Activity system (backend EventEmitter + Activity entity)
* \[x] Dashboard v2 API endpoints (with offset support)
* \[x] Consistent card-based grid design for all lists/stats
* \[x] Clickable leaderboards (operators → profile, nets → detail)
* \[x] Totals link to list pages (participants → operators, nets → nets)
* \[x] Desktop layout: 6 nets + activities side-by-side, stats below
* \[x] Mobile layout: 3 nets, activities with load more, stats
* \[x] Consistent dividers/separators between all sections
* \[x] Activity pagination (3 items, load more button)

### Phase 5: Nets Module - COMPLETE

* \[x] Net list page (responsive grid, search, status/date filters)
* \[x] Net create Sheet (searchable operator select, sorted by managed count)
* \[x] Net detail page (header, status, actions)
* \[x] Net edit Sheet (for pending nets)
* \[x] Attendee management panel (search, add, edit, delete)
* \[x] Unified attendee entry flow (existing + new operators)
* \[x] QTH editing for attendees
* \[x] Dashboard: pending nets display (max 6 desktop, max 3 mobile)
* \[x] Consistent status indicators (green pulse=active, blue=pending, gray=completed)
* \[x] Keyboard navigation (arrows, enter, escape, tab)
* \[x] Focus management (search input focused after operations)
* \[x] Net report page (attendee list table, export to PDF/PNG/CSV)
* \[x] Backend pagination/sorting for net list (status priority + createdAt DESC)

### Phase 6: Operators Module - COMPLETE

* \[x] Operator list with search (responsive 1/2/3 column grid)
* \[x] Operator detail page (profile, stats, recent nets)
* \[x] Admin edit operator (EditOperatorAdminSheet)
* \[x] Backend: `/operator/:id/stats` endpoint
* \[x] Backend: `/operator/:id/recent-nets` endpoint
* \[x] Guest restriction (toast + redirect)
* \[x] Profile → Account rename (`/profile` → `/account`)
* \[x] Membership filter (registered/unregistered)
* \[x] Sorting: registered users first, then callSign alphabetically
* \[x] Operator search with sortBy parameter (managed/attended/default)

### Phase 7: Admin Features - DONE

* \[x] Admin account section in operator profile (email, role, member since)
* \[x] Role change for users (admin can change lower roles)
* \[x] Password reset for users (admin can reset lower role passwords)
* \[x] Profile picture upload (Account page)
* \[x] Password reset requests management (dashboard alert + sheet)

### Phase 8: Polish - DONE

* \[x] Error boundaries (global error handler, ErrorBoundary component, 403/500 pages)
* \[x] Skeleton loaders (Skeleton component, improved loading states)
* \[x] Accessibility audit (ARIA labels, alt texts, focus management)
* \[x] Performance optimization (vendor chunk splitting, lazy loading)

### Phase 9: Migration

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
* Admin dashboard alert + sheet for processing requests
* `GET /auth/password-reset-requests` - List pending requests (admin only)
* `GET /auth/password-reset-requests/count` - Pending count (admin only)
* `POST /auth/password-reset-requests/:id/approve` - Approve and generate password
* `POST /auth/password-reset-requests/:id/reject` - Reject request

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
| Pending State | Blue accent for scheduled nets |
| Completed State | Muted/gray for completed nets |

***

## Known Issues

| Issue | Severity | Notes |
|-------|----------|-------|
| District name mismatch | Minor | Some DB records have Turkish chars (Palandöken) vs API (Palandoken) |
| City trailing spaces | Minor | Some DB records have trailing spaces, fixed with `.trim()` in UI |

***

## Changelog

### 2026-02-01 (Session 6)

* Phase 8 (Polish) completed:
  * Error boundaries: Global error handler in main.ts, ErrorBoundary component
  * Error pages: 403 Forbidden, 500 Server Error pages with retry/home buttons
  * Skeleton component added to ui library
  * Improved skeleton loaders for NetReportPage
  * Accessibility: ARIA labels for icon-only buttons (theme/lang toggles, copy buttons)
  * Accessibility: alt attributes for images (UserAvatar)
  * Performance: Vite build config with manual chunks (vue-vendor, ui-vendor)
* Activity system simplified:
  * Removed less useful activity types (net.updated, net.deleted, attendee.updated, etc.)
  * Kept only meaningful activities: net.created, net.started, net.ended, attendee.added
  * Cleaned up backend services and frontend ActivityFeed
* Temporary password UX improved:
  * Removed dialog, created dedicated ForceChangePasswordPage
  * Router guards enforce password change before accessing any page
* Default avatar system:
  * Added default-avatar.png
  * Created UserAvatar component with error fallback
  * Applied consistently across all avatar displays
* Operator list role filter added
* i18n updates for error pages and accessibility labels

### 2026-01-31 (Session 5)

* Phase 7 (Admin Features) completed:
  * Password reset requests management for admins
  * Dashboard alert badge showing pending request count
  * Sheet UI for reviewing, approving, and rejecting requests
  * Temporary password system with forced password change on first login
  * Permanent dialog showing generated password with copy functionality
  * User entity extended with `isTemporaryPassword` flag
  * Login response includes `isTemporaryPassword` status
  * Mandatory password change dialog on login when using temporary password
  * Backend endpoints for list, count, approve, reject operations
  * Created Dialog UI components (shadcn-vue style)

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

### 2026-02-01 (Session 4)

* Code organization refactoring:
  * Created `lib/formatters.ts` - date, callSign formatting
  * Created `lib/ui-helpers.ts` - getRoleBadgeClass, UserRole type
  * Created `composables/useAvatarUrl.ts` - avatar URL helper
  * Created `components/shared/` - NetCard, OperatorCard, skeletons
  * Removed duplicate code from 7+ files
* UI consistency improvements:
  * Role badges now colored consistently across all pages
  * Edit buttons: icon + text (not icon-only)
  * AccountPage & ProfilePage layouts aligned
  * Report opens in new tab
* Cursor rules consolidated to `.cursor/rules/` (project root)

### 2026-02-01 (Session 3)

* Phase 5 (Nets Module) completed:
  * Net report page with attendee table and export (CSV/PDF/PNG)
  * Direct export from Net Detail page (no need to open report)
  * Backend pagination/sorting for net list
  * Pending status color changed from yellow to blue
* Phase 6 (Operators Module) enhancements:
  * Membership filter added (All/Registered/Unregistered)
  * Sorting: registered users first, then callSign alphabetically
  * Operator search with sortBy parameter:
    * `managed` - for net operator dropdown (sorted by managed count)
    * `attended` - for attendee search (sorted by attendance count)
* i18n updates:
  * Membership labels: "Kayıtlı/Registered", "Kayıtsız/Unregistered"
  * Status consistency: "Tamamlandı" (not "Tamamlanan")

### 2026-02-01 (Session 2)

* Dashboard major redesign:
  * Desktop: 6 nets (2 rows) + activities side-by-side
  * Mobile: 3 nets + activities with load more
  * PersonalStatsModule separated from NetsModule
  * Consistent dividers between all sections (horizontal + vertical)
  * Leaderboard columns with vertical dividers
* ActivityFeed improvements:
  * Initial load: 3 items
  * Load more button (small, text style)
  * Fixed height container with internal scroll (after 3+ items)
  * Backend: offset parameter support added
* i18n updates:
  * "İstatistiklerim" (not "İstatistiklerin")
  * "Katıldığım Çevrim", "Yönettiğim Çevrim", "Ardışık Katılım"
  * "My Stats", "Nets Attended", "Nets Managed", "Streak"
  * Status labels: "Planlandı"/"Scheduled", "Tamamlandı"/"Completed"
* UI polish:
  * All buttons converted to outline variant
  * Theme/language toggles use Lucide icons (not emojis)
  * Profile photo border adapts to theme
  * Full width layouts on desktop

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
