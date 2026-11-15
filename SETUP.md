# FIRM — Local setup on macOS

This guide gets the FIRM fleet-classification app running on a fresh Mac, either
against the built-in embedded database (fastest) or a real PostgreSQL server.

FIRM is a Next.js 16 app. It imports a crane fleet from Excel, classifies every
asset against the FIRM policy, and routes the result through a governed
Prepared → Reviewed → Approved sign-off chain. Everything runs locally; there is
no SAP connection and no cloud service required.

---

## 1. Prerequisites

| Tool | Version | Why |
| ---- | ------- | --- |
| macOS | 13 Ventura or newer | Intel or Apple Silicon both work |
| Node.js | **22 LTS** (20.9+ minimum) | Next.js 16 and PGlite |
| npm | Ships with Node | Dependency install |
| git | Any recent version | Clone the repo |
| Docker Desktop | Optional | Only for the PostgreSQL option |

Install Node with Homebrew or nvm:

```bash
# Homebrew
brew install node@22
brew link --overwrite --force node@22

# or nvm (recommended if you keep several Node versions)
brew install nvm
mkdir -p ~/.nvm
nvm install 22
nvm use 22
```

Verify:

```bash
node -v    # v22.x.x
npm -v     # 10.x or newer
```

> Avoid Node 18 and Node 23+. Next.js 16 needs a modern Node runtime, and the
> native PGlite package is tested against the LTS releases.

---

## 2. Get the code

```bash
git clone <REPOSITORY-URL> firm
cd firm
```

> **Before you clone:** this working copy has not been committed yet. Commit and
> push from the machine that has the current work first, or copy the folder over
> (excluding `node_modules`, `.next` and `.data`). The rest of this guide assumes
> a normal `git clone`.

Check what you have:

```bash
ls
# AGENTS.md  README.md  USAGE.md  package.json  src  public  scripts ...
```

---

## 3. Install dependencies

```bash
npm install
```

Use `npm ci` instead if you want an exact install from `package-lock.json`
(recommended on CI or a second machine):

```bash
npm ci
```

This installs Next.js, React 19, Tailwind v4, Radix primitives, Recharts,
TanStack Table, SheetJS, Drizzle, and the embedded PGlite database engine.

> `npm audit` currently reports two high-severity advisories from transitive
> dependencies. They do not block local use. Review them before a production
> deployment.

---

## 4. Configure the environment

```bash
cp .env.example .env.local
```

Generate a session secret and paste it into `.env.local`:

```bash
openssl rand -base64 48
```

`.env.local` for the default embedded database:

```dotenv
# Leave empty to use the embedded PGlite database in ./.data/pglite
DATABASE_URL=

# Optional: where the embedded database lives
# PGLITE_DIR=./.data/pglite

# Required in shared environments; any long random string works locally
SESSION_SECRET=<paste-the-openssl-output-here>

# Optional: run the UI from deterministic fixtures instead of the database
# NEXT_PUBLIC_USE_MOCK=true
```

Notes:

- `.env.local` is git-ignored. Never commit it.
- Environment changes require a dev-server restart.
- With `DATABASE_URL` empty, the app creates `.data/pglite` on first connection
  and seeds the demo user accounts automatically.

---

## 5. First run (embedded database)

Seed the sample fleet. This parses the same workbook the app offers for
download, runs it through the real import pipeline, and creates evaluation
run #1 with 42 assets:

```bash
npm run seed:demo
```

Start the app:

```bash
npm run dev
```

Open **http://localhost:3100**.

### Demo accounts

| Name | Role | Email | Password |
| ---- | ---- | ----- | -------- |
| System Administrator | ADMIN | `admin@firm.local` | `Admin@12345` |
| Satish Irale (AVP – SCM) | PREPARER | `satish.irale@firm.local` | `Firm@12345` |
| Prajwal Kumar (CBO) | REVIEWER | `prajwal.kumar@firm.local` | `Firm@12345` |
| Abhijeet Sawarkar (VP) | REVIEWER | `abhijeet.sawarkar@firm.local` | `Firm@12345` |
| R. Manoj (VP) | REVIEWER | `r.manoj@firm.local` | `Firm@12345` |
| Gaurang Desai (CEO) | APPROVER | `gaurang.desai@firm.local` | `Firm@12345` |
| Rishi Sanghvi (MD) | APPROVER | `rishi.sanghvi@firm.local` | `Firm@12345` |

These accounts are for evaluation only. Change the passwords and
`SESSION_SECRET` before sharing the app with anyone.

---

## 6. Optional: run the UI from mock data

The pages read through `src/lib/api.ts`, which switches between the live
database and `src/lib/mock/` fixtures:

```dotenv
NEXT_PUBLIC_USE_MOCK=true
```

Restart `npm run dev`. You get a deterministic 12-asset fleet covering all five
classes (Non-Deployable, NRG, NRG Review, Old Fleet, Healthy), five evaluation
runs, a pending review, a returned run and approval history.

Important: **sign-in still uses the seeded database users**. Run
`npm run seed:demo` once even in mock mode, or sign-in will fail. Set the flag
back to `false` (or remove it) and restart to return to live data.

---

## 7. Production build on the Mac

```bash
npm run typecheck
npm run build
npm start
```

`npm start` serves the production build on **http://localhost:3100**. The build
uses Next.js standalone output, so it can also be containerised with the
included `Dockerfile`.

---

## 8. Optional: use real PostgreSQL

### Option A — Docker Compose

