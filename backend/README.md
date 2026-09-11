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

Local auth without Clerk: `ALLOW_DEV_AUTH=true` and header `x-dev-user-id` (seed prints user ids). Never enable this in production.

## Third-party services required

| Service | Purpose | Required? |
| --- | --- | --- |
| **Clerk** | Login (email/OTP/SSO), session JWT, Organizations (one per team), team-invite emails, bulk `createUser` | **Yes** for production auth/invites |
| **PostgreSQL** | System of record (Prisma). Local: Docker. Prod: Neon / RDS / Cloud SQL | **Yes** |
| **Redis** | BullMQ queues + rate-limit buckets. Local: Docker. Prod: Upstash / Redis Cloud / ElastiCache | **Yes** for email, export, reminders, rate limits |
| **Resend** | All notification emails except Clerk org invites (allocation, deadlines, eval published, broadcasts) | **Yes** for production email |
| **S3-compatible storage** (Cloudflare R2 or AWS S3) | Milestone files (PPT/video/report) via pre-signed URLs; export files | **Yes** for uploads in production (local export falls back to `storage/exports`) |
| **Svix** | Bundled via Clerk/Resend webhook signature verification — no separate account | Comes with Clerk + Resend webhooks |
| **Virus scan webhook** (optional) | POST `SCAN_WEBHOOK_URL` after upload (e.g. S3 event → ClamAV Lambda) | Optional Phase 1 |
| **Hosting** | API + worker on a Node host (Render / Railway / Fly / ECS). Frontend later on Vercel | **Yes** to go live |
| **Institute SSO** | Optional SAML/OIDC connection **inside Clerk** (FR-02) | Optional |

Clerk dashboard also needs: allowed email domains, OTP, custom org roles, `publicMetadata.role` in session claims, webhooks to `/api/webhooks/clerk` (`user.*`, `organizationInvitation.accepted`, `organizationMembership.created`). Resend webhook → `/api/webhooks/resend`.

## Auth in production

`Authorization: Bearer <Clerk session JWT>`. Role from `publicMetadata.role`; team/mentor access is checked in Postgres.
