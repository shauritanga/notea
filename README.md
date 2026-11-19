# Notea

Notea is a mobile-first football community for Tanzania. Players, fans, coaches, scouts, clubs, academies, businesses, and sponsors share one calm place. The product requirements are in [docs/SRS.md](docs/SRS.md). The build plan is in [docs/PLAN.md](docs/PLAN.md).

## Run

```bash
npm run db:up
npm test
npm run dev
```

The app uses PostgreSQL on `127.0.0.1:5433`. Copy `.env.example` to `.env` if you want to change the connection.

Demo password: `notea-demo`

- `ada@notea.test` — super admin
- `fan@notea.test` — fan
- `amina@notea.test` — player
- `scout@notea.test` — scout
- `club@notea.test` — club owner
- `shop@notea.test` — business owner
- `sponsor@notea.test` — Kairuki sponsor manager

With `NOTEA_SHOW_CODES=1`, the verification screen shows the code for a new account.
