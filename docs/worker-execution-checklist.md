# Worker Execution Checklist for Issue #281

This planning-only checklist defines the worker-only execution capability for [issue #281](https://github.com/pabcrz/sebasam-app/issues/281). It is **not approved for implementation**. The intended outcome is a mobile-first `/mis-trabajos` experience where assigned workers can record non-financial execution notes without receiving, creating, or changing commercial data.

## Quick Path

1. Resolve the lifecycle decisions in [Pre-implementation Decisions](#pre-implementation-decisions).
2. Deliver the online-only phases in order, keeping worker data reads and writes isolated from admin and quote payloads.
3. Verify every item in the [Acceptance Checklist](#acceptance-checklist) before considering a release.
4. Plan offline support as a separate, later initiative.

## Scope at a Glance

| Topic              | Planning decision                                                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Worker view        | New, worker-only, mobile-first `/mis-trabajos` route.                                                                             |
| Read model         | A dedicated server response; never reuse admin quote or work-order payloads because prices must be absent at the server boundary. |
| Planned work       | Snapshot the assigned plan at publish/assignment so it remains stable against later quote edits.                                  |
| Recorded work      | Append-only material or labor records with free-text descriptions.                                                                |
| Commercial process | Supervisor review creates a separate, authorized change order; worker execution never changes a quote automatically.              |
| Initial delivery   | Online-only. Estimated 10-14 engineering days for phases 1-4; 15-20 engineering days for the complete roadmap.                    |

## User Journey

1. An assigned worker opens `/mis-trabajos` on a phone.
2. The server returns only ordinary active work orders assigned to that worker.
3. The worker selects an active order and reviews the non-financial planned-work snapshot.
4. While the assignment remains valid and the order is `ASSIGNED` or `IN_PROGRESS`, the worker appends a `MATERIAL` or `LABOR` execution record with a free-text description.
5. A supervisor reviews the append-only record. If commercial action is needed, the supervisor creates a separate authorized change order.

## Security and Privacy Boundary

| Boundary              | Required rule                                                                                                                     | Explicitly prohibited                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Worker read API       | Filter on the session-derived worker identity and return only active assigned ordinary work orders.                               | Admin quote/work-order payload reuse, price fields, and unassigned or inactive orders.        |
| Planned-work response | Return the snapshot section/order, allowed type, description, quantity, and source trace only.                                    | Prices, tax, totals, discounts, billing data, or a live quote-derived plan.                   |
| Execution append API  | Derive creator and timestamp on the server; authorize against the active assignment and allowed order states.                     | Client-supplied `workerId`, financial fields, admin actions, and mutation/deletion endpoints. |
| Supervisor review     | Treat the execution record as operational evidence and create any commercial change through a separately authorized change order. | Automatic quote modification or billing derived directly from worker input.                   |
| Worker lifecycle      | Preserve historical attribution after execution exists.                                                                           | Hard deletion of a worker with execution history.                                             |

## Data Model Sketch

### `WorkOrderPlanSnapshot`

Created when the work order is published or assigned. It is the stable planned-work record associated with that work order.

### `WorkOrderPlanItem`

Created with the plan snapshot and stores:

- Snapshot section and display/order position.
- Allowed execution type.
- Description and planned quantity.
- Source trace to the originating quote/revision context.
- No prices or other financial fields.

### `WorkOrderExecutionItem`

Append-only record with:

- Work order reference.
- Optional plan snapshot item and optional section reference.
- Strict `MATERIAL` or `LABOR` enum.
- Free-text description only in V1.
- Session-derived creator and server-generated timestamp.
- Optional future idempotency key.
- No prices, tax, totals, discounts, billing data, actual structured quantity/unit, mutable updates, or deletes.

### Lifecycle Rules

- Create the plan snapshot at publish/assignment, not on worker read.
- Define a revision/republish policy before implementation so later quote edits cannot silently redefine an assigned plan.
- When a worker has execution history, deletion becomes deactivation-only or is blocked; actor history must remain intact.
- The execution-item transition is append-only. Corrections require a new record or a separate future correction policy, not an update to historical evidence.

## Pre-implementation Decisions

These inconsistencies must be resolved and documented before development begins:

- Define the `IN_PROGRESS` transition: starting work cannot remain a no-op if the state authorizes worker appends.
- Reconcile quote editability with the claimed frozen completion behavior. Specify exactly which revision is immutable, when it becomes immutable, and how republish affects assigned work orders.
- Consolidate the approval-to-work-order lifecycle into one canonical path. The current two inconsistent paths must not both drive snapshot creation or worker eligibility.
- Specify whether publish and assignment each create a snapshot, or whether one canonical lifecycle event does so. The policy must identify the source revision and supersession behavior.
- Define the ordinary-work-order predicate used by the worker-safe read model so non-ordinary work never appears in `/mis-trabajos`.

## Delivery Roadmap

### Phase 1: Decisions and Lifecycle

- Resolve and document the lifecycle inconsistencies above.
- Define snapshot creation, revision, republish, and supersession policy.
- Define assignment validity and the canonical state transition into `IN_PROGRESS`.
- Estimate: 2-3 engineering days.

### Phase 2: Worker-safe Read Model

- Implement the dedicated worker-only `/mis-trabajos` read model and route.
- Return only active assigned ordinary work orders and their non-financial plan snapshots.
- Prove server responses omit every commercial field, including nested or inherited quote data.
- Estimate: 3-4 engineering days.

### Phase 3: Append Flow and Admin Review

- Implement server-authorized append-only `WorkOrderExecutionItem` creation.
- Accept only `MATERIAL` or `LABOR` and a V1 free-text description.
- Add supervisor review surfaces without exposing worker actions that change administration or billing.
- Estimate: 3-4 engineering days.

### Phase 4: Audit and Commercial Isolation

- Enforce worker deactivation-only/blocking when execution history exists.
- Audit authorization, actor attribution, timestamps, append-only behavior, and commercial isolation.
- Route commercial follow-up through a separately authorized change-order flow.
- Estimate: 2-3 engineering days.

### Phase 5: Offline Hardening

- Scope offline capture, local persistence, replay, conflict handling, and idempotency as a separate change.
- Use the optional idempotency key only when the offline design defines its semantics and retention.
- Do not block the online-only release on this phase.
- Estimate: 5-6 engineering days.

**Estimate:** phases 1-4, online-only, require **10-14 engineering days**. The complete roadmap, including offline hardening, requires **15-20 engineering days**.

## Acceptance Checklist

### Product and Lifecycle

- [ ] `/mis-trabajos` is worker-only and mobile-first.
- [ ] The canonical approval-to-work-order lifecycle is documented and used consistently.
- [ ] Starting work produces a defined `IN_PROGRESS` transition rather than a no-op.
- [ ] Snapshot creation and revision/republish behavior are deterministic and preserve assigned-plan history.
- [ ] Quote changes after assignment cannot silently alter the worker's planned-work snapshot.

### Read Boundary

- [ ] A worker receives only active, assigned, ordinary work orders.
- [ ] The worker identity is derived from the authenticated session, not a request parameter.
- [ ] The worker response contains plan section/order, allowed type, description, quantity, and source trace as needed.
- [ ] The worker response contains no prices, tax, totals, discounts, billing fields, quote totals, or financial nested data.
- [ ] Admin quote/work-order serializers are not reused for worker reads.

### Append Boundary

- [ ] An execution item can be appended only while the assignment is valid and the work order is `ASSIGNED` or `IN_PROGRESS`.
- [ ] The server sets creator identity and timestamp.
- [ ] The accepted type is strictly `MATERIAL` or `LABOR`.
- [ ] V1 accepts free-text description only; it does not collect structured actual quantity or unit.
- [ ] Execution items have no financial fields and no update/delete API.
- [ ] A future idempotency key, if introduced, is optional and governed by an explicit replay policy.

### Review, Audit, and Safety

- [ ] Supervisor review is separate from the worker append action.
- [ ] Commercial changes require a separate authorized change order and never modify a quote automatically.
- [ ] Worker deactivation/deletion rules preserve attribution for historical execution items.
- [ ] Authorization tests cover unassigned workers, expired assignments, inactive orders, forbidden states, and non-ordinary orders.
- [ ] Privacy tests assert the absence of financial fields in all worker-facing server responses.

## Test Strategy

| Test layer           | Evidence required                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Lifecycle            | Snapshot creation and revision/republish tests prove the selected canonical lifecycle and frozen-plan behavior.                 |
| Authorization        | Server tests reject client worker identity, invalid assignments, inactive orders, unauthorized states, and non-ordinary orders. |
| Serialization        | Contract tests assert the exact worker response shape and the absence of financial data at every nesting level.                 |
| Append-only audit    | Tests verify server actor/timestamp creation and reject update/delete or financial payload fields.                              |
| Commercial isolation | Tests prove execution review cannot alter a quote and that change orders require separate supervisor authorization.             |
| Mobile UX            | End-to-end coverage verifies the small-screen journey for viewing assigned work and appending both allowed record types.        |

## Rollout and Rollback

| Stage                | Plan                                                                                                                            | Rollback                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Internal readiness   | Confirm lifecycle decisions, data migration safety, authorization tests, and serialization contracts before enabling the route. | Keep the route and append endpoint disabled.                                                |
| Controlled rollout   | Enable only for a small authorized worker cohort; monitor rejected authorization attempts and supervisor review outcomes.       | Disable worker access and append creation. Preserve existing append-only records for audit. |
| General availability | Expand after security/privacy checks and operational review pass.                                                               | Disable new worker writes or the route without deleting snapshots or execution history.     |

Rollback must never delete or mutate `WorkOrderExecutionItem` history. Any implementation rollout requires its own approved issue work and migration plan.

## Explicit Non-goals

- Reusing admin quote or work-order API payloads for workers.
- Showing any price, tax, total, discount, billing, or other commercial data to workers.
- Editing or deleting execution records.
- Sending `workerId` from the client as an authority input.
- Automatically changing quotes, invoices, or billing from worker execution records.
- Structured actual quantity/unit capture in V1.
- Offline support, background replay, or conflict resolution in the initial online-only release.
- Implementing this checklist without explicit approval after issue #281 planning review.

## Next Step

Review and approve the unresolved lifecycle decisions for [issue #281](https://github.com/pabcrz/sebasam-app/issues/281). Only then should a separately approved implementation issue or task begin phases 1-4.
