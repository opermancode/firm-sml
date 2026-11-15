# FIRM — Complete Usage Guide

**FIRM** (Fleet Inventory & Retention Management) is the internal fleet-classification
tool for **Sanghvi Movers Limited**. It turns the crane fleet workbook into a governed,
auditable classification of every crane as **Old Fleet**, **Non-Deployable**,
**Non-Revenue Generating (NRG)** or **Healthy**.

> **Confidential — Sanghvi Movers Limited. Internal use only.**
> The workbook, classifications, retention economics and approval records are
> commercially sensitive. Do not share exports outside the authorised sign-off group.

---

## 1. What the app does

The app answers one question, objectively and repeatably:

> *For every crane we own, what is its classification under the current FIRM policy,
> why did it get that classification, and who signed off on it?*

It does this in five stages:

| Stage | What happens | Where |
| ----- | ------------ | ----- |
| **1. Capture** | Upload an Excel workbook with the fleet master, three years of performance and retention assessments. | `/import` |
| **2. Validate** | Every row is checked for required fields, valid dates, valid model names and referential integrity. Nothing is written until you commit. | `/import` |
| **3. Classify** | The engine applies the policy to every crane and stores every reason, threshold and metric. | Automatic on commit |
| **4. Review** | The run moves through **Prepared By → Reviewed By → Approved By**. | `/runs/[id]`, `/approvals` |
| **5. Monitor** | Dashboard, fleet register, asset detail, model master and CSV export always reflect the latest evaluation. | `/`, `/assets` |

There is **no SAP integration**. The workbook is the source of truth for each
evaluation. Re-uploading a corrected workbook updates the fleet and creates a new
evaluation run.

---

## 2. The mental model

Before using the app, understand these five concepts.

### 2.1 Asset (crane)

An asset is one owned crane, identified by **Asset Code**. The app keeps the latest
master data for it: model, year of manufacture, capex, certificates, OEM support,
spares availability, compliance, repair estimate and location.

### 2.2 Evaluation run

An **evaluation run** is an immutable snapshot of a classification exercise:

- the **evaluation date**,
- the **policy snapshot** used at that moment,
- one result per asset, with every **reason** and **metric**,
- the **sign-off trail** and **audit entries**.

Runs are numbered (`#1`, `#2`, …). A run is never edited. A new import or a
reclassification creates a new run, so history stays reproducible even after policy
thresholds change.

### 2.3 Flags vs primary class

Each crane can carry **more than one flag**:

- `Old Fleet` — age above the marketability threshold.
- `Non-Deployable` — serviceability failure.
- `NRG` — confirmed under-performance plus retention economics.
- `NRG Review` — Condition 1 met, but the retention assessment is missing.

The **primary class** is the single most severe action, used for the classification
mix and the fleet register. Precedence:

```
Non-Deployable  >  NRG  >  NRG Review  >  Old Fleet  >  Healthy
```

A crane that is both Old Fleet and Non-Deployable appears as **Non-Deployable** in
the primary mix but still carries the Old Fleet flag in its detail page.

### 2.4 Reason trail

Every classification produces a list of reasons, each with:

- **area** — Old Fleet, Non-Deployable or NRG,
- **severity** — `critical`, `warning`, `info` or `pass`,
- **title / detail** — what was tested and what was observed,
- **observed / threshold** — the number versus the policy limit.

The asset detail page (`/assets/[code]`) and the run detail page show this trail.
Nothing is a black box: a reviewer can see exactly why a crane was flagged.

### 2.5 Policy snapshot

All thresholds live in the database and are editable in `/settings`. Each run stores
the policy it was computed with. Changing a threshold affects **new** runs only;
old runs keep their original snapshot.

---

## 3. Roles and permissions

The app has four roles. A user has exactly one role.

