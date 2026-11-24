# Balance: cobros, utilidad y gastos

Pantalla `/admin/balance`. Tiene tres secciones: **Cobros y saldos** (todos los roles operativos) y **Utilidad** y **Gastos** (solo SUPER_ADMIN y ADMIN).

## Cobros y saldos

- **Cobrado:** pagos `PAID` registrados esta semana, este mes y este año.
- **Por cobrar:** saldo pendiente de notas completadas. No es dinero cobrado y nunca se suma a lo cobrado.

## Gastos

Cada gasto lleva fecha, monto, categoría y **comprobante** (con factura / sin factura). El comprobante es un eje aparte: no depende de la categoría. Cada gasto lleva también un **porcentaje a refacciones** (0–100); el resto se carga a mano de obra. La categoría propone el porcentaje:

| Categoría | % a refacciones |
|---|---|
| Refacciones y materiales comprados | 100 |
| Combustible y traslados | 50 |
| Renta, luz, agua, teléfono e internet, herramienta y equipo, impuestos y derechos, otros | 0 |

El reparto nunca pierde centavos: la parte de refacciones se redondea y la de mano de obra es el resto.

Los gastos se eliminan de forma lógica (`deletedAt`); la fila se conserva pero deja de contar.

## Utilidad (por mes)

Tres vistas que **cuadran entre sí**: queda general = queda de mano de obra + queda de refacciones + otros ingresos.

- **Mano de obra:** ingresos por mano de obra − comisiones de nómina − gastos que le tocan. La **cobertura** es ingresos ÷ (nómina + gastos).
- **Refacciones:** ingresos por refacciones y materiales − compras y su parte de gastos compartidos = utilidad libre (no está comprometida a pagar renta ni luz).
- **General:** entró, se gastó y queda, y cuánto queda de cada cuenta.

### De dónde sale cada cifra

- **Ingresos:** una nota (`PayableNote` emitida, de trabajo o de venta) cuenta **solo cuando queda totalmente liquidada**, en el mes (hora de CDMX) del abono que la cubre por completo, aunque tuviera abonos anteriores. Se reconoce su base sin IVA, ya con descuentos o acuerdos, repartida entre categorías según sus partidas: `LABOR` es mano de obra; `MATERIAL` y `REFACCIONES`, refacciones y materiales; `OTHER` solo aparece en la vista General. Las secciones no autorizadas no cuentan.
- **Nómina:** el cálculo de nómina mensual existente (`totalPayableCents`, o las comisiones si no hay total). No se captura.
- **Gastos:** por fecha de pago, en el mes que se pagaron.
- **Cobrado en efectivo:** referencia aparte; puede diferir de los ingresos porque los abonos de una nota pueden llegar en otros meses.

### Límites conocidos

- Ingresos y gastos pueden caer en meses distintos (se compra una refacción un mes y la nota se liquida el siguiente). Es una aproximación; la utilidad exacta por trabajo requiere ligar cada compra a su nota.
- La app **no calcula impuestos** ni da asesoría fiscal. «Con factura» describe un hecho (hay comprobante), no si el gasto es deducible.
