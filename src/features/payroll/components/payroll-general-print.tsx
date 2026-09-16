import type { ParsedPayrollParams } from "../period";
import type { WeeklyPayrollReport } from "../domain";
import { getPayrollJobRows } from "../domain";

function money(cents: number) { return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cents / 100); }

export function PayrollGeneralPrint({ report, period }: { report: WeeklyPayrollReport; period: ParsedPayrollParams }) {
  const masters = report.workers;
  const rows = getPayrollJobRows(report);
  const fixedPayHelpers = report.fixedPayHelpers ?? [];
  const totalGeneralCents = report.totalPayableCents ?? report.totalCommissionCents;
  const totalChargedCents = report.totalClientLaborCents;
  return <main data-testid="payroll-general-print" className="mx-auto w-full max-w-6xl bg-white p-4 pb-24 text-black sm:p-8 sm:pb-24 print:max-w-none print:px-[14mm] print:py-[12mm] print:pb-[12mm]">
    <header className="mb-6 border-b-2 border-black pb-3"><h1 className="text-xl font-bold">SEBASAM · Nómina general</h1><p>Período: {period.rangeLabel}</p></header>
      <div className="w-full overflow-x-auto overscroll-x-contain print:overflow-visible"><table className="w-full min-w-[40rem] border-collapse text-xs print:min-w-0"><thead><tr className="border-b-2 border-black"><th className="p-2 text-left">Trabajo</th><th className="p-2 text-right">Cobrado</th>{masters.map((master) => <th key={master.workerId} className="p-2 text-right">{master.displayName}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={row.order.workOrderId} className="border-b border-gray-300"><td className="p-2"><span className="block font-semibold text-gray-900">{row.order.quoteTitle}</span><span className="block text-gray-600">{row.order.clientName}</span></td><td className="p-2 text-right">{money(row.order.totalClientLaborCents)}</td>{masters.map((master) => <td key={master.workerId} className="p-2 text-right">{master.workerId === row.masterId ? money(row.order.totalCommissionCents) : "-"}</td>)}</tr>)}</tbody>
        <tfoot>
          <tr className="border-t-2 border-black font-bold"><td className="p-2">Total por maestro</td><td className="p-2 text-right">{money(totalChargedCents)}</td>{masters.map((master) => <td key={master.workerId} className="p-2 text-right">{money(master.totalCommissionCents)}</td>)}</tr>
          {fixedPayHelpers.length > 0 && <>
            <tr className="border-t border-gray-300 font-semibold"><td colSpan={masters.length + 2} className="p-2">Trabajadores con sueldo</td></tr>
            {fixedPayHelpers.map((helper) => <tr key={helper.workerId} className="border-b border-gray-300"><td className="p-2">{helper.displayName}</td><td className="p-2 text-right">-</td><td colSpan={masters.length} className="p-2 text-right">{money(helper.totalPayableCents)}</td></tr>)}
          </>}
          <tr className="border-t-2 border-black font-bold"><td className="p-2">Total general</td><td className="p-2 text-right">{money(totalChargedCents)}</td><td colSpan={masters.length} className="p-2 text-right">{money(totalGeneralCents)}</td></tr>
        </tfoot>
       </table></div>
   </main>;
}
