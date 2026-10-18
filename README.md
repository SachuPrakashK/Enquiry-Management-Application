# Enquiry Management Application

An Angular 22 admin application for managing customer enquiries, statuses, service categories, follow-ups, administrators, profiles, and dashboard reporting.

## Features

- Sign in, registration, guarded routes, persistent demo sessions, and mock forgot/reset password flows
- Dashboard statistics, recent activity, follow-up overview, and an amCharts status donut chart
- Enquiry status, category, enquiry, follow-up, and admin-user CRUD
- Profile editing and independent profile-image updates
- Search, combined filters, sorting, pagination, responsive tables, and empty states
- Responsive sidebar, side-drawer forms, shared SVG icons, toast notifications, confirmation dialogs, global HTTP loading, and button-level loading states

## Technology stack

- Angular 22 with standalone components and Angular Router
- TypeScript with strict typing
- SCSS with centralized theme and component utilities
- Angular Signals and computed state
- RxJS and Angular HttpClient
- Typed Reactive Forms
- amCharts 5
- A local JSON REST API backed by `db.json`

## Prerequisites

- Node.js compatible with the `engines` field in `package.json`
- npm

## Installation

```bash
npm install
```

## Running the project

Start the Angular application and mock API together:

```bash
npm start
```

Run them separately when needed:

```bash
npm run start:api
npm run start:app
```

The Angular development server proxies `/api` requests to the local API on port 3000.

## Mock API

`db.json` stores statuses, categories, enquiries, follow-ups, options, and admin users. The Node service in `server/api.ts` exposes the JSON-backed REST API and persists create, update, and delete operations.

Authentication is a development-only mock. The API hashes demo passwords before persistence and excludes credential hashes from user responses, but JSON file storage, browser session state, and frontend guards are not production security.

## Project structure

```text
src/app/core/       Authentication, guards, interceptors, layout, API services
src/app/shared/     Reusable UI, models, badges, loaders, dialogs, and utilities
src/app/features/   Authentication, masters, enquiries, follow-ups, users, profile
public/assets/      Brand and illustration SVG assets
src/styles/         Central SCSS theme, layout, forms, buttons, tables, and utilities
server/             Local JSON REST API
db.json             Development data store
```

## Authentication

The demo supports Super Admin and Admin roles, remembered or session-only login state, guest and authenticated route guards, registration, and mock password-recovery screens. It never stores plain-text passwords in browser storage. A production backend must provide secure authentication, authorization, password hashing, access and refresh tokens, session revocation, and password-reset delivery.

## Build and tests

Create a production build:

```bash
npm run build
```

Run the API type-check, API tests, production build, and Playwright browser tests:

```bash
npm test
```

## Branding and UI

The interface uses Inter, a slate and teal theme, a shared outline SVG icon system, responsive layouts, accessible focus states, and full and compact Enquiry Management brand marks.

## Future backend integration

The focused Angular services keep API access outside components so the JSON API can be replaced with a real backend. Production integration should add server-side authorization, durable database persistence, secure credential handling, file storage for profile images, and email-based password reset.
