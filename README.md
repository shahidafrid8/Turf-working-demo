# TurfTime / Quick Turf

A mobile-first turf booking application with player, turf owner, staff, and admin flows. The app uses React, Vite, Express, Drizzle ORM, PostgreSQL/Neon, and session-based authentication.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
SESSION_SECRET=replace-with-a-long-random-secret
ADMIN_KEY=replace-with-admin-key
CORS_ORIGIN=http://localhost:5000
PORT=5000
NODE_ENV=development
CLOUDINARY_CLOUD_NAME=optional-cloudinary-cloud
CLOUDINARY_UPLOAD_PRESET=optional-unsigned-upload-preset
```

3. Apply database migrations:

```bash
npm run db:migrate
```

4. Seed an empty database when needed:

```bash
npm run db:seed
```

5. Start development server:

```bash
npm run dev
```

6. Type-check before deploying:

```bash
npm run check
```

## Environment Variables

`DATABASE_URL` is required for Neon/PostgreSQL persistence.

`SESSION_SECRET` signs user sessions. Use a long random value in production.

`ADMIN_KEY` protects the current admin API through the `x-admin-key` header. Do not use the default key for production.

`CORS_ORIGIN` should be set to the production frontend origin when deployed.

`PORT` controls the Express server port.

`CLOUDINARY_CLOUD_NAME` and `CLOUDINARY_UPLOAD_PRESET` enable external image storage. If omitted, uploads fall back to local `uploads/` storage for development.

## Database Migration

Migrations live in `migrations/` and are managed by Drizzle Kit.

Use this after schema changes:

```bash
npm run db:generate
npm run db:migrate
```

The production hardening migrations add:

- unique slot identity by `turf_id`, `date`, and `start_time`
- booking/date lookup indexes
- booking-code uniqueness and user/date lookup indexes
- database checks for booking amount math, durations, statuses, payment methods, prices, and user roles
- PostgreSQL session table

Create a database backup before migrations:

```bash
npm run db:backup
```

`db:backup` writes a custom-format dump under `backups/` and requires `pg_dump` in your PATH.

## Production Notes

Bookings now use a database transaction that locks selected slot rows before creating a booking. This prevents two users from booking the same slot at the same time when `DATABASE_URL` is configured.

Sessions are stored in PostgreSQL through `connect-pg-simple`, not memory.

Uploads validate both MIME type and actual PNG/JPEG file signatures. For a full production deployment, move uploaded files to Cloudinary, S3, or another object store and save only the returned URL.

Structured JSON logs are emitted for server activity, booking success/failure, and captured errors. Connect these logs to your platform logging or an error monitor such as Sentry.

Production startup fails if `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_KEY`, `CLOUDINARY_CLOUD_NAME`, or `CLOUDINARY_UPLOAD_PRESET` is missing. Keep staging and production on separate database URLs, secrets, admin keys, and Cloudinary presets; start from `.env.staging.example` and `.env.production.example`.

## Code Organization

Backend route handlers are split by ownership:

- `server/routes/auth.routes.ts` - login, registration, sessions, profile
- `server/routes/player.routes.ts` - customer bookings, feedback, reviews
- `server/routes/owner.routes.ts` - owner turf management, staff management, analytics
- `server/routes/staff.routes.ts` - staff-only route home for future workflows
- `server/routes/admin.routes.ts` - admin moderation, approvals, reports
- `server/routes/booking.routes.ts` - booking creation and lookup
- `server/routes/upload.routes.ts` - image upload endpoints
- `server/routes/public.routes.ts` - public turf, slot, location, review reads
- `server/routes/payment.routes.ts` - reserved for payment provider routes/webhooks
- `server/routes/shared.ts` - shared validators and route helpers

Frontend pages are grouped by role under `client/src/pages/admin`, `client/src/pages/owner`, `client/src/pages/staff`, `client/src/pages/player`, and `client/src/pages/auth`.

## Deployment Steps

1. Set production environment variables.
2. Run `npm ci`.
3. Run `npm run check`.
4. Run `npm run db:migrate` against the production Neon database.
5. Run `npm run build`.
6. Start with `npm run start`.

## Admin Credentials Setup

The current admin API expects the admin key in the `x-admin-key` header:

```bash
x-admin-key: your-production-admin-key
```

For production, replace this with a real admin login and role-based access before exposing admin features publicly.
