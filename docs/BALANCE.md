# Balance: cobros, utilidad y gastos

Pantalla `/admin/balance`. Tiene tres secciones y cada rol ve las suyas:

| Sección | Quién la ve |
|---|---|
| **Cobros y saldos** | Todos los roles operativos |
| **Gastos** (registrar, editar, eliminar) | SUPER_ADMIN, ADMIN y ADMIN_ASSISTANT |
| **Utilidad** y **Asignar** | Solo SUPER_ADMIN (el dueño) |

Quien captura gastos (ADMIN o ADMIN_ASSISTANT) solo registra hechos: fecha, monto, categoría, proveedor, comprobante y nota. **No ve ni elige cómo se reparte** un gasto entre las cuentas, ni ve la utilidad.

## Cobros y saldos

- **Cobrado:** pagos `PAID` registrados esta semana, este mes y este año.
- **Por cobrar:** saldo pendiente de notas completadas. No es dinero cobrado y nunca se suma a lo cobrado.

## Gastos

Cada gasto lleva fecha, monto, categoría y **comprobante** (con factura / sin factura). El comprobante es un eje aparte: no depende de la categoría. Cada gasto lleva también un **porcentaje a refacciones** (0–100); el resto se carga a mano de obra. Al registrarse, el porcentaje es el que propone la categoría; el dueño lo ajusta después, gasto por gasto, en **Utilidad → Asignar**. Editar un gasto no cambia un reparto que el dueño ya asignó (solo sigue a la categoría si nunca se tocó).

| Categoría | % a refacciones |
|---|---|
| Refacciones y materiales comprados | 100 |
| Combustible y traslados | 50 |
| Renta, luz, agua, teléfono e internet, herramienta y equipo, impuestos y derechos, otros | 0 |

El reparto nunca pierde centavos: la parte de refacciones se redondea y la de mano de obra es el resto.

Los gastos se eliminan de forma lógica (`deletedAt`); la fila se conserva pero deja de contar.

### Proveedores

El catálogo de proveedores **aprende solo**: cada vez que se registra o edita un gasto con proveedor, el catálogo guarda el comprobante y la categoría que se usaron con él, y el gasto queda ligado a ese proveedor (coincidencia exacta del nombre). Al capturar un gasto nuevo, el campo Proveedor autocompleta con el catálogo y, si el nombre ya existe, propone su categoría y su comprobante habituales; quien captura puede cambiarlos. Al aplicar la migración, los proveedores que ya estaban escritos en gastos se pasan al catálogo con los datos de su gasto más reciente.

### Porcentajes por categoría

En **Configuración → Porcentajes de gastos** (solo el dueño) se cambia el porcentaje que cada categoría propone para refacciones (por ejemplo, el 50 % de combustible). Solo aplica a gastos **nuevos** y a los que se confirman desde una plantilla; los ya registrados conservan su reparto, que se ajusta en Utilidad → Asignar. Una categoría vuelta al valor por defecto deja de guardarse como excepción. Editar un gasto sigue la categoría nueva mientras su reparto sea solo la propuesta de la categoría; en cuanto el dueño lo asigna a mano (`partsShareAssigned`), editar no lo toca.

### Comprobante con foto o PDF

Al registrar un gasto nuevo se puede subir la **foto o el PDF** del comprobante (factura que te hace el proveedor, ticket o nota). La foto se reduce en el teléfono a 1600 px antes de enviarse; el límite es 4 MB (JPG, PNG, WebP o PDF).

- Se guarda en un bucket privado de Supabase Storage (`expense-receipts`, se crea solo la primera vez). Nunca es público: se abre con un enlace firmado de un minuto.
- Un modelo de visión (Gemini, el mismo `GEMINI_API_KEY` del asistente; opcional `GEMINI_VISION_MODEL`) lee fecha, total, proveedor, categoría y si es factura. Eso solo **llena el formulario**: la persona revisa y registra. Nada se guarda como gasto sin su confirmación.
- Si no se puede leer (sin llave, error o foto borrosa), el comprobante se conserva y se captura a mano.
- El comprobante lo ven solo el dueño y el administrador (**Ver comprobante** en la lista de gastos). La asistente puede subirlo pero no abrirlo.
- Editar un gasto nunca quita el comprobante ya adjunto. Si se sube una foto y se cancela el formulario, el archivo queda guardado sin gasto (no se limpia solo todavía).
- La foto se envía a Google para leerla.

### Exportar a CSV

En Gastos, **Descargar CSV** baja los gastos del mes mostrado (`/admin/balance/gastos.csv?month=YYYY-MM`) con fecha, categoría, proveedor, comprobante, método de pago, monto en pesos y nota, del más antiguo al más reciente. Lo pueden bajar quienes registran gastos. No calcula impuestos.

Las columnas son una **primera propuesta nuestra**: todavía no se han revisado con un contador. Cuando se platique con uno, se ajustan a lo que realmente pida.

