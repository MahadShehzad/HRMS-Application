# PeopleCore HRMS

A Human Resource Management System built with **Angular 21**, **Bootstrap 5.3**, SCSS and TypeScript.
It uses standalone components, signals, zoneless change detection and lazy-loaded features.

## Quick start

```bash
npm install
npm start            # http://localhost:4200
npm run build        # production build → dist/HRMS
npm test             # unit tests (Vitest)
```

### Demo accounts

| Role        | Email                    | Password   | Sees                                   |
| ----------- | ------------------------ | ---------- | -------------------------------------- |
| Admin       | `admin@peoplecore.io`    | `admin123` | Everything, incl. System settings       |
| HR Manager  | `hr@peoplecore.io`       | `hr123`    | All HR modules, approvals, payroll      |
| Employee    | `employee@peoplecore.io` | `emp123`   | Self-service: clock-in, leave, payslips |

The login page has one-click buttons for each account.

## Features

| Module        | What it does                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------- |
| Dashboard     | Live clock-in card, KPIs, attendance trend, headcount, approvals queue, celebrations, holidays  |
| Employees     | Table/card views, search, filters, sorting, pagination, CSV export, profile tabs, create/edit form with an unsaved-changes guard |
| Departments   | Cards with head, headcount, budget utilisation; create/edit/delete                             |
| Attendance    | Clock in/out, daily log with corrections, monthly calendar per employee, CSV export            |
| Leave         | Balances, apply (weekends excluded, balance checks), approve/reject with notes, all requests   |
| Payroll       | Run payroll per month (tax bands, pension, overtime, unpaid leave), mark paid, printable payslips |
| Recruitment   | Job openings CRUD, drag-and-drop candidate pipeline (plus a keyboard-accessible "Move to" menu) |
| Performance   | Quarterly reviews with goals, ratings and acknowledgement                                      |
| Announcements | Company feed (pin, categories) and holiday calendar                                            |
| Reports       | Headcount, salary cost, gender, tenure and leave analytics, each with CSV export               |
| Settings      | Profile, light/dark/system theme, compact sidebar, change password, demo-data reset            |

Role-based access is enforced in three places: in the routes (`canMatch`, so restricted code is never downloaded), in the UI (`*appHasRole`, `auth.isManager()`), and in the API (mock server permission checks).

## Where things live

```
src/
├── index.html                  Splash screen (pure CSS, shown before Angular boots) + theme pre-paint
├── styles.scss                 Global stylesheet entry
├── styles/
│   ├── _variables.scss         ★ Bootstrap theme: brand colours, radius, fonts, dark palette
│   ├── _mixins.scss            Breakpoint mixins for component SCSS  (@use 'mixins' as *)
│   ├── vendors/_bootstrap.scss Bootstrap modules in use (comment lines in/out)
│   ├── base/                   CSS tokens (incl. chart palette) and element defaults
│   ├── components/             Shared styles: cards, tables, forms, skeletons, charts
│   └── utilities/              Animation system, helpers, print styles
├── environments/               apiUrl, useMockApi, mock latency
└── app/
    ├── app.ts / app.config.ts / app.routes.ts
    ├── core/                   Singletons, no UI
    │   ├── auth/               AuthService, guards (auth, guest, role, unsaved-changes)
    │   ├── http/               Interceptors (auth header, global errors)
    │   ├── data/               ★ One service per REST resource (EntityStore base class)
    │   ├── mock-api/           In-browser REST backend + seed data generator
    │   ├── models/             TypeScript interfaces for every entity
    │   ├── services/           Toasts, confirm dialog, preferences, title strategy
    │   ├── constants/          Navigation menu (single source of truth)
    │   └── utils/              Dates, payroll maths, CSV, ids
    ├── shared/                 Reusable UI kit (import from 'src/app/shared')
    │   ├── components/         avatar, modal, page-header, stat-card, skeleton, pagination,
    │   │                       status-badge, rating, field-error, toast, confirm, charts/…
    │   ├── directives/         countUp, hasRole, tooltip
    │   └── pipes/              label, relativeDate, compact
    ├── layout/                 main-layout, auth-layout, sidebar, topbar
    └── features/               One folder per page, each lazy-loaded
        ├── auth/  dashboard/  employees/  departments/  attendance/  leave/
        ├── payroll/  recruitment/  performance/  company/  reports/  settings/
        └── errors/             404 and access-denied pages
```

Naming convention: `*-page.ts` is a routed page, `*.service.ts` a service, `*.model.ts` types, and `*.guard(s).ts` / `*.interceptor.ts` / `*.directive.ts` / `*.pipe.ts` what the suffix says.

## Connecting a real backend

All data goes through `core/data/*.service.ts` → `HttpClient` → `environment.apiUrl`.
The mock backend is just an HTTP interceptor (`core/mock-api/mock-api.interceptor.ts`) that serves
json-server-style REST routes from localStorage. To go live, set `useMockApi: false` and point
`apiUrl` at your server. No feature code needs to change.

Endpoints expected: `POST /auth/login`, `POST /auth/change-password`, `POST /payroll/run`, and
`GET|POST /:collection`, `GET|PATCH|DELETE /:collection/:id` for `employees, departments, attendance,
leaves, payslips, jobs, candidates, reviews, announcements, holidays` (filtering with `?field=value`,
`?field_gte=`, `?field_lte=`).

## Performance & motion

- Every feature is a lazy chunk, preloaded in the background after start-up. Initial transfer is about 160 kB gzipped.
- Data services cache results in signals, so revisiting a page renders instantly with no refetch.
- Skeleton loaders match the final layout, so content doesn't jump when data arrives.
- Animations appear only where they carry meaning: the splash screen, the route progress bar (shown only for slow navigations), content-area route transitions (View Transitions API), toasts, list removals, KPI count-up and chart entry.
  All of them respect `prefers-reduced-motion`.
