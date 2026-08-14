# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Business Store (bubble memories) — a Java/Spring Boot modular monolith for an art-print and photobook shop: canvas prints with variants/frames, custom print/framing requests, and a heavily custom-built photobook product (design-before-you-buy editor, per-page pricing, post-purchase photo submission and studio approval workflow). React/Vite frontend serves both the public storefront and a lazy-loaded admin/operations area from the same app.

## Commands

### Backend (Java 21, Maven, run from repo root)

```bash
cp .env.example .env                        # first time only
docker compose up -d postgres redis mailpit # Postgres 17, Redis 7.4, Mailpit (SMTP :1025, UI :8025)
sh mvnw spring-boot:run                     # API on :8080; runs Flyway + dev seed data automatically
```

`mvnw` has no execute bit in this repo — always invoke it via `sh mvnw ...`, not `./mvnw ...`.

```bash
sh mvnw -DskipTests compile        # fast compile check
sh mvnw test                       # full suite (unit + Testcontainers integration tests; needs Docker running)
sh mvnw test -Dtest=ClassName                     # one test class
sh mvnw test -Dtest=ClassName#methodName          # one test method
```

Dev-profile defaults: seeds idempotent sample data (3 categories, frames, 4 published products, a photobook product) and an admin account `admin@tranh.local` / `Admin@123456` (override via `APP_SEED_ADMIN_EMAIL`/`APP_SEED_ADMIN_PASSWORD`, disable via `APP_SEED_ENABLED=false`). Never runs in `prod`.

If Testcontainers-backed tests get skipped because Docker isn't running, say so explicitly — don't report `sh mvnw test` passing as equivalent to a verified PostgreSQL/Flyway migration run.

### Frontend (`frontend/`, Node 22, run from `frontend/`)

```bash
npm install
npm run dev          # Vite dev server on :5173, proxies nothing — talks to :8080 directly
npm run build         # tsc -b && vite build — treat TS errors as build failures
npm run test          # vitest run (jsdom env)
npm run test:watch    # vitest watch
```

Run a single frontend test file with `npx vitest run path/to/File.test.tsx`.

CI (`.github/workflows/ci.yml`) runs, in order: `sh mvnw -B test`, `npm ci`, `npm run test`, `npm run build`. Match that before calling something done.

## Architecture

### Backend: strict package-by-layer

```
controller -> service (interface) -> service/impl -> repository -> entity -> PostgreSQL
```

- `controller`: HTTP only — binds request DTOs, calls one service method, returns response DTOs. Never returns a JPA entity.
- `service` / `service/impl`: business rules and `@Transactional` boundaries live here, not in controllers or repositories.
- `entity`: JPA models. `BaseEntity` gives every entity a `UUID id` (`GenerationType.UUID`) plus auditing `createdAt`/`updatedAt`.
- `repository`: Spring Data JPA; ownership/ownership-scoped queries are expressed as derived methods (e.g. `findByIdAndUserId`) rather than checked after a plain `findById`.
- `exception`: `ErrorCode` enum + `AppException(errorCode, message)`, mapped centrally by a global exception handler — add a new `ErrorCode` constant rather than throwing raw exceptions.
- `security`: JWT access token (`Authorization: Bearer`) + refresh token in an `HttpOnly` cookie, whitelisted/rotated in Redis. Endpoint auth is declared in `security/SecurityConfiguration.java` (explicit `permitAll()` list, everything else `anyRequest().authenticated()`) plus method-level `@PreAuthorize` using named constants from `constant/SecurityExpressions.java` — permission-based (`CATEGORY_MANAGE`, `ORDER_MANAGE`, `PROMOTION_MANAGE`, ...), never a hard-coded role check per feature.
- **Jackson is `tools.jackson.*` (Jackson 3), not `com.fasterxml.jackson.*`.** This applies uniformly across the codebase — importing the `com.fasterxml` package will not compile against the JSON types actually in use here (`ObjectMapper`, `JsonNode`, `JacksonException` all come from `tools.jackson.*`).

### Schema: Flyway owns it, Hibernate never does

Hibernate runs with `ddl-auto: validate` — it verifies the schema matches the entities but never mutates it. All schema changes are new `src/main/resources/db/migration/V<next>__description.sql` files; **never edit a migration that has already been applied**. Several tables intentionally store structured data as raw JSON text/`jsonb` (e.g. `photobook_layouts.slots`, `photobook_designs.spreads_json`) rather than being normalized, specifically because nothing needs to query into those fields — this is a deliberate, repeated pattern, not an oversight.

### Order/checkout invariants (read before touching cart, order, promotion, payment, or shipment code)

- **Backend recomputes everything at checkout** — price, discount, shipping fee, stock. Client-submitted totals from the cart are never trusted as final; `OrderServiceImpl.checkout()` re-derives price per line the same way `CartServiceImpl` does, and both must stay in sync (e.g. photobook pricing goes through the shared `PhotobookPricing.priceAt()` helper from both places).
- **Orders are immutable historical snapshots.** `OrderItem` copies product name/slug/SKU/material/dimensions/price/frame at checkout time so later catalog edits never change a past order.
- Stock is pessimistically locked (`findByIdForUpdate`-style queries) and decremented inside the same checkout transaction that creates the order; cancellation restores the exact locked row.
- Promotion/coupon quota is a three-state reservation (`RESERVED` at checkout with a TTL → `CONSUMED` on staff confirmation → `RELEASED`/`EXPIRED` on cancel/timeout), enforced with Postgres conditional updates/constraints — Redis is not the correctness mechanism here, only IAM token state lives in Redis.
- Notifications/emails run as `@TransactionalEventListener(phase = AFTER_COMMIT)`, insert with an idempotent `ON CONFLICT(event_key) DO NOTHING`, and only send email after that insert succeeds. SMTP failure is logged, never rolls back the business transaction. Follow this pattern (see `NotificationEventListener`) for any new business event that needs to notify a user.
- Real-time **admin** "new order" alerts are a separate mechanism from user notifications: `OrderServiceImpl` publishes an `OrderPlacedEvent`, `NotificationEventListener` (still `AFTER_COMMIT`) both creates the customer's in-app notification *and* calls `AdminOrderNotificationPublisher`, which pushes to Redis pub/sub; every app instance's `RedisAdminOrderNotificationSubscriber` fans that out to its own local SSE clients (`AdminOrderNotificationStreamService`) — this is why it needs Redis pub/sub rather than just an in-process event, and why it stays out of the same insert as user notifications.

