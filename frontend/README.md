# SmartPay Malawi — Frontend

React + Vite single-page app for merchants. UI taken from the `pixel-perfect-prototype`, wired to the
cookie-based auth API described in `docs/architecture/authContract.md`.

## Run it

```bash
# 1. Backend (from the repo root) — must be running on http://localhost:3000
npm run start:dev

# 2. Frontend
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Open http://localhost:5173 — the login page is the main page.

`VITE_API_URL` (see `.env.example`) defaults to `http://localhost:3000`. The backend's `FRONTEND_URL`
must be exactly `http://localhost:5173` (it already is in `.env.example`), because credentialed CORS
cannot use a wildcard origin.

## Screens

| Route       | Who sees it        | What it does                                                    |
| ----------- | ------------------ | --------------------------------------------------------------- |
| `/`         | Logged-out         | **Login** (main page). Logged-in merchants are sent to `/home`. |
| `/register` | Logged-out         | Register, then back to `/` with an "Account created" note.      |
| `/home`     | Logged-in only     | Placeholder dashboard + Logout. Logged-out visitors go to `/`.  |

## How auth works here

- Every request uses `credentials: "include"` (`src/lib/api.ts`). No token is ever read or stored in JS.
- On load the app calls `GET /auth/me` (`src/lib/auth.tsx`): 200 → logged in, 401 → logged out,
  network error → "Can't reach SmartPay" with a retry button (not treated as an expired session).
- Login = `POST /auth/login`, then `GET /auth/me` for the identity.
- Register does not log in; the merchant is sent to the login page.
- Logout = `POST /auth/logout`; local state is cleared only after the server confirms.

## Scripts

`npm run dev` · `npm run build` (typecheck + production build) · `npm test`

Routes live in `src/routes` (TanStack Router, file-based; `src/routeTree.gen.ts` is generated).
`components.json` is kept so more shadcn/ui components can be added with the shadcn CLI.
