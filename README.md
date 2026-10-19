# Enquiry Management Application

An Angular 22 admin application for managing customer enquiries, statuses, service categories, follow-ups, administrators, profiles, and dashboard reporting.

## Features

- Token-based sign in, registration, guarded routes, and password-reset tokens
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
- A Node.js REST API backed by PostgreSQL

## Prerequisites

- Node.js compatible with the `engines` field in `package.json`
- npm

## Installation

```bash
npm install
```

## Running the project

Create a local environment file and configure PostgreSQL first:

```bash
copy backend\.env.example backend\.env
npm run db:migrate
npm run db:seed
```

`DATABASE_URL` and a random `JWT_SECRET` of at least 32 characters are required. The seed command also requires `SEED_ADMIN_PASSWORD`; it assigns that password to imported seed administrators.

Start the Angular application and API together:

```bash
npm start
```

Run them separately when needed:

```bash
npm run start:backend
npm run start:frontend
```

The Angular development server proxies `/api` requests to the local API on port 3000.

## API and database

The Node service in `backend/server/` exposes the REST API under `/api`. PostgreSQL stores users, statuses, categories, enquiries, follow-ups, and one-time password-reset tokens. Migrations are kept in `backend/server/migrations`; `backend/db.json` is retained only as source data for the optional initial seed.

Passwords use Node's salted scrypt implementation. The API issues signed, expiring bearer tokens and checks the account status and role on protected requests. Set `JWT_SECRET` through the deployment environment and never commit it.

## Project structure

```text
frontend/src/              Angular application source
frontend/public/           Brand and illustration assets
frontend/tests/            Browser tests and test server
frontend/vercel.json       Frontend deployment configuration
backend/server/            Node.js API, database access, migrations, and seed tool
backend/api/               Vercel serverless entry points
backend/tests/             Backend security and integration tests
backend/db.json            Optional initial seed source
backend/vercel.json        Backend deployment configuration
package.json               Workspace-level development commands
```

## Authentication

The application supports Super Admin and Admin roles, remembered or session-only login state, server-side authorization, registration, and expiring one-time password-reset tokens. Configure an email provider before production use to deliver the reset link; in non-production mode the API prints the generated token to the server console.

## Deploying to Vercel

1. Create a PostgreSQL database (for example, Neon through the Vercel Marketplace).
2. Import the repository as a Vercel project with `backend` selected as its Root Directory.
3. Add `DATABASE_URL`, `JWT_SECRET`, and `DATABASE_SSL=true` to the backend project environment variables.
4. Run `npm run db:migrate` and, for an empty database, `npm run db:seed` locally with those environment variables available.
5. Import the same repository as a second Vercel project with `frontend` selected as its Root Directory.
6. Replace `YOUR-BACKEND` in `frontend/vercel.json` with the deployed backend project hostname before deploying the frontend.

Use a pooled PostgreSQL connection string for serverless deployments. Do not set `SEED_ADMIN_PASSWORD` permanently in Vercel after seeding.

## Build and tests

Create a production build:

```bash
npm run build
```

Run the API type-check, security tests, and production build:

```bash
npm test
```

With a migrated, seeded test database and API running on port 3101, run the PostgreSQL integration smoke test with `npm run test:integration --workspace backend`. Browser tests can be run separately with `npm run test:e2e --workspace frontend` after configuring their test database.

## Branding and UI

The interface uses Inter, a slate and teal theme, a shared outline SVG icon system, responsive layouts, accessible focus states, and full and compact Enquiry Management brand marks.

## Production notes

Profile images are currently stored as data URLs in PostgreSQL for compatibility with the existing UI. For heavier use, move them to object storage. Password reset token generation is implemented, but production email delivery must be connected to your chosen transactional email service.
