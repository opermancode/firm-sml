# FIRM — Fleet Classification Tool

An internal tool for **Sanghvi Movers Limited** that ingests the crane fleet from an
Excel workbook, classifies every crane against the FIRM policy, and routes the result
through a governed sign-off chain.

No SAP connection is required. The fleet master, annual performance and retention
assessments are uploaded from a standard workbook, validated, and stored locally.

---

## What it does

- **Excel ingestion** — three-sheet workbook (Fleet Master, Annual Performance,
  Retention Assessment) with header aliases, date/number normalisation, and
  row-level validation. Nothing is written until the preview is committed.
- **Classification engine** — applies the policy to every crane:
  - **Old Fleet** — age above the Old Fleet threshold (default 15 years).
  - **Non-Deployable** — above the model-specific age threshold (15 / 20 / 25 years
    from the 67-model master), lapsed statutory certificate, or repair cost above the
    replacement-capex trigger.
  - **NRG (Non-Revenue Generating)** — Condition 1 (utilisation and monthly yield on
    capital employed both below threshold for three consecutive financial years)
    **and** Condition 2 (retention not committable and NPV below sale price, or
    capital-release return above the crane's return).
  - **NRG Review** — Condition 1 is met but the retention assessment is missing, so
    the crane is flagged for review instead of confirmed NRG.
- **Dashboard** — fleet composition, replacement capex at risk, region/model
  breakdowns and the latest evaluation.
- **Fleet register** — filterable, searchable, sortable list with a full reason trail
  per crane and CSV export.
- **Evaluation runs** — every import creates an immutable run with a policy snapshot
  and per-asset results, so historic classifications stay reproducible.
- **Approval & audit** — Prepared By → Reviewed By → Approved By, with comments,
  segregation of duties, and an audit log for imports, policy changes and sign-offs.
- **Policy settings** — thresholds live in the database and are editable from the UI;
  existing runs keep the snapshot they were computed with.

---

## Tech stack

| Layer      | Choice |
| ---------- | ------ |
| Framework  | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling    | Tailwind CSS v4 |
| Database   | PostgreSQL via Drizzle ORM |
| Local DB   | Embedded PGlite (PostgreSQL in WASM) — zero install |
| Excel      | SheetJS (`xlsx`) |
| Auth       | Signed, HTTP-only session cookie (HMAC-SHA256) |

The database driver is selected at runtime: set `DATABASE_URL` to use a real
PostgreSQL server, or leave it empty to use the embedded PGlite database in
`./.data/pglite`.

---

## Quick start

Requirements: **Node.js 20.9+** (Node 22 recommended) and npm.

```bash
npm install

# Optional: regenerate the downloadable templates in public/templates
npm run excel

# Seed the demo fleet (parses the sample workbook through the real pipeline)
npm run seed:demo

# Start the app on http://localhost:3100
npm run dev
```

Open <http://localhost:3100> and sign in.

### Demo credentials

| Name | Role | Email | Password |
| ---- | ---- | ----- | -------- |
| System Administrator | ADMIN | `admin@firm.local` | `Admin@12345` |
| Satish Irale (AVP – SCM) | PREPARER | `satish.irale@firm.local` | `Firm@12345` |
| Prajwal Kumar (CBO) | REVIEWER | `prajwal.kumar@firm.local` | `Firm@12345` |
| Abhijeet Sawarkar (VP) | REVIEWER | `abhijeet.sawarkar@firm.local` | `Firm@12345` |
| R. Manoj (VP) | REVIEWER | `r.manoj@firm.local` | `Firm@12345` |
| Gaurang Desai (CEO) | APPROVER | `gaurang.desai@firm.local` | `Firm@12345` |
| Rishi Sanghvi (MD) | APPROVER | `rishi.sanghvi@firm.local` | `Firm@12345` |

Seeded accounts are for evaluation only. Change the passwords and
`SESSION_SECRET` before any shared deployment.

---

## Environment variables

Copy `.env.example` to `.env.local` and adjust as needed.

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `DATABASE_URL` | No | PostgreSQL connection string. Empty = embedded PGlite. |
| `PGLITE_DIR` | No | Directory for the embedded database (default `./.data/pglite`). |
| `SESSION_SECRET` | Recommended | HMAC key for session cookies. Set a long random value in shared environments. |

The schema and seed users are created automatically on first connection.

---

## Using the tool

1. **Import** (`/import`) — download the blank template or sample workbook, upload a
   workbook, choose the evaluation date, and click **Validate workbook**.
   - Errors block the commit; warnings are imported with a data-quality flag.
   - The preview shows the classification result before anything is saved.
2. **Commit** — creates the fleet records and a new **evaluation run**.
3. **Prepare** (`/runs/[id]`) — the Preparer confirms the data and forwards the run.
4. **Review** — the Reviewer validates and forwards, or returns it for rework.
5. **Approve** — the Approver records final management approval.
6. **Monitor** — the dashboard, fleet register, model master and approvals queue
   always reflect the latest evaluation. Approved runs are the fleet position.

### Workbook layout

**1 · Fleet Master** — one row per crane. Required: Asset Code, Model, Year of
Manufacture. Recommended: description, OEM, category, capacity, capitalisation date,
original capex, gross block, net book value, replacement capex, location, region,
current status, OEM support, spares availability, compliance status, repair quote and
the four statutory certificate expiry dates.

**2 · Annual Performance** — one row per crane per financial year (`FY2023-24`,
`2023-24`, `23-24` accepted). Columns: Asset Code, FY, Available Days, Deployed Days,
Rental Revenue, Operating Cost, Capital Employed. Three consecutive years are needed
to test NRG Condition 1.

**3 · Retention Assessment** — Asset Code, Evaluation Date, Rentability Committable
(Yes/No), NPV (5 yr), Achievable Sale Price, Capital Release Return %, Crane Return %,
Recommendation, Justification. Leave the evaluation date blank to use the evaluation
date selected in the import screen.

Monetary cells accept plain rupees (`12500000`) or shorthand (`1.25 Cr`, `45 L`).
Dates accept `YYYY-MM-DD` or `DD/MM/YYYY`.

---

## Classification rules

### Old Fleet

Age = evaluation date − Year of Manufacture. A crane older than the Old Fleet
threshold (default **15 years**) is Old Fleet.

### Non-Deployable

Any one of the following:

- Age above the **model-specific threshold** from the approved master
  (15 / 20 / 25 years).
- A statutory certificate (fitness, lifting, TPI, PESO) lapsed beyond the grace
  period (default **30 days**).
- Repair quote above **25%** of prevailing replacement capex (obsolescence trigger).
- For Old Fleet cranes (default scope): OEM support withdrawn, critical spares
  unavailable, or compliance failure. Set the scope to **All equipment** in policy
  settings to apply these triggers to every crane.

### NRG — Non-Revenue Generating

**Condition 1** — for each of the last three financial years:

- utilisation below **60%**, **and**
- monthly yield on capital employed below **1.8%** (≈ 21.6% annualised).

Monthly yield is computed as:

```
monthly yield % = (annual rental revenue ÷ capital employed) ÷ 12 × 100
```

**Condition 2** — either:

- **2.1** the business cannot commit five-year rentability **and** NPV is below the
  achievable sale price, or
- **2.2** the return from releasing capital exceeds the crane's return.

A crane that meets Condition 1 but has no retention assessment is **NRG Review**
(potential NRG). Missing performance years make the NRG test **not testable**; the
asset is reported in the data-coverage panel rather than classified NRG.

---

## Project structure

```
src/
  app/
    (app)/               authenticated pages: dashboard, assets, runs, approvals,
                         models, settings, import
    api/                 import, template download, CSV export, health
    actions/             server actions: auth, approvals, policy, reclassify
    login/               sign-in page
  components/            UI: sidebar, badges, stat cards, import wizard,
                         sign-off panel, policy form
  db/                    Drizzle schema, DDL, PGlite/Postgres initialiser, seed
  lib/                   classification engine, Excel parser, import pipeline,
                         policy store, queries, auth, workflow constants, format
scripts/
  generate-excel.ts      writes the blank template and sample workbook
  seed-demo.ts           imports the sample fleet as demo data
public/templates/        downloadable .xlsx templates
```

---

## Scripts

| Script | Description |
| ------ | ----------- |
| `npm run dev` | Development server on port 3100. |
| `npm run build` | Production build. |
| `npm start` | Start the production server on port 3100. |
| `npm run typecheck` | TypeScript check without emitting. |
| `npm run excel` | Regenerate `public/templates/*.xlsx`. |
| `npm run seed:demo` | Import the sample fleet into the configured database. |

---

## Production with PostgreSQL

```bash
export DATABASE_URL=postgres://firm:firm@localhost:5432/firm
export SESSION_SECRET="$(openssl rand -hex 32)"
npm run build
npm start
```

The schema, policy defaults and user accounts are created automatically on first
connection. Point `DATABASE_URL` at a managed PostgreSQL instance for a durable
deployment; PGlite is intended for local use and demos.

### Docker

```bash
docker compose up --build
```

This starts PostgreSQL and the app on <http://localhost:3100>. Override
`SESSION_SECRET` (and the database credentials) for anything beyond a local demo.
The demo users are seeded automatically; run the demo fleet import from the UI or
with `docker compose exec app node -e "..."` if you want sample data.

---

## Notes & assumptions

- The 67-model master and the 15 / 20 / 25-year age thresholds are taken from the
  FIRM definition document and are validated on upload. Unknown models are imported
  with a warning and no model-specific threshold.
- Obsolescence triggers are applied to Old Fleet cranes by default, matching the
  document's wording ("Any crane in the Old Fleet"). The scope is configurable.
- Retention assessments use the latest row with an evaluation date on or before the
  run's evaluation date.
- The application stores no passwords in plain text (scrypt hashes) and sessions are
  signed HTTP-only cookies.
