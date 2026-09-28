# SIH Portal — Startup & Important Commands

## Prerequisites

- Node.js (v18+)
- npm
- Docker Desktop (running)

---

## 1. Start Infrastructure (Docker)

```bash
cd backend
docker compose up -d
```

Starts **PostgreSQL 16** (port 5432) and **Redis 7** (port 6379).

To stop:
```bash
docker compose down
```

To stop and **remove volumes** (fresh DB):
```bash
docker compose down -v
```

---

## 2. Backend Setup

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run start:dev
```

Backend runs on **http://localhost:3001** (with hot-reload via NestJS watch mode).

### Other Important Backend Commands

```bash
# Run Prisma migrations (migration-based approach)
npx prisma migrate dev

# Reset database and re-seed
npx prisma migrate reset

# Open Prisma Studio (visual DB browser)
npx prisma studio

# Build for production
npm run build

# Run production server
npm run start

# Run BullMQ worker (separate terminal)
npm run start:worker

# Run tests
npm test

# Check TypeScript types
npx tsc --noEmit
```

---

## 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:3000**.

### Other Important Frontend Commands

```bash
# Production build
npm run build

# Start production server (after build)
npm run start

# Type-check only (no output files)
npx tsc --noEmit
```

---

## 4. Full Quick Start (Copy-Paste)

```bash
# Terminal 1 — Docker
cd backend && docker compose up -d

# Terminal 2 — Backend
cd backend && npm install && npx prisma generate && npx prisma db push && npm run start:dev

# Terminal 3 — Frontend
cd frontend && npm install && npm run dev
```

---

## 5. Environment Variables

Backend (`.env`) and frontend (`.env.local`) files are already configured. See `.env.example` in each directory for the full list of variables.

| Service | Variable | Default |
|---------|----------|---------|
| Backend | `PORT` | `3001` |
| Backend | `DATABASE_URL` | `postgresql://sih:sih@localhost:5432/sih_portal` |
| Backend | `REDIS_URL` | `redis://localhost:6379` |
| Frontend | `NEXT_PUBLIC_API_URL` | `http://localhost:3001` (or production URL) |

---

## 6. URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| Prisma Studio | http://localhost:5555 (after `npx prisma studio`) |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |



Vm satrtup :- ssh -i ~/.ssh/test-01_key.pem azureuser@172.198.136.105
