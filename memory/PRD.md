# QuickTurf - Turf Owner Enhancement PRD

## Original Problem Statement
Enhance the Turf Owner section of the QuickTurf app (cloned from https://github.com/shamanth-25/Turf-sha) with comprehensive owner management features.

## App Architecture
- **Frontend**: TypeScript + React + Vite (port 3000) — original client/ directory
- **Backend**: Python FastAPI (port 8001) — new backend/server.py
- **Database**: MongoDB — replaced in-memory storage with persistent MongoDB
- **Auth**: JWT in HTTP-only cookies (auth_token, 7-day expiry)
- **Routing**: Nginx proxies /api/* to port 8001, /* to port 3000

## User Personas
- **Turf Owner**: Lists and manages cricket turfs, views bookings and revenue
- **Player**: Finds and books cricket turfs
- **Admin**: Approves owner accounts and turf listings

## Core Requirements (Static)
- Owner registration & account approval workflow
- Turf submission & admin review workflow
- Slot management (block/unblock by date)
- Booking management with player details

## What's Been Implemented (as of Feb 2026)

### Architecture Migration
- Cloned TypeScript Replit app to Emergent environment
- Created FastAPI backend replacing Express.js
- MongoDB replacing in-memory MemStorage
- Vite dev server (port 3000) separated from API server

### 6 New Turf Owner Enhancements (Phase 1)
1. **Analytics Dashboard** (Analytics tab) - KPI cards + Monthly Revenue bar chart + Peak hours + Recent bookings
2. **Pricing Management** (Edit Turf tab) - Edit price per hour, auto-regenerates future slots
3. **Turf Profile Edit** (Edit Turf tab) - Name, address, amenities, up to 5 images
4. **Booking Cancellation** (Bookings tab) - Cancel upcoming bookings, frees time slots
5. **Operating Hours Setup** (Edit Turf tab) - Open/close hour dropdowns, live slot preview
6. **Customer Reviews** (Reviews tab) - Star summary, review cards, empty state

### Phase 2 Features
7. **Seed Demo Bookings** - 20 bookings seeded (₹59,100 revenue, Nov-Apr history)
8. **Player Review Submission from Confirmation** - Star rating + comment after booking
9. **Multiple Turfs Per Owner** - "Add Another Turf" form, pending/rejected badges, admin can approve/reject
10. **Export Bookings as CSV/PDF** - CSV download with player details, Print/PDF window

### Backend Endpoints
All existing routes ported from TypeScript + new routes:
- Auth: register, register/owner, login, logout, me, forgot-password, profile, change-password
- Owner: turfs, slots, block/unblock, bookings, cancel-booking, turf-profile, analytics, reviews
- Public: turfs, turf-slots, bookings, create-booking, reviews
- Admin: stats, owners, players, bookings, approve/reject account & turf, locations
- Uploads: /api/upload, /api/auth/profile-image

## Prioritized Backlog

### P0 (Must Have - not yet built)
- Push notifications for new bookings (email/SMS via Resend/Twilio)

### P1 (High Value)
- Player ability to submit reviews from booking confirmation
- Multi-sport support beyond Cricket
- Turf availability calendar view
- Export bookings as PDF/CSV

### P2 (Nice to Have)
- Multiple turfs per owner account
- Owner chat with players
- Seasonal/date-specific pricing overrides

## Next Tasks
1. Add player review submission from booking confirmation page
2. Seed demo bookings for analytics visualization
3. Add booking notification (email) on new booking
4. Admin dashboard improvements (charts, export)
