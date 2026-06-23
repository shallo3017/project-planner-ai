🚀 **AI Project-Roadmap Generator**
An AI-powered platform that converts project requirements into professional PRD and TRD documents — via a free-form AI Chatbot or a structured Questionnaire.

**Tech Stack**
-> Frontend: Next.js 14, React 18, Tailwind CSS, Redux Toolkit, Socket.IO Client
-> Backend: Node.js + Express, TypeScript, MongoDB + Prisma (ORM), Socket.IO
-> AI: Groq API (llama-3.3-70b-versatile) — free tier
-> Auth: Custom JWT (short-lived access token + HTTP-only refresh cookie, no OAuth)

---

## Backend (apps/api)

### Setup

1. `npm install` (from the repo root — this is an npm-workspaces monorepo).
2. Copy `.env.example` to `.env` at the repo root and fill in values.
   - `MONGODB_URI` — for Atlas, prefer the **non-SRV (direct) form** to avoid DNS
     SRV-lookup failures (`querySrv ECONNREFUSED`). Prisma's engine can't be
     pointed at a public DNS resolver the way the Node driver can, so SRV URLs
     are unreliable on some networks:
     `mongodb://USER:PASS@host1:27017,host2:27017,host3:27017/DB?ssl=true&replicaSet=...&authSource=admin`
   - `JWT_SECRET` and `JWT_REFRESH_SECRET` — two **different** 64-char hex strings:
     `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
3. Generate the Prisma client: `npm run prisma:generate --workspace apps/api`
4. Push the schema (creates indexes, e.g. unique email): `npm run prisma:push --workspace apps/api`

### Run

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the API with hot-reload (tsx watch) |
| `npm run build` / `npm start` | Compile and run the production build |
| `npm run db:ping --workspace apps/api` | Verify the MongoDB connection |
| `npm run prisma:generate --workspace apps/api` | Regenerate the Prisma client after schema changes |
| `npm run prisma:push --workspace apps/api` | Sync the schema to MongoDB |
| `npm run create:admin --workspace apps/api -- <email> <password> [name]` | Create/promote an admin user |

### Data model (Prisma)

Schema lives in `apps/api/prisma/schema.prisma`; the generated client is in
`apps/api/src/generated/prisma`. Models: `User` (roles: client/admin/tech) and
`Project` (owned by a user, status enum: draft/in_review/approved/locked/archived).

### API endpoints

| Method | Route | Auth |
|--------|-------|------|
| GET | `/api/health` | — |
| POST | `/api/auth/register` | — |
| POST | `/api/auth/login` | — |
| POST | `/api/auth/refresh` | refresh cookie |
| POST | `/api/auth/logout` | — |
| GET | `/api/auth/me` | Bearer |
| GET/POST | `/api/projects` | Bearer |
| GET/PATCH/DELETE | `/api/projects/:id` | Bearer (owner-scoped) |
| GET | `/api/admin/users` | Bearer + **admin** role |
| GET | `/api/admin/projects` | Bearer + **admin** role |

**Roles:** users register as `client`. Create an `admin` with the `create:admin`
script (admins can't be self-registered). The `requireRole('admin')` middleware
gates everything under `/api/admin`; a non-admin token gets `403`.

**Auth flow:** register/login return an access token (JSON body, ~15 min) and set
an HTTP-only `refreshToken` cookie (~7 days). Send the access token as
`Authorization: Bearer <token>` on protected routes. When it expires, call
`POST /api/auth/refresh` (cookie sent automatically) to get a new one; the refresh
cookie is rotated each time. `POST /api/auth/logout` clears the cookie.
