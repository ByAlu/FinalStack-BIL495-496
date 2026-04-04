# Backend Docker Setup

Start PostgreSQL for local backend development from the `backend` directory:

```powershell
docker compose up -d
```

This starts PostgreSQL on `localhost:5432` with:

- database: `neoai_db`
- user: `postgres`
- password: `12345`

Seeded example users:

- doctor / doctor123
- admin / admin123

Seeded baseline catalog data:

- ultrasound AI modules:
  - `RDS_SCORING`
  - `B_LINE_DETECTION`
- ultrasound preprocessing operations:
  - `MEDIAN_BLUR`
  - `CLAHE`
  - `GAUSSIAN_BLUR`
- default per-user ultrasound preprocessing settings for both seeded users

The seed SQL only runs when the Postgres volume is created for the first time. If you already have an older local volume and want to seed these users again:

```powershell
docker compose down -v
docker compose up -d
```
