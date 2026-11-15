import * as React from "react";
import { DocumentPreview } from "../../src/components/document-preview";
import { EntityCard } from "../../src/components/ui/entity-card";
import { PeriodNavigator } from "../../src/components/ui/period-navigator";
import { StatTile } from "../../src/components/ui/stat-tile";
import { Sheet, DialogContent, DialogMobileHeader, DialogTitle, DialogMobileBody, DialogMobileFooter } from "../../src/components/ui/dialog";
import { Button } from "../../src/components/ui/button";

export function ResponsivePreviewFixture() {
  const [open, setOpen] = React.useState(false);
  return <main className="p-4">
    <div className="w-[240px] max-w-full">
      <EntityCard openLabel="Abrir prueba" title="Cambio de clutch" amount="$7,772.00" onOpen={() => setOpen(true)} />
    </div>
    <PeriodNavigator view="week" anchor="2026-11-11" today={new Date("2026-11-11T18:00:00Z")} onViewChange={() => {}} onAnchorChange={() => {}} />
    <div className="grid grid-cols-2 gap-3"><StatTile label="Mano de obra facturada" value="$6,600.00" info="Prueba" /></div>
    <Sheet open={open} onOpenChange={setOpen}>
      <DialogContent variant="sheet" aria-describedby={undefined}>
        <DialogMobileHeader><DialogTitle>Folio · Cliente de prueba</DialogTitle></DialogMobileHeader>
        <DialogMobileBody>
          <DocumentPreview typeLabel="Cotización" customer={{ name: "Cliente de prueba" }} unitLine="GR-6142 · Nissan NP300" service="Cambio de clutch" sections={[{ id: "s", name: "General", subtotalCents: 670000, rows: [{ id: "r", quantityLabel: "1", description: "Cambio de clutch", unitPriceCents: 670000, lineTotalCents: 670000 }] }]} totals={{ subtotalCents: 670000, taxCents: 107200, totalCents: 777200 }} />
        </DialogMobileBody>
        <DialogMobileFooter><Button onClick={() => setOpen(false)}>Cerrar</Button><Button>Compartir cotización</Button></DialogMobileFooter>
      </DialogContent>
    </Sheet>
  </main>;
}