The repo includes a Postgres 16 service:

```bash
docker compose up -d db
```

Then in `.env.local`:

```dotenv
DATABASE_URL=postgres://firm:firm@localhost:5432/firm
```

Restart the dev server. The schema and demo users are created automatically on
first connection. Seed the fleet with `npm run seed:demo`.

### Option B — Homebrew Postgres

```bash
brew install postgresql@16
brew services start postgresql@16
createdb firm
```

```dotenv
DATABASE_URL=postgres://$(whoami)@localhost:5432/firm
```

The embedded `.data/pglite` directory is simply ignored when `DATABASE_URL` is
set.

---

## 9. Everyday commands

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Dev server on port 3100 with hot reload |
| `npm run build` | Production build |
| `npm start` | Serve the production build on 3100 |
| `npm run typecheck` | TypeScript check, no emit |
| `npm run seed:demo` | Import the sample fleet through the real pipeline |
| `npm run excel` | Regenerate the template workbooks in `public/templates` |

---

## 10. Reset the local database

Stop the dev server, then:

```bash
rm -rf .data/pglite
npm run seed:demo
npm run dev
```

For PostgreSQL, drop and recreate the database instead:

```bash
dropdb firm && createdb firm
npm run seed:demo
```

---

## 11. Troubleshooting on macOS

**Port 3100 is already in use**

```bash
lsof -ti:3100 | xargs kill -9
```

**`EPERM`, `EBUSY` or stale-chunk errors under `.next`**

```bash
rm -rf .next
npm run dev
```

**PGlite fails to open the data directory**

- Keep the project on the local disk, not iCloud Drive, Dropbox, a network
  share, or an external volume.
- Make sure the folder is writable: `ls -ld .data`.
- Delete and re-seed if the directory was copied mid-write.

**`npm install` fails on Apple Silicon**

- Confirm you are on Node 22 LTS (`node -v`).
- Remove a partial install and retry: `rm -rf node_modules && npm ci`.
- If you are behind a corporate proxy, configure `npm config set proxy` and
  `npm config set https-proxy`.

**Sign-in immediately bounces back to `/login`**

- Check that `.env.local` exists and the dev server was restarted.
- Sessions last 12 hours and are signed with `SESSION_SECRET`. Changing the
  secret invalidates existing cookies; clear cookies for `localhost:3100`.
- Make sure the demo users exist: `npm run seed:demo`.

**Mock mode shows no change**

`NEXT_PUBLIC_USE_MOCK` is read at build/start time. Stop the dev server, confirm
the value in `.env.local`, and start it again.

**Excel import rejects a workbook**

Open `/import`, validate first, and read the row-level errors. Errors block the
commit by design; warnings do not. Monetary cells accept `12500000`, `1.25 Cr`
or `45 L`, and dates accept `YYYY-MM-DD` or `DD/MM/YYYY`.

---

## 12. What lives where

```
src/
  app/
    login/                 sign-in
    (app)/                 authenticated shell + pages
      page.tsx             dashboard
      assets/              fleet register and asset detail
      import/              workbook wizard
      runs/                evaluation runs and run detail
      approvals/           sign-off queue
      models/              approved model master
      settings/            policy settings, users, reclassify
    actions/               server actions (auth, approvals, policy, runs)
    api/                   template download, CSV export, health
  components/              shared UI (badges, tables, charts, dialogs, shell)
  db/                      Drizzle schema, DDL, connection + seed users
  lib/
    api.ts                 typed data facade (live DB or mock)
    mock/                  deterministic fixtures for NEXT_PUBLIC_USE_MOCK
    queries.ts             live read models
    classify.ts            classification engine
    policy.ts              policy defaults and validation
    workflow.ts            roles, stages, status labels
public/templates/          downloadable Excel template and sample fleet
scripts/                   seed:demo and excel generators
USAGE.md                   functional source of truth
AGENTS.md                  notes for AI coding agents working in this repo
```

### Routes

| Route | Purpose |
| ----- | ------- |
| `/login` | Sign in |
| `/` | Fleet classification dashboard |
| `/assets` | Fleet register with filters, search and CSV export |
| `/assets/[code]` | Full reason trail, certificates, performance, retention |
| `/import` | Validate and commit a workbook |
| `/runs` | Evaluation runs by sign-off state |
| `/runs/[id]` | Run results, policy snapshot, sign-off and audit |
| `/approvals` | Actionable, blocked and in-flight sign-offs |
| `/models` | 67-model master by 15/20/25-year threshold |
| `/settings` | Policy thresholds, users and reclassification |

---

## 13. Verification checklist

After setup, walk these in order:

1. `/login` signs in with `admin@firm.local` / `Admin@12345`.
2. `/` shows the seeded fleet and the latest run.
3. `/assets` filters by class and exports CSV.
4. Open one asset and confirm the reason trail shows observed values and
   thresholds.
5. `/runs` lists the seeded run; open it and confirm the policy snapshot.
6. `/approvals` shows the sign-off chain.
7. `/models` lists all 67 models across the three thresholds.
8. `/settings` shows the policy form (editable as ADMIN) and the seeded users.
9. `npm run typecheck` passes.

The footer on every authenticated page should read
**“Confidential. Sanghvi Movers Limited. Internal use only.”**

---

## 14. Before you push

`node_modules/`, `.next/`, `.data/` and `.env.local` are git-ignored. Commit the
source, `package.json` and `package-lock.json`; never commit the database
directory, build output or secrets.
