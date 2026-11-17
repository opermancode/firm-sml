# FIRM — Usage Guide (Business Process Source of Truth)

**FIRM** is the internal crane-disposal cycle for **Sanghvi Movers Limited**. This
document describes how the cycle works and how the app supports it. It is written
from the *FIRM Business Process Document* and is the functional source of truth for
the rebuilt application.

> **Confidential. Sanghvi Movers Limited. Internal use only.**
> Fleet data, rental quotes, sale prices and approval records are commercially
> sensitive. Do not share them outside the authorised group.

---

## 1. Purpose and scope

FIRM is a structured cycle that moves **Old Fleet**, **Non-Revenue Generating (NRG)**
and **Non-Deployable** cranes to one of three outcomes:

- **International rental** — the crane is transferred to an international business
  unit (BU) through SAP.
- **Sale** — the crane is sold domestically or internationally through SCM.
- **Scrap** — if the crane cannot be sold, it is scrapped.

The cycle has one owner per step, clear approvals, and an SAP record for every exit.
Four rules shape the whole process:

| Rule | What it means |
| ---- | ------------- |
| **Every crane goes through every check** | Sales and Maintenance review the full fleet **in parallel**, not one after the other. |
| **International rental comes first** | Old Fleet and NRG cranes are offered to international BUs **before** sale. Non-Deployable cranes skip rental and go straight to sale (then scrap if unsold). |
| **SAP is the hard stop** | A crane leaves FIRM only when SAP records its exit — a sales order (SO) or an asset transfer for international deployment. After that, **nobody can claim it back**. |
| **Active SO rule** | Cranes already on rent stay in the cycle. Teams may quote, claim and approve as normal, but a **new SO, deployment or handover happens only on or after the current SO end date** recorded for the crane. This date is shown on every crane as **"Execution allowed from"**. |

> **SAP data in this build.** There is **no live SAP connection** here. The four SAP
> fields — **SAP Status, SO Number, SO Start Date and SO End Date** — are entered
> manually in the fleet upload from the SAP system of record. **In production these
> fields are pulled automatically from SAP** and are not typed by hand. SAP remains
> the hard stop in both cases: the SO (or international asset transfer) is the event
> that locks a crane and ends all claim-back rights.

---

## 2. Roles (Section 2)

There are **12 roles**. A user has one role; the role decides what they can see and do.

| Role | What they do in FIRM |
| ---- | -------------------- |
| **FP&A** | Starts the FIRM cycle, uploads the fleet Excel, and validates the sale price before management approval. |
| **Sales Team (Domestic)** | Confirms marketability, flags NRG cranes, writes expected deployment duration, and can claim a crane back for domestic rental before an SO exists. |
| **Maintenance Team** | Flags deployability status (**Deployable / Non-Deployable**) for every crane, with a reason. |
| **Finance** | Deduplicates the three inputs (Section 4), finalises the FIRM list, and closes out exited cranes. |
| **Strategy Team (International)** | Floats Old Fleet and NRG cranes to all international BUs for rental, evaluates quotes, awards the crane, and can claim it back for international rental before an SO. |
| **International BUs** | Decide whether they want a crane on rental and share their rental terms (quote). |
| **Marketing Team** | Uploads the crane catalogue within a fixed window before the crane goes to SCM. |
| **SCM Team** | Runs domestic and international sale and scrap sale, and brings quotations for approval. |
| **CBO** | Final call when SCM has a sale quotation and domestic Sales has a rental opportunity; approves sale per DOA. |
| **CSO** | Final call and exception approval when the International team has a rental opportunity on a crane that also has a sale quotation. |
| **MD** | Approves sale, scrap sale and exceptions per Section 7. |
| **Global Administrator** | Sees the status of every crane in the cycle and sends reminders to push stuck cranes forward. Does **not** take business calls. |

The **Global Administrator** is a progress monitor, not a business approver: they
chase missing inputs and unresolved conflicts, but the business decisions in
Sections 6 and 7 are made by the named approvers.

---

## 3. End-to-end to-be flow (Section 3)

