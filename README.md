# Butwal DC Logbook (Times Global)

Replaces `DCButwal_Log2083.xlsx` + `Genset(2083).xlsx` with web logs.

- DC: 3 slots/day `06:00, 14:00, 22:00`, UPS, Racks 1–22 A/B, PAC A–D, Main DB A+B, duty person
- Genset: diesel, security, start/end, G1/G2, stock, consumed
- Auth: only `@timesglobal.com.np`, OTP via Gmail App Password, roles `admin` (edit/delete/users/export) vs `user` (create + view)

## Run with Docker (recommended)

```bash
cp .env.example .env
# edit .env: JWT_SECRET, SMTP_USER, SMTP_APP_PASS, ADMIN_EMAILS
docker compose up --build
# app: http://localhost:3000
# mongo-express (optional): docker compose --profile tools up
```

## Run locally

```bash
npm install
cp .env.example .env
# set MONGO_URI=mongodb://localhost:27017/logbook
npm start
```

## API

- `POST /api/auth/register {name,email}` → OTP
- `POST /api/auth/request-otp {email}` → OTP
- `POST /api/auth/verify-otp {email,otp}` → JWT cookie
- `GET /api/auth/me`, `POST /api/auth/logout`
- `GET/POST /api/dclogs`, `PUT/DELETE /api/dclogs/:id` (admin)
- `GET/POST /api/gensets`, `PUT/DELETE /api/gensets/:id` (admin)
- `GET /api/users`, `PATCH /api/users/:id/role` (admin)
- `GET /api/export/dclogs.csv?from=&to=`, `GET /api/export/gensets.csv` (admin)
- `GET /api/health`

## Security notes

- Auth is passwordless OTP (6-digit, hashed, 10-min TTL, 5-attempt cap) restricted to
  `@timesglobal.com.np`. First registered user becomes admin; further admins via `ADMIN_EMAILS`.
- Roles: `user` creates logs and reads history; only `admin` can edit/delete, manage
  users, and export. `createdBy` is always set server-side; update bodies are allowlisted
  and MongoDB operator keys (`$...`) are rejected with 422.
- All history rendering HTML-escapes server data (stored-XSS defense). Security headers
  via helmet with a `default-src 'self'` CSP. CORS is same-origin unless `ALLOWED_ORIGINS`
  is set. Cookies are httpOnly + SameSite=lax; set `COOKIE_SECURE=true` behind HTTPS.
- Header tuning for plain-HTTP LAN: `upgrade-insecure-requests` is nulled out (it would
  rewrite every CSS/JS fetch to https and break the UI with no TLS terminator),
  Cross-Origin-Opener-Policy and Origin-Agent-Cluster are off (they only log errors on
  untrustworthy http origins), and no Permissions-Policy header is sent (no camera/mic
  features; kills "unrecognized feature" console noise). Re-enable all three behind HTTPS.
- Rate limits: OTP request 10/hr, OTP verify 5 attempts per code, general API
  `API_RATE_MAX`/15min per IP (in-memory; single instance only, use a shared store if scaled).
- 500 responses are generic; details go to the server log, which also records an audit
  trail (`[audit]` lines) for OTP failures, role changes, user deletes, and log deletes.
- Personal data held: name + work email (auth and log attribution). OTP records auto-expire.
  Admin user-delete removes the account; their past log rows stay for record integrity with
  blank attribution. The single Mongo volume holds all data; include it in backups and in
  any deletion workflow.

## Dependency audit (2026-10-08)

- `npm audit`: 1 high (nodemailer 6.10.1 addressparser/DNS/OAuth advisories, fix only via
  breaking major 10.x). Triage: not reachable here. Recipients are single domain-checked
  strings (never user-supplied address lists), auth is single-tenant Gmail app-password
  (no OAuth2 token fetch), one shared transporter. Deferred; review on next release or
  2027-01-08, whichever is first. Never run `npm audit fix --force` blindly.
