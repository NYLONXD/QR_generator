# QR-Based Google Form Attendance Gateway

Browser-only temporary access gateway for an existing Google Form. Teachers paste a Google Forms URL, the backend stores that URL server-side, and the dashboard displays a QR code containing only a short-lived gateway URL. Students scan, receive a temporary browser session, validate against Redis, and are redirected to the Google Form only after a one-time grant is redeemed.

## Architecture

- `backend/`: NestJS REST API, PostgreSQL persistence, Redis hot-path token/session/grant storage.
- `frontend/`: React + Vite faculty portal (TIET branded): sign-in, faculty sign-up, per-teacher dashboard, start session, live QR with projector view, session history, admin faculty management, profile.
- `database/schema.sql`: `teachers` and `attendance_sessions` tables. Idempotent, so re-running it upgrades an existing database.
- `docker-compose.yml`: local PostgreSQL and Redis.

## API

- `POST /auth/register`, `POST /auth/login`
- `GET /auth/me`, `PATCH /auth/me`, `POST /auth/change-password`
- `POST /attendance/start`
- `POST /attendance/stop`
- `GET /attendance/sessions`, `GET /attendance/sessions/:sessionId`
- `GET /attendance/:sessionId/qr`
- `GET /a/:token`
- `POST /attendance/validate`
- `GET /attendance/access/:grantToken`

## Faculty accounts

- Only `@thapar.edu` addresses can sign up or sign in. The server checks this on both endpoints; any other domain gets a 400.
- Sign-up is self-service: `POST /auth/register` creates an active account and signs the teacher straight in. There is no email verification or admin approval yet, so the server checks the domain only, not that the person owns that mailbox or is faculty.
- Every attendance endpoint is scoped to the signed-in teacher, so each dashboard and session history shows only that teacher's sessions. Another teacher's session id gets a 404.

## Security boundaries

The QR code never contains the Google Form URL. QR tokens are generated with `crypto.randomBytes(32)`, live for 20 seconds in Redis, and are checked server-side. Browser-only systems cannot prove which physical phone scanned a QR; a currently valid gateway URL can still be forwarded during its 20-second window.

## Run locally

```bash
docker compose up -d
cd backend && npm install && npm run start:dev
cd frontend && npm install && npm run dev
```

Then open the portal and create an account at `/register` with an `@thapar.edu` email.

### Upgrading an existing database

Docker only runs `schema.sql` when it first creates the volume. To upgrade a database created before faculty sign-up, including the hosted one in `DATABASE_URL`, run the whole file against it. Use `psql "$DATABASE_URL" -f database/schema.sql`, paste it into your provider's SQL editor, or locally run `docker compose exec -T postgres psql -U attendance -d attendance_gateway < database/schema.sql`.

Do this **before** deploying the new backend. The old backend keeps working on the upgraded schema, but the new one needs the new columns.

### Frontend demo mode (no backend needed)

```bash
cd frontend && npm run dev:mock
```

Runs the whole portal against an in-browser fake API with sample data (stored in `localStorage`; clear the `tiet_attendance_mock_db` key to reset). Demo accounts are shown on the sign-in page:

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@thapar.edu` | `admin123` |
| Faculty | `teacher@thapar.edu` | `teacher123` |

## Frontend API contract (to implement in the backend)

The frontend calls these through `frontend/src/services/api.ts`; shapes are in `frontend/src/services/types.ts`. Only the admin endpoints are still *planned*. Until they exist, the Faculty admin page shows a notice.

| Method & path | Body | Returns | Status |
| --- | --- | --- | --- |
| `POST /auth/login` | `{ email, password }` | `{ accessToken, teacher }` | exists; `@thapar.edu` only (400 otherwise); JWT carries `sub`, `email`, `name`, `role` |
| `POST /auth/register` | `{ name, email, department, designation, password }` | `{ accessToken, teacher }` | exists; `@thapar.edu` only, password 8–72 characters, 409 if the email exists; account is active immediately |
| `GET /auth/me` | – | `Teacher` | exists |
| `PATCH /auth/me` | `{ name, department, designation }` | `Teacher` | exists |
| `POST /auth/change-password` | `{ currentPassword, newPassword }` | `{ ok: true }` | exists; wrong current password is **400**, not 401 (401 signs the user out) |
| `POST /attendance/start` | `{ courseCode, courseTitle, group, sessionType, googleFormUrl }` | `{ sessionId }` | exists |
| `POST /attendance/stop` | `{ sessionId }` | `{ stopped: true }` | exists |
| `GET /attendance/:sessionId/qr` | – | `{ token, qrUrl, ttlRemaining }` | exists |
| `GET /attendance/sessions` | – | `AttendanceSession[]` (own, newest first) | exists |
| `GET /attendance/sessions/:id` | – | `AttendanceSession` | exists; 404 for another teacher's or a malformed id |
| `GET /admin/faculty` | – | `Teacher[]` with `sessionCount`, `lastActiveAt` | planned; admin only |
| `POST /admin/faculty` | `{ name, email, department, designation, role }` | `{ teacher, temporaryPassword }` | planned; admin only |
| `PATCH /admin/faculty/:id` | `{ status: 'active' \| 'pending' \| 'disabled' }` | `Teacher` | planned; admin only, not on own account |

`database/schema.sql` has the columns these need. `teachers` gains `department`, `designation` and `role` (`teacher`/`admin`). `attendance_sessions` gains `course_code`, `course_title`, `class_group`, `session_type` and `check_ins`; `check_ins` goes up by one each time a grant is redeemed in `GET /attendance/access/:grantToken`. The admin endpoints will also need `teachers.status` (`pending`/`active`/`disabled`). Client errors keep Nest's `{ message }` JSON body; the UI shows that message for 4xx responses.