The short version: FP&A uploads the fleet, Sales and Maintenance review it side by
side, and Finance finalises the list. Old Fleet and NRG cranes are offered to the
international BUs first; anything they don't take goes up for sale. Non-Deployable
cranes skip rental and go straight to sale. A crane leaves FIRM only when SAP records
its exit — a sale SO or an international asset transfer.

| Step | Owner | What happens | Status reached |
| ---- | ----- | ------------ | -------------- |
| 1 | FP&A | Initiate cycle, upload fleet | S01 |
| 2 | Sales + Maintenance | Parallel checks on every crane | S02 |
| 3 | Finance | Deduplicate and finalise the list | S04 / S08 / S03 |
| 4 | Strategy + BUs | International rental and BU award | S04 → S07 → S16 or S08 |
| 5 | Marketing | Catalogue window | S08 → S09 |
| 6 | SCM | Domestic and international sale | S09 → S18 or S11 |
| 7 | Management + SCM | Scrap sale | S11 → S19 or S20 |
| 8 | Finance | Close the cycle in SAP | Locked / closed |

### Step 1 — FP&A initiates the FIRM cycle

- FP&A starts the cycle by uploading the fleet in the standard Excel template. The
  file has **nine columns**: the five crane fields — Equipment ID, Equipment
  Description, YOM, Yield % and Utilisation % — plus four SAP fields — SAP Status,
  SO Number, SO Start Date and SO End Date. Any row with a blank field is sent back
  to FP&A.
- Because this build has **no SAP connection**, FP&A **enters the four SAP fields
  manually** from the SAP system of record when uploading the file. In production
  they are pulled automatically from SAP, so nobody has to type them. The SO End Date
  is the "Execution allowed from" date.
- The app calculates each crane's age from its YOM and sets the **Old Fleet flag**
  automatically.
- The Sales and Maintenance checks then open **together** for every crane in the
  upload (status **S01**).

### Step 2 — Parallel checks by Sales and Maintenance

- Sales and Maintenance work through the full fleet list **at the same time**, and
  every crane goes through **both** checks. This is parallel, not sequential.
- **Sales check** — confirm whether the crane is marketable (Marketable / Not
  marketable), flag whether it is NRG (Yes / No), and note the expected deployment
  duration in months. This tells Strategy and SCM how long the crane could stay busy.
- **Maintenance check** — mark every crane Deployable or Non-Deployable and give a
  reason for Non-Deployable.
- Because the Old Fleet flag was already set in Step 1, all three inputs are in as
  soon as Sales and Maintenance submit (status **S02**). The Global Administrator
  follows up with anyone who hasn't submitted yet.

### Step 3 — Finance deduplicates and finalises the list

- Finance applies the Section 4 logic so each crane ends up with **one final
  category** and one route.
- Finance then finalises the FIRM list and routes each crane:

| Final category | Route | Status |
| -------------- | ----- | ------ |
| Old Fleet and NRG | Strategy for international rental | S04 |
| Non-Deployable | Sale process directly | S08 |
| No flag | Not in FIRM this cycle — stays in the active fleet | S03 |

### Step 4 — International rental via Strategy and BUs

- **Float to BUs** — Strategy offers every Old Fleet and NRG crane to **all**
  international BUs at once (S04). Each BU can see the Equipment ID, description,
  YOM, deployability, catalogue and current SO end date.
- **BU quote** — each BU marks itself Interested or Not interested. An interested BU
  sends an indicative quote: monthly rental rate, rental duration, expected rental
  yield %, earliest start date, customer and country (S05). BUs may revise quotes
  until the window closes.
- **Strategy call** — Strategy weighs quotes on yield, duration and start date,
  awards the crane to one BU, and records why. The award waits for sign-off from the
  Strategy Head, and from the **CSO if the yield falls below the expected rate**
  (S06).
- **Reserved** — once awarded, the crane is reserved for that BU (S07). **No SO is
  created at this stage**, so it can still be claimed back before transfer.
- **Deployed** — Strategy deploys the crane to the international entity through an
  **SAP asset transfer**, on or after the current SO end date (S16 — Completed —
  International Transfer).
- **No taker** — if no BU quotes, or Strategy accepts none, by the end of the **BU
  window (proposed: 20 days)**, the crane moves on to sale (S08).

