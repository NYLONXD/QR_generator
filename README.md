# QR-Based Google Form Attendance Gateway

Browser-only temporary access gateway for an existing Google Form. Teachers paste a Google Forms URL, the backend stores that URL server-side, and the dashboard displays a QR code containing only a short-lived gateway URL. Students scan, receive a temporary browser session, validate against Redis, and are redirected to the Google Form only after a one-time grant is redeemed.

## Architecture

- `backend/`: NestJS REST API, PostgreSQL persistence, Redis hot-path token/session/grant storage.
- `frontend/`: React + Vite teacher dashboard only.
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
c
cd backend && npm install && npm run start:dev
cd frontend && npm install && npm run dev
```

Create a teacher row with a bcrypt password hash before logging in.
