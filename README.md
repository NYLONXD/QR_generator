# QR-Based Google Form Attendance Gateway

Browser-only temporary access gateway for an existing Google Form. Teachers paste a Google Forms URL, the backend stores that URL server-side, and the dashboard displays a QR code containing only a short-lived gateway URL. Students scan, receive a temporary browser session, validate against Redis, and are redirected to the Google Form only after a one-time grant is redeemed.

## Architecture

- `backend/`: NestJS REST API, PostgreSQL persistence, Redis hot-path token/session/grant storage.
- `frontend/`: React + Vite faculty portal (TIET branded): sign-in, faculty sign-up requests, dashboard, start session, live QR with projector view, session history, admin faculty management, profile.
- `database/schema.sql`: required `teachers` and `attendance_sessions` tables only.
- `docker-compose.yml`: local PostgreSQL and Redis.

## API

- `POST /auth/login`
- `POST /attendance/start`
- `POST /attendance/stop`
- `GET /attendance/:sessionId/qr`
- `GET /a/:token`
- `POST /attendance/validate`
- `GET /attendance/access/:grantToken`

## Security boundaries

The QR code never contains the Google Form URL. QR tokens are generated with `crypto.randomBytes(32)`, live for 15 seconds in Redis, and are checked server-side. Browser-only systems cannot prove which physical phone scanned a QR; a currently valid gateway URL can still be forwarded during its 15-second window.

## Run locally

```bash
docker compose up -d
cd backend && npm install && npm run start:dev
cd frontend && npm install && npm run dev
```

Create a teacher row with a bcrypt password hash before logging in.

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

The frontend calls these through `frontend/src/services/api.ts`; shapes are in `frontend/src/services/types.ts`. Endpoints marked *planned* do not exist yet. Until they do, the real-backend frontend degrades gracefully (sign-in, start/stop and the live QR work; history, stats and faculty pages show a notice).

| Method & path | Body | Returns | Status |
| --- | --- | --- | --- |
| `POST /auth/login` | `{ email, password }` | `{ accessToken, teacher }` | exists; add `role`, `department`, `designation` to `teacher` and the JWT; reject `pending`/`disabled` accounts with 403 + message |
| `POST /auth/register` | `{ name, email, department, designation, password }` | `{ status: 'pending' }` | planned; 409 if the email exists |
| `GET /auth/me` | – | `Teacher` | planned |
| `PATCH /auth/me` | `{ name, department, designation }` | `Teacher` | planned |
| `POST /auth/change-password` | `{ currentPassword, newPassword }` | `{ ok: true }` | planned; wrong current password must be **400**, not 401 (401 signs the user out) |
| `POST /attendance/start` | `{ courseCode, courseTitle, group, sessionType, googleFormUrl }` | `{ sessionId }` | exists; store the new fields |
| `POST /attendance/stop` | `{ sessionId }` | `{ stopped: true }` | exists |
| `GET /attendance/:sessionId/qr` | – | `{ token, qrUrl, ttlRemaining }` | exists |
| `GET /attendance/sessions` | – | `AttendanceSession[]` (own, newest first) | planned |
| `GET /attendance/sessions/:id` | – | `AttendanceSession` | planned |
| `GET /admin/faculty` | – | `Teacher[]` with `sessionCount`, `lastActiveAt` | planned; admin only |
| `POST /admin/faculty` | `{ name, email, department, designation, role }` | `{ teacher, temporaryPassword }` | planned; admin only |
| `PATCH /admin/faculty/:id` | `{ status: 'active' \| 'pending' \| 'disabled' }` | `Teacher` | planned; admin only, not on own account |

Schema additions this implies: `teachers.department`, `teachers.designation`, `teachers.role` (`teacher`/`admin`), `teachers.status` (`pending`/`active`/`disabled`); `attendance_sessions.course_code`, `course_title`, `class_group`, `session_type`, and a `check_ins` count (increment when a grant is redeemed in `GET /attendance/access/:grantToken`). Client errors should keep Nest's `{ message }` JSON body; the UI shows that message for 4xx responses.