| Capability | ADMIN | PREPARER | REVIEWER | APPROVER |
| ---------- | :---: | :------: | :------: | :------: |
| Sign in, view dashboard, register, runs | ✅ | ✅ | ✅ | ✅ |
| Download template / sample, validate workbook | ✅ | ✅ | ✅ | ✅ |
| Commit an import | ✅ | ✅ | — | — |
| Prepare a run (PENDING/RETURNED → PREPARED) | ✅ | ✅ | — | — |
| Review a run (PREPARED → REVIEWED) | ✅ | — | ✅ | — |
| Approve a run (REVIEWED → APPROVED) | ✅ | — | — | ✅ |
| Return a run for rework | ✅ | — | ✅ | ✅ |
| Reclassify the current fleet | ✅ | ✅ | — | — |
| Edit policy thresholds | ✅ | — | — | — |
| Export CSV | ✅ | ✅ | ✅ | ✅ |

**Segregation of duties.** Except for an Administrator, the same person cannot record
two consecutive stages of the same run. If Satish prepares a run, a different
reviewer must review it; if Prajwal reviews it, a different approver must approve it.

**Demo accounts** (seeded for evaluation only):

| Name | Role | Email | Password |
| ---- | ---- | ----- | -------- |
| System Administrator | ADMIN | `admin@firm.local` | `Admin@12345` |
| Satish Irale (AVP – SCM) | PREPARER | `satish.irale@firm.local` | `Firm@12345` |
| Prajwal Kumar (CBO) | REVIEWER | `prajwal.kumar@firm.local` | `Firm@12345` |
| Abhijeet Sawarkar (VP) | REVIEWER | `abhijeet.sawarkar@firm.local` | `Firm@12345` |
| R. Manoj (VP) | REVIEWER | `r.manoj@firm.local` | `Firm@12345` |
| Gaurang Desai (CEO) | APPROVER | `gaurang.desai@firm.local` | `Firm@12345` |
| Rishi Sanghvi (MD) | APPROVER | `rishi.sanghvi@firm.local` | `Firm@12345` |

Change the passwords and `SESSION_SECRET` before any shared deployment.

---

## 4. End-to-end walkthrough

### Step 1 — Sign in

Open the app (default `http://localhost:3100`). Sign in with your FIRM account.
Unauthenticated visits to any app page redirect to `/login`. Sessions last 12 hours
and are stored in a signed, HTTP-only cookie.

### Step 2 — Download the workbook

Go to **Import Data** (`/import`). Two downloads are available:

- **Download template** — a blank workbook with the correct sheets and headers.
- **Download sample fleet** — a realistic example you can study or import.

Both are also available directly:

```
GET /api/template?kind=template
GET /api/template?kind=sample
```

### Step 3 — Fill the workbook

