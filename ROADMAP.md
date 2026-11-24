# `bentekkie-mainframe` Exploratory Feature Roadmap

> **Purpose:** This document is an exploratory, codebase-grounded roadmap for brainstorming and prioritizing future improvements to [`bentekkie-mainframe`](README.md) (`bentekkie.com`). It separates **existing capabilities** (Baseline) and **bug fixes / security hardening / stub completion** (Phase 0) from **genuinely new features** (Phases 1–3 and Wildcard Ideas), with technical feasibility assessments, open design trade-offs, and a standing **in-place `docker compose up` deployment contract** for every PR.

---

## Table of Contents
1. [Current Baseline (Already Implemented)](#1-current-baseline-already-implemented)
2. [Prioritization Framework, Dependency Matrix & PR Deployment Contract](#2-prioritization-framework-dependency-matrix--pr-deployment-contract)
3. [Phase 0 — Foundation, Security & Completing Existing Work](#3-phase-0--foundation-security--completing-existing-work)
4. [Phase 1 — High-Leverage Core Features (Now)](#4-phase-1--high-leverage-core-features-now)
5. [Phase 2 — Shell Parity, Self-Contained Portfolio & Accessibility (Next)](#5-phase-2--shell-parity-self-contained-portfolio--accessibility-next)
6. [Phase 3 — Interactive Engagement, CMS Safety & Composable Shell (Later)](#6-phase-3--interactive-engagement-cms-safety--composable-shell-later)
7. [Wildcard Brainstorming Ideas](#7-wildcard-brainstorming-ideas)

---

## 1. Current Baseline (Already Implemented)

To avoid re-proposing existing functionality, every capability below is **already implemented** in the repository (at commit `187e2f9`) and forms the baseline that new features build upon.

### 1.1 Architecture Snapshot
| Layer | Current Implementation | Key Files |
|---|---|---|
| **API Contract** | Protobuf v3 (`package mainframe`, `service shell`: `runCommand`, `runSudoCommand`, `autoComplete`, `sudoAutoComplete`, `getRoot`) with `ResponseType` (`text`, `markdown`, `html`, `json`) | `proto/command/v1/command.proto:1-78` |
| **Backend Server** | Go `1.27.4` HTTP mux mounting Connect-RPC (`connectrpc.com/connect v1.21.1`) at `/grpc/` and static files from `/out` at `/`; `-seed <file>` startup flag (`main.go:33,68-76`); HS512 JWT auth (`golang-jwt/jwt/v5 v5.3.1`) | `main.go:32-90`, `server/main.go:18-45`, `server/auth/auth.go:11-68` |
| **Database / VFS** | PostgreSQL (`postgres:15-alpine`) virtual inode tree (`inodes`, `files`, `users`, `isfile(id)`) with JSON tree seed/dump helpers | `server/db/db.go:19-282`, `server/db/seed.go:10-139`, `db.schema.json:1-59` |
| **Frontend** | Next.js `16.4.6` static export (`output: 'export'`, `distDir: 'out'`), React `19.3.1`, TypeScript `7.0.2`, Connect-Web `2.3.0`, `react-markdown` + `remark-gfm`, `react-mde`, `react-modal`, `react-cookie` | `clientnext/next.config.js:4-15`, `clientnext/package.json:10-31`, `clientnext/src/pages/index.tsx:5-23`, `clientnext/src/lib/*` |
| **Build, Ops & Tests** | Bazel (Bzlmod) building `distroless/base` OCI image; GitHub Actions image build/push; `docker-compose.yml`; Ginkgo + `dockertest/v3` + `agouti` E2E specs | `MODULE.bazel:6-91`, `BUILD.bazel:13-87`, `clientnext/defs.bzl:21-215`, `.github/workflows/*.yaml`, `*_test.go` |

### 1.2 Implemented Commands & UX Capabilities
- **Public commands (`CommandType`, `proto/command/v1/command.proto:23-33`):**
  - `ls`, `cat`, `cd`, `help` implemented on backend (`server/mainframe/shell_service.go:396-559`) and wired via `default:` in frontend (`clientnext/src/lib/api.tsx:122-136`).
  - `login` is implemented on backend (`shell_service.go:560-592`), while frontend `CommandType.login` returns `currentDir` early at `clientnext/src/lib/api.tsx:90` (opening `LoginModal` only when `args.length === 0`, `api.tsx:83-91`); actual `runCommand` login RPC is invoked from `LoginModal` via `api.tsx:370-381`, not inline 2-arg CLI execution.
  - `clear`, `landing`, `download_resume`, `exec` implemented client-side (`clientnext/src/lib/api.tsx:60-121`); `bootstrap()` runs `exec init` on page load (`api.tsx:356-365`).
- **Admin sudo commands (`SudoCommandType`, `proto/command/v1/command.proto:35-44`):**
  - `logout` (client-side cookie removal, `api.tsx:145-148`), `touch`, `mkdir`, `rm` (with `-f` cascade delete), `adduser`, `edit` (two-step: 1-arg `cat` opens `EditModal` with `react-mde`, 2-arg saves), `seed` (reads local JSON file and calls `SeedDB`, `api.tsx:139-144,409-435`, `shell_service.go:57-350`; CLI `-seed <file>` also invokes `SeedDB(..., true)` at startup in `main.go:33,68-76` while ignoring errors at `main.go:74-75`).
  - `dump` is **partially implemented**: `db.Connection.DumpDB` (`server/db/seed.go:51-66`) and client `ResponseType.json` download (`api.tsx:249-256`) exist, while the RPC handler returns `"Unimplemented"` (`shell_service.go:304-310`).
- **Terminal UX (`clientnext/src/lib/`):**
  - Tab autocomplete + cycling (`CommandBar.tsx:33-35`, `api.tsx:287-355`, `shell_service.go:613-762`), Up/Down command history (`CommandBar.tsx:26-32`, `AppContext.tsx:79-88`), quoted argument parsing (`api.tsx:25-33`), prompt path truncation `/../<leaf>` (`api.tsx:271-275`), guest-green / admin-red theming (`Terminal.tsx:12`, `CommandBar.tsx:16`).

### 1.3 Standard Extension Workflow in This Repo
Adding a typical end-to-end feature touches up to five places:
1. **Contract (`proto/command/v1/command.proto`)**: Add enum values / message fields and handle the repo's Bazel/native proto split-brain: `//clientnext/src/gen:gen_command_pb.ts` (`clientnext/src/gen/BUILD.bazel:14-19`, `protoc_es.bzl:42-61`) generates `command_pb.ts` ephemerally under `bazel-bin/clientnext/src/gen/` (`clientnext/tsconfig.json:15`; not checked into Git), while `BUILD.bazel:7-10` excludes checked-in `**/*.pb.go` and `**/*.connect.go` from Gazelle and resolves Go protos via `//proto/command/v1:commandv1_go_proto` (so native `go` tooling reads checked-in `.pb.go`/`.connect.go` files unless re-synced or run via `bazelisk`).
2. **Database (`server/db/db.go`)**: Evolve schema (currently inline DDL in `InitSchema` at `db.go:38-55`) and add query methods on `*Connection`.
3. **Command Handler (`server/mainframe/shell_service.go` & `help_text.go`)**: Implement dispatch, autocomplete, and Markdown help text.
4. **Frontend (`clientnext/src/lib/api.tsx`, `AppContextTypes.ts`, `AppContext.tsx`, components/CSS)**: Handle new command/response types and state transitions.
5. **Packaging & Tests (`BUILD.bazel`, `*_test.go`)**: Keep static export (`clientnext/next.config.js:5`) and `distroless/base` image self-contained with zero unbundled runtime assets.

---

## 2. Prioritization Framework, Dependency Matrix & PR Deployment Contract

### 2.1 Scoring Rubric (1–5 scale per factor)
Every candidate feature is scored using four weighted criteria tailored to an interactive personal portfolio and live VFS CMS:

| Criterion | Weight | Scoring Guide |
|---|---|---|
| **Visitor & Owner Value** | **35%** | `5` = transforms recruiter/visitor discovery or mobile usability; `3` = meaningful polish or CMS workflow boost; `1` = niche power-user delight |
| **Risk Reduction & Foundation Leverage** | **25%** | `5` = eliminates security/data-loss risk or unblocks 3+ downstream features; `3` = improves reliability or enables 1–2 features; `1` = standalone leaf feature |
| **Architectural Fit & Inverse Effort** | **25%** | `5` = Effort **S** (<1–2 days, minimal proto/DB churn); `3` = Effort **M** (2–5 days, schema migration + RPC + UI); `1–2` = Effort **L** (1+ weeks, major refactor) |
| **Scope & Identity Alignment** | **15%** | `5` = lightweight, self-hosted, authentic retro mainframe UX; `1` = introduces heavy runtime dependencies or operational bloat |

$$\text{Weighted Score} = 0.35(\text{Value}) + 0.25(\text{Leverage}) + 0.25(\text{Fit/Effort}) + 0.15(\text{Alignment})$$

### 2.2 Horizon Definitions
- **Phase 0 — Foundation, Security & Completing Existing Work:** *Non-novel* maintenance, security hardening, active bug fixes, stub completion, and CI/test wiring. Executed first so new features do not build on plaintext auth, broken SQL queries, or untested code.
- **Phase 1 — Now (High-Leverage Core, Score ≥ 4.0):** Highest ROI additions for external visitors (search, deep links, clickable/mobile UX) and production operations (health probes, telemetry).
- **Phase 2 — Next (Shell & CMS Maturity, Score 3.4–3.9):** Completes CLI ergonomics (path-aware autocomplete, `mv`/`cp`/`pwd`/`stat`), removes external Google Docs dependency for resumes, and adds themes/accessibility.
- **Phase 3 — Later (Interactive & Platform Expansion, Score 2.8–3.3):** Higher-effort or stateful additions (`contact`/guestbook, file revision history, composable command pipelines, multi-user RBAC) that rely on Phase 0–2 prerequisites.
- **Wildcards:** Provocative, higher-uncertainty explorations kept for brainstorming rather than immediate commitment.

### 2.3 Dependency & Priority Matrix

| ID | Item | Phase | Effort | Value (35%) | Leverage (25%) | Fit/Effort (25%) | Align (15%) | Score | Dependencies | Primary Layers Touched |
|---|---|---|---|---|---|---|---|---|---|---|
| **P0.1–P0.4** | Security, DB Fixes, Stubs (`dump`, `landing`), CI/Tests | **0** | M–L | — | — | — | — | *Prereq* | None | `auth`, `db`, `shell_service`, `api.tsx`, CI |
| **F1** | VFS Search & Tree (`tree`, `find`, `grep`) | **1** | M | 5 | 4 | 3 | 5 | **4.25** | P0.2 (`IsFile`/SQL) | `command.proto`, `db`, `shell_service` |
| **F2** | Deep-Linkable URLs (`?path=`, `?cmd=`) | **1** | S | 4 | 3 | 5 | 5 | **4.15** | P0.3 (`init` alignment) | `api.tsx`, `index.tsx` |
| **F4** | Health Probes (`/healthz`, `/readyz`) & `stats` | **1** | S–M | 3 | 5 | 4 | 5 | **4.05** | P0.2 (DB connect), P0.4 | `server/main.go`, `db`, `compose` |
| **F3** | Clickable Output & Mobile Quick-Action Bar | **1** | M | 5 | 3 | 3 | 5 | **4.00** | None | `api.tsx`, `CommandBar.tsx`, CSS |
| **F5** | Path-Aware Autocomplete & Candidate Preview | **2** | S–M | 4 | 3 | 4 | 5 | **3.90** | P0.2 | `shell_service.go`, `api.tsx`, `CommandBar.tsx` |
| **F6** | Full VFS Ops (`pwd`, `mv`, `cp`, `stat`) + Metadata | **2** | M | 4 | 4 | 3 | 4 | **3.75** | P0.2 (migrations) | `command.proto`, `db`, `shell_service` |
| **F7** | Self-Contained Resume Serving & Print View | **2** | S–M | 4 | 3 | 4 | 4 | **3.75** | P0.3 (config URLs) | `server/main.go`, `db` or static, CSS |
| **F8** | Terminal Themes, CRT Mode & Accessibility | **2** | S | 3 | 2 | 5 | 5 | **3.55** | None | `Terminal.tsx`, `CommandBar.tsx`, CSS |
| **F9** | Visitor `contact` / Guestbook + Sudo `messages` | **3** | M | 4 | 2 | 3 | 4 | **3.25** | P0.1 (rate limit), P0.2 | `command.proto`, `db`, `shell_service`, UI |
| **F10** | VFS Revision History & Rollback (`history`, `rollback`) | **3** | M | 3 | 3 | 3 | 4 | **3.15** | P0.1 (`Username` JWT), P0.2 | `db`, `shell_service`, `EditModal.tsx` |
| **F11** | Command Registry, Pipes (`\|`) & Paging (`head`/`tail`/`wc`) | **3** | M–L | 3 | 4 | 2 | 4 | **3.15** | P0.4 (DI refactor) | `shell_service.go`, `api.tsx` |
| **F12** | Multi-User RBAC & Content Scoping (`whoami`, `passwd`) | **3** | M | 2 | 4 | 3 | 4 | **3.05** | P0.1 (hashing + JWT) | `auth`, `db`, `shell_service` |

### 2.4 Per-PR Release Contract: In-Place `docker compose up` Deployability
Every PR implementing an item from this roadmap **must** remain trivially deployable in place against an existing PostgreSQL volume (`my_dbdata_prod` in `docker-compose.yml:18-19,30-31`) via a single `docker compose up` workflow — no manual SQL execution, no volume wipes, and no out-of-band scripts:
- **Target deploy workflows (GHCR-backed via GitHub Actions):**
  - *Production (`master`):* `./update.sh` (`docker compose pull && docker compose up -d --wait --remove-orphans`), pulling `ghcr.io/bentekkie/bentekkie-mainframe:latest` (while `main.yaml` also tags `sha-<short_sha>` for point-in-time rollbacks).
  - *PR preview / staging from GHCR:* `IMAGE_TAG=pr-<number> ./update.sh` (or `IMAGE_TAG=pr-<number> docker compose pull && IMAGE_TAG=pr-<number> docker compose up -d --wait`), using `image: ghcr.io/bentekkie/bentekkie-mainframe:${IMAGE_TAG:-latest}` in `docker-compose.yml:4` and the PR image published by `.github/workflows/build.yaml` via `:bentekkie-mainframe_image_push_tag`.
- **Automatic, Embedded, Baseline-Aware Schema Migrations:**
  - Store versioned SQL migrations in-repo (e.g., `server/db/migrations/0001_baseline.sql`, `0002_...sql`) and embed them directly into the Go binary using `//go:embed` (wired via `embedsrcs` in `server/db/BUILD.bazel`) so they travel inside the `distroless/base` OCI image (`BUILD.bazel:36-45`) with zero external files or sidecar containers.
  - Run pending migrations **automatically on server startup** inside `db.Connect` / `main.go` before starting the HTTP server, guarded by a PostgreSQL advisory lock (`pg_advisory_lock`) and bounded startup retry/backoff while Postgres boots.
  - **Existing-volume adoption:** `0001_baseline.sql` must use `IF NOT EXISTS` / `CREATE OR REPLACE` matching the existing `inodes`, `files`, `users`, and `isfile(id)` schema (`server/db/db.go:38-55`) so upgrading an already-populated `my_dbdata_prod` volume applies cleanly on first upgrade and records version `1` without touching existing data.
  - **Fail fast on migration error:** Unlike current `main.go:64-67` (which prints `db.Connect` errors and continues), any failed migration must abort startup immediately so broken upgrades never serve half-migrated state. (Optionally expose a `-migrate-only` flag for CI/operator pre-flight checks.)
- **Backward-Compatible Configuration (`prod.env`):**
  - Existing deployments only define the 6 keys in `prod.env:1-6` (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_HOST`, `POSTGRES_PORT`, `ADMIN_USER`). Every new env var introduced by a PR (e.g., `JWT_SECRET`, `STATIC_DIR`, `LANDING_URL`, `RESUME_URL`) **must** have a safe default or logged fallback rather than `panic()`ing on startup, and be documented in `.env.example`.
- **In-Place Data & Auth Compatibility:**
  - Schema additions must be additive or supply safe `DEFAULT` values (e.g., `DEFAULT NOW()` for timestamps in F6, `DEFAULT 'admin'` for `users.role` in F12, or nullable columns).
  - Auth upgrades (`P0.1` plaintext → `argon2id`/`bcrypt`) must handle existing `users` rows gracefully (e.g., transparent rehash-on-login or explicit admin bootstrap without silently breaking existing credentials or recreating `ADMIN_USER` on every restart).
- **Per-PR Definition of Done Checklist:**
  - [ ] Fresh DB boot (`docker compose down -v && docker compose up -d`) succeeds with zero manual steps.
  - [ ] **In-place upgrade test:** Starting the previous version (or seeding the v1 schema), then running `docker compose up -d` with the PR image preserves existing `inodes`/`files`/`users` data and applies migrations cleanly.
  - [ ] Existing `prod.env` (without new keys) boots cleanly with no startup panic.
  - [ ] Any irreversible or destructive schema migration includes a rollback/backup note (`dump` / `pg_dump`) in the PR description.

---

## 3. Phase 0 — Foundation, Security & Completing Existing Work

> **Important Distinction:** Nothing in Phase 0 is a "new feature." These items resolve active security vulnerabilities, SQL/runtime bugs, half-finished stubs, and missing CI checks already observed in the codebase.

### P0.1 Authentication, Session & XSS Hardening
- **Observed Gaps:**
  - Plaintext passwords stored and compared in `server/db/db.go:117,274,280` and `server/mainframe/shell_service.go:570`; `InitAdminUser` deletes and recreates `ADMIN_USER` on every startup and logs the password in cleartext (`server/db/db.go:111-122`).
  - `auth.InitJWT()` generates a fresh 64-byte random secret in memory on every start and ignores `rand.Read`'s error (`server/auth/auth.go:27-31`), invalidating all sessions on restart. `ParseJWT` (`server/auth/auth.go:47-68`) parses `customClaims` (`auth.go:11-14`), verifies the HMAC signature and `ExpiresAt` (2-minute early-expiry window), and currently discards `claims.Username` without validating or returning it.
  - `useCookie` calls `setCookie(key, newJwt)` with no `secure`, `sameSite`, `path`, or expiry (`clientnext/src/lib/api.tsx:18`), and `login` (`shell_service.go:560-592`) has no rate limiting.
  - `ResponseType.html` renders via raw `dangerouslySetInnerHTML` (`clientnext/src/lib/api.tsx:235-236`) without sanitization.
- **Work Items:** Hash passwords with `argon2id` or `bcrypt` (with in-place compatibility for pre-existing plaintext rows on existing volumes, e.g., detect legacy non-hashed passwords and rehash on successful login, and only create `ADMIN_USER` if missing instead of deleting/recreating on every restart); read `JWT_SECRET` from env (with safe dev/upgrade fallback warning so existing `prod.env` boots cleanly) and return `username` from `ParseJWT`; harden cookie flags and add per-IP login backoff; sanitize `ResponseType.html` with `DOMPurify` (or deprecate raw HTML in favor of Markdown).

### P0.2 Database Bug Fixes, Destructive Guards & Embedded Auto-Migrations
- **Observed Gaps:**
  - `Connection.IsFile` hardcodes `inode=65` (`server/db/db.go:263-269`), ignoring its `iNode` parameter.
  - `FindDirListingsByPath` uses unescaped SQL `LIKE $1 AND path NOT LIKE $2` with `p.Join(currentDir, "_%")` (`db.go:250-260`), even though `validFilename` (`shell_service.go:22`) allows `_`.
  - `rm -f /` is unguarded (`shell_service.go:208-278`): deleting root cascades across all `inodes` (`db.go:42`) while leaving `db.DbConnection.Root` stale.
  - `InitSchema` retries `ExecContext` in an unbounded tight loop with no backoff or `ctx.Done()` check (`db.go:87-89`) and only runs `CREATE TABLE IF NOT EXISTS` (`db.go:38-55`), which cannot evolve existing tables on `my_dbdata_prod` in place; package-level `var DbConnection, _ = Connect(...)` connects at import time (`db.go:58`); `main.go:64-67` prints `db.Connect` errors and continues; `main.go:74-75` (`-seed` startup flag) and `SeedDB`/`addINode` (`seed.go:38,69,74`) ignore errors; `server/db/scema.sql` is misspelled, unused, and syntactically broken (`scema.sql:15-16`).
- **Work Items:** Fix `IsFile` (`$1` parameter) and replace `FindDirListingsByPath` with `FindDirListings` (`parentinode=$1`, `db.go:239-247`); block `rm` on `/`; make `SeedDB` transactional; adopt embedded auto-running SQL migrations (`//go:embed` + Bazel `embedsrcs`, e.g. `goose` or `golang-migrate`) with bounded Postgres startup backoff, advisory locking, an idempotent `0001_baseline.sql` that cleanly adopts existing `my_dbdata_prod` volumes, and fail-fast error handling in `main.go`; delete `scema.sql`.

### P0.3 Completing Existing Stubs & Fixing UI Regressions
- **Observed Gaps:**
  - **`dump` stub:** `DumpDB` (`server/db/seed.go:51-66`) and frontend `dump.json` download (`clientnext/src/lib/api.tsx:249-256`) already exist, but `shell_service.go:304-310` returns `"Unimplemented"` and `api.tsx:254-256` leaks an unremoved `<a>` node and returns `undefined`.
  - **`landing` & `help` drift:** `help_text.go:31-33` describes `landing` as `"Unimplemented"` while `api.tsx:65-68` redirects to hardcoded `http://www.bentekkie.com`; `_AllCommandsHelp` (`help_text.go:47-54`) omits all `SudoCommandType` commands.
  - **Bootstrap & modal bugs:** `bootstrap()` runs `exec init` (`api.tsx:362`) whereas tests seed `.init` (`bentekkie_mainframe_suite_test.go:46`); `LoginModal.tsx:38` hardcodes `value="Login"` when `registering`; `LoginModal` and `EditModal` lack Cancel/Close/`onRequestClose`; `api.tsx:406,425` chain `.then(console.error)` instead of `.catch(console.error)`; `AppContext.tsx:79-88` inverts `NextCommand`/`PrevCommand` and doesn't reset `current_command` at end of history; `utils.ts:9` `arrays_equal` uses `!(a < b || b < a)` string coercion.
- **Work Items:** Wire `SudoCommandType_dump` to `DumpDB`; update `help_text.go` (including sudo help); externalize `LANDING_URL` / `RESUME_URL`; unify `init`/`.init` fallback; fix modal controls and Promise/history bugs.

### P0.4 Local Dev Ergonomics, Dependency Injection & CI Test Wiring
- **Observed Gaps:**
  - `main.go:78` (`os.ReadDir("/out")`) and `server/main.go:26,41` (`http.Dir("/out")`) crash unless `/out` exists at filesystem root; `main.go:65-67` prints `db.Connect` failure and proceeds; `server/main.go:28` ignores `http.ListenAndServe` error with no graceful shutdown.
  - `db.DbConnection` global singleton (`db.go:58`) and `InitSchema` infinite retry (`db.go:87-89`) cause `go test ./...` to hang at package init unless Postgres is listening on `54320` or DB initialization is decoupled, and prevent unit testing `ShellServer` without Postgres.
  - Zero unit tests exist; `command_test.go:80-87,100-111` has commented-out `help` specs; `page_open_test.go:21` reads missing `ascii_art.txt`.
  - **CI & proto split-brain:** `.github/workflows/build.yaml:25-35` only provisions Bazel (not Go or Node/pnpm) and `build.yaml:35` / `main.yaml:30` run **no** tests, lint, or `tsc`. `clientnext/src/gen/command_pb.ts` is **not** checked into Git (Bazel-generated only via `//clientnext/src/gen:gen_command_pb.ts`, mapped in `clientnext/tsconfig.json:15`), while `BUILD.bazel:7-8` excludes checked-in `**/*.pb.go` and `**/*.connect.go` (so Bazel builds ephemerally while native `go test ./...` reads checked-in generated files, creating split-brain unless synced or run via `bazelisk test`).
  - Legacy files clutter the root: `generateProto.sh`, `generateProto.bat`, `fresh.conf`, unused `clientnext/src/styles/App.css` (`_app.tsx:2`), stale `README.md` (`"web-grpc"`, `"React.js"`).
- **Work Items:** Add `STATIC_DIR` env var (default `/out`); modernize `docker-compose.yml` (use `image: ghcr.io/bentekkie/bentekkie-mainframe:${IMAGE_TAG:-latest}` so production defaults to `:latest` and PR/rollback deploys pull `:pr-<number>` or `:sha-<short_sha>` from GHCR, add Postgres `pg_isready` healthcheck with `depends_on: condition: service_healthy`, remove obsolete `version`/`links`); decouple `db.DbConnection` import-time `Connect` and inject a `Store` interface into `NewShellServer(store)`; add Go unit tests, an automated **v1 → latest in-place DB upgrade test**, and frontend Jest/Vitest smoke tests; wire CI in `.github/workflows/build.yaml` to either run `bazelisk test` (with pure Go unit-test targets / Docker+ChromeDriver for E2E) or provision Go + Node/pnpm, generate `//clientnext/src/gen:gen_command_pb.ts` before `eslint` + `tsc --noEmit`, and keep checked-in `.pb.go`/`.connect.go` stubs synced for `go test ./...`.

---

## 4. Phase 1 — High-Leverage Core Features (Now)

### F1: VFS Search & Tree Discovery (`tree`, `find`, `grep`)
- **Codebase Grounding:**
  - Currently visitors can only explore one directory at a time via `ls` (`server/mainframe/shell_service.go:396-439`) and `cd` (`:488-526`).
  - `inodes` (`id`, `parentinode`, `path`) and `files` (`inode`, `contents`) in `server/db/db.go:40-48` already model the entire VFS hierarchy in PostgreSQL.
- **Proposed Capability:**
  - `tree [path] [-L depth]`: Renders an ASCII/Markdown directory tree so visitors can see all resume/project files at a glance.
  - `find <glob/name>`: Searches `inodes.path` by filename pattern.
  - `grep <query> [path]`: Full-text or substring search across `files.contents`, returning matching file paths with line numbers and matched snippets.
- **Technical Feasibility Assessment:**
  - **Layers:** `proto/command/v1/command.proto` (add `tree`, `find`, `grep` to `CommandType`) -> Bazel codegen -> `server/db/db.go` (`WITH RECURSIVE` CTE for `tree`, `ILIKE` / `tsvector` queries for `find`/`grep`) -> `server/mainframe/shell_service.go` + `help_text.go` -> `clientnext/src/lib/api.tsx`.
  - **Dependencies:** Phase 0.2 (clean `IsFile`/SQL handling; optionally migration for GIN index).
  - **Risks & Mitigations:** Unbounded `tree` or regex ReDoS / slow sequential scans on large text blobs. Mitigate with default max depth (e.g., `3`), result cap (e.g., `50` matches), parameterized `ILIKE` / `plainto_tsquery` (no raw user regex in SQL), and escaping special characters.
  - **Effort:** **M**
- **Prioritization Rationale:** **Score 4.25.** Highest visitor impact: recruiters rarely want to `cd` blindly through folders to find skills or project writeups; `tree` and `grep` make the portfolio immediately navigable.
- **Open Design Questions & Trade-offs:**
  - *Server-side SQL search vs. client-side in-memory index?* Server-side scales and avoids shipping all file contents on initial load; client-side caching of `tree` metadata could enable instant autocomplete later.
  - *Dotfile visibility:* Should `tree`/`find`/`grep` hide `.init` (and future dotfiles) by default unless `-a` is passed?

### F2: Deep-Linkable URLs & Shareable Command Routing (`?path=` / `?cmd=`)
- **Codebase Grounding:**
  - `clientnext/src/pages/index.tsx` and `clientnext/src/lib/api.tsx:356-365` (`bootstrap()`) ignore browser URL query/hash state and always start at `/` running `exec init`.
  - `clientnext/next.config.js:5` uses `output: 'export'`, and `server/main.go:26` serves static files from `/out` via `http.FileServer`.
- **Proposed Capability:**
  - Support query/hash URLs such as `/?path=/projects` or `/?cmd=cat+/projects/mainframe.md` so resume links (LinkedIn, GitHub, PDF) open directly to specific portfolio sections.
  - Optionally sync `window.history.replaceState` when `cd` or `cat` executes so visitors can copy-paste a shareable URL from the address bar.
- **Technical Feasibility Assessment:**
  - **Layers:** Pure frontend change in `clientnext/src/lib/api.tsx` (`bootstrap()` and `receiveResponse()`). No changes needed to `command.proto`, Go server, or static `output: 'export'` routing.
  - **Dependencies:** P0.3 (reconcile `init`/`.init` startup behavior so bootstrap + deep-link commands execute in deterministic order).
  - **Risks & Mitigations:**
    - *Untrusted `?cmd=` execution risk:* A crafted link like `/?cmd=rm+-f+/...` could execute unintended commands if an admin opens it while logged in (`jwt` cookie present). **Mitigation:** Strictly allowlist URL-bootstrapped commands to read-only public commands (`ls`, `cd`, `cat`, `help`, `tree`, `find`, `grep`).
    - *Race condition, `React.StrictMode` double-boot & stale `state.prompt` closure:* `clientnext/src/pages/index.tsx:17` wraps `<App>` in `React.StrictMode` (causing `Terminal.tsx:10` to call `bootstrap()` twice before `state.bootstrapped` flips at `api.tsx:356-365`), and `sendCommand` reads `state.prompt` from closure (`api.tsx:47`). **Mitigation:** Guard `bootstrap()` with a `bootstrappedRef`, await `const afterInitDir = await sendCommand("exec init", false, resp)`, and thread/derive both the resolved `Folder` and prompt string directly into the follow-up URL command.
  - **Effort:** **S**
- **Prioritization Rationale:** **Score 4.15.** Tiny implementation footprint with outsized portfolio ROI — turns every file in the mainframe into a shareable web URL.
- **Open Design Questions & Trade-offs:**
  - *Query params (`?path=...&cmd=...`) vs. hash fragments (`#/projects/foo.md`)?* Query params are cleaner for sharing; hash fragments never trigger server requests and work even if static hosting doesn't rewrite subpaths.
  - *Run `init` banner before the deep-linked command, or skip `init` when `?cmd=` is present?* Keeping the welcome banner preserves brand identity, while `?quiet=1` could suppress it for embedded links.

### F4: Operational Health Probes, Request Telemetry & `stats` Command
- **Codebase Grounding:**
  - `server/main.go:25-27` mounts only `/` and `/grpc/`; `docker-compose.yml:3-20` has no `healthcheck:` directives.
  - `BUILD.bazel:36-45` packages `/bentekkie-mainframe` on `gcr.io/distroless/base` (`MODULE.bazel:82-90`), which ships no `sh`, `curl`, or `wget`.
  - `go.mod:52-57` already includes `go.opentelemetry.io/otel` indirectly, and `main.go:11` uses `logrus`, yet no request logging, metrics, or health endpoints exist.
- **Proposed Capability:**
  - HTTP `/healthz` (liveness) and `/readyz` (verifies PostgreSQL connectivity via `PingContext` + valid `Root` inode) endpoints + `docker-compose.yml` healthchecks.
  - Connect-RPC server interceptor (`connect.WithInterceptors(...)`) logging command name, duration, and status (strictly redacting args for `login`/`adduser`).
  - Privacy-safe aggregate `command_stats` counter table (no IP/PII, just command + target path counts + daily buckets) surfaced via a new `SudoCommandType_stats` command.
- **Technical Feasibility Assessment:**
  - **Layers:** `main.go` + `server/main.go`, `server/db/db.go` (`Ping` + optional `command_stats` migration), `proto/command/v1/command.proto` (`stats` in `SudoCommandType`), `server/mainframe/shell_service.go`, `BUILD.bazel`, `docker-compose.yml`.
  - **Dependencies:** P0.2 (schema migrations + `db.Connect` error handling).
  - **Risks & Mitigations:**
    - *Distroless healthcheck execution:* Because `distroless/base` (`BUILD.bazel:36-45`, `MODULE.bazel:82-90`) lacks `sh`, `curl`, and `wget`, `docker-compose.yml` container healthchecks cannot run shell/curl probes directly. **Mitigation:** Add a Go binary `-healthcheck` flag/subcommand (e.g., `["/bentekkie-mainframe", "-healthcheck"]` hitting `http://localhost:$PORT/healthz`) or bundle a static probe binary in `BUILD.bazel`.
    - *DB write overhead:* Writing a DB row on every public command adds write latency. **Mitigation:** Buffer increments asynchronously in-memory and flush periodically (or batch via goroutine), and never block command responses on telemetry writes.
  - **Effort:** **S–M** (`S` for probes + interceptor logging; `M` including `stats` DB counters).
- **Prioritization Rationale:** **Score 4.05.** Essential for reliable container orchestration and gives the site owner visibility into which resume files visitors actually read.
- **Open Design Questions & Trade-offs:**
  - *In-DB `stats` command vs. `/metrics` Prometheus scrape endpoint?* `stats` fits the self-contained Compose setup (`docker-compose.yml`) without needing a Prometheus stack; `/metrics` can be exposed trivially if needed.

### F3: Clickable Terminal Output, Command Chips & Mobile Quick-Action Bar
- **Codebase Grounding:**
  - `ls` renders a plain Markdown table `|Name|Type|` (`shell_service.go:424-433`).
  - `ReactMarkdown` (`react-markdown ^10.1.0`, `clientnext/package.json:26`) already customizes `<a>` rendering in `clientnext/src/lib/api.tsx:238-248`; `ResponseType.json` currently unconditionally triggers a `dump.json` download (`api.tsx:249-256`).
  - `CommandBar.tsx:26-41` relies on physical keyboard `Tab`, `↑`, `↓`; `CommandBar.css:10,20` hardcodes `font-size: 25px`, and `Window.css:9` hardcodes `max-width: 598px` (`Window_contentInner`).
- **Proposed Capability:**
  - Make `ls` / `tree` entries clickable (clicking a folder runs `cd <folder> && ls`; clicking a file runs `cat <file>`).
  - Add a compact, unobtrusive **Quick-Action / Mobile Key Bar** above/below `CommandBar` with common suggestions (`ls`, `tree`, `cat resume.md`, `help`, `clear`) and mobile virtual keys (`Tab`, `↑`, `↓`, `cd ..`).
  - Make terminal typography and container width responsive (`clamp()` font sizes and fluid `max-width` on desktop/mobile).
- **Technical Feasibility Assessment:**
  - **Layers:** `clientnext/src/lib/api.tsx` (link click / cell interceptor), `CommandBar.tsx` + `CommandBar.css` + `Window.css` (responsive layout & quick-action strip), and optionally `command.proto` / `shell_service.go` (dedicated listing `ResponseType` or `cmd:` Markdown links).
  - **Dependencies:** None (additive UI; pairs naturally with F1 `tree`).
  - **Risks & Mitigations:**
    - *E2E DOM selectors:* `command_test.go:47-78` asserts exact DOM structure, specifically `.Window_contentInner > div:last-child > table` (`command_test.go:60`) and `CommandBar_submitText` (`:74,77`). **Mitigation:** Keep `<table>` as a direct child of the output `<div>` (no extra wrapper around `<table>`) and preserve `<table><tr><td>` and `CommandBar_submitText` semantics.
    - *Markdown scheme & JSON collision:* `react-markdown ^10.1.0` (`package.json:26`) strips custom `cmd:` schemes via its default `urlTransform`, and `api.tsx:240-244` sets `target="_blank"` on non-matching origins (`new URL(...)`) unless `cmd:` is allowed in `urlTransform` and intercepted before `new URL(...)`; meanwhile `ResponseType.json` unconditionally downloads `dump.json` (`api.tsx:249-256`), so structured listings require a new `ResponseType` enum (not overloading `ResponseType.json`).
  - **Effort:** **M**
- **Prioritization Rationale:** **Score 4.00.** Solves the two biggest UX barriers for a terminal portfolio: non-technical recruiters not knowing what to type, and mobile visitors lacking `Tab`/arrow keys.
- **Open Design Questions & Trade-offs:**
  - *Encode `cmd:` links in Markdown from Go (with custom `urlTransform` + `<a>` interceptor) vs. keeping Go output pure Markdown and enhancing `<td>` / adding a dedicated `ResponseType_listing`?* Client-side enhancement or a dedicated `ResponseType` keeps `cat`/`ls` output clean if copied or piped later (F11) and avoids colliding with `ResponseType.json`.
  - *Always visible command chips vs. collapsible/first-visit helper bar?* Keeping it compact (1 line) avoids cluttering the retro aesthetic.

---

## 5. Phase 2 — Shell Parity, Self-Contained Portfolio & Accessibility (Next)

### F5: Path-Aware Smart Autocomplete & Candidate Preview Bar
- **Codebase Grounding:**
  - `shell_service.go:630-754` ignores `cmd.Args` and only queries direct children of `cmd.CurrentDir.Path`.
  - `sudoAutoComplete` handles only `edit`, `mkdir`, `touch`, `logout` (`shell_service.go:702-761`), omitting `rm`, `seed`, `dump`, `adduser`, while `touch` falls through from `mkdir` and suggests folders; `autoComplete` omits `exec` and `login`.
  - `clientnext/src/lib/api.tsx:294` checks `split[1] !== undefined`, so pressing Tab after `"ls "` (trailing space) fails to request argument completions from the server.
- **Proposed Capability:**
  - Parse the trailing argument (including trailing-space empty arg and nested paths like `cat projects/go<Tab>`), resolve the target parent directory via `path.Split`, and return matching prefix completions.
  - Add completions for `rm` (files & folders), `exec` (executable/script files), `help` (including sudo commands when logged in).
  - Display a compact candidate list above `CommandBar` when multiple completions match (instead of silent cycling).
- **Technical Feasibility Assessment:**
  - **Layers:** `server/mainframe/shell_service.go`, `clientnext/src/lib/api.tsx`, `clientnext/src/lib/CommandBar.tsx` + `AppContext.tsx`. No proto schema change needed (`AutoCompResponse` already returns `repeated string completions`).
  - **Dependencies:** P0.2 (safe path lookup).
  - **Risks & Mitigations:** Rapid `Tab` presses triggering duplicate RPCs. **Mitigation:** Preserve existing `rawAutoComp` caching in `AppContext.tsx:41-64` keyed by `(currentDir, commandPrefix)`.
  - **Effort:** **S–M**
- **Prioritization Rationale:** **Score 3.90.** High perceived quality improvement — makes the shell feel responsive and authentic rather than brittle on nested paths or trailing spaces.
- **Open Design Questions & Trade-offs:**
  - *Longest-common-prefix (Bash style) vs. cycle-through-candidates (current Zsh-like style)?* Filling longest common prefix on first Tab and showing the candidate strip makes multi-match discovery much clearer.

### F6: Full VFS Shell Operations (`pwd`, `mv`, `cp`, `stat`) & File Metadata
- **Codebase Grounding:**
  - Currently only `ls`, `cat`, `cd`, `touch`, `mkdir`, `rm`, `edit` exist (`command.proto:23-44`).
  - `receiveResponse` truncates deep paths to `/../<basename>` (`api.tsx:271-275`), leaving users with no way to print the full current directory (`pwd`).
  - `inodes` (`id`, `parentinode`, `path`) and `files` (`inode`, `contents`) (`server/db/db.go:40-48`) store zero timestamps, sizes, or MIME metadata.
- **Proposed Capability:**
  - Public: `pwd` (prints full `CurrentDir.Path`) and `stat <path>` (prints type, full path, byte size, `created_at`, `updated_at`).
  - Sudo: `mv <src> <dst>` (move/rename files and folders) and `cp <src> <dst>` (copy files or recursive folder trees).
- **Technical Feasibility Assessment:**
  - **Layers:** `proto/command/v1/command.proto` -> Bazel codegen -> `server/db/db.go` (migration adding `created_at`, `updated_at`, `size_bytes` / `mime_type` + transactional `MoveINode`/`CopyINode`) -> `shell_service.go` -> `api.tsx`.
  - **Dependencies:** P0.2 (SQL migrations).
  - **Risks & Mitigations:**
    - *`sqlx` struct/query lockstep:* `server/db/db.go:159,168,219,243,254` use `SELECT *,isfile(id)` and `SELECT inodes.*,files.contents` mapped via `sqlx` into `INode`/`File` (`db.go:25-36`) without `Unsafe()`, so adding metadata columns to `inodes`/`files` breaks queries unless structs and explicit column lists are updated together.
    - *Subtree consistency on `mv`:* Moving a folder must atomically update `parentinode` and rewrite `inodes.path` for all descendants without colliding with an existing destination or moving a folder into its own descendant. **Mitigation:** Execute inside `BeginTxx` transaction with cycle check (`strings.HasPrefix(dst, src+"/")`) and `path` prefix replacement.
  - **Effort:** **M**
- **Prioritization Rationale:** **Score 3.75.** Eliminates painful `rm` + `touch` + `edit` workarounds during CMS maintenance and enriches `ls -l` / `stat` output.
- **Open Design Questions & Trade-offs:**
  - *Keep denormalized `inodes.path` column or derive paths dynamically from `parentinode` CTEs?* Keeping `inodes.path` with transactional subtree updates preserves fast O(1) `UNIQUE` path lookups; `parentinode`-only avoids path-rewrite drift on `mv`.

### F7: Self-Contained Resume Serving & Printable Portfolio View (`download_resume` v2 / `download`)
- **Codebase Grounding:**
  - `CommandType_download_resume` in `clientnext/src/lib/api.tsx:69-82` hardcodes an external personal Google Docs URL (`docs.google.com/document/d/.../export?format=pdf`), creating an external dependency and stale-build risk.
  - `server/main.go:25-27` has no file-download HTTP route, and `files.contents` (`db.go:47`) is `text` only.
- **Proposed Capability:**
  - Replace hardcoded Google Docs export with a self-contained mechanism: either serve a VFS-backed or configured static PDF via `GET /api/resume.pdf` (plus generic `download <path>` for VFS files), and/or add a `print_resume` command opening a clean `@media print` resume view compiled from VFS Markdown.
- **Technical Feasibility Assessment:**
  - **Layers:** `server/main.go` (HTTP handler or static asset), optionally `server/db/db.go` (`blob bytea` or `mime_type`), `proto/command/v1/command.proto` (optional `download` command), `clientnext/src/lib/api.tsx` + print CSS.
  - **Dependencies:** P0.3 (remove hardcoded URLs).
  - **Risks & Mitigations:** Server-side Markdown-to-PDF generation would bloat the minimal `distroless/base` OCI image (`BUILD.bazel:36-45`) with headless Chrome or LaTeX. **Mitigation:** Avoid server-side PDF rendering; store pre-built PDF bytes in DB/config or use browser-native `@media print` CSS.
  - **Effort:** **S–M**
- **Prioritization Rationale:** **Score 3.75.** Removes an external Google Docs single point of failure while keeping the distroless image small.
- **Open Design Questions & Trade-offs:**
  - *Uploaded PDF blob in PostgreSQL (`upload` sudo command) vs. `RESUME_FILE_PATH` / static asset in `/out` vs. live Markdown + `@media print`?* Storing PDF bytes in VFS (or `assets` table) lets the owner update the resume via the live CMS without redeploying the container.

### F8: Terminal Themes, CRT Effects & Accessibility (`theme`, `font`)
- **Codebase Grounding:**
  - Colors and fonts are hardcoded across `Terminal.css:1-13` (`#008106`, `#00B7FF`, `"Lucida Console"`), `Terminal.tsx:12` (`"red"`/`"green"` inline style), `CommandBar.tsx:16`, and `Window.css:30,34`.
  - `Window.tsx` has no ARIA live region, and `EditModal.tsx:8` / `LoginModal.tsx:5` bind `ReactModal` to `#root` at module load time.
- **Proposed Capability:**
  - Refactor colors/fonts to CSS custom properties (`--fg`, `--bg`, `--accent`, `--admin-fg`, `--font-size`).
  - Add client-side `theme [green|amber|cyber|high-contrast|light]` and `crt [on|off]` commands persisted in `localStorage`, plus WCAG AA high-contrast mode and `prefers-reduced-motion` support.
- **Technical Feasibility Assessment:**
  - **Layers:** Pure frontend (`clientnext/src/styles/*.css`, `Terminal.tsx`, `CommandBar.tsx`, `api.tsx`, `proto/command/v1/command.proto` if `theme` is documented in `help`).
  - **Dependencies:** None.
  - **Risks & Mitigations:** Inline `style={{ color: ... }}` in `Terminal.tsx:12` and `CommandBar.tsx:16` overrides CSS classes, and `.App_container` (`clientnext/src/styles/Terminal.css:20-30`) is `position: fixed; bottom: 0` without `top: 0` while `html` (`Terminal.css:1-8`) and `body` (`clientnext/src/styles/globals.css:1-5`) control the full-viewport background. **Mitigation:** Put `data-theme="..."` CSS custom properties on `html`/`body` (e.g., `document.documentElement`), not only `.App_container`, and replace inline colors with `data-logged-in="true|false"` selectors.
  - **Effort:** **S**
- **Prioritization Rationale:** **Score 3.55.** Low effort, improves readability for visitors with color-vision deficiency (`#008106` on `#000` has ~4.2:1 contrast, borderline for small text), and enhances retro character.
- **Open Design Questions & Trade-offs:**
  - *Keep `theme` strictly client-side (`localStorage`) vs. allowing `.init` to set a site-wide default theme?* Allowing `exec` to invoke `theme` gives the owner default styling control while letting visitors override locally.

---

## 6. Phase 3 — Interactive Engagement, CMS Safety & Composable Shell (Later)

### F9: Visitor Contact & Guestbook Workflow (`contact` + Sudo `messages`)
- **Codebase Grounding:**
  - `server/db/db.go:38-55` has only `inodes`, `files`, `users` — there is no inbound visitor communication mechanism inside the terminal.
  - Modal form pattern already exists (`LoginModal.tsx:7-43`).
- **Proposed Capability:**
  - `contact` command (interactive modal or `contact "<email>" "<message>"`) allowing recruiters/visitors to send a message stored in PostgreSQL (`messages` table), optionally triggering a webhook alert (Discord/Slack/ntfy).
  - Admin `SudoCommandType_messages` command (`list`, `read <id>`, `delete <id>`) to review inbox messages inside the mainframe.
- **Technical Feasibility Assessment:**
  - **Layers:** `proto/command/v1/command.proto`, `server/db/db.go` (migration for `messages` table), `server/mainframe/shell_service.go`, `clientnext/src/lib/` (`ContactModal.tsx` or interactive prompt + `api.tsx`).
  - **Dependencies:** P0.1 (rate limiting), P0.2 (migrations).
  - **Risks & Mitigations:** Public write endpoint invites spam/flooding. **Mitigation:** Per-IP token-bucket rate limit, strict payload length limits (e.g., 2 KB), honeypot field, and optional webhook secret.
  - **Effort:** **M**
- **Prioritization Rationale:** **Score 3.25.** Valuable portfolio conversion tool, deferred to Phase 3 so it inherits rate limiting and DB migrations from Phase 0.
- **Open Design Questions & Trade-offs:**
  - *Modal form (`ContactModal`) vs. pure CLI flags vs. public `guestbook` board?* A modal avoids awkward shell escaping for multi-line messages; a moderated `guestbook` is fun but adds moderation overhead.

### F10: VFS Revision History, Diff & Rollback (`history`, `rollback`)
- **Codebase Grounding:**
  - `UpdateFileByPath` (`server/db/db.go:232-236`) overwrites `files.contents` in place; `DeleteINode` (`db.go:225-229`) cascade-deletes `files` permanently.
  - `customClaims` (`server/auth/auth.go:12`) already embeds `Username` in JWTs, though `ParseJWT` (`auth.go:47-68`) currently discards it.
- **Proposed Capability:**
  - Snapshot previous `contents` into a `file_revisions(id, inode_id, path, contents, edited_by, created_at)` table transactionally on every `edit` and `rm`.
  - Add sudo commands `history <path>` and `rollback <path> <revision_id>` (plus `EditModal.tsx` unsaved-draft autosave in `localStorage` and optimistic concurrency check).
- **Technical Feasibility Assessment:**
  - **Layers:** `proto/command/v1/command.proto`, `server/auth/auth.go` (return `Username`), `server/db/db.go` (migration + transactional snapshot), `server/mainframe/shell_service.go`, `clientnext/src/lib/EditModal.tsx`.
  - **Dependencies:** P0.1 (`ParseJWT` returning `Username`), P0.2 (migrations & `rm` safety).
  - **Risks & Mitigations:**
    - *Recursive folder cascade & missing parents on restore:* `DeleteINode` relies on `ON DELETE CASCADE` (`db.go:42,46,225-229`), so `rm -f` on a folder deletes descendant files permanently unless `F10` recursively snapshots every file in the subtree before deletion, and `rollback` must recreate any missing parent directories along `path`.
    - *Table growth:* Unbounded growth of `file_revisions` if edits happen frequently. **Mitigation:** Retain the latest *N* (e.g., 25) revisions per file path or prune by age.
  - **Effort:** **M**
- **Prioritization Rationale:** **Score 3.15.** Protects live portfolio content from accidental edits or deletions, especially once multi-user editing (F12) is introduced.
- **Open Design Questions & Trade-offs:**
  - *Store snapshots keyed by `path` vs. `inode_id`?* Keying by `path` (and storing `inode_id` nullable `ON DELETE SET NULL`) ensures deleted files can still be restored after `rm`!

### F11: Command Registry Refactor, Pipelines (`|`) & Output Paging (`head`, `tail`, `wc`)
- **Codebase Grounding:**
  - `shell_service.go:56-358` and `:395-601` implement dispatch via large monolithic `switch` statements directly returning formatted `Response` / `SudoResponse` structs.
  - `clientnext/src/lib/api.tsx:25-33` (`parseCommand`) only splits whitespace/quoted tokens and has no pipe (`|`) or chaining (`&&`, `;`) awareness.
- **Proposed Capability:**
  - Refactor `shell_service.go` into a structured `CommandRegistry` (`map[CommandType]Handler`) returning composable stdout/metadata.
  - Add Unix utility commands `head`, `tail`, `wc` and pipe (`|`) chaining (e.g., `cat resume.md | grep Kubernetes | wc -l`) plus client-side output truncation / `"Show more"` pagination for long outputs.
- **Technical Feasibility Assessment:**
  - **Layers:** `proto/command/v1/command.proto` (either `head`/`tail`/`wc` enums + `repeated Command pipeline` or `stdin` field), `server/mainframe/shell_service.go`, `clientnext/src/lib/api.tsx`.
  - **Dependencies:** P0.4 (DI refactor of `ShellServer`).
  - **Risks & Mitigations:** Over-engineering a full POSIX shell parser when the app is a portfolio site. **Mitigation:** Support simple single-line `cmd1 | cmd2` chaining without subshells or arbitrary shell expansion.
  - **Effort:** **M–L**
- **Prioritization Rationale:** **Score 3.15.** Great developer/hacker delight and dramatically cleans up `shell_service.go` (`762` lines), but visitors get higher immediate value from F1–F3 first.
- **Open Design Questions & Trade-offs:**
  - *Client-side pipe orchestration (chain `resp.resp` into next RPC) vs. single server-side pipeline RPC?* Server-side avoids extra network roundtrips; client-side works naturally across mixed client/server commands like `cat notes.md | clear` or future client formatters.

### F12: Multi-User RBAC & Content Scoping (`whoami`, `passwd`, `usermod`)
- **Codebase Grounding:**
  - `users` table (`server/db/db.go:49-52`) has only `(username, password)`.
  - Every authenticated user receives full root sudo access (`shell_service.go:35-55`) — `adduser` grants new users immediate `seed` and `rm -f` privileges.
- **Proposed Capability:**
  - Add `role` (`admin` | `editor`) to `users` and embed `role` in JWT claims (`server/auth/auth.go`).
  - Restrict destructive/privileged sudo commands (`seed`, `dump`, `adduser`, `rm -f`, `usermod`) to `admin`, while allowing `editor` users to `edit`/`touch`/`mkdir` scoped subtrees (e.g., `/blog` or `/guest`).
  - Add `whoami` and `passwd` (self-service password rotation).
- **Technical Feasibility Assessment:**
  - **Layers:** `server/db/db.go` (migration), `server/auth/auth.go`, `proto/command/v1/command.proto`, `server/mainframe/shell_service.go`, `clientnext/src/lib/api.tsx` (filtering `useCommandNames` by role).
  - **Dependencies:** P0.1 (password hashing + `ParseJWT` returning user identity).
  - **Risks & Mitigations:** Client-side command filtering (`api.tsx:13`) is UX-only; authorization *must* be enforced on the Go server in `runSudoCommand` and `sudoAutoComplete`.
  - **Effort:** **M**
- **Prioritization Rationale:** **Score 3.05.** Needed only if multiple contributors or demo accounts are desired; single-owner sites can defer safely behind Phase 1–2.
- **Open Design Questions & Trade-offs:**
  - *Move JWT from `SudoCommand.jwt` proto field (`command.proto:57`) to HTTP `Authorization: Bearer` header in Connect-RPC interceptor?* Moving to headers decouples auth from every proto message and simplifies middleware enforcement.

---

## 7. Wildcard Brainstorming Ideas

These exploratory concepts go beyond incremental roadmap items and carry deliberate trade-offs worth debating:

| Idea | Concept & Grounding | Key Trade-offs & Open Questions |
|---|---|---|
| **W1: Ephemeral Visitor Sandbox Overlay** | Layer a client-side in-memory VFS overlay (`useReducer` / `IndexedDB` in `AppContext.tsx`) over read-only server responses so visitors can run `touch`, `mkdir`, `rm`, `edit`, and `mv` locally in their browser session without logging in or mutating PostgreSQL. | **Pros:** Zero DB risk, instant interactive "try the CMS" demo for recruiters.<br>**Cons:** Client must re-implement FS semantics for mutated paths; could confuse visitors about what is persisted vs. ephemeral without a clear `[sandbox]` prompt badge. |
| **W2: Guided Portfolio Tours (`tour [recruiter\|engineer]`)** | Build on `exec` (`api.tsx:92-121`) + structured `ResponseType` cards to launch an interactive 3-step guided walkthrough (Overview → Featured Projects → Architecture & Contact) with `[Next >]` clickable buttons. | **Pros:** Bridges the gap between a blank prompt and a traditional portfolio page.<br>**Cons:** Requires designing a new structured card `ResponseType` in `command.proto` and maintaining tour script content in VFS. |
| **W3: Local or RAG Portfolio Q&A (`ask "<question>"`)** | Answer natural-language recruiter questions (*"What Go or Kubernetes projects has Ben built?"*) grounded strictly in VFS `files.contents`, citing exact `cat <path>` commands. | **Pros:** High novelty and fast recruiter synthesis.<br>**Cons:** External LLM APIs introduce cost, latency, and API key management; a lightweight local BM25/pgvector search + snippet synthesizer avoids external API dependencies entirely. |
| **W4: Split-Pane Terminal & Command Palette (`Ctrl+K`)** | Refactor `AppContext` into per-pane state instances inside `Terminal.tsx` to support side-by-side panes (e.g., `tree` on left, `cat` on right) plus a `Ctrl+K` fuzzy command/file launcher. | **Pros:** Power-user ergonomics and better wide-screen utilization (fixing `Window.css:9` `598px` constraint).<br>**Cons:** Significant CSS/state complexity on mobile viewports. |
| **W5: GitOps Content Sync (`content/` ↔ VFS)** | Commit a canonical `content/` directory of Markdown files + `.init` in Git and add a CI/CLI sync mode (`-seed` enhancement using deterministic `DumpDB` ordering — `FindDirListings` at `server/db/db.go:239-245` currently lacks `ORDER BY`, making `DumpDB` at `seed.go:51-92` non-deterministic) so portfolio content has full Git history alongside live `edit` overrides. | **Pros:** Eliminates the current absence of seed content in the repo (`db.schema.json` only) and prevents accidental data loss.<br>**Cons:** Needs a clear conflict rule when live DB edits diverge from Git `content/`. |