### Step 5 — Marketing catalogue window

- Before a crane reaches SCM, Marketing gets a fixed window (**proposed: 5 working
  days**) to upload its catalogue: photos, a short video, the spec sheet, load chart
  and a condition summary (S08).
- When the window closes, the crane moves to SCM **whether or not the catalogue is
  ready** (S09). If the catalogue is missing, the Global Administrator is alerted.

### Step 6 — Sale by SCM (domestic and international)

- **Buyer search** — SCM looks for buyers in domestic and international markets at
  the same time and gathers quotations (S09).
- **Approval** — once SCM picks a quotation, FP&A checks the price and management
  approves it per Section 7 (S10).
- **Sold** — after approval, the sale SO is created in SAP and the crane is locked
  (S18). Handover is on or after the current SO end date.
- **No buyer** — if no acceptable quotation arrives within the **sale window
  (proposed: 60 days)**, the crane goes to management to decide on a scrap sale
  (S11).

### Step 7 — Scrap sale

- **Scrap approval** — management approves a scrap sale for cranes that could not be
  sold, usually Non-Deployable ones (S12). If management does not approve, the crane
  is carried over to the next cycle (S20).
- **Scrap sale** — SCM runs the scrap sale, FP&A checks the scrap price, and the
  scrap sale SO is created in SAP (S19).

### Step 8 — Close

- **SAP record** — every exit is recorded in SAP: an asset transfer (international
  deployment), a rental SO (domestic rent after a claim-back), a sale SO (sold), or a
  scrap sale SO (scrapped).
- **Locked** — once the SO or asset transfer is in place, **nobody can claim the
  crane**. Finance closes it out in the FIRM cycle and the asset register is updated.
- **Next cycle** — a crane deployed internationally moves onto the receiving
  entity's books through the SAP asset transfer, so it may not appear in the next
  cycle's upload.

### Timing summary

| Window | Proposed length | If it expires |
| ------ | --------------- | ------------- |
| International BU window | 20 days | Crane moves to sale (S08) if no quote is accepted. |
| Marketing catalogue window | 5 working days | Crane moves to SCM (S09) even if the catalogue is missing; Admin is alerted. |
| Sale window | 60 days | Crane goes to management for a scrap decision (S11). |
| Conflict decision | 3 working days | Global Administrator reminds; after 5 working days, escalated to CEO. |
| Claim-back execution | 15 days | Crane returns to the layer it was pulled from if no SO/reservation. |

---

## 4. Deduplication logic (Section 4)

Finance applies this once all three inputs are in. The rule is simple:
**Non-Deployable always wins; otherwise Old Fleet beats NRG; if none apply, the
crane is Not in FIRM.**

| Old Fleet | NRG | Non-Deployable | Final category | Route |
| :-------: | :-: | :------------: | -------------- | ----- |
| Yes | No | No | Old Fleet | Strategy — international rental |
| No | Yes | No | Non-Revenue Generating | Strategy — international rental |
| Yes | Yes | No | Old Fleet | Strategy — international rental |
| No | No | Yes | Non-Deployable | Sale (then scrap sale if unsold) |
| Yes | No | Yes | Non-Deployable | Sale (then scrap sale if unsold) |
| No | Yes | Yes | Non-Deployable | Sale (then scrap sale if unsold) |
| Yes | Yes | Yes | Non-Deployable | Sale (then scrap sale if unsold) |
| No | No | No | Not in FIRM | Stays in active fleet |

**Overrides.** Finance can override a category, but **only with a written reason**.
The original flags (Old Fleet, NRG, Non-Deployable) always stay visible on the crane
record, so the override never hides where the crane came from.

---

## 5. Claim-back and conflict rules (Section 6)

The **SO in SAP is the hard stop**. Before it exists, a crane can be claimed back;
after it exists, no one can. The further a crane has moved through the process, the
more senior the approval needed to pull it back.

### 5.1 When a conflict happens

If a claim-back lands on a crane that already has a live BU quote or a sale
quotation, the crane moves to **S14 — Conflict — Decision Pending**. On S14,
**everything is paused**: no new quotes are accepted, the window clock stops, and a
decision is due within **3 working days**.

