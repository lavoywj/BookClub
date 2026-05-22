BookClub
========

BookClub is a textbook exchange app originally built as a capstone project. The old Angular/Cordova frontend and provided database dependency have been replaced with a modern React client plus a local Express/Prisma API.

Current modernization milestone
-------------------------------

- Modern React/Vite/TypeScript client in `client/`.
- Local Express API in `server/`.
- Prisma schema with a SQLite development database.
- Seed data for demo users and textbook listings.
- Login, registration, search, book detail, dashboard, listing management, and profile editing.

Local setup
-----------

Install client dependencies:

```sh
cd client
npm install
cp .env.example .env
```

Install backend dependencies:

```sh
cd server
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

In another terminal, start the React client:

```sh
cd client
npm run dev
```

The client runs at `http://127.0.0.1:5173` and expects the API at `http://localhost:4000`. Override the API URL with `VITE_API_URL` if needed.

Demo accounts
-------------

Each seeded user uses the password `password123`.

- `alice@example.edu`
- `ben@example.edu`
- `maya@example.edu`

Next steps
----------

1. Add API and frontend tests for the main workflows.
2. Add image upload instead of image URL entry.
3. Improve messaging/contact flows between buyers and sellers.
4. Add Capacitor after the web app is stable if mobile app packaging is still desired.
5. Move SQLite to Postgres for deployed production use.
