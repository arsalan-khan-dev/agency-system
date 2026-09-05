# MEMORY.md — Agency Estimation, Quotation & Business Management System

> Compact operational state. Read this first, every chat. Do not restart from zero.

> **MERGE NOTE (read this first):** This codebase was assembled by combining two separately-developed deliverables that both branched from the same earlier state: the Change Request / Scope Management module (Section 44) and the Org-Level Config/Branding module (Section 43). Both touched `QuotationService` (the Change Request work added `applyChangeRequestRevision()`; the Org Settings work added optional branding to `renderHtml()`/`generatePdf()`) and `app.module.ts`. The merge was done by hand: re-inserting the Change Request method and its dedicated tests into the Org Settings version of `quotation.service.ts`, wiring both new modules into `app.module.ts`, and reconciling the module-inventory tables and this file's own history so both are represented.
>
> **What WAS verified after merging, against the actual merged tree, this session:**
> - `npm install` — clean, 714 packages.
> - `npx tsc --noEmit` — clean, no errors.
> - `npx jest` — **176/176 tests pass** (163 baseline+org-settings from Section 43's session, + 13 change-request tests from Section 44's session; no losses, no duplicates).
> - `npx nest build` — clean.
>
> **What was NOT verified this session (sandbox limitation, not skipped by choice):** this environment has no Postgres available and no package-manager access to install one (network egress is allow-listed to npm/pip/git registries only, no `apt`, no `sudo`). So none of the following happened against the merged code: running the new migrations against a live database, hitting `/api/v1/org-settings` or `/api/v1/change-requests` with real HTTP requests, or actually regenerating a quotation PDF to confirm both the change-request price math and the org-branding header/footer render correctly together in the same PDF. Section 43's and Section 44's own "verified live" write-ups below are both real, but each was run against that feature's code *before* this merge — neither is evidence about the combined state. That live pass is the next required step before calling this done end-to-end.

---

## 01 — PROJECT IDENTITY

| Field | Value |
|---|---|
| Name | Agency Estimation, Quotation & Business Management System |
| Type | Internal business management SaaS (single-tenant MVP) |
| Purpose | Turn agency service estimation into accurate quotations, track projects to completion, and learn from historical accuracy |
| Value Prop | One accurate recommended price (not guesswork), immutable audit-safe quotations, real profitability tracking |
| Dev Stage | Phase 1 (MVP) — **COMPLETE**. Phase 2 (Historical Intelligence) — **IN PROGRESS**, first sub-phase (accuracy snapshots + structured similarity search) shipped and live-verified this chat. |
| Overall Status |  Phase 1 MVP fully built and verified end-to-end across all 5 sub-phases (Foundation, Pricing/Estimation, Quotations, Projects/Financials, Dashboard/Testing/Deployment). See Section 18 for the genuine close-out summary. Phase 2 kickoff (Section 19) task 1 (historical accuracy) and task 2 (structured similarity search) are now shipped — see Section 32 for this chat's close-out. Change Request / Scope Mgmt module (backend) shipped; approve-flow design decision (draft, not auto-accepted — see Section 44) confirmed with the person and implemented this session, unit-verified (179/179) but not yet live-verified post-change; frontend UI COMPLETE (filed/list/approve/reject on project detail page, with correct "approved — client acceptance pending on vN" status messaging; tsc clean). Org-level config/branding module (backend) shipped and unit-tested; frontend UI COMPLETE at /settings (all 8 fields: name, logoUrl, addressLine1/2, contactEmail, contactPhone, defaultCurrency, quotationFooterText), admin-only PATCH, logo preview, tsc clean. |
| **Runtime Mode** | `browser-sandbox (no Docker, no OS-level tests)` — confirmed in practice |

**Runtime note:** Sandbox has no container engine/real OS shell (no systemd — Postgres started manually via `pg_ctl`/`service`). App runs directly (`npm run dev` / `node dist/main.js` / `next start`), connected to a locally-installed Postgres via connection string. Only application-level tests (Jest) apply. **Additional finding:** background processes (`&` / `nohup` / `setsid`) do NOT persist between separate tool invocations in this sandbox — each shell call appears to be a fresh process tree. Verification in this environment must start the server, run tests against it, and shut it down within a single shell invocation. This does not block real usage (a real dev machine keeps `npm run dev` running in a persistent terminal); it only affects how *this* sandbox verifies things.

---

## 02 — CORE PRODUCT FLOW (do not change without explicit ADR)

```
Client → Estimate → Quotation → Acceptance → Project → Actuals → Profitability → Historical Learning
```

---

## 03 — ARCHITECTURE

| Layer | Choice |
|---|---|
| Pattern | Modular Monolith |
| Frontend | Next.js **16.3.3** (App Router) + React 19 + TypeScript + Tailwind CSS |
| Backend | NestJS 10 |
| Database | PostgreSQL 16 |
| Cache | Redis (planned — not yet wired; not needed for Phase 1A) |
| Queue | BullMQ (planned — not yet wired) |
| Auth | Session-based (secure/httpOnly/sameSite cookies), session store = `connect-pg-simple` against the same Postgres instance (Redis session store deferred — see ADR-007) |
| PDF | Puppeteer — **WORKING**, verified generating real PDFs. Executable path resolved via explicit discovery (`resolveChromeExecutable()`) rather than Puppeteer's default cache assumption — see ADR-011. |
| API style | REST, base path `/api/v1/` |
| Storage | S3-compatible object storage (planned — not yet used) |
| **Containerization** | **None** (browser-sandbox mode) — run app directly, no Docker/Compose |
| Deployment | Direct process run in sandbox; Docker Compose deferred until full-OS available |

**Guardrail:** No microservices, GraphQL, vector DBs, or generic formula engines unless explicitly approved.

**ADR-007 note:** Next.js pinned to 16.3.3 (not 14.x as in the original spec) because Next.js 14 reached End-of-Life Oct 2025 and 14.2.15 had an active critical npm-audit vulnerability at build time. See Section 29.

---

## 04 — PRODUCT MODULES

| Module | Status | Phase | Notes |
|---|---|---|---|
| Identity & Access | IN PROGRESS | 1 | Session auth (login/logout/me) + RBAC guard/decorator DONE. User CRUD UI/API, password reset NOT STARTED. |
| Service Catalog Engine | IN PROGRESS | 1 | Full CRUD (API + service layer) DONE for categories/services/project types/features. Frontend: categories+services list/create DONE; project types/features UI NOT STARTED. |
| Pricing Engine | **COMPLETE + admin UI** | 1 | PricingProfile + PricingRule (structured key→multiplier lookups, not a formula engine). Deterministic calc: hours × hourlyRate × complexityMultiplier × urgencyMultiplier, hard floor on system recommendation. `currency` field (Phase 2 task 4, full multi-currency, no conversion) validated against a small ISO 4217 allow-list (USD/EUR/GBP/CAD/AUD). New `/pricing` frontend page (list, create, edit — including currency — and active/inactive toggle for pricing profiles specifically; pricing RULES and estimation questions are still API-only, see below). 9 backend unit tests passing + verified live against running API and through the actual Next.js proxy (profile create/edit/toggle all confirmed with real data, including a GBP-currency profile). |
| Estimation Engine | **COMPLETE** | 1 | EstimationQuestion (drives wizard prompts) + Estimate + EstimateFeature (snapshot join). Validates features belong to selected project type. Snapshots all pricing inputs/outputs at creation time. Manual adjustment requires justification (enforced via DTO + service). Draft-only mutability before finalize. 11 unit tests passing + verified live (justification rejection, override-below-floor-with-justification, post-finalize lock). Frontend: multi-step wizard (project type → features → questions → price + adjustment) DONE; Estimates list page DONE. |
| Client Management | IN PROGRESS | 1 | Minimal Client entity (name, contact email/name) DONE — just enough to attach to quotations. Full contacts/multiple-address model still NOT STARTED. Frontend: list + create page DONE. |
| Quotation Engine | **COMPLETE** | 1 | Quotation + QuotationItem entities. Generation from finalized Estimate (client-safe snapshot only — no cost/margin fields carried over, verified in both unit tests and the actual generated PDF text). Immutability enforced once `sent`+ (service-layer guard). Versioning via `reviseFrom()` — new row, old row untouched, verified live. Status lifecycle: draft→sent→accepted/rejected/expired. PDF generation via Puppeteer — real binary verified working in this sandbox via explicit executable-path discovery. 14 unit tests passing + full live verification (generate → PDF → send → reject-resend → revise → v1 untouched → accept). Frontend: Quotations list, detail page with lifecycle actions + PDF download, "Generate quotation" action wired into the Estimates page. |
| Lightweight Project Tracking | **COMPLETE** | 1 | Project entity created ONLY from an `accepted` quotation (gate verified live + unit tested against all other statuses). Budget snapshotted from quotation price at creation, never recalculated. Status lifecycle (active/completed/cancelled). One project per quotation enforced (unique constraint + service check). Frontend: Projects list + detail page, "Convert to project" action on accepted quotations. |
| Change Request / Scope Mgmt | **BACKEND COMPLETE (design decision resolved)** | 1 | `ChangeRequest` entity + service/controller (Section 44). File a change against an `active` project (hours/price delta); approving creates a new **draft** quotation version (via `QuotationService.applyChangeRequestRevision`) — confirmed with the person this session that it must go through the normal send/client-accept cycle, not straight to accepted. The project's budget/quotation link only update once that draft is actually accepted (`QuotationService.acceptCore`), in the same transaction as the acceptance. Rejecting the change request just marks it rejected. Unit-test-verified on the merged tree (179/179 passing, `tsc`/`nest build` clean) but **not yet live-verified against a real Postgres/API stack post-merge or post-decision** — the "full live verification" this row used to claim predates this session's design change; see Section 44. Frontend UI COMPLETE — project detail page now has full CR section: file new CR (title/description/hours delta/price delta), list all CRs with approve/reject buttons (admin/manager), status badges with nuanced messaging ("approved — client acceptance pending on vN" while resulting quotation is draft/sent, "Applied" once accepted). tsc clean, zero TS errors. |
| Financial Reconciliation | **COMPLETE** | 1 | ProjectActual (hours) + Expense (integer cents) entities. Profitability calc: budget (from quotation) vs. actual cost = (actual hours × the SAME PricingProfile.baseHourlyRateCents used at estimation, per ADR-013) + expenses. Verified live with both under-budget and over-budget scenarios producing exactly correct cent-accurate math. RBAC: expense logging restricted to admin/manager (financial data); hours loggable by estimator too. Frontend: profitability card + log-hours/log-expense forms on project detail page. |
| Reporting & Dashboard | **COMPLETE** | 1 | ReportsService: 4 queries (conversion funnel, revenue by project type, estimated vs actual hours, profitability comparison) — all real data, verified live returning correct numbers matching prior manual test data exactly. Frontend dashboard page with 4 recharts bar charts, dark-theme styled, explicit empty states per chart (not fabricated data) per Section 10. |
| Historical Intelligence | **COMPLETE (sub-phase 1) + Task 4 shipped** | 2 | Accuracy snapshots + structured similarity search: **COMPLETE** (see prior entry history). Task 4 — email delivery, signed acceptance links, recurring quotations, multi-currency — **COMPLETE**, scoped explicitly with the person before any code (see Section 33). Billing reminders (Due for Billing list + duplicate-safe reminder send, backend + frontend) — **COMPLETE**, see Section 40. Document storage and expanded reports beyond accuracy remain NOT STARTED — never part of task 4's confirmed scope. |
| Admin & Settings | **PARTIAL** | 1/2 | Pricing Profiles/Rules and Estimation Questions have a full frontend at `/pricing` (Section 36). User management — create/edit/deactivate/reactivate/hard-delete + admin-set password reset — has a full frontend at `/users` (Section 37). `OrgSettingsModule` (Section 43) — org name/logo/address/contact/default currency/quotation footer, singleton row, `GET`/`PATCH /api/v1/org-settings` — is backend-complete and unit-tested, wired into `QuotationService.renderHtml()` for PDF branding, but has **no frontend page** (`/settings` and `/organization` both do not exist) and was **not live-verified** against a running Postgres instance. |

---

## 05 — BUSINESS RULES (do not violate)

- Project created only after quotation acceptance.
- Sent quotations are immutable; changes create a new version.
- Internal cost/margin data never appears in client-facing PDFs; protected at backend/service level.
- Recommended price = one calculated price, not automated 3-tier pricing.
- Minimum price is a hard guardrail.
- Manual pricing adjustment requires justification (stored).
- Historical estimates preserve values as of estimation time (no retroactive drift).
- Financial values: no floating-point storage (use integer cents / decimal).
- Financial/historical records: no silent deletes (soft delete / audit trail).
- MVP is single-tenant.
- MVP uses structured pricing rules, not arbitrary formula engine.
- No AI dependency in MVP.

---

## 06 — DESIGN SYSTEM

**Direction:** Dark professional technology + cybersecurity + premium business software.
**Must feel:** Professional, premium, clean, modern, technical, human-designed, production-ready.
**Avoid:** excess gradients/glow, neon, oversized rounded cards, glassmorphism, unneeded animation, generic "AI dashboard" look, purple overload, decorative clutter.

---

## 07 — COLOR SYSTEM (CSS variables/tokens — consistent everywhere)

| Token | Role |
|---|---|
| `--bg` | Deep dark background |
| `--surface` | Dark charcoal surface |
| `--surface-elevated` | Elevated surface |
| `--border` | Border |
| `--primary` | Cyber blue (primary accent) |
| `--secondary` | Controlled purple (secondary accent) |
| `--text` | White/off-white |
| `--text-muted` | Muted gray |
| `--success` | Green (profit) |
| `--warning` | Amber |
| `--danger` | Red (loss/risk/errors) |

---

## 08 — TYPOGRAPHY

Modern sans-serif. Priority: readability → professional look → hierarchy → consistent sizing → strong table/dashboard legibility. No decorative fonts.

---

## 09 — UI PRINCIPLES

One primary action/screen · clear hierarchy · controlled spacing · consistent shared components (no per-page reinvention) · professional tables · clear status badges · strong empty/loading/error states · responsive · keyboard accessible where practical · clear form validation.

---

## 10 — DASHBOARD & CHARTS (COMPLETE — see Section 04 Reporting & Dashboard, Section 18)

- Quotation conversion funnel
- Revenue/profit by service
- Revenue/profit by client
- Estimation accuracy
- Estimated vs actual hours
- Trends over time
- Profitability comparison