| Conflict | Decided by | Status while waiting | If rental wins | If the other side wins |
| -------- | ---------- | -------------------- | -------------- | ---------------------- |
| SCM has a sale quotation; domestic Sales has a rental opportunity | **CBO** | S10 → S14 | S14 → S15. Sale approval stops, SCM tells the buyer, the crane leaves the sale flow. Sales creates the rental SO → S17. **No SO in 15 days → back to S09** (the sale quotation can be revived if still valid). | S14 → S10. Claim-back rejected; sale approval resumes and the window clock restarts. |
| SCM has a sale quotation; International team has a rental opportunity | **CSO** (exception approval) | S10 → S14 | S14 → S07. Sale approval stops, SCM tells the buyer. Strategy reserves the crane for the BU and deploys via SAP asset transfer (S16). **Not reserved in 15 days → back to S09**. | S14 → S10. Claim-back rejected; sale approval resumes. |
| Domestic Sales claims back a crane that BUs have quoted on or been awarded | **CBO and CSO together; CEO if they disagree** | S05 / S07 → S14 | Domestic wins: S14 → S15. BU quotes are closed and all BUs told. Sales creates the rental SO → S17. | International wins: S14 → S05 / S07. Domestic claim rejected; Strategy continues the BU award. |
| Two BUs want the same crane | **Strategy** | Stays S05 — no conflict status | Selected BU: S05 → S07; other BUs told "not awarded". | — |

**Record and escalation.** Every conflict decision is logged with who made it, the
date, the reason and the option that lost out, so that option can be picked up again
if the winning deal falls through. If a conflict is unresolved after **3 working
days**, the Global Administrator sends a reminder; after **5 working days** it is
escalated to the **CEO**.

### 5.2 Claim-back rules

| Rule | Detail |
| ---- | ------ |
| **Real opportunity** | Every claim-back must include the customer, rental rate, duration and expected SO date — without these it is rejected. While awaiting sign-off, the crane sits in **S13 — Claim-Back Approval Pending**. |
| **Non-Deployable cranes** | Cannot be claimed back for rental unless Maintenance first changes their status to Deployable. |
| **15-day limit** | If a claimed-back crane doesn't get an SO (domestic) or isn't reserved for a BU (international) within **15 days** (proposed), it goes back to the layer it was pulled from. |
| **Notify** | When a crane is claimed back, everyone working on it — BUs, Marketing, SCM and any buyers — is informed **the same day**. |

---

## 6. Approvals at each layer (Section 7)

Every hand-off is confirmed by one named person. The value limits in the business
process document are proposals, still to be confirmed by the CBO / CEO.

| Layer / decision | Prepared by | Approved by |
| ---------------- | ----------- | ----------- |
| Final FIRM list after deduplication | Finance | Finance Head |
| Award crane to a BU for international rental | Strategy | Strategy Head; CSO if rental is below the expected rate |
| Move crane from Strategy to sale (no BU interest) | Strategy | Automatic at end of BU window |
| Sale | SCM; FP&A validates price | CBO |
| Scrap sale (sale did not work out) | SCM; FP&A validates scrap price | MD |
| Claim-back (by layer) | Sales or Strategy | As per Section 6 claim-back rules |
| Exception: international rental over a sale quotation | Strategy | CSO |
| Exception: domestic rental over a sale quotation | Sales | CBO |

- **System record.** All approvals are recorded in the app with the approver's name,
  date and comments. An approval given by email or verbally **does not** move a crane
  forward.
- **Escalation.** If an approver hasn't acted within **3 working days**, the Global
  Administrator sends a reminder; after **5 working days** it is escalated to the
  next level.

---

## 7. Crane statuses (Section 12.1)

At any point, every crane has exactly **one** of these 20 statuses: eight Active,
five Approval, one On Hold, four Locked, and two Closed. The cycle impact column
says whether a crane in that status is carried forward to the next cycle or excluded
from it. Next to the status, the app shows the crane's **SO End Date** (entered from
SAP in the upload in this build), labelled **"Execution allowed from"**.

