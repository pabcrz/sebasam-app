# Payment Correction Specification

## Purpose

Replace an erroneous payment through one auditable, atomic correction operation.

## Requirements

### Requirement: Authorized Auditable Payment Replacement

The system MUST restrict payment correction to administrators. One correction operation MUST change the payment amount and method, require a reason and actor, retain the original financial history, and timestamp the replacement with the current time. It MUST NOT permit arbitrary paid-work commercial edits.

#### Scenario: Administrator corrects a payment

- GIVEN an administrator and an active captured payment
- WHEN the administrator supplies replacement amount, method, and reason
- THEN the system records one correction with the actor and current timestamp
- AND the original payment remains auditable

#### Scenario: Unauthorized correction is rejected

- GIVEN a user without administrator payment authorization
- WHEN the user attempts a payment correction
- THEN the system rejects the request without financial changes

### Requirement: Atomic and Idempotent Financial Correction

The system MUST atomically reverse the original capture and applications, create the replacement and its applications and ledger entries, and persist durable correction linkage. A replay using the same correction identity MUST return the original result without duplicating any financial row. Any failure MUST roll back the entire correction.

#### Scenario: Correction applies as one financial operation

- GIVEN an active payment with applications and ledger entries
- WHEN a valid correction is submitted
- THEN reversal, replacement, applications, ledger entries, and linkage all persist together
- AND the replacement is the only active payment for the corrected amount and method

#### Scenario: Concurrent idempotent replay

- GIVEN two concurrent submissions with the same correction identity
- WHEN both requests complete
- THEN both return the same correction result
- AND exactly one reversal, replacement, application set, ledger set, and linkage exists

#### Scenario: Correction failure rolls back

- GIVEN a correction whose replacement cannot be fully recorded
- WHEN the operation fails
- THEN no reversal, replacement, application, ledger entry, or linkage is persisted

### Requirement: Effective Financial Read Models

The system MUST calculate balances, totals, and payment-related note views from the active replacement and MUST exclude reversed payments.

#### Scenario: Read corrected balance

- GIVEN a corrected payment with its original capture reversed
- WHEN a balance, total, or note view is requested
- THEN it reflects the replacement only and retains correction audit visibility

## Out of Scope

Historical date/reference edits and closed-period payroll policy MUST NOT be changed by this capability.
