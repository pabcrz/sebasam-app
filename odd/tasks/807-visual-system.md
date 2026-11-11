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
- T2 [S2,S3] #794 Button scale and action hierarchy. Pending.
- T3 [S8] #795 Icon wrapper and Tabler outline migration. Pending.
- T4 [S7] #796 Segmented, tabs, chips. Pending.
- T5 [S6] #797 Sheets, panels, dialogs. Pending.
- T6 #798 PageHeader, SearchBar+filters, PeriodNavigator. Pending.
- T7 [S9] #799 Unified operational card (restore dynamic primary). Pending.
- T8 #800 Single document preview. Pending.
- T9 #801 Unified mobile/side navigation. Pending.
- T10 #802 Create/edit quote flow. Pending.
- T11 #803 Home as prioritized inbox. Pending.
- T12 #804 Quotes, Work orders, Notes, Payroll. Pending.
- T13 #805 Customers, profile, statement. Pending.
- T14 #806 Settings, Workers, Users. Pending.

## Log

- L1: "hay un issue 807, que es El tracker ... vas a crear un nuevo working para que sobre ese vayamos haciendo todos los cambios ... lo visual va a ser la regla ... work Tree de 788 tiene algunos cambios entonces ya sé que los traigas"
- L2: #788 (PR #789, #790) already merged in `develop`; nothing to import. `.claude/worktrees/visual-ux-inconsistencies-3b4c5c/DESIGN.md` is the stale pre-#788 version without the new rules; the HTML is the source.
- L3: Slice boundary: T0 is 1722 lines because it carries the 190 KB HTML reference (no authored code); code slices follow per child issue.
