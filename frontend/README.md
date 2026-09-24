# Frontend (Next.js)

Pulled from [AtharvaJadhav1/Prabodh](https://github.com/AtharvaJadhav1/Prabodh) and wired to `../backend`.

```bash
cd frontend
npm install
npm run dev
```

Runs on http://localhost:3000 and calls `http://localhost:3001/api`.

Start the API first (`cd backend && npm run start:dev`) with `ALLOW_DEV_AUTH=true` and a seeded database.

Demo logins:

- Student: `leader@institute.edu`
- Institute mentor: `faculty@institute.edu`
- Industry mentor: `industry@partner.com`
- Student expert: `expert@institute.edu`
- Admin: `admin@institute.edu`

Default seed password: `Prabodh@123` (local/demo only). In production, create Student Expert accounts from Admin → Manage Users (invite emails credentials).
