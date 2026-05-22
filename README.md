# DEVCON+ PM

Project Management Dashboard for the DEVCON+ team — built with Next.js 14, Supabase, and Tailwind CSS.

---

## Tech stack

| Layer       | Tool                             |
|-------------|----------------------------------|
| Framework   | Next.js 14 (App Router, TypeScript) |
| Backend     | Supabase (Postgres, Auth, Storage, Edge Functions) |
| Email       | Resend                           |
| Bot         | Telegram Bot API                 |
| Styling     | Tailwind CSS                     |
| State       | Zustand                          |
| Deployment  | Vercel                           |

---

## Local setup

### 1. Prerequisites
- Node.js 18+
- Supabase CLI: `npm i -g supabase`

### 2. Clone and install
```bash
git clone <repo-url>
cd DevconPlus_Dashboard
npm install
```

### 3. Configure environment variables
```bash
cp .env.local.example .env.local
```
Fill in `.env.local` with your Supabase project credentials, Resend API key, and Telegram bot token.

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API |
| `RESEND_API_KEY` | resend.com → API Keys |
| `TELEGRAM_BOT_TOKEN` | @BotFather on Telegram |
| `TELEGRAM_GROUP_CHAT_ID` | Your DEVCON+ Telegram group chat ID |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local dev |

### 4. Apply database migrations
In the Supabase Dashboard → SQL Editor, run the migrations **in order**:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_storage.sql
```

Or using the Supabase CLI with a local instance:
```bash
supabase db push
```

### 5. Add the first contributor
After running migrations, manually insert a contributor in Supabase:

```sql
INSERT INTO contributors (email, full_name, role_id)
VALUES ('you@devconph.com', 'Your Name', (SELECT id FROM roles WHERE name = 'Project Manager'));
```

Then create a matching Supabase Auth user in the dashboard with the same email.

### 6. Run the dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you will be redirected to the login page.

---

## Project structure

```
/app
  /(authenticated)
    /dashboard          → PM Kanban board
    /qa                 → QA test tracker
    /announcements      → Announcements feed
    /contributors       → Team directory
  /login                → Auth page
  /access-denied        → Non-contributor error page
  /api
    /telegram           → Telegram webhook handler
    /notify             → Email notification handler

/components
  /ui                   → Shared UI (Sidebar, Modal, Button, Badge)
  /board                → Kanban-specific components
  /qa                   → QA-specific components

/lib
  supabase.ts           → Browser + server + service-role Supabase clients
  store.ts              → Zustand auth store
  resend.ts             → Resend client stub
  telegram.ts           → Telegram bot stub
  utils.ts              → cn(), formatDate(), isOverdue()

/types
  index.ts              → All TypeScript types + DB type map

/supabase
  /migrations           → SQL migration files (run in order)
  /functions            → Supabase Edge Functions (Deno)
  config.toml           → Local Supabase config
```

---

## Access control

Only pre-added contributors can log in. The flow:
1. User signs in with email + password via Supabase Auth.
2. After sign-in, the app checks if that email exists in the `contributors` table.
3. If not found, sign out and redirect to `/access-denied`.
4. If found, store the contributor record in Zustand and proceed to dashboard.

Add new team members by inserting their email into the `contributors` table and creating a Supabase Auth user for them.

---

## Deployment (Vercel)

1. Push to GitHub.
2. Import the repo in Vercel.
3. Add all `.env.local` variables as Vercel Environment Variables.
4. Deploy — Vercel auto-detects Next.js.

---

## Batched build plan

| Batch | Scope |
|---|---|
| **1 (this batch)** | Scaffold, Supabase schema, RLS, Storage, Edge Function stubs, Auth |
| 2 | Full UI — Kanban board, task modals, QA tracker, announcements, contributors |
| 3 | Notifications — Resend email, Telegram bot, Edge Function wiring |