Use the three sheets described in [section 6](#6-workbook-reference). The minimum
viable workbook is a **Fleet Master** sheet with Asset Code, Model and Year of
Manufacture. Performance and retention sheets are optional but determine whether the
NRG test can be concluded.

### Step 4 — Validate (preview)

On `/import`:

1. Drag the workbook onto the drop zone, or choose a file.
2. Set the **evaluation date** (defaults to today; it cannot be in the future).
3. Click **Validate workbook**.

The preview shows, before anything is saved:

- workbook statistics — assets, performance rows, retention rows, models used,
  errors, warnings;
- the detected sheet names;
- all validation issues, grouped as errors and warnings;
- a full preview table with each crane's age, classification flags, primary class,
  average utilisation and average monthly yield.

**Errors block the commit. Warnings do not.**

### Step 5 — Commit

If there are no errors and you are a Preparer or Administrator, click **Commit
import**. The app:

1. upserts the fleet master by Asset Code;
2. upserts performance rows by asset + financial year;
3. upserts retention rows by asset + evaluation date;
4. creates a new evaluation run with the policy snapshot and every reason;
5. writes an `IMPORT_COMMITTED` audit entry.

You are taken to the new run. If you are not a Preparer, you can still validate and
inspect the preview, but the commit button is not available.

### Step 6 — Prepare

Open the run (`/runs/[id]`). A Preparer (or Administrator) sees the **Sign-off**
panel and clicks **Prepare & send for review**. The status changes from
*Pending preparation* to *Pending review*. A comment is optional but recommended.

### Step 7 — Review

A Reviewer opens the same run and either:

- clicks **Review & send for approval** → *Pending approval*, or
- clicks **Return for rework**, which **requires a comment** explaining what must be
  corrected → *Returned for rework*.

### Step 8 — Approve

An Approver opens the run and clicks **Approve evaluation** → *Approved*. The run is
now the fleet position.

### Step 9 — Monitor and export

- **Dashboard** (`/`) — fleet composition, capex at risk, priority actions, data
  coverage and recent imports.
- **Fleet Assets** (`/assets`) — searchable, filterable, sortable register with CSV
  export.
- **Asset detail** (`/assets/[code]`) — full reason trail, certificates, performance
  history and retention assessment for one crane.
- **Evaluation Runs** (`/runs`) — every run, its status and sign-off progress.
- **Approvals** (`/approvals`) — the queue split into “awaiting your action”, “in the
  chain (other roles)” and approved history.

### Step 10 — Change policy or reclassify (when needed)

- **Policy Settings** (`/settings`) — an Administrator edits thresholds. Existing
  runs keep their snapshot.
- **Reclassify current fleet** — a Preparer or Administrator creates a new run from
  the saved fleet and the current policy, without re-uploading a workbook. Use this
  after a threshold change.

---

## 5. Classification logic

All rules are implemented in `src/lib/classify.ts`. The default policy is in
`src/lib/policy.ts` and can be changed in `/settings`.

### 5.1 Inputs used

| Area | Inputs |
| ---- | ------ |
| Old Fleet | Year of Manufacture, evaluation date |
| Non-Deployable | Model (from the 67-model master), YOM, four certificate expiry dates, OEM support, spares availability, compliance status, repair quote, replacement capex |
| NRG | Three consecutive financial years of available days, deployed days, rental revenue and capital employed; retention assessment (rentability commitment, NPV, sale price, capital-release return, crane return) |

### 5.2 Old Fleet

```
age (years) = evaluation year − year of manufacture
Old Fleet   = age > oldFleetYears          (default 15; strictly greater)
```

This is a **marketability** test. It is independent of the model-specific
Non-Deployable threshold. A 16-year-old crane with a 25-year model threshold is Old
Fleet but not Non-Deployable.

### 5.3 Non-Deployable

A crane is Non-Deployable if **any** of the following is true:

#### (a) Model age threshold exceeded

Each model in the approved master has a deployable life of **15, 20 or 25 years**.
The test is:

```
age > model threshold
```

Models not in the master are imported with a warning; no model-specific threshold is
applied, so this test cannot fail for them.

#### (b) Statutory certificate lapsed

Four certificates are tested:

1. Fitness Certificate
2. Lifting Equipment License
3. Third-Party Inspection Certificate
4. PESO / Factory License

A certificate fails when:

```
evaluation date > expiry date + certGraceDays      (default grace: 30 days)
```

Missing expiry dates are a **warning**, not a failure. The asset detail page shows
each certificate with its expiry, grace end and days remaining/lapsed.

#### (c) Obsolescence triggers

Four triggers are evaluated:

| Trigger | Fails when |
| ------- | ---------- |
| OEM technical support discontinued | `OEM support = Discontinued` |
| Critical spares unavailable | `Spares availability = Unavailable` |
| Safety / regulatory / emission non-compliance | `Compliance status = Non-compliant` |
| Repair cost above threshold | `repair quote ÷ replacement capex × 100 > repairPct` (default 25%) |

**Scope.** By default these four triggers apply **only to Old Fleet cranes**,
matching the policy wording (“Any crane in the Old Fleet”). Set
**Obsolescence scope = All equipment** in `/settings` to apply them to every crane.
When a trigger fires outside the scope, it is recorded as a warning with an
explanation, not as a failure.

> A missing input (blank OEM support, blank spares, blank compliance, missing capex
> or repair quote) produces a **warning**, never a failure.

### 5.4 NRG — Non-Revenue Generating

NRG is a two-condition test. Both conditions must be met and fully testable before a
crane is confirmed NRG.

#### Condition 1 — sustained under-performance

For each of the required consecutive financial years (default **3**):

```
utilisation %      = deployed days ÷ available days × 100
monthly yield %    = (annual rental revenue ÷ capital employed) ÷ 12 × 100
underperforms      = utilisation < nrgUtilPct  AND  monthly yield < nrgYieldPct
```

Defaults: `nrgUtilPct = 60`, `nrgYieldPct = 1.8` (1.8% per month ≈ 21.6% per annum).

Condition 1 is met only when **every** required year underperforms on **both**
measures. The engine selects the latest consecutive financial years present in the
workbook, using an April–March financial year. Accepted labels include
`FY2023-24`, `2023-24`, `2023/24` and `23-24`.

If any required year is missing, or utilisation/capital employed is missing for a
year, Condition 1 is **not testable** (`null`) and the crane is reported as
**Insufficient data** rather than classified NRG.

#### Condition 2 — retention economics

The business team's retention assessment is used. Two sub-tests are evaluated:

**2.1 — 5-year rentability not underwritten**

```
condition 2.1 = rentability committable = No
                AND NPV (5 yr) < achievable sale price
```

**2.2 — capital release earns a superior return**

```
condition 2.2 = return on capital released > crane 5-year return
```

The engine requires **both 2.1 and 2.2 to be testable and met** for Condition 2 to
be true. If either input is missing, Condition 2 is “cannot be tested” and the crane
becomes **Potential NRG** (shown as **NRG Review**).

#### NRG status matrix

| Condition 1 | Condition 2 | NRG status | Primary class |
| ----------- | ----------- | ---------- | ------------- |
| Not testable | — | Insufficient data | Old Fleet / Healthy (as applicable) |
| Not met | — | Not NRG | Old Fleet / Healthy (as applicable) |
| Met | Not testable | Potential NRG | **NRG Review** |
| Met | Met | **NRG confirmed** | **NRG** |
| Met | Not met | Not NRG | Old Fleet / Healthy (as applicable) |

### 5.5 Primary classification precedence

```
NON_DEPLOYABLE  →  NRG  →  NRG_REVIEW  →  OLD_FLEET  →  HEALTHY
```

Non-Deployable wins even if the crane is also NRG. This keeps the fleet register
focused on the most severe action. The individual flags remain visible on the asset
detail and run detail pages.

### 5.6 Worked example

Suppose a crane has:

- YOM 2008, evaluation date 2026 → age 18 years
- Model `LTM 1090` → threshold 20 years
- Fitness certificate expired 45 days ago → grace 30 days → **lapsed**
- Utilisation 52% / 55% / 58%, monthly yield 1.2% / 1.4% / 1.5% for three years
- Retention: rentability not committable, NPV 1.8 Cr, sale price 2.4 Cr,
  capital-release return 14%, crane return 9%

Result:

- Old Fleet: **yes** (18 > 15)
- Non-Deployable: **yes** (fitness certificate lapsed)
- NRG: Condition 1 met (all three years below 60% and 1.8%); Condition 2 met
  (NPV 1.8 Cr < sale 2.4 Cr; 14% > 9%)
- **Primary class: Non-Deployable** (highest precedence)

The asset detail page would show the Old Fleet reason, the lapsed-certificate
critical reason, and the NRG reasons, all with observed values and thresholds.

### 5.7 Data sufficiency

The app never guesses. Missing data is surfaced explicitly:

- **NRG not testable** — fewer than the required consecutive years, or missing
  utilisation/capital employed.
- **Retention pending** — Condition 1 met but no retention assessment on or before
  the evaluation date.
- **Missing capex** — replacement capex blank, so capex-at-risk is understated.
- **Model not in master** — imported with a warning, no model threshold applied.
- **Certificates missing** — expiry dates blank; certificate test not performed.

These counts appear in the dashboard **Data coverage** panel and can be opened as
filtered register views.

---

## 6. Workbook reference

### 6.1 Sheet names

The parser matches sheet names loosely (case and punctuation are ignored), so these
all work:

| Sheet | Accepted names |
| ----- | -------------- |
| Fleet Master | `Fleet Master`, `Fleet`, `Asset Master`, `Assets` |
| Annual Performance | `Annual Performance`, `Performance`, `Utilisation`, `Utilization` |
| Retention Assessment | `Retention Assessment`, `Retention` |

Only **Fleet Master** is mandatory. Missing performance/retention sheets produce a
warning, and the affected NRG tests cannot be concluded.

### 6.2 Fleet Master

One row per crane. Header names are matched by alias, so `Equipment Code`,
`Crane ID`, `Asset No.` etc. all map to Asset Code.

| Field | Required | Used for |
| ----- | :------: | -------- |
| Asset Code | ✅ | Identity; upsert key |
| Model | ✅ | Model-specific age threshold |
| Year of Manufacture (YOM) | ✅ | Old Fleet and model-age tests |
| Description | — | Display |
| OEM / Make | — | Display |
| Category | — | Display; normalised to hydraulic telescopic / crawler lattice |
| Capacity (MT) | — | Display |
| Capitalisation Date | — | Data quality check |
| Original Capex | — | Display |
| Gross Block | — | Display |
| Net Book Value | — | Display |
| Replacement Capex | — | Capex at risk; repair-cost ratio |
| Location / Region | — | Register filters, region breakdown |
| Current Status | — | Display |
| OEM Support Status | — | Obsolescence trigger |
| Critical Spares Availability | — | Obsolescence trigger |
| Safety / Regulatory / Emission Compliance | — | Obsolescence trigger |
| Estimated Repair Cost | — | Obsolescence trigger |
| Fitness Certificate Expiry | — | Certificate test |
| Lifting Equipment License Expiry | — | Certificate test |
| Third-Party Inspection Certificate Expiry | — | Certificate test |
| PESO / Factory License Expiry | — | Certificate test |
| Notes / Remarks | — | Display |

**Validation rules**

- Asset Code is mandatory and must be unique within the sheet.
- Model is mandatory.
- YOM must be a year between 1950 and the current year + 1.
- Unknown models are **warnings**.
- Negative capex/repair values are ignored with a warning.
- Repair cost greater than replacement capex is a warning.
- Invalid dates are warnings; use `YYYY-MM-DD` or `DD/MM/YYYY`.
- Capitalisation date earlier than YOM is a warning.

### 6.3 Annual Performance

One row per crane per financial year.

| Field | Required | Notes |
| ----- | :------: | ----- |
| Asset Code | ✅ | Must exist in Fleet Master |
| Financial Year | ✅ | `2023-24`, `FY2023-24`, `2023/24`, `23-24` |
| Available Days | Recommended | Denominator of utilisation |
| Deployed Days | Recommended | Numerator of utilisation |
| Rental Revenue | Recommended | Numerator of yield |
| Operating Cost | Optional | Stored for reference |
| Capital Employed | Recommended | Denominator of yield |

- Three **consecutive** years are needed for the default NRG test.
- Rows for assets not in Fleet Master are **errors** (orphans).
- Invalid FY formats and duplicate asset/FY rows are warnings.
- Deployed days greater than available days is a warning (utilisation > 100%).

### 6.4 Retention Assessment

The business team's five-year rentability view. One row per crane per assessment date.

| Field | Required | Notes |
| ----- | :------: | ----- |
| Asset Code | ✅ | Must exist in Fleet Master |
| Evaluation Date | Optional | Blank = the evaluation date chosen on the import screen |
| 5-Year Rentability Committable | Recommended | Yes / No |
| NPV of 5-Year Cash Flows (INR) | Recommended | Used in Condition 2.1 |
| Achievable Sale Price (INR) | Recommended | Used in Condition 2.1 |
| Return on Capital Released (%) | Recommended | Used in Condition 2.2 |
| Crane 5-Year Return (%) | Recommended | Used in Condition 2.2 |
| Recommendation | Optional | Retain / Redeploy / Sell / Scrap |
| Justification | Optional | Free text |

- The engine uses the latest retention row with an evaluation date **on or before**
  the run's evaluation date.
- Rows for assets not in Fleet Master are **errors**.
- Duplicate asset/date rows are warnings.
- Unreadable Yes/No values are warnings.

### 6.5 Accepted cell formats

**Numbers**

- Plain rupees: `12500000`
- Shorthand: `1.25 Cr`, `1.25 crore`, `45 L`, `45 lakh`, `250 K`
- Currency symbols and commas are stripped: `₹1,25,00,000`
- Percent signs are stripped: `21.6%` → `21.6`
- Parentheses mean negative: `(5000)` → `-5000`

**Dates**

- `YYYY-MM-DD`
- `DD/MM/YYYY` (India convention; day/month is swapped only when unambiguous)
- Excel date cells

**Yes/No fields**

`Yes`, `No`, `Y`, `N`, `True`, `False`, `1`, `0`, `Available`,
`Not Available`, `Compliant`, `Non-compliant`, etc. are normalised.

### 6.6 Errors vs warnings

| Severity | Effect |
| -------- | ------ |
| **Error** | Blocks the commit. The workbook must be corrected. |
| **Warning** | Import is allowed; the data-quality issue is recorded and shown in the preview and run. |

Typical errors: missing sheet, no header row, missing Asset Code/Model/YOM,
duplicate Asset Code, orphan performance/retention rows, no valid assets.

Typical warnings: unknown model, invalid date, missing certificate dates, missing
capex, deployed > available days, duplicate performance/retention rows, unreadable
Yes/No, repair cost > capex.

---

## 7. Page-by-page guide

### 7.1 Dashboard (`/`)

The default landing page after sign-in. It shows the **latest evaluation**.

- **Fleet assets** — total cranes and replacement capex.
- **Old Fleet**, **Non-Deployable**, **NRG confirmed**, **Healthy** — counts and
  capex. Old Fleet/Non-Deployable/NRG are **flag counts**; Healthy is a **primary
  class** count.
- **Pending approvals banner** — links to `/approvals` when runs are waiting.
- **Classification mix** — primary class distribution.
- **Priority actions** — highest-severity assets by replacement capex.
- **Policy tests** — the current thresholds and how many cranes they flag.
- **Data coverage** — NRG not testable, retention pending, missing capex.
- **Portfolio by region** — fleet, Non-Deployable and NRG counts per region.
- **Recent imports** — latest runs with status.

If no fleet has been imported, the dashboard shows an onboarding empty state with
links to import, download the template or download the sample fleet.

### 7.2 Fleet Assets (`/assets`)

The full register, 25 rows per page.

- **Tabs** — All, Flagged, Non-Deployable, NRG, NRG review, Old Fleet, Healthy.
- **Search** — asset code, description, model, location.
- **Filters** — region, model, data-coverage issue.
- **Sort** — risk (default), age, capex, asset code.
- **Export CSV** — exports the current filter selection.

Each row links to the asset detail page.

### 7.3 Asset detail (`/assets/[code]`)

One crane, in full:

- identity, model, category, capacity, YOM, age vs threshold, region/location;
- current flags and primary class;
- replacement capex, utilisation and monthly yield;
- **reason trail** grouped by Old Fleet / Non-Deployable / NRG, sorted by severity,
  with observed values and thresholds;
- **certificates** — expiry, grace end, days remaining or lapsed;
- **performance history** — the financial years used, utilisation and yield;
- **retention assessment** — the latest assessment on or before the run date;
- the run the result came from and its sign-off status.

### 7.4 Import Data (`/import`)

Upload, validate and commit a workbook. Also shows:

- what the workbook needs (three sheets);
- what happens on commit (upsert, new run, sign-off, audit);
- your access level.

### 7.5 Evaluation Runs (`/runs`)

Every run, newest first, with status, evaluation date, source file, asset counts,
Non-Deployable and NRG counts. Filter by open/approved. Open a run to see detail.

### 7.6 Run detail (`/runs/[id]`)

- run header, status and sign-off chain;
- summary stat cards;
- classification results table with class filter tabs and per-asset reason preview;
- **sign-off trail** — every action, actor, designation, timestamp and comment;
- **audit log** — import and sign-off events linked to the run;
- **sign-off panel** — the action available to your role;
- run details and policy snapshot;
- data coverage and import errors.

### 7.7 Approvals (`/approvals`)

The governance queue, split into:

1. **Awaiting your action** — runs where your role is next and you did not record the
   previous stage.
2. **In the chain (other roles)** — runs waiting on someone else.
3. **Blocked by segregation of duties** — runs where you recorded the previous stage.
4. **Approved evaluations** — recent approved runs.

Each card shows the run, evaluation date, counts and the next action.

### 7.8 Model Master (`/models`)

The authoritative list of **67 models** and their Non-Deployable age thresholds:

| Bucket | Models | Description |
| ------ | :----: | ----------- |
| 15 years | 15 | Hydraulic mobile telescopic and lighter crawler cranes |
| 20 years | 37 | Mid-size telescopic and lattice-boom cranes |
| 25 years | 15 | Heavy-lift crawler and large telescopic cranes |

The page also shows how many cranes of each model are in the current fleet, and any
uploaded model names that are **not** in the master.

### 7.9 Policy Settings (`/settings`)

- View and edit thresholds (Administrator only).
- See policy defaults.
- See the seeded users and roles.
- **Reclassify current fleet** (Preparer/Administrator) — creates a new run from the
  saved fleet and current policy.

---

## 8. Approval chain and audit

### 8.1 Statuses

| Status | Meaning | Next action |
| ------ | ------- | ----------- |
| `PENDING` | Pending preparation | Preparer prepares |
| `PREPARED` | Pending review | Reviewer reviews or returns |
| `REVIEWED` | Pending approval | Approver approves or returns |
| `APPROVED` | Approved | None — fleet position |
| `RETURNED` | Returned for rework | Preparer re-prepares |

### 8.2 Transitions

```
PENDING ──PREPARE──▶ PREPARED ──REVIEW──▶ REVIEWED ──APPROVE──▶ APPROVED
   ▲                    │                   │
   │                    └────RETURN─────────┘
   │                            │
   └──────────RE-PREPARE──── RETURNED
```

- **PREPARE** — requires PREPARER or ADMIN. From PENDING or RETURNED.
- **REVIEW** — requires REVIEWER or ADMIN. From PREPARED.
- **APPROVE** — requires APPROVER or ADMIN. From REVIEWED.
- **RETURN** — requires REVIEWER or ADMIN from PREPARED, or APPROVER or ADMIN from
  REVIEWED. **A comment is mandatory.**

### 8.3 Segregation of duties

For non-Administrators, the same person cannot record consecutive stages of the same
run. The app checks the latest approval entry and blocks the action with a clear
message. Use a different reviewer/approver, or an Administrator override.

### 8.4 Audit events

Every important action writes to the audit log with actor, timestamp and details:

| Action | When |
| ------ | ---- |
| `IMPORT_COMMITTED` | A workbook is committed |
| `RUN_PREPARE` | A run is prepared |
| `RUN_REVIEW` | A run is reviewed |
| `RUN_APPROVE` | A run is approved |
| `RUN_RETURN` | A run is returned for rework |
| `RUN_RECLASSIFIED` | A new run is created from saved fleet data |
| `POLICY_UPDATED` | Policy thresholds are changed (before/after stored) |

Import events appear on the run detail page. Approval events appear in the sign-off
trail and audit log. Policy changes are recorded against the `settings` entity.

---

## 9. Policy settings reference

| Setting | Default | Range | Effect |
| ------- | :-----: | :---: | ------ |
| Old Fleet age | 15 years | 1–60 | Age strictly greater than this is Old Fleet |
| NRG utilisation | 60% | 0–100 | Condition 1 utilisation threshold |
| NRG monthly yield | 1.8% | 0–100 | Condition 1 yield threshold (≈ 21.6% p.a.) |
| NRG consecutive years | 3 | 1–10 | Number of consecutive years required |
| Repair cost trigger | 25% | 0–100 | Repair quote ÷ replacement capex |
| Certificate grace | 30 days | 0–365 | Grace after expiry before a certificate is lapsed |
| Obsolescence scope | Old Fleet only | Old Fleet only / All | Whether OEM/spares/compliance/repair triggers apply only to Old Fleet or to every crane |

Changing a setting:

- affects **new** evaluation runs only;
- does not rewrite existing runs;
- is recorded in the audit log with before/after values;
- can be applied immediately by running **Reclassify current fleet**.

---

## 10. CSV export

`GET /api/export/assets` exports the current register selection. Columns:

1. Asset Code
2. Description
3. Model
4. OEM
5. Category
6. Capacity (MT)
7. YOM
8. Age (years)
9. Age threshold (years)
10. Region
11. Location
12. Current status
13. Replacement capex (INR)
14. Utilisation 3Y avg (%)
15. Monthly yield 3Y avg (%)
16. Old Fleet (Yes/No)
17. Non-Deployable (Yes/No)
18. NRG status
19. Primary classification
20. Critical findings
21. Warnings

The export respects the same `q`, `classification`, `region`, `model`, `sort` and
`data` query parameters as the register. The file is UTF-8 with a BOM so Excel opens
it correctly, and is named `FIRM-Fleet-<evaluation-date>.csv`.

---

## 11. Data storage and architecture (brief)

- **Database** — PostgreSQL. Local development uses embedded PGlite in
  `./.data/pglite`; production uses `DATABASE_URL`. The schema and seed users are
  created automatically on first connection.
- **Tables** — users, settings, uploads, assets, performance, retention,
  evaluation_runs, evaluation_results, approvals, audit_log.
- **Excel parsing** — SheetJS (`xlsx`) with header aliases, number/date
  normalisation and row-level validation.
- **Auth** — signed HTTP-only session cookie (HMAC-SHA256), 12-hour expiry, scrypt
  password hashes.
- **Runs** — immutable; each run stores its policy snapshot and per-asset
  reasons/metrics.
- **Upserts** — assets by Asset Code; performance by asset + FY; retention by asset +
  evaluation date. Re-uploading corrects existing records rather than duplicating
  them.

For installation, environment variables, scripts and Docker, see `README.md`.

---

## 12. Troubleshooting and FAQ

**The commit button is disabled.**
You are signed in as a Reviewer or Approver. Only a Preparer or Administrator can
commit. Ask a Preparer to commit, or sign in with the Preparer account.

**The workbook validates but the commit fails.**
Check the error message. The most common cause is a validation **error** that
appeared after the preview (for example, an orphan performance row). Fix the
workbook and re-validate.

**A crane is “NRG Review” instead of “NRG”.**
Condition 1 is met but the retention assessment is missing or incomplete. Add a
retention row with the rentability commitment, NPV, sale price, capital-release
return and crane return, then re-import or reclassify.

**A crane is “NRG not testable”.**
There are fewer than three consecutive years of performance data, or utilisation /
capital employed is missing for one of the years. Add the missing rows.

**A model is flagged as “not in the approved master”.**
The model name in the workbook does not match any of the 67 approved models. Correct
the spelling or add the model to the master. Until then, no model-specific age
threshold is applied.

**A certificate is not failing even though it is expired.**
Check the evaluation date and the grace period. A certificate only fails when the
evaluation date is **after** expiry + grace days. Also confirm the expiry was parsed
correctly (use `YYYY-MM-DD` or `DD/MM/YYYY`).

**I changed a threshold but the dashboard still shows the old classification.**
Existing runs keep their policy snapshot. Run **Reclassify current fleet** in
`/settings` (or commit a new import) to apply the new policy.

**The same person cannot review after preparing.**
That is segregation of duties. Use a different reviewer or approver, or sign in as an
Administrator.

**I need to correct a committed import.**
Fix the workbook and import it again. Assets are upserted by Asset Code, performance
by asset + FY, retention by asset + date. A new run is created for sign-off; the old
run remains for history.

**Where do I see the audit trail?**
On the run detail page (sign-off trail and audit log). Policy changes are recorded in
the audit log against the settings entity.

**Can I use this without SAP?**
Yes. The app has no SAP dependency. The Excel workbook is the integration point.

---

## 13. Quick reference card

```
SIGN IN              /login
DASHBOARD            /
FLEET REGISTER       /assets
ASSET DETAIL         /assets/<asset-code>
IMPORT               /import
EVALUATION RUNS      /runs
RUN DETAIL           /runs/<id>
APPROVALS            /approvals
MODEL MASTER         /models
POLICY SETTINGS      /settings

WORKBOOK             3 sheets: Fleet Master, Annual Performance, Retention Assessment
MINIMUM FLEET ROW    Asset Code + Model + YOM
NRG CONDITION 1      util < 60% AND monthly yield < 1.8% for 3 consecutive FYs
MONTHLY YIELD        (annual rental revenue ÷ capital employed) ÷ 12 × 100
NRG CONDITION 2      2.1 rentability not committable AND NPV < sale price
                     AND 2.2 capital-release return > crane return
PRIMARY CLASS        Non-Deployable > NRG > NRG Review > Old Fleet > Healthy
SIGN-OFF             Prepared By → Reviewed By → Approved By
SEGREGATION          Different person for consecutive stages (except Admin)
```

---

*FIRM — Fleet Classification Tool · Sanghvi Movers Limited · Confidential internal use.*
