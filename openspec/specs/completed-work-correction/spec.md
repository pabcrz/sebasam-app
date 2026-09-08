# Completed Work Correction Specification

## Purpose

Permit payment-aware commercial corrections to completed work without changing its operational record.

## Requirements

### Requirement: Payment-Aware Completed-Work Commercial Editing

The system MUST allow a user holding the existing operational edit authorization to update commercial data for a `COMPLETED` work order only when no active, unreversed payment exists at commit time. It MUST preserve work-order status, assignments, execution records, `completedAt`, and quote lifecycle state. A reversed payment MUST remain auditable but MUST NOT block editing or count as paid.

#### Scenario: Correct unpaid completed work

- GIVEN authorized completed work with no active payment
- WHEN the user submits a commercial edit
- THEN the commercial data is updated and the work remains `COMPLETED`
- AND its operational history and quote lifecycle state are unchanged

#### Scenario: Reversed payment permits an edit

- GIVEN completed work whose only captures are reversed
- WHEN an authorized user submits a commercial edit
- THEN the edit succeeds without treating those captures as paid

#### Scenario: Active payment rejects an edit

- GIVEN completed work with an active, unreversed payment
- WHEN a user submits any arbitrary commercial edit
- THEN the system rejects the edit and preserves existing data

#### Scenario: Capture races with an edit

- GIVEN completed work initially has no active payment
- WHEN payment capture and a commercial edit commit concurrently
- THEN at most one conflicting operation succeeds
- AND no committed result contains an edited commercial record with an active payment

### Requirement: Completed-Work Effective Views

The system MUST calculate completed-work totals and display quote and note data from current effective commercial and active-payment data. It MUST exclude reversed payments from paid totals.

#### Scenario: View corrected effective data

- GIVEN a completed work order with a reversed capture and replacement data
- WHEN its list or detail view is requested
- THEN totals exclude the reversed capture and show the current quote and notes

## Out of Scope

Historical date/reference edits and closed-period payroll policy MUST NOT be changed by this capability.
