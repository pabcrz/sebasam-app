# customer-management-flow Specification

## Purpose

Defines requirements and operational contracts for customer management in SEBASAM, covering fast in-list actions, multi-selection bulk deletion, proactive deletion restrictions, inline mobile/desktop modal editing, and layout clearance.

## Requirements

### Requirement: In-List Quick Actions Menu

Each customer card in the customer list MUST provide an accessible quick actions trigger (`MoreHorizontal`). Activating this trigger MUST display available contextual actions: "Editar", "Ver cuenta", and "Eliminar".

#### Scenario: Open quick actions menu
- GIVEN an operator viewing the customer list
- WHEN the operator clicks or taps the actions menu trigger on a customer card
- THEN the actions menu opens displaying options for Edit, View Account, and Delete
- AND focus is managed accessibly within the menu dialog or sheet

#### Scenario: Trigger quick edit from menu
- GIVEN the actions menu is open for a customer
- WHEN the operator selects "Editar"
- THEN the quick actions menu closes
- AND the quick edit modal opens populated with the customer's current data

---

### Requirement: Proactive Deletion Restriction Feedback

The customer query MUST retrieve related counts for `quotes`, `payments`, `paymentRequests`, and `ledgerEntries` alongside customer records. If a customer has associated quotes or financial activity, the delete action MUST be disabled and MUST display an inline explanation.

#### Scenario: Customer without history is deletable
- GIVEN a customer with 0 quotes, 0 payments, 0 payment requests, and 0 ledger entries
- WHEN the operator opens the actions menu for this customer
- THEN the "Eliminar" action is enabled
- AND activating it triggers a confirmation dialog

#### Scenario: Customer with quotes displays restriction reason
- GIVEN a customer with 2 quotes
- WHEN the operator views the actions menu or card controls for this customer
- THEN the "Eliminar" action is disabled
- AND an inline note indicates "No se puede eliminar: tiene 2 cotizaciones asociadas"

#### Scenario: Customer with financial activity displays restriction reason
- GIVEN a customer with payments or ledger entries
- WHEN the operator views the actions menu or card controls for this customer
- THEN the "Eliminar" action is disabled
- AND an inline note indicates "No se puede eliminar: tiene actividad financiera asociada"

---

### Requirement: Multi-Select Mode and Batch Deletion

The customer list header MUST provide a "Seleccionar" toggle to enter multi-select mode. In this mode, each customer card MUST display a selection checkbox. Customers with deletion restrictions MUST have their checkbox disabled with explanatory text.

#### Scenario: Enter multi-select mode
- GIVEN the operator is on `/admin/customers`
- WHEN the operator clicks "Seleccionar" in the list header
- THEN selection mode activates
- AND each eligible customer card displays an interactive checkbox
- AND the header displays a selection counter, "Seleccionar todos", and "Cancelar"
- AND clicking a customer card toggles its selection instead of opening the account dialog

#### Scenario: Select and delete multiple eligible customers
- GIVEN selection mode is active with 3 eligible test customers selected
- WHEN the operator clicks "Eliminar seleccionados"
- THEN a confirmation modal appears displaying "Eliminar 3 clientes"
- AND when the operator confirms, the selected customers are deleted in a single database transaction
- AND the list revalidates, displaying a success feedback status

#### Scenario: Non-deletable customer in multi-select mode
- GIVEN a customer has associated quotes or payments
- WHEN selection mode is active
- THEN that customer's checkbox is disabled
- AND a badge or text indicates why the customer cannot be selected for deletion

#### Scenario: Cancel multi-select mode
- GIVEN selection mode is active with selected customers
- WHEN the operator clicks "Cancelar"
- THEN selection mode is exited
- AND selection state is cleared
- AND normal card interaction (opening account statement) is restored

---

### Requirement: Responsive Quick Edit Modal

The customer interface MUST provide an inline modal/sheet (`CustomerEditDialog`) allowing operators to edit `name`, `status`, `phone`, `email`, `address`, and `notes` without leaving `/admin/customers`.

#### Scenario: Successfully edit customer inline
- GIVEN the operator opens the quick edit dialog for customer "Taller Central"
- WHEN the operator changes the phone number and status to "INACTIVE" and submits
- THEN the changes are saved to the database
- AND the dialog closes
- AND the customer list reflects the updated phone and status badge immediately

#### Scenario: Validation error in quick edit dialog
- GIVEN the quick edit dialog is open
- WHEN the operator clears the required name field and submits
- THEN the dialog remains open displaying an error message
- AND the previously entered data in other fields is preserved

---

### Requirement: Mobile Floating Action Button Clearance

The customer list scroll container MUST provide sufficient bottom padding (`pb-28 sm:pb-0`) on mobile viewports so that the fixed "Nuevo cliente" floating action button never obscures the last card or its interactive elements.

#### Scenario: Mobile viewport scrolling
- GIVEN a mobile user scrolling to the bottom of the customer list
- WHEN the user reaches the end of the list
- THEN the last card is fully visible above the floating action button and bottom navigation bar
- AND all card actions remain clickable without obstruction
