# Artillery load tests — Prabodh / SIH Portal API

HTTP load tests for the NestJS backend (`/api`). Works on **Windows, macOS, and Linux**.

## Setup

```bash
cd load-tests
npm install
```

## Targets

| Target | How |
| --- | --- |
| Local API | `npm run smoke` (default `http://localhost:3001/api`) |
| Render | `npm run smoke:render` |

Default credentials (seeded admin):

- Email: `admin@institute.edu`
- Password: `Prabodh@123`

Override with `LOGIN_EMAIL` / `LOGIN_PASSWORD` / `TARGET`.

Scripts **log in once**, set `ACCESS_TOKEN`, then run Artillery — this avoids the API login rate limit (`LOGIN_RATE_LIMIT_PER_MIN`).

## Commands

```bash
# Quick smoke (~30s)
npm run smoke
npm run smoke:render

# Steady load (~3 min)
npm run load
npm run load:render

# Stress ramp (~3.5 min, peak 40 arrivals/sec)
npm run stress

# HTML report
npm run report:smoke
```

### Windows PowerShell (manual env override)

```powershell
$env:TARGET = "https://prabodh.onrender.com/api"
$env:LOGIN_EMAIL = "admin@institute.edu"
$env:LOGIN_PASSWORD = "Prabodh@123"
npm run smoke
```

## Scenarios

| File | Coverage |
| --- | --- |
| `scenarios/smoke.yml` | `GET /health`, `/me`, PS list, teams, stages, notifications |
| `scenarios/load.yml` | Same + admin dashboard, higher rate |
| `scenarios/stress.yml` | Ramp to 40 RPS authenticated reads |

## Notes

- Prefer staging for load/stress; avoid production peak hours.
- Reports under `reports/` are gitignored.
- Deprecation warnings from Artillery dependencies are safe to ignore.
