# SIH Portal Backend

Node.js API for the SIH Team & Project Management Portal (FR-01 through FR-27).

## Run locally

```bash
cd backend
docker compose up -d
copy .env.example .env
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run start:dev
```

Second terminal: `npm run start:worker`

API: `http://localhost:3001/api` · Health: `GET /api/health`

Local dev shortcut: `ALLOW_DEV_AUTH=true` and header `x-dev-user-id` (seed prints user ids). Never enable this in production.

## Third-party services required

| Service | Purpose | Required? |
| --- | --- | --- |
| **PostgreSQL** | System of record (Prisma). Local: Docker. Prod: Neon / RDS / Cloud SQL | **Yes** |
| **Redis** | BullMQ queues + rate-limit buckets. Local: Docker. Prod: Upstash / Redis Cloud / ElastiCache | **Yes** for email, export, reminders, rate limits |
| **Resend** | Auth OTP, password reset, team/mentor invites, allocation, deadlines, eval published, broadcasts | **Yes** for production email |
| **S3-compatible storage** (Cloudflare R2 or AWS S3) | Milestone files (PPT/video/report) via pre-signed URLs; export files | **Yes** for uploads in production (local export falls back to `storage/exports`) |
| **Svix** | Resend webhook signature verification (`/api/webhooks/resend`) | Used with Resend webhooks |
| **Virus scan webhook** (optional) | POST `SCAN_WEBHOOK_URL` after upload (e.g. S3 event → ClamAV Lambda) | Optional Phase 1 |
| **Hosting** | API + worker on a Node host (Render / Railway / Fly / ECS). Frontend on Vercel / Render | **Yes** to go live |

## Auth in production

Email + password (or OTP registration) with app-issued JWT: `Authorization: Bearer <accessToken>`. Set `AUTH_JWT_SECRET` in production. Role is stored on the user row (`platform_role`); team/mentor access is enforced in Postgres.