### Gastos que se repiten

Al registrar un gasto nuevo se puede marcar **Repetir cada mes** (renta, luz, agua, teléfono). Eso crea una plantilla con la categoría, el monto, el comprobante, el proveedor y el método de pago, fechada el mismo día del mes (máximo el 28, para que exista en todos los meses). El gasto con el que se creó queda ligado a la plantilla, así que ese mes no se propone otra vez.

- Cada mes, la plantilla aparece como **pendiente** en Gastos hasta que alguien la **confirma** (con el monto ajustado, porque la luz cambia) o la **omite** ese mes. **Nada se registra solo.**
- Confirmar es idempotente: si el mes ya tiene un gasto de esa plantilla, no se duplica.
- No se proponen meses futuros ni meses anteriores a la creación de la plantilla.
- **Dejar de repetir** desactiva la plantilla; los gastos ya registrados se quedan.
- Un gasto confirmado es un gasto normal: cuenta por fecha de pago y el dueño puede repartirlo o ligarlo a notas como cualquier otro.
- Pueden administrarlas quienes registran gastos (dueño, administrador y asistente administrativa).

## Utilidad (por mes)

Tres vistas que **cuadran entre sí**: queda general = queda de mano de obra + queda de refacciones + otros ingresos.

- **Mano de obra:** ingresos por mano de obra − comisiones de nómina − gastos que le tocan. La **cobertura** es ingresos ÷ (nómina + gastos).
- **Refacciones:** ingresos por refacciones y materiales − compras y su parte de gastos compartidos = utilidad libre (no está comprometida a pagar renta ni luz).
- **General:** entró, se gastó y queda, y cuánto queda de cada cuenta.

### De dónde sale cada cifra

- **Ingresos:** una nota (`PayableNote` emitida, de trabajo o de venta) cuenta **solo cuando queda totalmente liquidada**, en el mes (hora de CDMX) del abono que la cubre por completo, aunque tuviera abonos anteriores. Se reconoce su base sin IVA, ya con descuentos o acuerdos, repartida entre categorías según sus partidas: `LABOR` es mano de obra; `MATERIAL` y `REFACCIONES`, refacciones y materiales; `OTHER` solo aparece en la vista General. Las secciones no autorizadas no cuentan.
- **Nómina:** el cálculo de nómina mensual existente (`totalPayableCents`, o las comisiones si no hay total). No se captura.
- **Gastos:** por fecha de pago, en el mes que se pagaron. La parte de una compra que el dueño **liga a una nota** (Utilidad → Asignar) cuenta en cambio en el mes en que esa nota se liquida, junto con lo que cobró; la parte sin ligar sigue por fecha de pago. Lo ligado a notas de una compra no puede pasar de su monto, y cada centavo cuenta una sola vez.
- **Utilidad por trabajo** (vista Refacciones): por nota liquidada en el mes, refacciones cobradas − costo de refacciones ligado (la parte de refacciones de cada pieza), con su margen en %. Una nota sin compras ligadas aparece con margen completo.
- **Cobrado en efectivo:** referencia aparte; puede diferir de los ingresos porque los abonos de una nota pueden llegar en otros meses.

### Comparar meses

**Utilidad → Comparar** muestra los últimos 12 meses (hasta el mes elegido), con filtro **Todas / Mano de obra / Refacciones**: lo que entró, el % de mano de obra, los gastos y cómo se ve cada mes frente al resto.

- Reglas de reconocimiento iguales a las del mes: una nota cuenta completa en el mes en que queda totalmente liquidada; una compra ligada a una nota cuenta con ella. Meses de calendario en hora de la Ciudad de México.
- «Frente al resto» compara con la **mediana** de los meses que tuvieron cobros: **más fuerte** si la supera por más de 15 %, **más débil** si queda más de 15 % abajo, **típico** en medio. Con menos de 3 meses con cobros no se clasifica. Es una descripción del pasado: sin puntuaciones ni pronósticos.
- **Otros (partidas «Otro»):** cuentan solo en «Todas»; nunca se mezclan con refacciones ni con mano de obra, y quedan fuera del % de mano de obra (mano de obra entre mano de obra más refacciones).
- Los gastos de esta vista **no incluyen nómina**; la nómina sigue en las vistas del mes.
- Fuera por ahora: filtro por **semana** (falta definir con el negocio qué día empieza la semana) y la **CxC mensual histórica** (no hay saldo inicial verificado ni historial completo; la CxC de hoy está en Cobros y saldos).

### Límites conocidos

- Ingresos y gastos pueden caer en meses distintos (se compra una refacción un mes y la nota se liquida el siguiente). Ligar la compra a su nota (arriba) lo corrige; lo que no se liga sigue siendo una aproximación.
- La app **no calcula impuestos** ni da asesoría fiscal. «Con factura» describe un hecho (hay comprobante), no si el gasto es deducible.