### Photobook subsystem — four related but distinct concepts, don't conflate them

This is the most elaborate feature in the app and easy to get lost in without knowing the shape up front:

1. **`PhotobookDraft`** (`photobook_drafts` table, one row per user+product slug, overwritten on every autosave) — the customer's in-progress pre-purchase editor state (layout per spread, image references, crop, captions, background color). Frontend keeps the actual image *files* client-side only (IndexedDB via `frontend/src/data/photobookDraft.ts`); the server side of the draft is metadata-only JSON, used purely so the editor can resume across devices/sessions. Never referenced by an order.
2. **`PhotobookDesign`** (`photobook_designs` + `photobook_design_images`) — an immutable, fully-uploaded snapshot of a finished design, created via `POST /api/v1/photobook-designs` right before "add to cart". This is what a `CartItem`/`OrderItem` actually links to (`photobook_design_id`), so what gets manufactured is provably what the customer saw at add-to-cart time, independent of anything they edit in their draft afterward.
3. **`PhotobookProject`** (+ `PhotobookSpread`/`PhotobookSpreadSlot`) — the real production record, one per photobook `OrderItem`, created by `PhotobookProjectServiceImpl.openProjectsFor()` at checkout. If the order item carries a matching `PhotobookDesign`, the project is hydrated directly into spreads/slots/photos and starts at `PHOTOS_SUBMITTED`; otherwise it starts at `AWAITING_PHOTOS` and the customer must upload photos manually (`addPhoto`/`submit`), after which `PhotobookLayoutEngine` auto-generates spreads from a default template. Status machine: `AWAITING_PHOTOS → PHOTOS_SUBMITTED → PROOF_SENT → REVISION_REQUESTED (up to 2 free) → APPROVED`.
4. **`PhotobookSharePreview`** (+ images) — a short-lived (30-day), token-based, publicly-shareable read-only snapshot of a design (for sending a preview link to someone who isn't logged in). Structurally similar to `PhotobookDesign` (same `spreads` JSON shape, same per-image multipart upload pattern) but a different lifecycle — don't merge the two; `PhotobookSpreadsPayloadValidator` is the shared piece between them (metadata parsing, image-id cross-checking, size caps).

Layout archetypes (`TRAN_DOI`, `DOI_CAN`, `CONTACT_SHEET`, ...) are a shared vocabulary that must stay byte-identical between `frontend/src/data/spreadLayouts.ts` and the seeded `photobook_layouts` table consumed by `PhotobookLayoutEngine` — a layout code chosen client-side is used server-side with no translation step.

Photo/page-count rule (`3–4 photos per page`) is duplicated intentionally on both sides (`frontend/src/api/photobook.ts` `photoRangeFor()` and backend `PhotobookProjectServiceImpl`/`PhotobookDesignServiceImpl`) so the product page and the actual submission limit never drift — change both together.

### RBAC

`User → UserRole → Role → RolePermission → Permission`, standard roles `CUSTOMER`/`STAFF`/`ADMIN`. The JWT carries both `ROLE_*` authorities and resolved permissions; `@PreAuthorize` checks permissions (`SecurityExpressions` constants), not role names, so admin can grant/revoke individual permissions to `STAFF` without a code change.

### Frontend structure

- `frontend/src/App.tsx` is the single route table for **both** the public storefront and the admin area — admin (`/admin/*`) is one `lazy()`-loaded chunk (`pages/AdminArea`), and the photobook editor/project/arrangement/share-preview pages are each separately lazy-loaded too (`lazyPage()` helper) since they're the heaviest parts of the bundle and most visitors never touch them.
- `frontend/src/api/http.ts` is the shared fetch wrapper: holds the access token in memory/localStorage, attaches it, and transparently refreshes on 401 using the refresh cookie — always route new API calls through it (or a module built on it, like `api/cart.ts`) rather than calling `fetch` directly, or session refresh silently breaks.
- Route guards (`RequireAuth`, permission checks in the admin nav) only shape UX; the backend's `@PreAuthorize`/ownership checks are the actual authority. Don't treat a hidden button as access control when writing backend code, and don't skip the backend check because the frontend already hides the action.
- Cart items belong to an authenticated user server-side (no true guest backend cart); a client-only "guest cart" in `api/guestCart.ts` exists purely for pre-login browsing and is reconciled at login.

## Further reading in this repo

- `README.md` — full REST API surface, per-feature contracts, local run instructions, SEO prerender steps.
- `architecture.md` — short canonical statement of the layering rules above.
- `AI_PROJECT_MEMORY.md` — longer-form handoff document: product intent, full domain model, verification checklist, and what's explicitly *not* built yet (online payment provider, refund processing, durable notification retry/outbox). Treat its "what's done" section as a snapshot in time, not current truth — verify against source/migrations/tests before relying on it.
