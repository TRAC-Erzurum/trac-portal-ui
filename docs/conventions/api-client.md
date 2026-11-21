# API client, auth and state

## HTTP client

- Use the shared `api` instance from `@/lib/api`: `api.get`, `api.post`, `api.patch`, `api.put`, `api.delete`. Do not use `axios` or raw `fetch` for API calls.
- The client sends `credentials: 'include'`. JSON bodies are serialized automatically; `FormData` is sent as-is.
- Type responses: `api.get<MyType>('/path')`. Keep the types in `src/types/` or next to the store.
- Errors are thrown as `ApiError` (`{ message, statusCode }`), exported from `@/lib/api`.
- `VITE_API_URL` is the base for every call. The app fails fast if it is missing.

## Authentication

- Auth is a JWT in an httpOnly cookie set by the API. The UI never reads or stores the token.
- The auth store (`src/stores/auth.ts`) holds the current user and role checks. Use it for permission checks in the UI.
- `api.ts` does not redirect on 401 by itself. Do not assume auto-logout exists; handle `statusCode === 401` where the flow requires it.
- Roles (shared with the API): `super_admin > president > admin > member > volunteer > guest`, encoded as a hierarchy in `src/stores/auth.ts`. Global roles (`guest`, `super_admin`) apply at user level; branch roles (`admin`, `member`, `volunteer`, `president`) apply within a branch. Do not offer `super_admin` or `guest` in branch-role selects.
- The UI hides controls for missing permissions as a convenience only. The API must enforce the same rule.

## Stores (Pinia)

- Use the setup syntax: `defineStore('name', () => { ... })`. Store ids are kebab-case.
- Existing stores: `auth`, `branch`, `theme`, `locale`, `feedback`, `cookieConsent`.
- Loading flags are `ref<boolean>` set in `try/finally`.

## Routing

- Routes are lazy-loaded: `component: () => import('@/pages/...')`.
- Typed `meta` (declared in `src/router/index.ts`): `requiresAuth`, `guestOnly`, `minRole`, `requiresRequestQueueAccess`, `forceChangePassword`, `titleKey` (document title, i18n key).
- Guards in the router enforce auth and role meta. Adding a page means adding its route, its `titleKey`, and both locale entries.