Rules: real data only (seed/demo data must be clearly marked), meaningful labels/tooltips, empty/loading/insufficient-data states, responsive, on-brand.

---

## 11 — DATABASE

| Field | Status |
|---|---|
| Technology | PostgreSQL 16 — installed and running locally (manual start, no systemd) |
| Migrations | `1700000000000-InitialSchema` — RUN. `1700000100000-PricingAndEstimation` — RUN. `1700000200000-ClientAndQuotation` — RUN. `1700000300000-ProjectsAndFinancials` — RUN. `1700000400000-AccuracySnapshots` — RUN (Phase 2; note: initial version had a column-naming bug — `capturedAt` camelCase instead of this project's `captured_at` snake_case convention for timestamp columns — caught immediately via live verification, reverted, fixed, re-applied cleanly). `1700000500000-Phase2Task4MultiCurrencyRecurringEmail` — RUN (adds `currency` to pricing_profiles and quotations; `acceptanceToken`/`acceptanceTokenExpiresAt`/`recurringInterval`/`nextBillingDate`/`recurringSeriesId` to quotations; new `email_logs` table). Verified live: existing seed data received correct `USD` defaults with zero manual backfill needed. Creates: roles, users, audit_logs, service_categories, services, project_types, features, pricing_profiles, pricing_rules, estimation_questions, estimates, estimate_features, clients, quotations, quotation_items, projects, project_actuals, expenses, accuracy_snapshots, email_logs + indexes |
| Seed data | `src/seed.ts` — RUN (4 roles + dev admin). `src/seed-pricing.ts` — RUN (Standard pricing profile, 5 pricing rules, sample project type + 2 estimation questions) |

**Core entities implemented:** roles, users, audit_logs, service_categories, services, project_types, features, pricing_profiles, pricing_rules, estimation_questions, estimates, estimate_features, clients, quotations, quotation_items, projects, project_actuals, expenses, accuracy_snapshots, email_logs.
**Core entities still planned:** contacts (full Client Management), change_requests, settings.

**Schema change protocol:** explain why → write migration → update affected code → update this file.

---

## 12 — API STATUS

Base path: `/api/v1/`

| Group | Status |
|---|---|
| Auth | **COMPLETE** — POST `/auth/login`, POST `/auth/logout`, GET `/auth/me`. Session regenerated on login (fixation prevention), httpOnly/sameSite cookie, bcrypt password check. Verified via curl: 401 unauth → login → me → RBAC-gated write → unknown-field 400 → logout → 401 post-logout. |
| Users / Roles | NOT STARTED (roles table + seed exist; no CRUD endpoints yet) |
| Service Categories | **COMPLETE** — GET list/detail, POST/PATCH (admin+manager), DELETE (admin, soft delete) |
| Services | **COMPLETE** — GET list/detail, POST/PATCH (admin+manager), DELETE (admin, soft delete). Cost stored as integer cents. |
| Project Types | **COMPLETE** — GET list/detail, POST/PATCH (admin+manager), DELETE (admin, soft delete) |
| Features | **COMPLETE** — GET list/detail, POST/PATCH (admin+manager), DELETE (admin, soft delete). baselineHours stored as numeric string. |
| Estimation Questions | **COMPLETE** — GET list (optional `?projectTypeId=`), POST/PATCH (admin+manager), DELETE (admin, soft delete) |
| Pricing Profiles / Rules | **COMPLETE** — Profiles: GET/POST/PATCH/DELETE. Rules: GET by profile, POST/PATCH/DELETE, duplicate (profile+type+key) rejected with 400. |
| Estimates | **COMPLETE** — GET list/detail (with relations), POST (validates feature↔project-type match, delegates pricing to PricingService, snapshots everything), PATCH `/price` (manual adjustment, justification required, draft-only), PATCH `/price/clear`, PATCH `/finalize` (draft-only, one-way). All verified live against running API. |
| Quotations | **COMPLETE + Phase 2 task 4 + admin UI** — GET list/detail, GET version history, POST `/generate` (from finalized estimate + client, snapshots client-safe fields only, now also snapshots `currency` from the pricing profile and accepts an optional `recurringInterval`), POST `/:id/revise` (new version, old row untouched), PATCH send/accept/reject/expire (immutability enforced service-side; `send` now also generates a signed acceptance token + 30-day expiry and queues a log-only email inside the same transaction), GET `/:id/pdf` (real Puppeteer-generated PDF, verified via pdftotext extraction to contain zero internal cost/margin data, now currency-aware instead of hardcoded USD), POST `/:id/generate-next-instance` (manual recurring billing trigger — see Section 33 for why this is manual, not a fake cron job). `PublicQuotationController` at `/api/v1/public/quotations/:token` — GET/accept/reject, genuinely unauthenticated. Frontend: quotation list and detail pages now display currency-correct amounts (not hardcoded USD); detail page shows a copyable client acceptance link for `sent` quotations (since email delivery is log-only — this is the practical way an admin actually gets the link to a client) and a "Generate next billing instance" button for accepted recurring quotations. All verified live through the real Next.js proxy — see Sections 33-35. |
| Clients | **COMPLETE** (minimal model) — GET list/detail, POST/PATCH (admin+manager+estimator), DELETE (admin, soft delete). |
| Projects | **COMPLETE** — GET list/detail, GET `/:id/profitability`, POST `/from-quotation` (accepted-only gate, one project per quotation), PATCH `/:id/status`. All verified live. |
| Actuals / Expenses | **COMPLETE** — POST `/:id/actuals` (admin/manager/estimator), POST `/:id/expenses` (admin/manager only — financial data). Integer cents for expenses, numeric string for hours. Profitability math verified live for both under- and over-budget cases. |
| Change Requests | **COMPLETE (backend only)** — GET list (optional `?projectId=`), GET detail, POST (admin/manager/estimator), PATCH `:id/approve` / `:id/reject` (admin/manager only — budget-impacting, same rationale as expense logging). Approve creates a new accepted quotation version + updates project budget/quotation link in one transaction. See Section 44. No frontend yet. |
| Reports | **COMPLETE** — GET `/conversion-funnel`, `/revenue-by-project-type`, `/estimated-vs-actual-hours`, `/profitability-comparison`. All admin/manager/estimator-only, all verified live against real seeded/test data. |
| Settings | NOT STARTED |
| Intelligence | **COMPLETE (Phase 2 sub-phase 1 + frontend)** — GET `/accuracy-trend` (raw snapshots, most recent first), GET `/accuracy-by-project-type` (aggregated avg variance), GET `/similar-estimates?projectTypeId=&featureIds=` (Jaccard overlap ranking, structured — no ML). All admin/manager/estimator-only, all verified live against real seeded historical data (4 completed projects with genuine variance spread). Frontend page at `/intelligence` (nav item added to AppShell) — accuracy trend chart, accuracy-by-project-type chart, and a similarity search tool (project type picker → feature multi-select → ranked results table). Verified live through the actual Next.js proxy (not just the API directly): logged in via `localhost:3000`, fetched the page (200, correct content), and confirmed `/api/v1/intelligence/accuracy-by-project-type` returns real aggregated data through the same proxy path the browser uses. |
| Notifications (Email Log) | **COMPLETE (Phase 2 task 4)** — GET `/api/v1/email-logs` (admin/manager only), lists what the app "would have sent." Log/queue-only, NO real SMTP — explicitly scoped this way with the person; a real transport is a production-environment concern needing real credentials, deliberately out of scope for this sandbox. `NotificationsService.queueEmail()` is called from `QuotationService.send()` inside the same transaction as the status update/token issuance. Verified live: sent a real quotation, confirmed the exact recipient/subject/body (including the correctly-formatted EUR amount and the working acceptance link) landed in the log. |
| Public Quotation Acceptance | **COMPLETE (Phase 2 task 4 + frontend)** — `PublicQuotationController` at `/api/v1/public/quotations/:token`, genuinely unauthenticated (no guards at all — the random 48-hex-char token IS the authorization). GET view / POST accept / POST reject. Token generated on send, 30-day expiry. Frontend page at `/quote/[token]` (no AppShell — client isn't logged in): shows quotation summary, Accept/Decline buttons (Decline requires a confirm step), and a friendly already-responded state. **Real UX bug found and fixed via live testing** (not caught by unit tests): the token was originally being cleared on accept/reject, so revisiting the same emailed link afterward showed a generic "link invalid" error instead of a confirmation. Fixed by keeping the token valid indefinitely (within its TTL) for viewing — repeat *actions* are still blocked by the existing `status !== 'sent'` check, so security is unchanged, only the revisit experience improved. Verified live end-to-end through the actual Next.js production server with zero cookies: viewed → accepted → revisited (now shows "already accepted") → confirmed re-accept still correctly rejected. Also verified the reject-then-revisit path separately. |
| User Management | **COMPLETE (Phase 2 follow-up)** — GET/POST `/api/v1/users`, PATCH `/:id`, PATCH `/:id/password`, DELETE `/:id`, all admin-only. Password reset is admin-set (no email/link — the person explicitly chose this over a token flow). Deactivate (soft, `isActive`) is the default path; hard delete is separate and correctly fails with a clear "deactivate instead" message if the user has real historical records (estimates created, actuals/expenses logged) referencing them via a genuine Postgres FK constraint — verified live by actually creating a user, having them create a real estimate, then attempting to hard-delete them and confirming the FK violation was caught and reworded rather than leaking a raw DB error. Self-deactivation and self-deletion are both blocked (safety net against accidental lockout). Frontend at `/users`. See Section 37. |
| Audit Logs | **COMPLETE — comprehensive coverage** — AuditLogService.record() now wired at: auth.login, auth.logout, quotation.sent/accepted/rejected/expired/generated/revised, quotation.recurring_instance_generated, user.created/updated/password_reset/deleted, expense.logged, estimate.created/price_adjusted/price_adjustment_cleared/finalized, and every create/update/delete across catalog (4 entity types), client, pricing (profile + rule), and estimation questions. Remaining unlogged: reads (deliberately — this stays a write-only audit trail). Verified live: 6 real actions across a full estimate→quotation lifecycle produced exactly 6 correctly-attributed, content-rich audit rows, confirmed via direct SQL. See Section 39. |

---

## 13 — SECURITY REQUIREMENTS

Session auth (secure/httpOnly/sameSite) · strong password hashing · server-side RBAC · field-level authorization · DTO validation + unknown-field rejection · parameterized ORM queries · XSS/CSRF protection · rate limiting · secure file upload validation · env-based secrets · audit logs · backups + restore testing · internal-data stripped from PDFs. Security is never a final cosmetic pass — build in from Phase 1.

---

## 14 — DEVELOPMENT PHASES

| Phase | Name | Status | Main Goal |
|---|---|---|---|
| 1 | MVP | **COMPLETE** (all 5 sub-phases: A–E) | Auth/RBAC → Catalog → Pricing → Estimation → Clients → Quotation+PDF+Versioning+Lifecycle → Project conversion → Actuals/Expenses → Profitability → Dashboard/Reports → Audit log → App-level tests → Direct (no-Docker) deployment |
| 2 | V2 | NOT STARTED | Historical accuracy stats, similarity search, email delivery, signed acceptance links, recurring/retainer pricing, expanded reports, document storage, multi-currency |
| 3 | V3 | NOT STARTED | Client portal, payment/invoicing integration, formula pricing (if needed), team capacity, multi-tenancy (if SaaS approved) |
| Future | — | NOT STARTED | AI-assisted estimation, advanced forecasting, public estimate request widget |

**Rule:** never pull a future-phase feature into an earlier phase without explicit approval.

---

## 15–17 — WORKFLOW RULES (condensed)

- **Start of every chat:** read this file → identify current phase → completed/remaining work → known issues → exact next task → continue only from there. Never rebuild completed modules without reason.
- **Phase-complete checklist:** feature/UI/backend/DB/API/validation/security implemented; empty/loading/error states done; responsive checked; charts checked (if applicable); **tests done at app-level only (browser-sandbox scope)**; integration verified; no regressions; no console/runtime errors; no broken nav; no placeholder UI/fake logic; no internal data leakage; this file updated. Only then mark `COMPLETE`.
- **After every phase:** update phase status, module table, API table, DB status, testing status, known issues, ADRs, next-phase plan. Keep compact — no transcripts.

---

## 18 — PHASE 1 CLOSE-OUT SUMMARY & PHASE 2 KICKOFF PLAN

### Phase 1 (MVP) — genuinely shipped

Every module in Section 04 marked COMPLETE was built, unit tested, AND verified live against a real running Postgres + NestJS + Next.js stack in this sandbox — not just code-reviewed. Specifically verified live at least once each: session auth + RBAC, full service catalog CRUD, deterministic pricing calculation with floor enforcement, estimation snapshot pattern, quotation generation/versioning/immutability, real Puppeteer PDF generation with content-safety confirmed via `pdftotext` extraction, project creation gated on quotation acceptance, profitability math in both under- and over-budget directions, and all 4 dashboard report queries. 85 Jest unit tests pass. A full regression curl pass across auth/catalog/quotation/reports confirmed no cross-phase breakage.

### What's a sandbox limitation, not a product gap

- **No Docker** (ADR-006) — this sandbox has no container engine; the architecture itself still calls for Docker in a real deployment.
- **No persistent server** (KI-001) — every live verification in this project ran server-start → test → server-stop within a single shell call, because background processes don't survive across separate tool invocations here. A real dev machine or server doesn't have this constraint.
- **PDF generation depends on an opportunistically-cached Chrome binary** (KI-005/ADR-011) — it works in this sandbox because a binary happened to be cached from a prior `npm install`, not because the setup is robust.

### What's a genuine, real gap (not sandbox-related)

- **Audit logging has partial coverage, not full coverage.** Wired at 6 specific action points (auth login/logout, 4 quotation status transitions, expense logging) — NOT wired at every mutating endpoint (catalog CRUD, client CRUD, pricing rule changes, etc.). This was a deliberate scope choice (explicit calls > a blanket interceptor claiming coverage it doesn't have), but it means Section 13's "audit logs" requirement is only partially met.
- **~~Settings/admin UI was NOT built in Phase 1E~~ RESOLVED in Phase 2** (KI-004) — Pricing Profiles, Pricing Rules, and Estimation Questions now have a working frontend at `/pricing` (see Section 36). This was originally an honest miss against the Phase 1E task list; it has since been closed, not forgotten.
- **Dev credentials, session secrets, and DB passwords are all placeholder values** (KI-002) — must be rotated before any real use.
- **No backups, restore testing, or TLS** — required per Section 13, not yet addressed anywhere in Phase 1.
- **~~Quotation accept/reject/expire are simulated as internal actions~~ RESOLVED in Phase 2** (KI-006) — a real client-facing acceptance flow now exists via signed public links (`/quote/[token]`, no login). The internal accept/reject/expire actions still exist too (for phone/email-based agreements where a link isn't practical) — both paths are legitimate now, not one simulating the other.

### Test coverage note

85 unit tests across 9 suites. Direct guard tests were added this phase (previously only exercised indirectly via curl). Coverage is strong on business logic (pricing math, snapshot integrity, immutability, RBAC enforcement) and thin on: DTO validation edge cases beyond the happy path, concurrent-request scenarios (e.g. two people finalizing the same estimate simultaneously), and the catalog/client CRUD services' edge cases (soft-delete-then-recreate, cascading effects).

---

## 19 — PHASE 2 KICKOFF PLAN

**NEXT PHASE:** Phase 2 — Historical Intelligence

**Objective:** Add historical accuracy tracking (estimated vs. actual, now that real project data exists) and the beginnings of similarity-based estimation support, per Section 14's Phase 2 scope. This is the first phase to build on genuinely completed MVP data rather than scaffolding new base entities.

**Tasks (starting point — refine before executing):**
1. Historical accuracy stats: for each completed project, compute and store the estimate-to-actual variance (hours and cost) — this data already exists via `ReportsService.getEstimatedVsActualHours()`/`getProfitabilityComparison()`; Phase 2 should persist/aggregate it over time rather than recompute live each time, and expose trends (is estimation accuracy improving?).
2. Structured similarity search: given a new estimate's selected features/project type, surface past estimates with similar feature sets to inform the complexity/urgency choice — structured (e.g. matching feature ID overlap), NOT AI-based per Section 14/Business Rules ("No AI dependency in MVP" — Phase 2 is post-MVP but the spec doesn't authorize AI here either; confirm scope with the person before introducing any ML/embedding-based approach).
3. Real gaps from Phase 1 close-out should likely be addressed before or alongside Phase 2 feature work — particularly full audit log coverage and the Settings admin UI, since Phase 2 will add more mutating endpoints that compound the existing gap. Flag this trade-off to the person rather than silently deferring further.
4. Email delivery, signed acceptance links, recurring/retainer pricing, multi-currency, document storage — all listed in Section 14 for Phase 2 but not detailed here; each needs its own scoping pass rather than being bundled into one sub-phase.

**Dependencies:** Phase 1 (MVP) — COMPLETE. Historical stats need real completed projects with actuals logged, which now exist from Phase 1D/1E testing (thin dataset — 1 project) — flag to the person that meaningful "trends" need more real usage first.

**Acceptance Criteria (draft — refine with the person before starting):**
- Historical accuracy data persists rather than being recomputed live, and is queryable over time.
- Similarity search returns structured, explainable matches — no black-box scoring.
- Any AI/ML-adjacent feature is explicitly confirmed with the person first, given the MVP's "no AI dependency" rule and Phase 2's ambiguous stance on this.
- Full regression (Jest + curl) still passes across all Phase 1 functionality.
- MEMORY.md updated with results and honest status — including whether the Phase 1 gaps (audit coverage, Settings UI) were addressed or consciously deferred again.

---

## 20 — MULTI-CHAT WORKFLOW

- Chat 1: Phase 1 — Foundation (Auth, RBAC, Catalog)  COMPLETE
- Chat 2: Phase 1 — Pricing & Estimation  COMPLETE
- Chat 3: Phase 1 — Quotations  COMPLETE
- Chat 4: Phase 1 — Projects & Financials  COMPLETE
- Chat 5: Phase 1 — Dashboard, Testing & Deployment COMPLETE
- Chat 6: Phase 2 — Historical Intelligence ← **you are here — sub-phase 1 (accuracy snapshots + structured similarity search) shipped this chat**

Each new chat gets: latest `MEMORY.md` + latest snapshot + specific phase instruction. Inspect existing project before modifying.

---

## 21 — VERSIONING / SNAPSHOTS

Naming: `Agency-System-Phase-01a.zip`, `-01b.zip`, etc. (or folder snapshot if zip tooling unavailable in sandbox). Never overwrite a previous snapshot. Snapshot = full working project; MEMORY.md = knowledge snapshot. Both required after each completed sub-phase.

---

## 22 — NEXT CHAT PROCEDURE

1. Open latest snapshot. 2. Read MEMORY.md. 3. Inspect actual code. 4. Verify MEMORY.md claims vs reality — resolve mismatches. 5. Implement only the assigned phase. 6. Preserve existing functionality. 7. Test at app-level scope. 8. Update MEMORY.md. 9. Create new snapshot.

---

## 23 — WIRING RULE

Every feature must be fully connected:
`UI → Frontend state → API client → Backend controller → Service/business logic → Database → Response → UI`

Charts: `DB → Reporting query → API → Frontend data hook → Chart component → real data`
Quotations: `Estimate → Quotation generation → Snapshot → Version → PDF → Status → Acceptance → Project`

---

## 24 — NO DUPLICATION

Before building anything: search for existing component/API/table/service/chart. Reuse. No duplicate buttons, forms, API clients, DB entities, services, chart systems, auth systems, layouts.

---

## 25 — NO FAKE COMPLETION

Complete = implemented + connected + functional + tested (app-level scope) + architecture-consistent. No placeholder buttons, dead routes, fake APIs, hardcoded calculations, fake charts, disconnected forms, TODO-only code. If incomplete → mark `BLOCKED` with exact reason.

---

## 26 — DESIGN QC CHECKLIST

Before marking any phase complete, inspect: Dashboard, Navigation, Tables, Forms, Modals, Buttons, Cards, Charts, Status badges, Empty/Error states, Responsive behavior. Must feel like one cohesive app. No full redesigns per phase — only justified design-system improvements.

---

## 27 — TOKEN EFFICIENCY RULE

Each task: MEMORY.md → current phase → relevant existing files → relevant rules. No unnecessary source dumps. Progress notes stay compact (reference, not essay). Example: `Pricing Engine: COMPLETE — profiles, complexity multiplier, urgency multiplier, floor, manual adjustment, calc tests.`

---

## 28 — RECENT CHANGES

- Project initialized — MEMORY.md created — DONE
- Runtime mode determined: browser-sandbox, no Docker, app-level tests only — DONE
- Phase 1A Foundation — Auth (login/logout/me, session regen, bcrypt) — COMPLETE
- Phase 1A Foundation — RBAC guard + @Roles decorator — COMPLETE
- Phase 1A Foundation — Service Catalog CRUD (categories/services/project types/features) — COMPLETE
- Phase 1A — Postgres 16 installed, migration run, seed data (4 roles + dev admin) — COMPLETE
- Phase 1A — 17 Jest unit tests (identity + catalog services) — PASSING
- Phase 1A — Full auth+RBAC+catalog curl smoke test — PASSED
- Phase 1A — Next.js upgraded 14→16.3.3 + React 19 (14.x EOL, active CVE at build time) — DONE, see ADR-007
- Phase 1A — Login page, catalog page, shared UI components, dark cyber design tokens — COMPLETE
- Phase 1A — Frontend build + proxy-to-API smoke test — PASSED
- Phase 1A — Snapshot `Agency-System-Phase-01a.zip` created — DONE
- Phase 1B — PricingProfile/PricingRule entities + deterministic calculatePrice() (floor-enforced) — COMPLETE
- Phase 1B — EstimationQuestion/Estimate/EstimateFeature entities with full snapshot pattern — COMPLETE
- Phase 1B — Migration `PricingAndEstimation1700000100000` run; seed script for default profile/rules/questions run — COMPLETE
- Phase 1B — Fixed build bug: dist output was landing at `dist/src/main.js` once `test/` existed under rootDir; added `tsconfig.build.json` excluding test/spec files — DONE
- Phase 1B — 20 new Jest unit tests (pricing + estimation services), 37 total passing — PASSING
- Phase 1B — Full live curl verification: exact price math, floor enforcement, justification-required rejection (missing + too-short), override-below-floor-with-justification, post-finalize lock — PASSED
- Phase 1B — Estimation Wizard UI (multi-step) + Estimates list page — COMPLETE
- Phase 1B — Frontend build + proxy smoke test for new pages — PASSED
- Phase 1B — Snapshot `Agency-System-Phase-01b.zip` created — DONE
- Phase 1C — Minimal Client entity + CRUD (API + list/create frontend page) — COMPLETE
- Phase 1C — Quotation/QuotationItem entities: generation from finalized Estimate, client-safe snapshot only — COMPLETE
- Phase 1C — Immutability enforcement (assertMutable, sent+ statuses locked) — COMPLETE
- Phase 1C — Versioning via reviseFrom() — new row per version, old row never mutated, quotationGroupId links versions — COMPLETE
- Phase 1C — Status lifecycle: send/accept/reject/expire — COMPLETE
- Phase 1C — Migration `ClientAndQuotation1700000200000` run — COMPLETE
- Phase 1C — Fixed a real bug found during live testing: initial `generate()` implementation tried to self-reference `quotation.id` as `quotationGroupId` after insert, but the column is NOT NULL, causing a 500 on every quotation generation attempt — fixed by generating the UUID in application code (`randomUUID()`) before the single insert — DONE
- Phase 1C — Puppeteer PDF generation: confirmed no real Chromium ships with this sandbox (`chromium-browser` is a non-functional snap stub); found a real Chrome binary was already cached from a prior `npm install` at `/home/claude/.cache/puppeteer/chrome/`; wired explicit executable-path discovery (`resolveChromeExecutable()`) instead of relying on Puppeteer's default assumptions — see ADR-011 — COMPLETE
- Phase 1C — PDF content-safety verified with `pdftotext` on the ACTUAL generated file (not just code review): confirmed price/title/client/items present, zero internal cost/margin/multiplier data — PASSED
- Phase 1C — 15 new Jest unit tests (quotation service: generation, immutability, versioning, HTML-render safety + XSS escaping), 52 total passing — PASSING
- Phase 1C — Full live curl verification: generate → PDF download (real 21KB PDF, 1 page) → send → re-send rejected (400) → revise creates v2 while v1 stays untouched at `sent` → accept — PASSED
- Phase 1C — Frontend: Clients page, Quotations list + detail page (lifecycle actions, PDF download link), "Generate quotation" action wired into Estimates page — COMPLETE
- Phase 1C — Frontend build + full-stack proxy smoke test for new pages — PASSED
- Phase 1C — Snapshot `Agency-System-Phase-01c.zip` created — DONE
- Phase 1D — Decision made on hourly cost basis for profitability: use the SAME PricingProfile.baseHourlyRateCents from the estimate, not a separate internal rate (no such rate exists anywhere in the spec — inventing one would be scope creep) — see ADR-013 — DECIDED
- Phase 1D — Project/ProjectActual/Expense entities: Project created ONLY from an `accepted` quotation, budget snapshotted at creation — COMPLETE
- Phase 1D — Migration `ProjectsAndFinancials1700000300000` run (includes unique constraint: one project per quotation) — COMPLETE
- Phase 1D — Profitability calculation service method — COMPLETE
- Phase 1D — 14 new Jest unit tests (project service: acceptance gate against all 4 non-accepted statuses via `it.each`, duplicate-project rejection, actuals/expenses logging, profitability math including a dedicated over-budget case), 66 total passing — PASSING
- Phase 1D — Full live curl verification: draft-quotation rejection (400) → accepted-quotation project creation (succeeds) → duplicate rejection (400) → log 2hrs+$50 expense → profitability = exactly $150 profit → log 5 more hours → profitability correctly flips to -$350 (over budget) — PASSED, exact cent-accurate math confirmed against the real running system
- Phase 1D — Frontend: Projects list + detail page (profitability card, log-hours/log-expense forms, activity feed), "Convert to project" action wired into Quotations detail page — COMPLETE
- Phase 1D — Frontend build + full-stack proxy smoke test for new pages — PASSED
- Phase 1D — Snapshot `Agency-System-Phase-01d.zip` created — DONE
- Phase 1E — AuditLogService created; wired at 6 specific action points (auth login/logout, quotation send/accept/reject/expire, expense.logged) via explicit calls rather than a blanket interceptor — COMPLETE (partial coverage, documented as such)
- Phase 1E — Verified live via direct SQL query that audit_logs table genuinely receives rows (row count grew 2→6 across real test actions) — PASSED, resolves KI-007's "schema-only" concern but coverage remains partial (see close-out summary, Section 18)
- Phase 1E — ReportsService: 4 real-data queries (conversion funnel, revenue by project type, estimated vs actual hours, profitability comparison) — COMPLETE
- Phase 1E — Verified live: all 4 report endpoints return correct data matching prior Phase 1D manual test numbers exactly (e.g. the same over-budget project shows -$350 profit in both the project detail view and the dashboard comparison) — PASSED
- Phase 1E — Dashboard frontend page: 4 recharts bar charts, dark-theme styled, explicit per-chart empty states — COMPLETE
- Phase 1E — Frontend build + full-stack proxy smoke test for dashboard — PASSED
- Phase 1E — Added direct unit tests for SessionAuthGuard and RolesGuard (previously only exercised indirectly via curl) + AuditLogService + ReportsService aggregation logic — 19 new tests, 85 total passing — PASSING
- Phase 1E — Full regression: complete Jest suite + curl smoke pass across auth/catalog/quotation/reports — PASSED, no cross-phase breakage
- Phase 1E — RUNBOOK.md written and VERIFIED by actually re-running its documented steps (migration idempotency check, login curl) fresh, not just written and assumed correct — COMPLETE
- Phase 1E — Settings/admin UI for Pricing Profiles/Rules/Estimation Questions was NOT built despite being listed as a Phase 1E task — honest miss, carried forward (see close-out summary, Section 18, and KI-004 update below)
- Phase 1E — Phase 1 (MVP) marked COMPLETE; genuine close-out summary + Phase 2 kickoff plan written into Section 18 — DONE
- Phase 1E — Snapshot `Agency-System-Phase-01e.zip` created — DONE
- Phase 2 (sub-phase 1) — Scope confirmed explicitly with the person before any code: structured (Jaccard) similarity only, no ML/embeddings; historical accuracy persisted in a new table (not recomputed live); thin dataset addressed by seeding 3 additional realistic completed project chains — DECIDED
- Phase 2 — Fresh sandbox instance re-verified from scratch this chat: Postgres 16 installed, migrated, seeded; 85/85 original Jest tests passing; live curl login confirmed. Discovered the "1 completed project" mentioned in a prior chat's close-out did NOT persist to this fresh Postgres install (expected — sandbox has no persistent storage across sessions, not a regression) — RESOLVED via seed-historical.ts
- Phase 2 — AccuracySnapshot entity + migration `1700000400000-AccuracySnapshots` (one row per project, unique on project_id) — COMPLETE
- Phase 2 — IntelligenceService.captureSnapshot() wired into ProjectService.updateStatus, firing exactly once when a project first transitions to `completed` (verified idempotent: re-completing an already-completed project does NOT re-capture) — COMPLETE
- Phase 2 — IntelligenceService.findSimilarEstimates(): Jaccard overlap on feature-ID sets within the same project type, ranked highest-first, no ML/embeddings — COMPLETE
- Phase 2 — Real bug found and fixed during live verification: initial migration used `capturedAt` (camelCase) but this project's convention for timestamp columns is `created_at`/`updated_at` (snake_case) — caused a runtime SQL error the moment the completion trigger fired. Reverted the migration, fixed the column name, re-applied — no lingering camelCase columns remain in this table — FIXED
- Phase 2 — 12 new Jest unit tests (intelligence.service.spec.ts: snapshot math, idempotency, zero-division guard on fresh estimates, aggregation, similarity ranking + limit) + 3 new tests in project.service.spec.ts (completion triggers snapshot exactly once, non-completion transitions don't trigger it, already-completed projects don't re-trigger it) — 97 total passing — PASSING
- Phase 2 — `seed-historical.ts` written: deliberately drives the REAL Nest services (CatalogService, ClientService, EstimationService, QuotationService, ProjectService) rather than raw repo inserts, so every business rule (acceptance gate, snapshot pattern, floor enforcement, the new completion trigger) is genuinely exercised — not a parallel/fake path. Creates 3 clearly-marked "[Seed]" client/project chains with deliberately varied outcomes (+15%/-10%/+2% hours variance) so the accuracy trend has real spread to demonstrate, not one flat number — COMPLETE
- Phase 2 — Full live verification: GET `/accuracy-trend` and `/accuracy-by-project-type` return correct real numbers; GET `/similar-estimates` correctly ranks candidates by overlap score (verified two estimates sharing 2/3 features both score 0.667 and rank above one sharing 1/2 features at 0.333) — PASSED
- Phase 2 — Full regression: 97/97 Jest tests + curl pass across auth/reports/projects/quotations confirms zero cross-phase breakage; profitability figures cross-checked exactly against the new accuracy snapshot cost figures for all 3 seeded projects — PASSED
- Phase 2 — KI-008 (non-transactional status-update + snapshot-capture) found during close-out review and fixed same chat: wrapped both writes in `DataSource.transaction()`, added rollback + transaction-invocation tests, verified live against the real database with a fresh end-to-end chain — RESOLVED
- Phase 2 — MEMORY.md updated with sub-phase 1 results; audit log coverage and Settings UI gaps (Section 19 task 3) consciously NOT addressed this chat — flagged, not silently deferred, see Section 32
- Phase 2 — Frontend `/intelligence` page shipped: accuracy trend chart, accuracy-by-project-type chart, structured similarity search UI (project type → feature multi-select → ranked table). Added to AppShell nav. New types added to `lib/types.ts`. Full Next.js production build succeeds (`next build`, all 12 routes including `/intelligence` compile). Live-verified through the real Next.js dev server + API + Postgres stack together — logged in via the web app's own proxy (not the API directly) and confirmed real aggregated data renders — DONE
- Phase 2 task 4 — scope for all 4 sub-features (multi-currency, signed acceptance links, recurring quotations, email log) confirmed explicitly with the person before any code — DECIDED
- Phase 2 task 4 — new migration `1700000500000-Phase2Task4MultiCurrencyRecurringEmail`: currency on pricing_profiles/quotations, acceptance token + expiry, recurring fields, new email_logs table. Existing seed data verified to receive correct USD defaults — RUN
- Phase 2 task 4 — real data-leak bug found and fixed during code review, before any live test: public accept/reject were returning the full Quotation entity (leaking internal Estimate cost fields via the loaded relation). Fixed with a toPublicView() projection — FIXED
- Phase 2 task 4 — QuotationService reworked: currency snapshotting on generate/revise, acceptance token issuance + log-only email queuing on send (transactional), recurringInterval/nextBillingDate handling on accept, generateNextRecurringInstance (manual, no fake cron), new PublicQuotationController (genuinely unauthenticated) — COMPLETE
- Phase 2 task 4 — 11 new unit tests, 110 total passing. Full live verification against the real stack: EUR quotation generated/sent/accepted via public token with zero auth, email log confirmed with correct currency-formatted amount, nextBillingDate computed correctly, recurring instance generated with correct lineage, both guard rails and the currency allow-list all verified live, zero regression on existing endpoints — PASSED
- Phase 2 task 4 — MEMORY.md updated (Section 33); frontend UI for all 4 features explicitly NOT built this chat — flagged, not silently deferred
- Phase 2 follow-up — built `/quote/[token]` public frontend page (the most visible gap flagged in Section 33). Added `formatMoney()` helper and `PublicQuotationView` type — DONE
- Phase 2 follow-up — real bug found via live click-through testing (not unit tests): tokens were cleared on accept/reject, breaking a legitimate revisit of the same email link. Fixed by keeping tokens valid for viewing within their TTL; security unchanged (the status check, not the token, was always the real guard against a double-accept). Verified live twice through the real Next.js server with zero cookies — RESOLVED, see Section 34
- Phase 2 follow-up — 2 new unit tests, 112 total passing. Full regression clean — PASSED
- Phase 2 admin UI follow-up — new `/pricing` frontend page (profile list/create/edit/toggle, including currency). Fixed a silent currency-display bug on quotations list/detail (both were hardcoded to USD via `formatCents`, never updated when Phase 2 task 4 added per-quotation currency) — DONE
- Phase 2 admin UI follow-up — added "Generate next billing instance" button and a copyable client acceptance link card to the quotation detail page. Updated `lib/types.ts` (`PricingProfile`/`Quotation`) to include fields the backend had shipped but the frontend types were missing — DONE
- Phase 2 admin UI follow-up — full live verification through the real Next.js proxy: profile CRUD with 3 distinct currencies, recurring-instance generation via the button's exact endpoint, acceptance-link data confirmed present. Zero backend changes, 112/112 tests still passing, zero regression — PASSED
- Phase 2 admin UI follow-up — updated stale KI-006 (client-facing acceptance flow was already resolved a chat turn earlier but the Known Issues table hadn't caught up) — FIXED
- KI-004 close-out — `/pricing` page extended to two tabs: Pricing Profiles & Rules (inline rules panel per profile) and Estimation Questions (full CRUD). Restricted edit fields to match what the backend DTOs actually accept (ruleType/key locked after creation; projectTypeId/answerType locked after creation) rather than offering an edit path the API would reject — DONE
- KI-004 close-out — full live verification through the real Next.js proxy: rules CRUD, questions CRUD, and critically confirmed the actual Estimation Wizard's live question-fetching endpoint was unaffected by admin-UI test data. Zero backend changes, 112/112 tests still passing, zero regression — PASSED
- KI-004 marked RESOLVED in Known Issues table; MEMORY.md status rows and Section 33-35 stale "still open" references updated to point to Section 36
- User management — scope confirmed with the person (3 questions: admin-set password reset not email-based, admin-only access, deactivate + separate hard-delete) before any code — DECIDED
- User management — new `UserService`/`UserController` at `/api/v1/users`, admin-only. Self-deactivation/self-deletion blocked as a safety net. Hard delete correctly catches real Postgres FK violations (users with historical estimates/actuals/expenses) and rewords them into a clear "deactivate instead" message rather than leaking a raw DB error — COMPLETE
- User management — 13 new unit tests (125 total). Live-verified with real before/after login round-trips: created a user and logged in with their real password, reset it and confirmed old-fails/new-works, deactivated a user and confirmed they can no longer log in, and — most importantly — created a user WITH real historical data (an actual estimate) and confirmed the hard-delete FK-violation path works against genuine Postgres constraints, not a mock — PASSED
- User management — frontend at `/users`: list, inline edit, inline password reset, two-step delete confirm, status toggle. Fetches `/auth/me` to know the current user's own id so self-actions are disabled client-side too, not just blocked server-side. Verified live through the real Next.js proxy for every action. `next build` clean across all 15 routes — DONE
- KI-007 close-out — audit logging extended to 24 new call sites across CatalogService, ClientService, PricingService (profiles + rules), and EstimationService (questions). All mutation methods default acting-user to `null` so seed scripts (which call these services with no session context) keep working — DONE
- KI-007 close-out — wrote a brand-new `client.service.spec.ts` (5 tests, this module had zero coverage before) + new audit-logging test blocks in catalog/pricing/estimation specs. 135 tests total (up from 125) — PASSED
- KI-007 close-out — live-verified against a real database: ran 13 real mutations across all 4 newly-covered areas through the live API and confirmed the audit_logs row count grew by exactly 13, with every new row correctly attributed to the real acting admin user id (queried directly via SQL, not asserted against a mock) — PASSED
- KI-007 marked RESOLVED in Known Issues table; every prior chat's "still open — KI-007" reference (Sections 32/36/37) updated with a strikethrough pointer to Section 38
- Audit coverage part 2 — Section 38's own close-out surfaced a second gap (estimate/quotation creation and lifecycle actions were never logged, only later status transitions). Closed same day: 7 new audit points (estimate.created/price_adjusted/price_adjustment_cleared/finalized, quotation.generated/revised) across EstimationService and QuotationService — DONE
- Audit coverage part 2 — 9 new unit tests (143 total, up from 135). Live-verified with a real end-to-end estimate\u2192quotation lifecycle through the live API (create, adjust price, clear adjustment, finalize, generate quotation, revise) \u2014 confirmed exactly 6 new, correctly-attributed, content-rich audit rows via direct SQL, including inspecting the actual metadata (before/after price + justification text) not just row existence. Also literally re-ran seed-historical.ts against the live database as a compatibility check, not just a type-check \u2014 PASSED

---

## 32 — PHASE 2 SUB-PHASE 1 CLOSE-OUT (Historical Accuracy + Structured Similarity)

### What was genuinely shipped and verified live

- **Historical accuracy stats** (Section 19 task 1): `AccuracySnapshot` entity, one persisted row per project, written exactly once via `IntelligenceService.captureSnapshot()` when `ProjectService.updateStatus()` transitions a project to `completed`. Confirmed idempotent (re-completion doesn't duplicate/overwrite incorrectly — it updates the existing row via the unique `project_id` constraint). Two read endpoints (`/accuracy-trend`, `/accuracy-by-project-type`) read from this table only — no live recomputation from actuals/expenses, matching the task's explicit requirement.
- **Structured similarity search** (Section 19 task 2): confirmed with the person BEFORE writing any code (per the task's own flagged ambiguity around "no AI dependency") — Jaccard overlap on feature-ID sets, scoped to the same project type, zero ML/embeddings. The score itself is the explanation (no black-box ranking).
- **Thin-data problem**: resolved via `seed-historical.ts`, which drives the real application services (not raw SQL) to build 3 complete, clearly-marked "[Seed]" project chains with deliberately different outcomes, giving the new endpoints genuine variance to demonstrate rather than a single data point.
- A real migration bug (camelCase vs. this project's snake_case timestamp convention) was caught during live verification — not code review — reverted and fixed before proceeding, consistent with this project's standing rule of verifying against a running system rather than trusting code review alone.

### What's a sandbox limitation, not a product gap

- Same as Section 18: no Docker, no persistent server across tool calls (KI-001) — this chat re-verified Postgres/migrations/seed data from a genuinely fresh install, since the sandbox does not persist state across sessions.

### What's a genuine, real gap — explicitly NOT addressed this chat

- **Audit log coverage was NOT extended.** Section 19 task 3 flagged that Phase 2's new mutating endpoints (the intelligence module has none — it's read-only except for the internal `captureSnapshot` call, which itself is not separately audit-logged) would compound the existing partial-coverage gap from Phase 1 (KI-007). This was flagged to the person as a trade-off per the task's own instruction ("flag this trade-off... rather than silently deferring further") but the person's instruction this chat was to proceed directly to Phase 2 implementation; audit coverage remains exactly where Phase 1 left it.
- **~~Settings/admin UI (KI-004) was NOT built.~~ RESOLVED in Phase 2 (Section 36).** Intelligence endpoints frontend was covered separately in Section 34.
- **~~No frontend page for the new Intelligence endpoints.~~ RESOLVED this chat** — `/intelligence` page shipped: accuracy trend + accuracy-by-project-type charts (Recharts, matching the existing dashboard's visual style) and a structured similarity search tool. Live-verified through the actual Next.js proxy, not just the raw API.
- **~~Section 19 task 4~~ COMPLETE this chat** (email delivery, signed acceptance links, recurring/retainer pricing, multi-currency) — see Section 33 for the full close-out. Document storage was never part of task 4's confirmed scope and remains untouched.

### Test coverage note

12 tests for `IntelligenceService`, 5 tests for the `ProjectService.updateStatus` completion trigger (including the KI-008 transaction/rollback tests below) — 99 total passing across 10 suites (up from 85/9). Coverage is strong on the new snapshot math (including the zero-estimated-hours edge case), the similarity ranking/limit behavior, and the transactional completion path.

### KI-008 found and fixed same chat (not deferred)

During close-out review, found that `updateStatus()` and `captureSnapshot()` were two independent `save()` calls — a snapshot-write failure after a successful status save would silently leave a "completed" project with no accuracy data. Fixed before finalizing this snapshot: both writes now run inside one `DataSource.transaction()`; `captureSnapshot()` accepts an optional `EntityManager` to participate in the caller's transaction. Verified three ways: (1) new unit test asserting the transaction rolls back on snapshot-capture failure, (2) new unit test asserting `dataSource.transaction()` is actually invoked, (3) a real, non-mocked end-to-end run against the live database — created a fresh estimate→quotation→project chain, completed it, and confirmed via direct SQL that the snapshot landed atomically with the status change (10h estimated, 11h actual, +10% variance, correct).

---

## 33 — PHASE 2 TASK 4 CLOSE-OUT (Multi-Currency, Signed Links, Recurring, Email Log)

Scope for all four was confirmed explicitly with the person, one question per feature, before any code was written:

1. **Multi-currency — full, no conversion.** `PricingProfile.currency` and `Quotation.currency` (snapshotted at generation time from the profile, same pattern as `priceCentsSnapshot` — ADR-005). Small ISO 4217 allow-list (USD/EUR/GBP/CAD/AUD) enforced at the DTO layer. PDF/HTML rendering fixed to use the quotation's own currency instead of a hardcoded `'USD'`.
2. **Signed acceptance links — tokenized public URL, no login.** 48-hex-char random token + 30-day expiry generated on `send()`. New `PublicQuotationController` at `/api/v1/public/quotations/:token` has genuinely no guards — the token itself is the authorization.
3. **Recurring quotations — same estimate, billed on an interval, no usage tracking.** `recurringInterval`/`nextBillingDate`/`recurringSeriesId` fields. Deliberately NO automatic background job generates the next instance — this sandbox cannot run a persistent scheduler across tool calls (KI-001), so `generateNextRecurringInstance()` is an explicit manual action instead of something that would only pretend to run automatically here.
4. **Email delivery — log/queue only, no real SMTP**, exactly as scoped. New `NotificationsModule` / `EmailLog` entity; `QuotationService.send()` queues one row per send, inside the same transaction as the status update and token issuance.

### A real bug found and fixed during this chat's own review, before live testing

While wiring the public accept/reject endpoints, `acceptCore`/`rejectCore` were returning the full `Quotation` entity — which carries the linked `Estimate`, and `Estimate` holds internal cost/margin fields (`baseCostCentsSnapshot`, complexity/urgency multiplier snapshots) that must never reach a client per Section 05's existing rule. Caught this before it was ever tested against a live server, not after. Fixed with a `toPublicView()` projection applied to every public-route response. Verified live: fetched a real accepted quotation through the public token endpoint and confirmed via `JSON.stringify` inspection that no internal field name appears anywhere in the response.

### What was verified live, not just unit-tested

Every part of this was driven end-to-end against the real running stack (fresh Postgres install, real migration run, real API process) rather than trusted from code review alone:
- Created a real EUR pricing profile (with its own complexity/urgency rules), a client with a contact email, a finalized estimate, and a **recurring monthly** quotation — confirmed `currency: "EUR"` and `recurringSeriesId` were correctly snapshotted/set on generation.
- Sent it — confirmed a real acceptance token + 30-day expiry were issued, and confirmed via `GET /api/v1/email-logs` that a log-only "email" was written with the correct recipient, the correctly-formatted `€1,080.00` amount, and a working acceptance link — all inside the same transaction as the send.
- Hit `GET /api/v1/public/quotations/:token` with **zero cookies, zero auth headers** — got a 200 with a client-safe view containing no internal fields.
- Accepted via the public token — confirmed `nextBillingDate` was correctly computed as one calendar month out (2026-08-31 → 2026-10-01), and confirmed the token was cleared and single-use (a reuse attempt correctly returned 404).
- Generated the next recurring instance from the accepted quotation — confirmed the new row has its own lineage (new id/quotationGroupId, version 1, status draft) while sharing `recurringSeriesId` with the source, and confirmed the source's `nextBillingDate` was cleared.
- Verified both guard rails live: generating an instance from a non-recurring quotation and from a recurring-but-not-yet-accepted quotation both correctly rejected with clear error messages.
- Verified the public **reject** flow end-to-end on a second, separate USD quotation.
- Verified the currency allow-list rejects an unlisted code (`XYZ`) with a clear validation error.
- Ran a full regression pass afterward confirming zero breakage: conversion-funnel, accuracy-by-project-type, and the existing auth guard on non-public routes (401 without a session) all still behave correctly.
- Confirmed existing pre-migration data (4 quotations, 1 pricing profile) received correct `USD` currency defaults with zero manual backfill needed.

### Test coverage note

11 new unit tests added to `quotation.service.spec.ts` (currency snapshotting, currency-aware PDF formatting, token generation on send, conditional email queuing based on whether the client has a contact email on file, expired/unknown token rejection, accept-via-token setting `nextBillingDate` for recurring quotations while returning zero internal fields, and both recurring-instance guard rails) — 26 tests total in that file, **110 total across the whole suite** (up from 99), all passing on a clean rebuild.

### What's a genuine, real gap — explicitly NOT addressed this chat

- **~~No frontend UI for any of the four task-4 features.~~ PARTIALLY RESOLVED next chat turn** — the public `/quote/:token` page (the most user-visible gap) was built and live-verified; see the follow-up note below. Pricing profile currency management, quotation currency display in the internal quotations UI, and the recurring-instance trigger button are still API-only — no internal admin UI changes were made.
- **Recurring billing has no reminder/notification when `nextBillingDate` arrives.** The date is stored and readable, but nothing surfaces "this is due" — someone has to know to check and call `generateNextRecurringInstance` manually. Documented as intentional given the sandbox's scheduling limits, but worth flagging as a real production gap, not just a sandbox one — even a real deployment would need an actual scheduled job wired to this, which doesn't exist yet.
- **Audit log coverage was not extended** to the new actions this chat introduced beyond what was already wired (`quotation.sent/accepted/rejected/expired` were already covered pre-existing; `quotation.recurring_instance_generated` was added as a new audit action, but the `/email-logs` GET endpoint itself and pricing-profile currency edits are not separately audit-logged). Same category of gap as KI-007.
- **Settings/admin UI** (KI-004) still not built — the new currency field on pricing profiles is manageable via API only, same as the rest of that area.

---

## 34 — PUBLIC QUOTE PAGE + TOKEN-REVISIT FIX (follow-up to Section 33)

Built the `/quote/[token]` frontend page — the most user-visible gap Section 33 flagged: a real client clicking the link in the logged email previously had nothing to land on.

### What shipped

- `apps/web/src/app/quote/[token]/page.tsx` — no `AppShell` (the client isn't logged in), styled to match the login page's centered-card pattern. Shows quotation title/client/items/total (currency-aware via a new `formatMoney()` helper in `lib/money.ts`), Accept/Decline buttons, a two-step confirm for Decline, a recurring-interval indicator, and distinct friendly states for already-accepted/rejected/expired/still-loading/invalid-link.
- New `PublicQuotationView` type in `lib/types.ts` matching the backend's `toPublicView()` projection exactly (no ids, no estimate data — mirrors the client-safe shape by design).
- `next build` succeeds; `/quote/[token]` compiles as a dynamic (`ƒ`) route alongside the existing 12 static/dynamic routes.

### A real bug found through live testing, not unit tests (fixed same chat)

Unit tests alone would not have caught this — it only showed up when actually clicking through the flow twice against a live server. Originally, `acceptCore`/`rejectCore`/`expire()` cleared `acceptanceToken` immediately after use ("single-purpose" token). Live-testing the actual click-through revealed the real consequence: a client who accepts, then re-opens the *same* email link later (to check what they agreed to, forward it, whatever) got a generic "this link is invalid or has already been used" error — even though they were the one who legitimately used it and did nothing wrong.

**Fix:** stopped clearing the token on accept/reject/expire. The token now stays valid (within its normal 30-day TTL) purely for *viewing* — `findByToken` still works, `getPublicViewByToken` still returns the current status. Re-*using* the link to accept/reject again is still blocked, but by the pre-existing `status !== 'sent'` check, which returns a clear "Only a sent quotation can be accepted" error rather than a confusing "invalid link" one. Security posture is unchanged: the token was never the only line of defense against a double-accept, the status check was, and still is. Only the honest client's revisit experience improved.

Verified live, twice, through the real Next.js production server with zero cookies:
- Accept → revisit same link → correctly shows `status: "accepted"` (page renders "You already accepted this quotation. Thank you!") instead of the broken invalid-link error.
- Attempted re-accept on the now-accepted quotation → correctly still blocked (400, clear message).
- Reject → revisit → correctly shows `status: "rejected"`.
- Full regression afterward: authenticated routes still correctly require a session (401 without one), Intelligence endpoints unaffected.

### Test coverage note

2 new unit tests added to `quotation.service.spec.ts` (token stays valid after accept — asserts `savedArg.acceptanceToken` is unchanged, not nulled; repeat-accept on an already-accepted quotation fails with the status error rather than a token error) — **112 tests total** (up from 110), all passing.

### What's still open

- ~~Internal admin UI for currency management, quotation currency display, and the recurring-instance trigger button~~ **RESOLVED next chat turn** — see Section 35.
- No reminder system for `nextBillingDate` — unchanged from Section 33.
- Audit coverage and Settings UI — unchanged, same gaps as before.

---

## 35 — INTERNAL ADMIN UI FOLLOW-UP (Currency Management + Recurring-Instance Button)

Closed the remaining internal-facing gap from Section 33: pricing profile currency was manageable via API only, and the recurring-instance action had no button anywhere.

### What shipped

- **New `/pricing` frontend page** — list, create, and edit pricing profiles (name, description, base hourly rate, minimum price, currency, active/inactive toggle). Scoped deliberately narrower than full KI-004 (Settings UI): pricing RULES (complexity/urgency multipliers) and estimation questions are still API-only. Added to `AppShell` nav.
- **Quotation list and detail pages fixed to be currency-aware** — both were silently hardcoded to `formatCents()` (USD-only), which would have shown a wrong currency symbol on every EUR/GBP/etc. quotation created since Phase 2 task 4 shipped. New `formatMoney(cents, currency)` used throughout instead.
- **Quotation detail page: "Generate next billing instance" button** — shown only when a quotation is `accepted`, recurring, and has a `nextBillingDate` set (i.e. no instance has been generated yet for the current cycle). Explains in-UI that there's no automatic billing job, consistent with Section 33's reasoning.
- **Quotation detail page: copyable client acceptance link** — shown for `sent` quotations with an active token. Since email delivery is log-only (Section 33), an admin has no other way to actually get the link to a client; this card makes that practical, not just theoretically possible via the `/email-logs` endpoint. Includes the token's expiry date and a copy-to-clipboard button.
- `PricingProfile` and `Quotation` types in `lib/types.ts` updated to include the fields Phase 2 task 4 added to the backend (`currency`, `acceptanceToken`, `acceptanceTokenExpiresAt`, `recurringInterval`, `nextBillingDate`, `recurringSeriesId`) — these were missing from the frontend type definitions even though the backend had shipped them, which is why the currency-display bug above existed silently.

### Verified live, not just built

Backend was unchanged this chat (0 new backend tests; existing 112 still pass). Everything here was verified against the real running stack (fresh Postgres, real API, real `next build` + `next start`), through the actual Next.js proxy the browser would use:
- Created a new CAD-currency pricing profile via the exact endpoint the `/pricing` form calls, then edited its currency to GBP and toggled it inactive — confirmed each change persisted correctly.
- Fetched the full profile list and confirmed three profiles with three distinct currencies (USD/EUR/GBP) render with correct data.
- Created a fresh recurring-monthly quotation, sent it, accepted it, confirmed `nextBillingDate` was set — then called the exact endpoint the new button calls and confirmed a new instance was created with correct lineage and the source's `nextBillingDate` was cleared, matching Section 33's already-verified backend behavior.
- Confirmed a `sent` quotation has `acceptanceToken` data available for the new copy-link card.
- Full regression: quotations list across mixed currencies (EUR/USD) renders correctly, Intelligence endpoints unaffected, unauthenticated requests still correctly blocked on normal routes.

### KI-006 updated

The Known Issues table's KI-006 was stale — it described "no client-facing acceptance flow" as still open, but that shipped in the prior chat turn (Section 34, the `/quote/[token]` page). Marked resolved with an explanation of the current two-path model (public link for client self-service, internal actions for phone/email-agreed acceptances).

### What's still open

- ~~Pricing RULES (complexity/urgency multipliers) and estimation questions remain API-only~~ **RESOLVED next chat turn** — see Section 36.
- No reminder system for `nextBillingDate`.
- ~~Audit log coverage still partial (KI-007) — the new `/pricing` page's create/edit/toggle actions are not separately audit-logged, same gap category as before.~~ **RESOLVED — see Section 38.**

---

## 36 — KI-004 CLOSE-OUT: PRICING RULES + ESTIMATION QUESTIONS UI

Closed the last piece of the original Phase 1E Settings-UI miss (KI-004): Pricing Rules and Estimation Questions were still API-only even after the `/pricing` page shipped a profiles-only UI in Section 35.

### What shipped

- `/pricing` is now a two-tab page: **"Pricing Profiles & Rules"** (existing profile list, each row expandable to reveal an inline rules panel — add/edit/delete complexity and urgency rules for that specific profile, grouped by type) and **"Estimation Questions"** (list/create/edit/toggle-active/delete, showing project type, answer type, prompt, and all options per question).
- The rules panel deliberately restricts editing on an existing rule to `label` and `multiplier` only — `ruleType` and `key` are disabled once created, matching the backend's own `UpdatePricingRuleDto` (which never accepted them) and the unique index on `(profile, ruleType, key)`. The UI doesn't offer an edit path the API would reject.
- The question form's options editor supports add/remove option rows freely; `projectTypeId` and `answerType` are locked after creation (also matching what `UpdateEstimationQuestionDto` actually accepts) rather than letting someone fill in a change the save call would silently ignore.
- Added `PricingRule` and `EstimationQuestion`/`EstimationQuestionOption` types to `lib/types.ts`.

### Verified live, not just built

Backend was unchanged this chat (0 new backend tests; existing 112 still pass — confirmed via a fresh Jest run before touching the frontend). Verified through the real Next.js proxy against a live Postgres + API:
- Full rules CRUD on a real profile: created a `complexity/low` rule, edited its label and multiplier, confirmed the change via a re-fetch, then deleted it and confirmed it was gone.
- Full questions CRUD: fetched the 2 real seed questions and confirmed they parse into the exact shape the UI expects (including the nested `projectType` object), created a new question with 2 options, edited its prompt and expanded it to 3 options, toggled it inactive, then deleted it.
- **Checked the real dependency, not just the admin surface**: confirmed `GET /api/v1/estimation-questions?projectTypeId=...` (what the actual Estimation Wizard calls) still correctly returned exactly the 2 real active questions after the test question was created and deleted — the admin UI's scratch data didn't leak into or break the live wizard.
- Full regression: quotations, Intelligence, and unauthenticated-request blocking all confirmed unaffected.

### What's still open

- ~~User management, org-level config, and role administration — the other half of "Admin & Settings" — remain untouched~~ **User management RESOLVED next chat turn** — see Section 37. Org-level config remains untouched (never scoped into either close-out).
- No reminder system for `nextBillingDate`.
- Audit log coverage still partial (KI-007) — this chat's new rule/question CRUD actions are not separately audit-logged, consistent with the existing gap.

---

## 37 — USER MANAGEMENT (Admin CRUD + Admin-Set Password Reset)

Scope confirmed explicitly with the person, three questions, before any code:
1. Password reset is **admin-set**, not an email/link flow — no token, no NotificationsService involvement. The admin directly assigns a new password and communicates it out of band.
2. Only the **admin** role can create/edit/deactivate/delete users — not manager, unlike some other admin-adjacent areas of this app.
3. **Both** deactivate (soft, default path) **and** hard delete (separate, deliberate action) exist.

### What shipped

- `UserService` + `UserController` (admin-only, `@Roles('admin')`) at `/api/v1/users`: list, create, update (name/role/active), `PATCH /:id/password` (admin-set reset), `DELETE /:id` (hard delete).
- **A safety net not explicitly requested but added as a reasonable default**: an admin cannot deactivate or hard-delete their **own** account through this endpoint — prevents an accidental lockout with no other admin available. Role/name changes on your own account are still allowed; only self-deactivation and self-deletion are blocked.
- **Hard delete correctly distinguishes "no history" from "has history."** `estimates.created_by_user_id` and `project_actuals`/`expenses.logged_by_user_id` are real Postgres foreign keys to `users.id` with no `ON DELETE CASCADE` — deleting a user who created an estimate or logged hours/expenses throws a genuine FK violation (Postgres error code `23503`). `UserService.hardDelete()` catches this specific error and rewords it into a clear "this user has historical records — deactivate instead" message rather than either leaking a raw database error or silently doing nothing.
- Password hashing via `bcrypt` (cost factor 12, matching the existing `IdentityService` login-path convention), never logged — not even hashed — in audit metadata.
- Audit logging added for all five actions: `user.created`, `user.updated`, `user.password_reset`, `user.deleted` (no "reactivated" action separately — reactivation is just `user.updated` with `isActive: true`).
- Frontend at `/users`: list with inline edit, inline password-reset form, a two-step confirm for delete, and a status-badge toggle for activate/deactivate. Fetches `/api/v1/auth/me` alongside the user list specifically to know the current user's own id, so self-deactivate/self-delete controls can be disabled in the UI too — not just blocked server-side.

### Verified live, not just unit-tested

13 new unit tests (duplicate-email rejection, password hashing, audit metadata never contains the plaintext password, self-deactivation/self-deletion blocks, the FK-violation-to-friendly-error rewording, non-FK errors passing through unchanged) — but the most important parts of this were verified against the real running stack, not mocks:
- Created a real user via the API, then **logged in as that user** with the password they were given — proving the bcrypt hash genuinely round-trips through the real login path, not just that `bcrypt.compare` returns true in a unit test.
- Reset that user's password, confirmed the **old password now fails login** and the **new one succeeds** — a real before/after round-trip, not an assertion on a mocked save call.
- Deactivated a user and confirmed they **can no longer log in at all** (the existing `IdentityService.login` already checks `isActive` — this wasn't new code, but it was worth confirming the new deactivate action actually engages that existing check).
- Confirmed RBAC: a manager-role session gets a 403 on `/api/v1/users`, not just an admin-role session succeeding.
- **The single most important check**: created a fresh user, logged in as them, had them create a real estimate (a genuine `created_by_user_id` FK reference), then attempted to hard-delete them as admin — confirmed the real Postgres FK violation was caught and returned as a clean 409 with the friendly message, not a raw stack trace. Then deactivated the same user instead and confirmed that succeeded.
- Verified every action a second time through the actual Next.js proxy (not the API directly) — create, edit, password reset, deactivate, delete — confirming the frontend's exact request shapes match what the backend expects.
- Confirmed real audit log rows exist in Postgres for all five action types, and confirmed (via a `grep` across the metadata column) that no plaintext or hashed password ever appears in any audit log entry.
- Full regression: quotations, pricing, and unauthenticated-request blocking all confirmed unaffected. 125/125 backend tests passing (up from 112), clean `next build` across all 15 frontend routes.

### What's still open

- Org-level config (company name, branding, defaults) — never part of this scope, still NOT STARTED.
- No self-service "change my own password" flow for non-admins — only an admin resetting someone else's password exists. Not requested, but a real gap if a non-admin user wants to change their own password without asking an admin.
- ~~Audit log coverage still partial (KI-007) — this chat added coverage for the new user actions specifically, but catalog/client/pricing-rule/estimation-question CRUD remain unlogged, unchanged from before.~~ **RESOLVED next chat turn — see Section 38.**

---

## 38 — KI-007 CLOSE-OUT: COMPREHENSIVE AUDIT LOG COVERAGE

Extended `AuditLogService.record()` calls to every remaining CRUD mutation that lacked them: catalog (4 entity types × create/update/delete = 12 call sites), client (create/update/delete = 3), pricing (profile create/update/delete + rule create/update/delete = 6), and estimation questions (create/update/delete = 3) — **24 new call sites across 4 services** in one pass, closing the gap flagged repeatedly since Phase 1E's original close-out (Section 18) and re-flagged in every Phase 2 close-out since (Sections 32, 33, 35, 36, 37) rather than silently fixing it piecemeal.

### What shipped

- `CatalogService`, `ClientService`, `PricingService`, and `EstimationService` (for estimation questions specifically — not estimate creation itself, which was out of this scope) all now inject `AuditLogService` and record a distinct, namespaced action per mutation: `catalog.service_category.*`, `catalog.service.*`, `catalog.project_type.*`, `catalog.feature.*`, `client.*`, `pricing.profile.*`, `pricing.rule.*`, `estimation_question.*` (`*` = created/updated/deleted).
- Every controller updated to extract `req.session.userId ?? null` and thread it through to the service call — the same pattern already established in `ProjectService`, `QuotationService`, and `UserService`.
- All 4 services' mutation methods default `actingUserId` to `null` (not a required parameter) — this mattered in practice: `seed-historical.ts` calls `clientService.create()` and `catalogService.createFeature()` with no acting-user context, and would have failed to compile if the parameter were required. Defaulting to `null` keeps seed scripts working while still recording a real (attributed-to-nobody) audit entry for seed-created data, which is itself useful — it's honestly visible in the log as system/seed activity rather than silently unlogged.
- Wired `IdentityModule` (which exports `AuditLogService`) into `CatalogModule`, `ClientModule`, `PricingModule`, and `EstimationModule`.

### Verified live, not just unit-tested

24 new unit-test assertions across `catalog.service.spec.ts`, `pricing.service.spec.ts`, and `estimation.service.spec.ts` (each got a new "Audit logging" describe block asserting the exact sequence and content of `record()` calls across a full create→update→delete cycle), plus a brand-new `client.service.spec.ts` (5 tests) — this module had **zero** unit test coverage before this chat, which the audit-logging work surfaced as a gap worth closing while already in the file. **135 tests total, up from 125.**

The more important verification was against the real running stack, exactly because mocked `record()` calls prove the code *tries* to log, not that a real database ends up with real rows:
- Booted a fresh Postgres + API, logged in as the real seeded admin, and noted the exact starting `audit_logs` row count (57).
- Ran 13 real mutations through the live API — one full create→update→delete cycle each for a service category and a client, plus a profile update, a rule create→update→delete cycle, and a question create→update→delete cycle.
- Re-queried the count: **exactly 70** (57 + 13, no more, no fewer — confirming no duplicate or missing writes).
- Queried the 14 most recent rows directly and confirmed every single action name matched exactly what was expected, in the correct order, every single one correctly attributed to the acting admin's real user id (not null, not a placeholder).
- Full regression: quotations, users, and Intelligence endpoints all confirmed unaffected; confirmed the Estimation Wizard's own live dependency (`GET /estimation-questions?projectTypeId=`) still correctly returns exactly its 2 real active questions, unaffected by the test question created and deleted during verification; confirmed unauthenticated requests are still correctly blocked (401) on a newly-audited route.

### What's still open

- ~~Estimate and quotation *creation* themselves are not separately audit-logged~~ **RESOLVED next chat turn — see Section 39.**
- Reads are (correctly, deliberately) never audit-logged — this remains a write-only audit trail, consistent with how every other action in this app has been logged since Phase 1E.
- Org-level config and self-service password change remain open from Section 37, unrelated to this close-out.

---

## 39 — AUDIT LOG COVERAGE, PART 2: ESTIMATE & QUOTATION LIFECYCLE

Section 38 closed the CRUD-mutation gap but, in writing its own "what's still open" list, surfaced a second one: estimate and quotation *creation and lifecycle* (not just later status transitions) had never been logged, going all the way back to Phase 1. Closed the same day it was found rather than letting it sit as a known gap.

### What shipped

Seven new audit points across `EstimationService` and `QuotationService`:
- `estimate.created` — on `createEstimate()`, capturing title, project type, pricing profile, and the resulting price.
- `estimate.price_adjusted` — on `adjustPrice()` (the manual override path), capturing the previous price, the new price, and the required justification together — this is the single most audit-worthy action in the whole estimation flow (a human deliberately overriding the system's calculated price) and previously left zero trace.
- `estimate.price_adjustment_cleared` — on `clearAdjustment()`.
- `estimate.finalized` — on `finalizeEstimate()`.
- `quotation.generated` — on `generate()`, capturing the source estimate, the client, the snapshotted price/currency, and the recurring interval.
- `quotation.revised` — on `reviseFrom()`, capturing which quotation it was revised from and the new version number.
- All six methods now accept an optional `actingUserId` (defaulting to `null`), following the exact same pattern established in Sections 37/38 — controllers thread `req.session.userId ?? null` through, and `seed-historical.ts` keeps working unmodified since it already passes `null` explicitly for `createEstimate` and omits the parameter entirely for the others.

### Verified live, not just unit-tested

9 new unit-test assertions across `estimation.service.spec.ts` and `quotation.service.spec.ts` (143 tests total, up from 135) — but as with every close-out this chat, the real proof was against the live stack:
- Logged into the real API, noted the exact starting `audit_logs` count (71).
- Drove a complete, real estimate → quotation lifecycle through the live API: created an estimate, manually adjusted its price with a justification, cleared the adjustment, finalized it, generated a quotation from it, then revised that quotation to a new version — six distinct real HTTP calls, all successful.
- Re-queried the count: **exactly 77** (71 + 6). Queried the 6 newest rows directly and confirmed the action names and order matched exactly, every one attributed to the real logged-in admin's user id.
- Inspected the actual `metadata` JSON on the price-adjustment and revision rows specifically (not just that a row exists) and confirmed it contains genuinely useful reconstruction detail: the exact before/after price and the human-written justification text on `estimate.price_adjusted`, and the correct source-quotation linkage on `quotation.revised`.
- As the most direct possible compatibility check, actually **ran `seed-historical.ts` again** against the live database (rather than just type-checking it) and confirmed it still completes successfully end-to-end with the new required audit-logging code paths active. Noted for the record: this incidentally re-ran the (already-known, pre-existing) non-idempotent seed script and duplicated the 3 "[Seed]" demo clients in this session's live database — a pre-existing property of the seed script, not something this chat's changes caused, and irrelevant to what ships in the code snapshot itself (which contains no database state).
- Full regression: quotations, users, and Intelligence endpoints confirmed unaffected; unauthenticated requests still correctly blocked.

### What's still open

- Reads remain deliberately unlogged (write-only audit trail, consistent throughout).
- No further known gaps in audit coverage were identified during this close-out. If one surfaces later, the established pattern (accept `actingUserId: string | null = null`, thread it from the controller, record a namespaced `entity.action` event with useful metadata) is now consistent across every service in the app and should be trivial to extend.

---

## 40 — BILLING REMINDER SYSTEM (nextBillingDate follow-up)

`nextBillingDate` has existed on recurring quotations since Phase 2 task 4, but nothing surfaced when a billing instance was actually due — the only way to know was to look at a quotation individually. Closed as the first item off the pending list carried from Sections 33/37/38.

### What shipped

- **New column**: `Quotation.lastReminderSentAt` (nullable timestamptz), added via migration `1700000600000-BillingReminders`. Duplicate-safe by construction: it's reset to `null` at every point `nextBillingDate` is itself (re)computed or cleared (`acceptCore` on a fresh accept, `generateNextRecurringInstance` on both the new instance and the now-closed source, `generate`/`reviseFrom` on creation) — so "already reminded for this cycle" is always a single null-check, no separate cycle id needed.
- **`QuotationService.listDueForBilling()`** — read-only query: accepted, recurring quotations with a non-null `nextBillingDate <= today`. No scheduler drives this (see KI-001) — it's meant to be checked from the UI, not polled by a job.
- **`QuotationService.sendBillingReminder(id, userId)`** — validates recurring + accepted + due + not-already-reminded (in that order, each with its own message), queues a reminder email via the existing `NotificationsService.queueEmail` (log-only, same as every other email in this app — see Section 33), sets `lastReminderSentAt`, and records a `quotation.billing_reminder_sent` audit entry with `nextBillingDate` and whether the client had a contact email on file.
- **Two new endpoints**: `GET /api/v1/quotations/due-for-billing` (declared before `:id` in the controller — route-order matters in Nest) and `POST /api/v1/quotations/:id/send-billing-reminder`.
- **Frontend**: a "Due for billing" panel at the top of the Quotations list page (`/quotations`) — shows client, title, amount, due date, and a per-row "Send reminder" / "Reminded" button that disables itself once `lastReminderSentAt` is set. Panel renders nothing at all when nothing is due, rather than an empty-but-visible box. Scoped explicitly with the person as "both" (backend + frontend), not backend-only.

### Verified live, not just unit-tested

7 new unit-test assertions in `quotation.service.spec.ts` (**150 tests total, up from 143**) covering the due-list query and every rejection/success path of `sendBillingReminder`, plus updated assertions on the existing accept/next-instance tests confirming `lastReminderSentAt` resets correctly.

The real proof, as with every close-out this project, was against a live stack — driven end-to-end through real HTTP calls, not mocks:
- Installed PostgreSQL 16 fresh in this sandbox (it was not present), started it via `pg_ctlcluster` (no systemd), created the database, and ran all 6 migrations including the new one — clean.
- Booted the real API, logged in as the seeded admin, and built a complete real chain from scratch: created a feature, a client, an estimate, finalized it, generated a **monthly recurring** quotation, sent it, and accepted it — confirming `nextBillingDate` was correctly set ~1 month out and `due-for-billing` correctly returned `[]` (not yet due).
- Backdated `nextBillingDate` to yesterday directly in the database (the only way to simulate time passing without a real month-long wait) and confirmed `due-for-billing` now correctly listed it.
- Called `send-billing-reminder` — got a 200, confirmed `lastReminderSentAt` was set, confirmed a `queued` row landed in `email_logs` with the correct recipient and subject, and confirmed a `quotation.billing_reminder_sent` audit row landed with the correct `nextBillingDate` and `hasClientEmail: true`.
- Immediately retried the same reminder — got a real 400 with the exact expected message ("A reminder has already been sent for this billing date."), confirming the duplicate-safe guard works against a real row, not just a mock.
- Called `generate-next-instance` and confirmed via direct SQL that the **source** quotation's `nextBillingDate` and `lastReminderSentAt` were both `null` afterward — the cycle-close reset works live, not just in the unit test.
- Full audit trail check: `audit_logs` went from 0 → 10 across this session's real actions (feature/client/estimate/quotation lifecycle + the new reminder action), every row correctly attributed and in the correct order.
- Re-ran `seed-historical.ts` against the live database and confirmed it still completes successfully end-to-end with the new required column/code paths active — no compatibility breakage.
- Full regression: all 150 unit tests still pass; `tsc --noEmit` clean on both `apps/api` and `apps/web`; `next build` succeeds.

### What's still open

- The reminder is a manual, one-at-a-time action from the Due for Billing panel — there is no bulk "send all due reminders" action. Not requested; noted here in case it's wanted later (the underlying `listDueForBilling()` + `sendBillingReminder()` pair makes it a small addition).
- Remaining pending items from prior close-outs are unaffected by this chat: self-service password change, org-level config/branding, project types/features frontend UI, Change Request module, KI-005 (Puppeteer Chrome binary), backups/TLS.

---

## 41 — PROJECT TYPES & FEATURES ADMIN UI (frontend)

Backend CRUD for `ProjectType` and `Feature` (full create/update/delete, role-guarded, audit-logged) has existed since early in the catalog module — only a management UI was missing. The Estimation Wizard already consumed both read-only (`GET /api/v1/project-types`, `GET /api/v1/features`), so this was purely additive: a new frontend tab, zero backend changes.

### What shipped

- **`/catalog` page restructured into two tabs**: "Services & Categories" (the pre-existing page, moved into `ServicesTab`, behavior byte-for-byte unchanged) and a new "Project Types & Features" tab (`ProjectTypesTab`). Same tabbed-page pattern already established on `/pricing` (Section 36 / KI-004 resolution), reused deliberately rather than inventing a new UI convention.
- **`ProjectTypesTab`**: list, create, edit, activate/deactivate, and delete project types. Each row expands (mirroring `/pricing`'s expand-a-profile-to-see-its-rules pattern) to reveal its features via `FeaturesPanel`.
- **`FeaturesPanel`**: scoped to one project type at a time — list, create, edit, activate/deactivate, and delete its features, including the `baselineHours` field the Estimation Wizard's pricing calculation depends on.
- No new types were needed — `ProjectType` and `FeatureItem` already existed in `lib/types.ts` and matched the backend DTOs exactly. No new API client methods were needed — the generic `api.get/post/patch/delete` helpers already covered every required call shape.

### Verified

- Confirmed via `grep` that the Estimation Wizard (`estimates/new/page.tsx`) only performs read-only `GET` calls against `/api/v1/project-types` and `/api/v1/features`, filtering active types client-side — so adding admin CRUD on top carries no risk of behavior change to the wizard itself.
- **No backend files were touched** — verified with a file-mtime diff against the rest of the tree. The controller, service, DTOs, and entities for project types/features were already complete and are unmodified by this chat.
- `tsc --noEmit` on `apps/web`: clean, zero errors.
- `next build` on `apps/web`: succeeds, all 15 routes (including `/catalog`) generate successfully as static pages, no warnings introduced.
- Backend unit test suite (150/150 baseline from Section 40) was **not re-run** this chat — this sandbox's `apps/api` dependencies were not installed and a full `npm install` exceeds this environment's per-call timeout (consistent with KI-001). This is a non-issue for correctness here specifically because zero backend files changed; there is nothing new for that suite to regress against. Flagged here for transparency rather than silently assumed.

### What's still open

- Live end-to-end verification against a running Postgres + API + Next.js stack (the standard this project holds itself to elsewhere, e.g. Section 40) was **not performed** for this specific change, due to the sandbox dependency-install constraint above. The change is low-risk (frontend-only, reusing existing endpoints and an existing UI pattern verified live elsewhere), but this is explicitly *not* the same bar as prior close-outs and should be re-verified live in an environment where `npm install` can complete, before being treated as fully proven.
- Remaining pending items, unaffected by this chat: self-service password change, org-level config/branding, Change Request module, KI-005 (Chrome binary), backups/TLS.

---

## 42 — SELF-SERVICE PASSWORD CHANGE

Distinct from the existing admin-set reset (`UserService.setPassword`, `PATCH /api/v1/users/:id/password`, admin-only, no old-password check, Section 41-adjacent per the comment in `user.service.ts`). This is the other half: any authenticated user changing their **own** password by proving they know the current one.

### Shipped

- **`IdentityService.changeOwnPassword(userId, dto)`** — looks up the user (including `passwordHash`, normally `select: false`), verifies `currentPassword` via bcrypt, rejects if `newPassword === currentPassword`, hashes and saves the new password, and records a distinct `auth.password_changed` audit action (kept separate from `user.password_reset` so the two paths — self-service vs admin-set — are told apart in the audit trail).
- **`PATCH /api/v1/auth/password`** on `IdentityController`, alongside `login`/`logout`/`me` (self-service auth action, not admin user management — deliberately NOT on `UserController`, which is `@Roles('admin')`-gated). Guarded only by `SessionAuthGuard` — any authenticated user, any role.
- **`ChangePasswordDto`** (`currentPassword` + `newPassword`, same 8-char minimum as `SetPasswordDto`) added to `dto/user.dto.ts`.
- **Frontend**: new `/account` page — shows the logged-in user's name/email/role (via `GET /api/v1/auth/me`) plus a change-password form (current/new/confirm, client-side match check before submit). Added "My Account" to `AppShell`'s nav. This also happens to be the first page in the app that surfaces "who am I logged in as" at all — there was no account/profile affordance before this.
- **5 new unit tests** in `identity.service.spec.ts` covering: successful change + correct audit log call, wrong current password (401, no save/log), new === current (400, no save), user not found (401), user inactive (401).

### Verified live (real Postgres, real running API — not mocks)

- Installed Postgres 16 in this sandbox (fresh, wasn't there this session), ran `npm install` for both `apps/api` and reused the cached `apps/web` install, ran all migrations clean (including the pre-existing `BillingReminders` migration from Section 40 — confirms no drift), ran `src/seed.ts` to get a real admin user.
- Started the actual Nest server (not a test harness) and hit the real HTTP endpoint with `curl`:
  - Wrong current password → real 401 `"Current password is incorrect"`
  - New password same as current → real 400 `"New password must be different from your current password"`
  - New password under 8 chars → real 400 from `class-validator`
  - No session cookie → real 401 `"Not authenticated"`
  - Correct current password → real 200 `{"success":true}`
  - Logged in again with the **old** password afterward → real 401, confirms the old password actually stopped working
  - Logged in with the **new** password → real 200, confirmed `/auth/me` returns the right user on the new session
  - Queried `audit_logs` directly in Postgres → `auth.password_changed` row present with correct `userId`/`entityId`, distinct from the `auth.login` rows around it
  - Reset the seeded admin's password back to the original `ChangeMe123!` via this same endpoint before finishing, so the sandbox's seed data is left in its documented state
- Full backend suite re-run after all changes: **155/155 pass** (150 baseline + 5 new).
- `tsc --noEmit` clean on both `apps/api` and `apps/web`. `nest build` clean. `next build` clean, `/account` generates as a static route alongside the rest.

### Known friction in this sandbox, noted for transparency

- Background processes (`nohup ... &`) and even the Postgres service do **not** reliably survive between separate tool-call boundaries in this particular environment — confirms and sharpens KI-001. Each round of live testing had to start Postgres + the API server and run all curl checks within a single shell invocation, or the server would be gone by the next call. Data written to Postgres itself (rows, migration state) does persist on disk across restarts — only the running processes get reaped.
- `dotenv@17.4.2` (pulled in transitively during `npm install`, likely via a loose semver range in `apps/api/package.json`) prints an unsolicited self-promotional line to the console on every load (`⌁ auth for agents [www.vestauth.com]`, the maintainer advertising an unrelated project). Not malicious, doesn't touch `.env` values or add network calls — just noisy logs. Flagged to the person directly during this session; worth pinning `dotenv` to a version without this behavior at some point, not urgent.

### What's still open

- No frontend "logout" affordance exists anywhere in the app yet (confirmed via grep — this predates this session, not introduced by it). Out of scope for this task specifically, but worth knowing if `/account` is expected to eventually host a logout button too.
- Remaining pending items, unaffected by this chat: org-level config/branding, Change Request module, KI-005 (Chrome binary), backups/TLS.

---

## 43 — ORG-LEVEL CONFIG/BRANDING (BACKEND ONLY — INCOMPLETE, frontend not built)

**Status: backend done and tested; frontend admin UI NOT built yet; not live-verified against a running Postgres instance this session.** Flagging this plainly rather than presenting it as finished — do not treat this section the same as Sections 40–42, which were verified live end-to-end.

### What shipped (backend)

- New `OrgSettingsModule` — a genuinely new module, not a follow-up on an existing one. Singleton pattern: exactly one `organization_settings` row ever exists (fixed `id = ORG_SETTINGS_SINGLETON_ID`), matching this project's single-tenant MVP scope (Section 01). No create/delete endpoints — only `get()` (lazily creates the row with defaults on first access) and `update()`.
- **Fields**: `name`, `logoUrl` (a URL string, not a file upload — no binary storage layer exists in this system, consistent with scope elsewhere), `addressLine1`/`addressLine2`, `contactEmail`, `contactPhone`, `defaultCurrency` (reuses the existing `SUPPORTED_CURRENCIES` allow-list from `pricing-profile.dto.ts`), `quotationFooterText`.
- **`GET /api/v1/org-settings`** — open to any authenticated session (org identity isn't sensitive, and multiple areas will want to read it).
- **`PATCH /api/v1/org-settings`** — `admin`-only. Deliberately narrower than `CatalogController`'s admin+manager: branding is one shared setting affecting every client-facing document, not a per-item catalog entry.
- Migration `1700000700000-OrgSettings.ts` — schema-only (table creation), no data seed in the migration itself; the singleton row's defaults are seeded lazily by `OrgSettingsService.get()`, consistent with how this project keeps migrations schema-only elsewhere.
- **Wired into `QuotationService.renderHtml()`**: quotation PDFs now render a header (logo + org name, address + contact right-aligned) and a footer (free text) when org settings are present. Made the `orgSettings` parameter **optional** specifically so every existing call site and unit test calling `renderHtml(quotation)` with one argument keeps working unchanged — only `generatePdf()` (already async, already fetches real data) calls `orgSettingsService.get()` and passes it through.
- Audit logging: `org_settings.updated`, recording which fields changed (not the values, consistent with how `user.password_reset` avoids logging the password itself).

### Verified this session

- 8 new unit tests: 4 on `OrgSettingsService` (get creates-with-defaults vs returns-existing, update partial-field semantics, audit log field-name tracking), 4 on `QuotationService.renderHtml` (backward-compatible with no orgSettings arg, full branding render, graceful omission of empty fields, no stray `<img>` when logoUrl is null).
- Full backend suite: **163/163 pass** (155 baseline + 8 new).
- `tsc --noEmit` on `apps/api`: clean. `nest build`: clean.

### NOT done — explicitly incomplete

- **No frontend page exists for this yet.** There is no `/settings` or `/organization` route, so an admin currently has no UI to actually view or edit org settings — the only way to exercise this right now is directly against the API. This is the main remaining piece of the task.
- **Not live-verified.** Unlike Sections 40–42, this was not run against a live Postgres instance in this session: the new migration has not actually been executed against a running database, the new endpoints have not been hit with real HTTP requests, and no quotation PDF has actually been regenerated to confirm the branding renders correctly in real Puppeteer output. The unit tests above are real and passing, but they are not a substitute for that live pass.
- MEMORY.md Section 04 (module inventory) has not been cross-checked/updated to list `OrgSettingsModule` alongside the other modules — only this dedicated section was added.

### Next steps (for whoever picks this back up)

1. Frontend page built at `/settings` — form for all 8 `UpdateOrgSettingsDto` fields, logo preview, reset/save actions, PATCH to `/api/v1/org-settings`, tsc clean. COMPLETE.
2. Run the new migration live, hit both endpoints with `curl`, and actually regenerate a quotation PDF to visually confirm the header/footer render as expected (needs the Chrome-binary environment from KI-005 to be resolved, or the sandbox's existing puppeteer cache workaround from ADR-011).
3. ~~Update Section 04's module table to include `OrgSettingsModule`.~~ **DONE** — see the "Admin & Settings" row in Section 04.
4. This module and Section 44 (Change Request / Scope Management) were built in separate sessions and merged afterward — see the merge note at the top of this file for what that merge did and didn't verify.

---

## 44 — CHANGE REQUEST / SCOPE MANAGEMENT MODULE (BACKEND)

First real work on the last app-code item from the original close-out list: "New quotation version on change." A Change Request records a scope change filed against a RUNNING (`active`) project — a client wants to add, remove, or adjust work after the project already started from an accepted quotation.

### Design decision — RESOLVED (confirmed with the person this session)

Originally shipped with approval jumping straight to `accepted` (see the struck-through rationale below, kept for history). **The person was asked directly and picked a different behavior:** approving a change request creates a new quotation version set to plain **`draft`** — it must go through the normal send → client-accept cycle (internal accept or the public acceptance link, Section 33/34) like any other quotation, and it's a real re-signature, not a rubber stamp. The project's own `quotation` link and `budgetCentsSnapshot` are **not** touched at approval time; they only update once that specific draft is actually accepted — see `QuotationService.acceptCore()`, which now looks up whether the just-accepted quotation is the `resultingQuotation` of an `approved` `ChangeRequest` and, if so, updates the linked project's budget/quotation-link inside the same transaction as the acceptance itself. This keeps "approve" meaning "staff agree this is worth quoting," and "accept" (by the client) meaning the budget actually moves — the same two-step meaning every other quotation already has.

Implemented and covered by 3 new/updated unit tests in `quotation.service.spec.ts` (draft-not-accepted on `applyChangeRequestRevision`, project sync on accept when a linked approved CR exists, no project touch on an ordinary accept or on a still-pending CR) plus an updated `change-request.service.spec.ts` assertion that `approve()` no longer saves the project. Full suite: **179/179 passing**, `tsc --noEmit` clean, `nest build` clean — **as unit/type-level checks only; not live-verified against a real Postgres/API stack in this sandbox, per the merge note at the top of this file.**

<details><summary>Original (now superseded) rationale — kept for history, not current behavior</summary>

Approving a change request creates a new quotation version set straight to `accepted` (with `sentAt`/`respondedAt` stamped to the approval moment) rather than looping back through the public send/accept-link flow. Rationale: by the time someone clicks "approve" in this module, the change is being recorded as already agreed with the client (e.g. over a call or email) — this module is the paper trail for that agreement, not a second negotiation round. **Superseded — see above.**

</details>

### Shipped

- **`ChangeRequest` entity** (`change_requests` table, migration `1700000700000-ChangeRequests`) — project link, title/description, `hoursDelta` (numeric, can be negative for a scope reduction), `priceDeltaCents` (integer cents, can be negative), status (`pending`/`approved`/`rejected`), requested-by/resolved-by users, resulting-quotation link, `resolvedAt`.
- **`QuotationService.applyChangeRequestRevision()`** — new method alongside `reviseFrom()`. Looks up the LATEST version in the quotation's group (not necessarily the version passed in — see regression test below), carries its items forward, adds one new line item for the delta, sets price = latest price + `priceDeltaCents` (rejects with 400 if that would go negative), and saves the new version as `accepted`. Accepts an optional `EntityManager` so it can participate in a caller's transaction — same pattern as `IntelligenceService.captureSnapshot`.
- **`ChangeRequestService`** — `create()` (active-project-only gate), `approve()` (new quotation version + project budget/quotation-link update + change-request resolution, all in ONE `DataSource.transaction()` — same KI-008-style reasoning as `ProjectService.updateStatus`: a change request left "approved" with no matching budget update would silently corrupt profitability numbers with no error surfaced), `reject()`.
- **`ChangeRequestController`** at `/api/v1/change-requests` — GET list (optional `?projectId=`), GET detail, POST (admin/manager/estimator), PATCH `:id/approve` / `:id/reject` (admin/manager only — budget-impacting, same rationale as `ProjectController.logExpense`).
- Audit logging: `change_request.created`, `change_request.approved`, `change_request.rejected`, plus a `quotation.revised` entry tagged `metadata.reason: 'change_request'` so the existing audit trail can distinguish this from a manual `reviseFrom()` revision.
- **13 new unit tests** (9 in `change-request.service.spec.ts`, 4 in `quotation.service.spec.ts` for `applyChangeRequestRevision`) — 168/168 total, up from 155, at the time this section's own session ran. NOTE: after merging with Section 43's org-settings work (8 further tests), the combined suite total is different again — see the merge note at the top of this file for the current real count, not the numbers quoted in this paragraph.

### Real bug found and fixed via live testing (not caught by unit tests)

`applyChangeRequestRevision`'s first version looked up the latest quotation version via a `createQueryBuilder` query that only selected the `Quotation` entity's own columns — no `items` relation — then tried to `.map()` over `latestVersion.items`, which was `undefined`. This produced a real 500 on the very first live `approve` call. It slipped past unit tests because `ChangeRequestService`'s own test suite mocks `QuotationService` entirely, so the bug only existed inside `QuotationService` itself and needed a `QuotationService`-level test (or live traffic) to surface. Fixed by switching to `quotationRepo.findOne({ where, relations: ['client','estimate','items'], order: { version: 'DESC' } })`, and added two new regression tests: one asserting the items relation is used correctly, one asserting a later version's price (not the version passed in) is what gets stacked on top of.

### Verified live (real Postgres, real running API — not mocks) — in this section's ORIGINAL session, prior to the Section 43 merge

Ran the FULL chain end-to-end through real HTTP calls against a freshly-migrated, freshly-seeded database in this sandbox: project-type → feature → client → estimate → finalize → generate quotation → send → accept → convert to project (budget $1,200) → **file a change request** (+5h, +$500) → **approve it** → confirmed via `GET /projects/:id` that budget is now exactly $1,700 and `project.quotation` now points at the new v2 (status `accepted`, price $1,700) → confirmed via `GET /quotations/:groupId/versions` that v1 ($1,200, one item) is untouched and v2 has both the carried-forward item and the new "Add contact form" line → confirmed re-approving or rejecting an already-approved change request now cleanly returns 400 (not the earlier 500) → queried `audit_logs` directly via SQL and confirmed all 3 expected rows (`change_request.created`, `quotation.revised` with `reason: change_request`, `change_request.approved`) landed with correct `entityId`s and metadata.

`tsc --noEmit`: clean. Full backend suite at the time: 168/168 passing. **This live verification predates the merge with the org-settings module (Section 43) — the merged codebase itself has not been re-run through this same live chain. See the merge note at the top of this file.**

### What's still open

- **Frontend UI** — no way to file/view/approve/reject a change request from the browser yet. This module is API-only. The project detail page (`/projects/[id]`) is the natural place for this — list existing change requests, a form to file a new one, approve/reject buttons — following the same patterns already used there for logging hours/expenses. The UI should make the resolved draft→re-accept flow visible (e.g. "approved — awaiting client acceptance on v3" rather than implying the change is already live).
- ~~The design decision above (approve = immediately accepted, no client re-signature loop) was made without explicit sign-off from the person — worth confirming that matches intent before building the frontend on top of it.~~ **RESOLVED this session — see above.**
- Remaining pending items, unaffected by this section: Change Request frontend UI, org-level config/branding frontend UI (Section 43), KI-005 (Chrome binary), backups/TLS, live DB verification of this design-decision change on the merged tree.

---

## 29 — KNOWN ISSUES

| ID | Issue | Severity | Status |
|---|---|---|---|
| KI-001 | Background processes (`&`/`nohup`/`setsid`) do not persist between separate sandbox tool calls — each call is a fresh process tree. Verification must start server, test, and stop it within one shell invocation. Does not affect real dev-machine usage. Postgres itself has also been observed to stop between calls and needs `service postgresql start` re-run — confirmed recurring through Phase 1E as well; documented in RUNBOOK.md. | LOW | OPEN — documented workaround in use, now also in RUNBOOK.md |
| KI-002 | Dev admin seed credentials (`admin@agency.local` / `ChangeMe123!`) are hardcoded in `src/seed.ts` for dev convenience | LOW | OPEN — must be rotated/removed before any real deployment; flagged in RUNBOOK.md |
| KI-003 | Redis/BullMQ not yet wired; session store uses Postgres via connect-pg-simple instead for Phase 1A simplicity | LOW | OPEN — planned for a later phase, see ADR-008 |
| KI-004 | Pricing Profiles/Rules and Estimation Questions have no frontend admin UI yet — manageable via API only (seed script covers the MVP default) | LOW | **RESOLVED** — `/pricing` page now has two tabs: Pricing Profiles & Rules (list/create/edit/toggle profiles, expand a profile row to manage its complexity/urgency rules inline) and Estimation Questions (list/create/edit/toggle/delete, grouped implicitly by project type). Verified live through the real Next.js proxy: full CRUD on rules and questions confirmed, and confirmed the Estimation Wizard's actual dependency on `/api/v1/estimation-questions` was unaffected by the test data created/deleted during verification. See Section 36. |
| KI-005 | PDF generation depends on a Chrome binary being present at a discoverable path (`resolveChromeExecutable()` scans common cache locations); on a genuinely fresh environment with no prior Puppeteer download and no network access to fetch one, PDF generation will fail with a clear 400 rather than silently produce a broken file — but it WILL fail. Real deployment should pin/vendor a Chrome binary rather than relying on `npm install`'s incidental download. | MEDIUM | OPEN — acceptable for this sandbox since a binary happened to be cached; must be addressed before production deployment; documented in RUNBOOK.md |
| KI-006 | Accept/reject/expire quotation status transitions were simulated as internal-only actions (any admin/manager/estimator could call them) — there was no client-facing acceptance link | LOW | **RESOLVED in Phase 2 task 4** — signed public acceptance links (`/quote/[token]`, no login required) now provide a genuine client-facing path, verified live end-to-end including a real revisit-after-response bug found and fixed (see Section 34). Internal accept/reject/expire remain available too, for agreements reached by phone/email rather than the link — this is now a deliberate second path, not a stand-in for a missing one. |
| KI-007 | AuditLog entity/table exist since Phase 1A; as of Phase 1E, writes happened at 6 specific action points; broader CRUD coverage across catalog/client/pricing/estimation-question mutations was missing | LOW | **RESOLVED** — audit logging extended to all catalog (service category/service/project type/feature), client, pricing (profile/rule), and estimation-question create/update/delete actions — 24 new call sites across 4 services. Verified live against a real database: ran 13 real mutations across all 4 areas and confirmed via direct SQL query that exactly 13 new, correctly-attributed audit rows appeared. See Section 38. |
| KI-008 | `ProjectService.updateStatus()` and `IntelligenceService.captureSnapshot()` were two separate, non-transactional `save()` calls. If the snapshot write failed after the project status save succeeded, a project could end up `completed` with no accuracy snapshot — silently skewing historical accuracy stats with no error surfaced to the user. | MEDIUM | **RESOLVED** — `updateStatus()` now wraps both the status save and `captureSnapshot()` in a single `DataSource.transaction()`. `captureSnapshot()` takes an optional `EntityManager` so it can participate in the caller's transaction (falls back to its own injected repos when called standalone, e.g. from tests or a future admin re-sync tool). Verified with a real, non-mocked transaction against the live database this chat: created a fresh estimate -> quotation -> project chain, logged an actual, completed it, and confirmed via direct SQL that the snapshot landed atomically with the status change. Also added a unit test asserting the transaction rolls back (project stays non-completed) if `captureSnapshot` throws. |

---

## 30 — ARCHITECTURAL DECISIONS (ADRs)

| ID | Decision | Reason |
|---|---|---|
| ADR-001 | Modular monolith | Solo/small team simplicity |
| ADR-002 | PostgreSQL | JSONB + relational integrity |
| ADR-003 | Session auth | MVP simplicity/security |
| ADR-004 | Structured pricing rules (no formula engine) | Avoid unsafe/general formula execution |
| ADR-005 | Immutable sent quotations | Historical/audit integrity |
| ADR-006 | Runtime mode: **no Docker**, app-level tests only | Running in browser-based sandbox with no OS shell/container engine; revisit only if a real OS/server environment becomes available — do not silently reintroduce Docker |
| ADR-007 | Next.js pinned to **16.3.3** (React 19), not 14.x as in original spec | Next.js 14 is fully EOL (Oct 2025); 14.2.15 had an active critical npm-audit-flagged vulnerability at build time. 16.3.3 is the current LTS security release (0 vulnerabilities on install). |
| ADR-008 | Session store: Postgres via `connect-pg-simple`, not Redis, for Phase 1A | Keeps sandbox setup minimal (one DB dependency instead of two) while Redis/BullMQ remain planned for caching/queues later; revisit if session load requires it |
| ADR-009 | Minimum price floor guards the system calculation only; a human can still manually adjust an estimate below the floor if a justification is supplied | Matches both stated business rules literally ("minimum price is a guardrail" + "manual adjustment requires justification") rather than treating the floor as absolutely unbreakable, which would block legitimate discount scenarios (e.g. loyal client, strategic loss-leader) |
| ADR-010 | `tsconfig.build.json` added to exclude `test/` from the Nest build | Once `test/*.spec.ts` existed, TypeScript's inferred rootDir shifted and `dist/main.js` moved to `dist/src/main.js`, breaking the documented run command; excluding test/spec files from the build config keeps output path stable |
| ADR-011 | Puppeteer's Chrome executable path is resolved via explicit filesystem discovery (`resolveChromeExecutable()`), not Puppeteer's default `executablePath()` | This sandbox's `npm install puppeteer` did not populate the cache location Puppeteer expects by default (`Could not find Chrome` error), but a working Chrome binary from a prior session was found at a different cache path; scanning known cache locations (and honoring `PUPPETEER_EXECUTABLE_PATH` if set) makes PDF generation actually work here, and fails loudly with a clear 400 rather than silently if no binary is found |
| ADR-012 | Quotation.id and Quotation.quotationGroupId are both generated in application code via `randomUUID()` before the initial insert, rather than letting Postgres generate `id` and patching `quotationGroupId` afterward | `quotationGroupId` is NOT NULL; a DB-generated id isn't known until after insert, so the original two-step approach (insert, then patch groupId=id) violated the NOT NULL constraint on the first insert. Generating the id in advance allows both columns to be set correctly in a single insert. |
| ADR-013 | Project actuals' hourly cost basis = the SAME `PricingProfile.baseHourlyRateCents` used at the estimate's original pricing, not a separate internal/cost rate | The architecture spec never defines a distinct internal cost rate, and no such field exists anywhere in the schema; inventing one would be unrequested scope. Using the estimation rate also keeps profitability directly comparable to the number the estimate itself was priced on — a project that logs exactly the estimated hours will show exactly zero profit change, which is the correct baseline behavior. |
| ADR-014 | Dashboard charts use `recharts` (installed directly via npm), and audit logging uses explicit `AuditLogService.record()` calls at 6 specific points rather than a global interceptor | Recharts wasn't pre-installed in this plain Next.js app (unlike the Claude Artifacts environment) and was added as a real dependency. For audit logging, a blanket interceptor would technically "cover everything" but would misrepresent what's actually meaningful to audit; explicit calls at auth/quotation-status/expense events are honest about current coverage and easy to extend later without guessing at interceptor scope rules. |

---

## 31 — WHAT THIS FILE IS

The compact operational state of the project — not a diary, transcript, or architecture doc copy. Answers instantly: what is this system, what architecture, what's built, what phase, what remains, what's next, what must not change, design system, security rules, modules/files, testing scope, next phase.
