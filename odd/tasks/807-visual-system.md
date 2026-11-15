# 807 — Consistent visual and navigation system

Tracker #807 (children #793–#806). Branch `feature/807-work` from `develop`; one PR per child issue. Source of truth: `DESIGN.md` (adopted from `docs/SEBASAM Consistencia Visual.html`). Order: foundations -> pieces -> navigation -> screens.

## Specs

- S1: "lo visual va a ser la regla" — the HTML proposal wins over current local formats; `DESIGN.md` reflects it.
- S2: "Escala de botones de 40 / 36 / 32 px con área táctil de 44 px; una sola acción primaria por superficie."
- S3: "Tres niveles de azul: gradiente de marca solo para la navegación activa, azul plano para la acción de página y tonal para la acción de tarjeta."
- S4: "Radios de 8 / 12 / 16 / 24 px; pastilla solo en insignias de estado y pestaña activa."
- S5: "Sombra o borde, nunca los dos."
- S6: "✕ siempre arriba a la derecha y un solo scroll por pantalla."
- S7: "Pestañas para cambiar de sección, segmentado para filtrar."
- S8: "Inter con cifras tabulares (sin DM Mono) e iconos Tabler outline."
- S9: "Identidad de la unidad: ECO + modelo, o placas + modelo, o modelo; el chofer aparte."
- S10: Out of scope: public pages, printed documents/PDF, assistant, login/setup; no business-rule, state, calculation, permission or payroll changes.

## Tasks

- T0 [S1] Adopt rules in `DESIGN.md` + commit the HTML reference. Route: inline. Commit: c96c5ea. Done.
- T1 [S1,S4,S5,S8] #793 Tokens base (palette light/dark, radii, shadows, Inter tabular, no DM Mono). Route: inline. Commit: 86ebd50. Done.
- T2 [S2,S3] #794 Button scale and action hierarchy. Route: inline. Commit: see git log "#794". Done.
- T3 [S8] #795 Icon wrapper and Tabler outline migration. Route: worker (83 files). Done; short logo asset deferred.
- T4 [S7] #796 Segmented, tabs, chips. Route: worker. Done; segmented/chip 44px hit area clipped vertically by scroll containers (known).
- T5 [S6] #797 Sheets, panels, dialogs. Route: worker. Done; no feature adopts variant="sheet" yet (screen issues do); 1024px panel is non-modal.
- T6 #798 PageHeader, SearchBar+filters, PeriodNavigator. Route: worker. Pieces done; screen adoption in #804/#805 (Estado de cuenta needs weekDays=7; Notas 6). Nómina "De Noviembre De" fixed.
- T7 [S9] #799 Unified operational card. Route: worker. Done for quotes (primary restored: draft->share per HTML, main had none); work orders/notes adopt EntityCard in #804; search by driver pending (#804).
- T8 #800 Single document preview. Route: worker. Done; hosts now Sheet; payment-methods block is a fixed list per HTML.
- T9 #801 Unified mobile/side navigation. Route: worker. Done (icons only per HTML; other roles keep old filtering; bar-hiding on quote flow is #802).
- T10 #802 Create/edit quote flow. Route: 2 workers. Done; OPEN DECISION: today closing with data discards after confirm (no local/server draft) — issue says close never loses capture; Nóm. column keeps existing rule (Mano de obra auto, Otro opt-in).
- T11 #803 Home as prioritized inbox. Route: worker. Done; OPEN: no "stopped" job state in data (amber branch inert), approved row links to status=APPROVED list.
- T12 #804 Quotes, Work orders, Notes, Payroll. Part A Cotizaciones done (partial: search is folio-only and "Ver resultados" has no count because both need queries.ts changes; "Otros criterios" keeps cliente/concepto/ECO/placas; desktop row lacks ⋯ and dynamic primary). Part B Trabajos+Notas done (no chofer search on Trabajos: needs queries.ts; Gestionar sheet also affects Cotizaciones/rollback). Part C Nómina done (ListRow created; print is icon-only; ADMIN opens read-only worker sheet).
- T13 #805 Customers, profile, statement. Route: worker. Done; gaps: driver search shows contact not unit, N+1 balance per row (50 max), customer-detail-dialog.tsx dead (kept for admin-page-header test), 375px unverified.
- T14 #806 Part A Workers+Users done (OPEN: worker delete removes assignments+execution records, no history guard exists; user role now saves with Guardar). Part B Configuración pending.

## Log

- L1: "hay un issue 807, que es El tracker ... vas a crear un nuevo working para que sobre ese vayamos haciendo todos los cambios ... lo visual va a ser la regla ... work Tree de 788 tiene algunos cambios entonces ya sé que los traigas"
- L2: #788 (PR #789, #790) already merged in `develop`; nothing to import. `.claude/worktrees/visual-ux-inconsistencies-3b4c5c/DESIGN.md` is the stale pre-#788 version without the new rules; the HTML is the source.
- L3: Slice boundary: T0 is 1722 lines because it carries the 190 KB HTML reference (no authored code); code slices follow per child issue.