| Code | Status | Layer | Type | Impact on cycle |
| ---- | ------ | ----- | ---- | --------------- |
| S01 | Pending Validation | L1 | Active | Carry forward |
| S02 | Under Finance Review | L1 | Approval | Carry forward |
| S03 | Not Flagged – Excluded | L2 | Closed | Exclude |
| S04 | Offered to International BUs | L3 | Active | Carry forward |
| S05 | BU Bid Evaluation | L4 | Active | Carry forward |
| S06 | BU Award Approval Pending | L4 | Approval | Carry forward |
| S07 | Reserved – Pending Deployment | L4 | Active | Carry forward |
| S08 | Catalogue Preparation | L5 | Active | Carry forward |
| S09 | Listed for Sale | L6 | Active | Carry forward |
| S10 | Sale Approval Pending | L7 | Approval | Carry forward |
| S11 | Scrap Approval Pending | L7 | Approval | Carry forward |
| S12 | Scrap Sale in Progress | L7 | Active | Carry forward |
| S13 | Claim-Back Approval Pending | Any before L8 | Approval | Carry forward |
| S14 | Conflict – Decision Pending | L4 or L7 | On Hold | Carry forward |
| S15 | Claimed Back – Rental SO Pending | Any before L8 | Active | Carry forward |
| S16 | Completed – International Transfer | L8 | Locked | Exclude |
| S17 | Completed – Domestic Rental | L8 | Locked | Exclude |
| S18 | Completed – Sold | L8 | Locked | Exclude |
| S19 | Completed – Scrapped | L8 | Locked | Exclude |
| S20 | Scrap Not Approved – Carried Forward | – | Closed | Carry forward |

**Locked (S16–S19)** means an SO or international asset transfer exists in SAP, so
the crane cannot be claimed back. Only these four statuses and S03 are excluded at
cycle close; S20 is closed but carried forward.

---

## 8. Fields at each step (Section 11)

Each field has **one owner and one source**. In production, anything that comes from
SAP is pulled automatically rather than typed in; **in this build, where SAP is not
connected, SAP Status and the SO fields are entered manually in the upload**. A crane
cannot move to the next step until all its **mandatory (M)** fields for the current
step are filled in.

| Step | Field | Filled by / source |
| ---- | ----- | ------------------ |
| 1 – Upload | Equipment ID (M) | FP&A — Excel |
| 1 – Upload | Equipment Description (M) | FP&A — Excel |
| 1 – Upload | YOM (M) | FP&A — Excel |
| 1 – Upload | Yield % (M) | FP&A — Excel |
| 1 – Upload | Utilisation % (M) | FP&A – Excel |
| 1 – Upload | SAP Status (on rent / idle / sold) | FP&A – Excel, entered manually from SAP (pulled automatically in production) |
| 1 – Upload | SO Number | FP&A – Excel, entered manually from SAP (pulled automatically in production) |
| 1 – Upload | SO Start Date | FP&A – Excel, entered manually from SAP (pulled automatically in production) |
| 1 – Upload | SO End Date — shown at every step as "Execution allowed from"; no new SO or handover before it | FP&A – Excel, entered manually from SAP (pulled automatically in production) |
| 1 – Upload | Age and Old Fleet flag | System – from YOM |
| 2 – Sales check | Marketability: Marketable / Not marketable (M) | Sales |
| 2 – Sales check | Non-Revenue Generating: Yes / No (M) | Sales |
| 2 – Sales check | Expected deployment duration in months (M if marketable) | Sales |
| 2 – Sales check | Remarks | Sales |
| 2 – Maintenance check | Deployability status: Deployable / Non-Deployable (M) | Maintenance |
| 2 – Maintenance check | Reason if Non-Deployable (M) | Maintenance |
| 3 – Finance | Final category (M) and override reason if any | Finance |
| 4 – International rental | BU response: Interested / Not interested (M) | Each BU |
| 4 – International rental | Possible quote: rental rate per month, rental duration, expected rental yield %, earliest start date (on or after current SO end date), customer, country (M if interested) | Each BU |
| 4 – International rental | Selected BU and reason (M) | Strategy |
| 4 – International rental | Asset transfer document number and deployment date | SAP |
| 5 – Catalogue | Photos, video, spec sheet, load chart, condition summary (upload) | Marketing |
| 6 – Sale | Market (domestic / international), buyer, quotation value, quotation date (M) | SCM |
| 6 – Sale | Price validation (M) | FP&A |
| 6 – Sale | Management approval (M) | CBO / CEO / MD per Section 7 |
| 6 – Sale | Sale SO number | SAP |
| 7 – Scrap sale | Scrap approval (M) | Management |
| 7 – Scrap sale | Scrap buyer, scrap price (M) | SCM |
| 7 – Scrap sale | Scrap sale SO number | SAP |
| Any step | Claim-back request: team, opportunity details, reason (M) | Sales or Strategy |

