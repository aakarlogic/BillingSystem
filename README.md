# पावती (Pavti): restaurant billing (React + TypeScript)

Same folder structure as the Health 360 frontend, with our own design (no MatDash).
Marathi by default, plus Hindi and English.

## Run

```bash
npm install
npm run dev          # http://localhost:5180
npm test             # billing math + mock backend rules (19 tests)
npm run typecheck    # strict TypeScript
npm run check:i18n   # every text key exists in mr / hi / en
npm run build
```

Demo: on the login page tap **Owner**, **Staff** (waiter) or **Platform Admin**.

## Folder structure

```
src/
  configs/app.config.ts      API url + mock switch (VITE_USE_MOCK_API)
  routes/Router.tsx          every page, lazy-loaded; ProtectedRoute / PublicRoute / MenuActionGuard
  services/                  BaseService (axios + token), ApiService.fetchData, one XxxService.ts per domain
  services/mock/             in-browser backend used while the real API is not ready (same urls)
  types/                     one file per domain; responses are { Success, StatusCode, Message, Data }
  views/<module>/            pages: authentication, landing, guide, dashboard, tables, billing,
                             payments, menu, customers, reports, user-management, settings, audit,
                             user-profile, platform
  layouts/full/              app shell: vertical/sidebar (Sidebaritems.ts, menuBinding.ts), vertical/header
  layouts/blank/             BlankLayout (login), FrontendLayout (public website)
  components/route|ui|shared|landingpage
  context/                   UserDataContext (person + page rights), LanguageContext
  guards/jwt/                token helpers
  hooks/                     useApi (load data), useAction (save + toast), use-mobile
  utils/                     billing.ts (bill math), session.ts, i18n.ts, languages/, hooks/useAuth.ts
  css/                       globals, layouts, pages, theme (saffron / maroon)
database/                    MySQL schema + seed (22 tables, page rights, no foreign keys)
```

## Page rights

Login loads `/Menu/GetMenuBinding`: the pages this person may open, with view / add / edit /
delete / export (from `role_page_rights` + the staff ticks in `user_permissions`, see
`database/README.md`). The side menu is built from it, and `MenuActionGuard` blocks a page
the role cannot open. The backend must check the same rules again on every call
(`services/mock/handlers.ts` shows how).

## Connecting the real backend

1. Build the API with the urls in `src/services/*Service.ts` (POST, `{ Success, StatusCode, Message, Data }`).
2. Create `.env` with `VITE_USE_MOCK_API=false` and `VITE_API_BASE_URL=https://your-server/api`.
3. Login must return `{ accessToken, user, mustChangePassword }` (`types/auth.ts`).