### The upload file has nine columns

The uploaded Excel has **nine columns**: five crane fields and four SAP fields.

| # | Column | Meaning | Source in this build |
| - | ------ | ------- | -------------------- |
| 1 | **Equipment ID** | Unique crane identifier from the asset register. | FP&A |
| 2 | **Equipment Description** | Short description of the crane. | FP&A |
| 3 | **YOM** | Year of manufacture — age and the Old Fleet flag are derived from this. | FP&A |
| 4 | **Yield %** | Yield percentage for the crane. | FP&A |
| 5 | **Utilisation %** | Utilisation percentage for the crane. | FP&A |
| 6 | **SAP Status** | Current status: on rent / idle / sold. | Entered manually from SAP |
| 7 | **SO Number** | Current sales order number, if any. | Entered manually from SAP |
| 8 | **SO Start Date** | Start date of the current SO. | Entered manually from SAP |
| 9 | **SO End Date** | End date of the current SO — the "Execution allowed from" date. | Entered manually from SAP |

**Why are SAP fields in the Excel?** This build has **no SAP connection**, so FP&A
enters SAP Status, SO Number, SO Start Date and SO End Date manually from the SAP
system of record when uploading the fleet. **In production these four fields are
pulled automatically from SAP** and are not typed by hand. Either way they are shown
at every step, and the **SO End Date** drives the "Execution allowed from" rule: no
new SO, deployment or handover may happen before it.

Do **not** add other columns (flags, categories, prices or quotes) to the upload.
The app derives age and the Old Fleet flag from YOM; later SAP references such as the
asset transfer document number, sale SO number and scrap sale SO number are recorded
in the app as those steps complete. Blank fields in the nine-column upload are
rejected and sent back to FP&A.

---

## 9. App routes

The rebuilt app exposes these routes. All of them except `/login` require sign-in.

| Route | Purpose |
| ----- | ------- |
| `/login` | Sign in with your FIRM account. First sign-in opens the guide. |
| `/welcome` | First-login guide explaining the process, your role, the 20 statuses, the screens and how to read a crane record. Reopen it from the Help button. |
| `/` | Dashboard — current cycle, crane counts by status and layer, approvals, conflicts and reminders. |
| `/cranes` | Crane register — search and filter cranes by status, layer, category and type. |
| `/cranes/[id]` | Crane detail — full record, flags, checks, quotes, approvals, conflict decisions and audit trail. |
| `/cycles` | FIRM cycles — start/finish cycles and see their cranes. |
| `/cycles/[id]` | Cycle detail — the cranes and progress of one FIRM cycle. |
| `/approvals` | Approval queue — the decisions waiting on your role. |
| `/import` | Upload the nine-column fleet Excel (five crane fields plus four SAP fields) to start a cycle. |
| `/roles` | The 12 FIRM roles and what each one does. |
| `/settings` | Application and workflow settings. |

Use `/import` to add a fleet, `/cranes` to follow individual cranes through the
statuses in Section 7, and `/approvals` to act on the hand-offs in Section 6.

---

## 10. Confidentiality banner

Every authenticated page displays this notice:

> **Confidential. Sanghvi Movers Limited. Internal use only.**

If you do not see the banner on a signed-in page, treat the page as untrusted and
report it. Quotes, prices and approvals shown in the app are internal-only
information and must not be exported or shared outside the authorised group.
