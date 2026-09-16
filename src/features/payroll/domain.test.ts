import { describe, expect, it } from "vitest";
import { QuoteItemType, WorkerKind } from "@prisma/client";
import {
  buildWeeklyPayrollReport,
  computeCommissionCents,
  calculateFixedPayHelperPayroll,
  DEFAULT_GENERAL_LABOR_RATE,
  DEFAULT_WELDING_LABOR_RATE,
  detectLaborCategory,
  evaluatePayrollItem,
  getDefaultLaborRate,
  type RawWorkOrderForPayroll,
} from "./domain";

describe("Payroll Domain - Labor Detection and Rates", () => {
  it("detects welding and torch cutting as WELDING category", () => {
    expect(detectLaborCategory("Soldadura de escape")).toBe("WELDING");
    expect(detectLaborCategory("Corte con soplete y ajuste")).toBe("WELDING");
    expect(detectLaborCategory("Soldar soporte de chasis")).toBe("WELDING");
    expect(detectLaborCategory("Trabajo de oxicorte")).toBe("WELDING");
  });

  it("detects general mechanics, electrical or bodywork as GENERAL category", () => {
    expect(detectLaborCategory("Alineación y balanceo")).toBe("GENERAL");
    expect(detectLaborCategory("Cambio de balatas delanteras")).toBe("GENERAL");
    expect(detectLaborCategory("Ajuste de frenos y purga")).toBe("GENERAL");
    expect(detectLaborCategory("Mano de obra desmontaje de motor")).toBe("GENERAL");
  });

  it("returns 50% for general labor and 40% for welding", () => {
    expect(getDefaultLaborRate("GENERAL")).toBe(DEFAULT_GENERAL_LABOR_RATE);
    expect(getDefaultLaborRate("WELDING")).toBe(DEFAULT_WELDING_LABOR_RATE);
  });

  it("computes commission cents accurately with rounding", () => {
    // 50% of 100,000 cents ($1,000.00) = 50,000 cents ($500.00)
    expect(computeCommissionCents(100000, 50)).toBe(50000);
    // 40% of 120,000 cents ($1,200.00) = 48,000 cents ($480.00)
    expect(computeCommissionCents(120000, 40)).toBe(48000);
    // 35% of 100,000 cents = 35,000 cents
    expect(computeCommissionCents(100000, 35)).toBe(35000);
    // Zero or negative
    expect(computeCommissionCents(0, 50)).toBe(0);
    expect(computeCommissionCents(10000, 0)).toBe(0);
  });
});

describe("Payroll Domain - Item Evaluation", () => {
  it("ignores non-labor items (materials, refacciones, other)", () => {
    expect(
      evaluatePayrollItem({
        id: "item-1",
        type: QuoteItemType.MATERIAL,
        description: "Aceite sintético 5W30",
        quantity: 4,
        unitPriceCents: 15000,
        totalCents: 60000,
      })
    ).toBeNull();

    expect(
      evaluatePayrollItem({
        id: "item-2",
        type: QuoteItemType.REFACCIONES,
        description: "Renta de pluma",
        quantity: 1,
        unitPriceCents: 50000,
        totalCents: 50000,
      })
    ).toBeNull();
  });

  it("evaluates general labor item with 50% commission", () => {
    const res = evaluatePayrollItem({
      id: "item-3",
      type: QuoteItemType.LABOR,
      description: "Mano de obra cambio de amortiguadores",
      quantity: 1,
      unitPriceCents: 80000,
      totalCents: 80000,
    });

    expect(res).not.toBeNull();
    expect(res?.category).toBe("GENERAL");
    expect(res?.ratePercent).toBe(50);
    expect(res?.clientTotalCents).toBe(80000);
    expect(res?.payrollBaseCents).toBe(80000);
    expect(res?.commissionCents).toBe(40000); // $400.00
  });

  it("evaluates welding labor item with 40% commission", () => {
    const res = evaluatePayrollItem({
      id: "item-4",
      type: QuoteItemType.LABOR,
      description: "Soldadura reforzada en larguero",
      quantity: 1,
      unitPriceCents: 100000,
      totalCents: 100000,
    });

    expect(res).not.toBeNull();
    expect(res?.category).toBe("WELDING");
    expect(res?.ratePercent).toBe(40);
    expect(res?.clientTotalCents).toBe(100000);
    expect(res?.payrollBaseCents).toBe(100000);
    expect(res?.commissionCents).toBe(40000); // $400.00
  });

  it("supports custom payroll base (e.g. charged $1,200 to client, but $1,000 base for payroll)", () => {
    const res = evaluatePayrollItem({
      id: "item-5",
      type: QuoteItemType.LABOR,
      description: "Mano de obra suspensión",
      quantity: 1,
      unitPriceCents: 120000,
      totalCents: 120000,
      customPayrollBaseCents: 100000, // $1,000.00
    });

    expect(res).not.toBeNull();
    expect(res?.clientTotalCents).toBe(120000); // $1,200 charged to client
    expect(res?.payrollBaseCents).toBe(100000); // $1,000 for payroll base
    expect(res?.ratePercent).toBe(50);
    expect(res?.commissionCents).toBe(50000); // $500.00
  });

  it("calculates 40% commission with adjusted base ($1,200 to client, base $1,000, 40% = $400)", () => {
    const res = evaluatePayrollItem({
      id: "item-5b",
      type: QuoteItemType.LABOR,
      description: "Soldadura chasis",
      quantity: 1,
      unitPriceCents: 120000,
      totalCents: 120000,
      customPayrollBaseCents: 100000,
    });

    expect(res).not.toBeNull();
    expect(res?.clientTotalCents).toBe(120000);
    expect(res?.payrollBaseCents).toBe(100000);
    expect(res?.ratePercent).toBe(40); // Welding rate 40%
    expect(res?.commissionCents).toBe(40000); // $400.00
  });

  it("does not re-multiply adjusted base by quantity when quantity > 1", () => {
    const res = evaluatePayrollItem({
      id: "item-qty-mult",
      type: QuoteItemType.LABOR,
      description: "Mano de obra reparación",
      quantity: 3,
      unitPriceCents: 40000, // 3 * 40,000 = 120,000 client total
      totalCents: 120000,
      customPayrollBaseCents: 100000, // Custom base for the entire line: $1,000.00
    });

    expect(res).not.toBeNull();
    expect(res?.quantity).toBe(3);
    expect(res?.clientTotalCents).toBe(120000);
    expect(res?.payrollBaseCents).toBe(100000); // Must remain 100,000, NOT 300,000
    expect(res?.commissionCents).toBe(50000); // 50% of 100,000 = 50,000 ($500.00)
  });

  it("handles explicit zero base ($0.00) resulting in $0.00 commission", () => {
    const res = evaluatePayrollItem({
      id: "item-zero-base",
      type: QuoteItemType.LABOR,
      description: "Mano de obra garantía",
      quantity: 1,
      unitPriceCents: 120000,
      totalCents: 120000,
      customPayrollBaseCents: 0,
    });

    expect(res).not.toBeNull();
    expect(res?.clientTotalCents).toBe(120000);
    expect(res?.payrollBaseCents).toBe(0);
    expect(res?.commissionCents).toBe(0);
  });

  it("removes adjustment when customPayrollBaseCents is null or undefined", () => {
    const resNull = evaluatePayrollItem({
      id: "item-no-adjust",
      type: QuoteItemType.LABOR,
      description: "Mano de obra general",
      quantity: 1,
      unitPriceCents: 120000,
      totalCents: 120000,
      customPayrollBaseCents: null,
    });

    expect(resNull).not.toBeNull();
    expect(resNull?.clientTotalCents).toBe(120000);
    expect(resNull?.payrollBaseCents).toBe(120000);
    expect(resNull?.commissionCents).toBe(60000); // 50% of 120,000
  });

  it("evaluates OTHER item with custom base when includeInPayroll is true", () => {
    const res = evaluatePayrollItem({
      id: "item-other-custom-base",
      type: QuoteItemType.OTHER,
      description: "Servicio foráneo",
      quantity: 1,
      unitPriceCents: 200000,
      totalCents: 200000,
      includeInPayroll: true,
      customPayrollBaseCents: 150000, // $1,500.00
    });

    expect(res).not.toBeNull();
    expect(res?.clientTotalCents).toBe(200000);
    expect(res?.payrollBaseCents).toBe(150000);
    expect(res?.ratePercent).toBe(40);
    expect(res?.commissionCents).toBe(60000); // 40% of $1,500 = $600
  });

  it("ignores OTHER item with custom base when includeInPayroll is false", () => {
    const res = evaluatePayrollItem({
      id: "item-other-ignored",
      type: QuoteItemType.OTHER,
      description: "Servicio sin nómina",
      quantity: 1,
      unitPriceCents: 200000,
      totalCents: 200000,
      includeInPayroll: false,
      customPayrollBaseCents: 150000,
    });

    expect(res).toBeNull();
  });

  it("supports custom rate percent (e.g. 35% for new master)", () => {
    const res = evaluatePayrollItem({
      id: "item-6",
      type: QuoteItemType.LABOR,
      description: "Mano de obra general",
      quantity: 1,
      unitPriceCents: 100000,
      totalCents: 100000,
      customRatePercent: 35,
    });

    expect(res).not.toBeNull();
    expect(res?.ratePercent).toBe(35);
    expect(res?.commissionCents).toBe(35000);
  });

  it("evaluates OTHER item when includeInPayroll is true with default 40% rate", () => {
    const res = evaluatePayrollItem({
      id: "item-other-1",
      type: QuoteItemType.OTHER,
      description: "Servicio foráneo Toluca",
      quantity: 1,
      unitPriceCents: 200000,
      totalCents: 200000,
      includeInPayroll: true,
    });

    expect(res).not.toBeNull();
    expect(res?.type).toBe(QuoteItemType.OTHER);
    expect(res?.ratePercent).toBe(40);
    expect(res?.clientTotalCents).toBe(200000);
    expect(res?.commissionCents).toBe(80000); // 40% of $2,000.00 = $800.00
  });

  it("evaluates OTHER item when includeInPayroll is true with custom rate (e.g. 45%)", () => {
    const res = evaluatePayrollItem({
      id: "item-other-2",
      type: QuoteItemType.OTHER,
      description: "Traslado en grúa foráneo",
      quantity: 1,
      unitPriceCents: 150000,
      totalCents: 150000,
      includeInPayroll: true,
      customRatePercent: 45,
    });

    expect(res).not.toBeNull();
    expect(res?.type).toBe(QuoteItemType.OTHER);
    expect(res?.ratePercent).toBe(45);
    expect(res?.commissionCents).toBe(67500); // 45% of $1,500.00 = $675.00
  });

  it("ignores OTHER item when includeInPayroll is false or omitted", () => {
    expect(
      evaluatePayrollItem({
        id: "item-other-3",
        type: QuoteItemType.OTHER,
        description: "Servicio de flete local",
        quantity: 1,
        unitPriceCents: 100000,
        totalCents: 100000,
        includeInPayroll: false,
      })
    ).toBeNull();

    expect(
      evaluatePayrollItem({
        id: "item-other-4",
        type: QuoteItemType.OTHER,
        description: "Servicio de flete local",
        quantity: 1,
        unitPriceCents: 100000,
        totalCents: 100000,
      })
    ).toBeNull();
  });
});

describe("Payroll Domain - Report Builder", () => {
  const sampleOrders: RawWorkOrderForPayroll[] = [
    {
      id: "wo-1",
      number: "OT-001",
      status: "COMPLETED",
      completedAt: new Date("2026-08-20T15:00:00Z"),
      isSpecial: false,
      specialAssigneeName: null,
      quote: {
        id: "q-1",
        number: "COT-001",
        customer: { name: "Transportes del Norte" },
        vehicle: { brand: "Kenworth", model: "T680", plate: "ABC-123" },
        items: [
          {
            id: "qi-1",
            type: QuoteItemType.LABOR,
            description: "Ajuste de frenos de aire",
            quantity: 1,
            unitPriceCents: 100000,
            totalCents: 100000,
          },
          {
            id: "qi-2",
            type: QuoteItemType.MATERIAL,
            description: "Filtro de aire",
            quantity: 1,
            unitPriceCents: 45000,
            totalCents: 45000,
          },
        ],
      },
      assignments: [
        {
          workerId: "worker-1",
          status: "ASSIGNED",
          worker: {
            id: "worker-1",
            displayName: "Maestro Juan",
            workerKind: WorkerKind.MASTER,
            role: "WORKER",
          },
        },
      ],
    },
    {
      id: "wo-2",
      number: "OT-002",
      status: "COMPLETED",
      completedAt: new Date("2026-08-21T11:00:00Z"),
      isSpecial: false,
      specialAssigneeName: null,
      quote: {
        id: "q-2",
        number: "COT-002",
        customer: { name: "Logística Express" },
        vehicle: { brand: "Freightliner", model: "Cascadia", plate: "XYZ-789" },
        items: [
          {
            id: "qi-3",
            type: QuoteItemType.LABOR,
            description: "Soldadura de soporte de tanque",
            quantity: 1,
            unitPriceCents: 150000,
            totalCents: 150000,
          },
        ],
      },
      assignments: [
        {
          workerId: "worker-1",
          status: "ASSIGNED",
          worker: {
            id: "worker-1",
            displayName: "Maestro Juan",
            workerKind: WorkerKind.MASTER,
            role: "WORKER",
          },
        },
      ],
    },
    {
      id: "wo-3",
      number: "OT-003",
      status: "COMPLETED",
      completedAt: new Date("2026-08-22T17:00:00Z"),
      isSpecial: true,
      specialAssigneeName: "Taller Externo",
      quote: {
        id: "q-3",
        number: "COT-003",
        customer: { name: "Particular" },
        vehicle: { brand: "Nissan", model: "NP300", plate: "JKL-456" },
        items: [
          {
            id: "qi-4",
            type: QuoteItemType.LABOR,
            description: "Rectificación de discos",
            quantity: 2,
            unitPriceCents: 30000,
            totalCents: 60000,
          },
        ],
      },
      assignments: [],
    },
  ];

  it("builds a consolidated report by worker with totals and breakdowns", () => {
    const report = buildWeeklyPayrollReport(sampleOrders, {
      startDate: new Date("2026-08-17T00:00:00Z"),
      endDate: new Date("2026-08-24T00:00:00Z"),
      rangeLabel: "17 al 23 de agosto de 2026",
      isCurrentWeek: true,
    });

    expect(report.totalCompletedOrders).toBe(3);
    // wo-1 labor: 100,000 (50% = 50,000)
    // wo-2 labor: 150,000 (40% soldadura = 60,000)
    // wo-3 labor: 60,000 (50% = 30,000)
    // Total client labor = 310,000 ($3,100)
    // Total commission = 50,000 + 60,000 + 30,000 = 140,000 ($1,400)
    expect(report.totalClientLaborCents).toBe(310000);
    expect(report.totalPayrollBaseCents).toBe(310000);
    expect(report.totalCommissionCents).toBe(140000);

    // Workers: Maestro Juan + Especial (Taller Externo)
    expect(report.workers.length).toBe(2);

    const juan = report.workers.find((w) => w.displayName === "Maestro Juan");
    expect(juan).toBeDefined();
    expect(juan?.completedOrderCount).toBe(2);
    expect(juan?.totalClientLaborCents).toBe(250000);
    expect(juan?.totalCommissionCents).toBe(110000); // 50,000 + 60,000
    expect(juan?.workOrders.length).toBe(2);

    const special = report.workers.find((w) => w.workerKind === "SPECIAL");
    expect(special).toBeDefined();
    expect(special?.completedOrderCount).toBe(1);
    expect(special?.totalCommissionCents).toBe(30000);
  });
});

describe("Fixed-pay helper payroll", () => {
  it("deducts absence days and adds a manual commission to weekly pay", () => {
    expect(
      calculateFixedPayHelperPayroll({
        weeklyRateCents: 6_00000,
        dailyRateCents: 1_00000,
        absenceDays: 2,
        manualCommissionCents: 2_5000,
      })
    ).toEqual({
      absenceDeductionCents: 2_00000,
      totalPayableCents: 4_25000,
    });
  });

  it("never deducts more than the captured weekly rate", () => {
    expect(
      calculateFixedPayHelperPayroll({
        weeklyRateCents: 5_0000,
        dailyRateCents: 1_0000,
        absenceDays: 6,
        manualCommissionCents: 0,
      })
    ).toEqual({
      absenceDeductionCents: 5_0000,
      totalPayableCents: 0,
    });
  });
});

describe("Labor advances domain calculations", () => {
  it("evaluates labor item deducting previous advances from base", () => {
    const item = {
      id: "concept-1",
      type: QuoteItemType.LABOR,
      description: "Acorazado de chasis",
      quantity: 1,
      unitPriceCents: 10_000_00,
      totalCents: 10_000_00,
      customRatePercent: 50,
    };

    // First evaluation: full base remaining
    const initial = evaluatePayrollItem(item, 0);
    expect(initial?.payrollBaseCents).toBe(10_000_00);
    expect(initial?.previousAdvancesBaseCents).toBe(0);
    expect(initial?.remainingBaseCents).toBe(10_000_00);
    expect(initial?.commissionCents).toBe(5_000_00);

    // After $4,000 advance: remaining base is $6,000, commission is $3,000
    const partial = evaluatePayrollItem(item, 4_000_00);
    expect(partial?.payrollBaseCents).toBe(10_000_00);
    expect(partial?.previousAdvancesBaseCents).toBe(4_000_00);
    expect(partial?.remainingBaseCents).toBe(6_000_00);
    expect(partial?.commissionCents).toBe(3_000_00);

    // After $8,000 advances ($4,000 + $4,000): remaining base is $2,000, commission is $1,000
    const finalClose = evaluatePayrollItem(item, 8_000_00);
    expect(finalClose?.remainingBaseCents).toBe(2_000_00);
    expect(finalClose?.commissionCents).toBe(1_000_00);

    // If advances cover 100% ($10,000): remaining base is 0, commission is 0
    const fullyAdvanced = evaluatePayrollItem(item, 10_000_00);
    expect(fullyAdvanced?.remainingBaseCents).toBe(0);
    expect(fullyAdvanced?.commissionCents).toBe(0);
  });

  it("builds weekly report including advances and final completion deducting previous advances", () => {
    // Week 1: Only an advance of $4,000 on concept-1 (total $10,000 at 50%)
    const week1Report = buildWeeklyPayrollReport([], {
      startDate: new Date("2026-09-07T00:00:00.000Z"),
      endDate: new Date("2026-09-13T00:00:00.000Z"),
      rangeLabel: "Semana 1",
      isCurrentWeek: false,
      advances: [
        {
          id: "adv-1",
          workOrderId: "wo-1",
          workOrderNumber: "OT-001",
          quoteId: "q-1",
          quoteNumber: "C-001",
          clientName: "Transportes MX",
          vehicleSummary: "Kenworth T680",
          workerId: "worker-juan",
          workerDisplayName: "Maestro Juan",
          quoteItemId: "concept-1",
          conceptDescription: "Alargado de chasis",
          advanceBaseCents: 4_000_00,
          advancePercentage: 40,
          commissionRatePercent: 50,
          commissionCents: 2_000_00,
          notes: "Terminó un lado",
        },
      ],
    });

    expect(week1Report.totalCompletedOrders).toBe(0);
    expect(week1Report.totalPayrollBaseCents).toBe(4_000_00);
    expect(week1Report.totalCommissionCents).toBe(2_000_00);
    expect(week1Report.workers).toHaveLength(1);
    expect(week1Report.workers[0].displayName).toBe("Maestro Juan");
    expect(week1Report.workers[0].completedOrderCount).toBe(0);
    expect(week1Report.workers[0].totalPayrollBaseCents).toBe(4_000_00);
    expect(week1Report.workers[0].totalCommissionCents).toBe(2_000_00);
    expect(week1Report.workers[0].workOrders[0].isAdvance).toBe(true);
    expect(week1Report.workers[0].workOrders[0].advanceBaseCents).toBe(4_000_00);

    // Week 3: Order completed, with $8,000 previous advances recorded in weeks 1 and 2
    const completedOrder: RawWorkOrderForPayroll = {
      id: "wo-1",
      number: "OT-001",
      status: "COMPLETED",
      completedAt: new Date("2026-09-22T10:00:00.000Z"),
      isSpecial: false,
      specialAssigneeName: null,
      quote: {
        id: "q-1",
        number: "C-001",
        customer: { name: "Transportes MX" },
        vehicle: { brand: "Kenworth", model: "T680", year: 2022, plate: "XYZ-123" },
        items: [
          {
            id: "concept-1",
            type: QuoteItemType.LABOR,
            description: "Alargado de chasis",
            quantity: 1,
            unitPriceCents: 10_000_00,
            totalCents: 10_000_00,
            customRatePercent: 50,
          },
        ],
      },
      assignments: [
        {
          workerId: "worker-juan",
          status: "ASSIGNED",
          worker: {
            id: "worker-juan",
            displayName: "Maestro Juan",
            workerKind: WorkerKind.MASTER,
            role: "WORKER",
          },
        },
      ],
      previousAdvances: [
        { quoteItemId: "concept-1", advanceBaseCents: 4_000_00 },
        { quoteItemId: "concept-1", advanceBaseCents: 4_000_00 },
      ],
    };

    const week3Report = buildWeeklyPayrollReport([completedOrder], {
      startDate: new Date("2026-09-21T00:00:00.000Z"),
      endDate: new Date("2026-09-27T00:00:00.000Z"),
      rangeLabel: "Semana 3",
      isCurrentWeek: true,
    });

    expect(week3Report.totalCompletedOrders).toBe(1);
    expect(week3Report.workers[0].completedOrderCount).toBe(1);
    // Remaining base is $2,000 ($10,000 - $8,000), commission is $1,000
    expect(week3Report.totalCommissionCents).toBe(1_000_00);
    const orderDetail = week3Report.workers[0].workOrders[0];
    expect(orderDetail.isAdvance).toBe(false);
    expect(orderDetail.previousAdvancesBaseCents).toBe(8_000_00);
    expect(orderDetail.remainingBaseCents).toBe(2_000_00);
    expect(orderDetail.totalCommissionCents).toBe(1_000_00);
  });

  it("handles master reassignment: advances paid to Maestro A, remaining base paid to Maestro B on completion", () => {
    // Week 1: Advance paid to Maestro Juan
    const week1Report = buildWeeklyPayrollReport([], {
      startDate: new Date("2026-09-07T00:00:00.000Z"),
      endDate: new Date("2026-09-13T00:00:00.000Z"),
      rangeLabel: "Semana 1",
      isCurrentWeek: false,
      advances: [
        {
          id: "adv-w1",
          workOrderId: "wo-long",
          workOrderNumber: "OT-500",
          quoteId: "q-500",
          quoteNumber: "COT-500",
          clientName: "Transportes Centro",
          vehicleSummary: "Kenworth T680",
          workerId: "worker-juan",
          workerDisplayName: "Maestro Juan",
          quoteItemId: "concept-1",
          conceptDescription: "Fabricación de chasis",
          advanceBaseCents: 4_000_00,
          advancePercentage: 40,
          commissionRatePercent: 50,
          commissionCents: 2_000_00,
          notes: "Avance inicial",
        },
      ],
    });

    // In week 1, Maestro Juan receives $2,000 commission for the advance
    expect(week1Report.workers).toHaveLength(1);
    expect(week1Report.workers[0].displayName).toBe("Maestro Juan");
    expect(week1Report.workers[0].totalCommissionCents).toBe(2_000_00);

    // Week 2: Work order reassigned to Maestro Carlos due to illness and completed
    const completedOrderReassigned: RawWorkOrderForPayroll = {
      id: "wo-long",
      number: "OT-500",
      status: "COMPLETED",
      completedAt: new Date("2026-09-16T12:00:00.000Z"),
      isSpecial: false,
      specialAssigneeName: null,
      quote: {
        id: "q-500",
        number: "COT-500",
        customer: { name: "Transportes Centro" },
        vehicle: { brand: "Kenworth", model: "T680", year: 2021, plate: "TC-01" },
        items: [
          {
            id: "concept-1",
            type: QuoteItemType.LABOR,
            description: "Fabricación de chasis",
            quantity: 1,
            unitPriceCents: 10_000_00,
            totalCents: 10_000_00,
            customRatePercent: 50,
          },
        ],
      },
      assignments: [
        {
          workerId: "worker-carlos",
          status: "ASSIGNED",
          worker: {
            id: "worker-carlos",
            displayName: "Maestro Carlos",
            workerKind: WorkerKind.MASTER,
            role: "WORKER",
          },
        },
      ],
      previousAdvances: [
        { quoteItemId: "concept-1", advanceBaseCents: 4_000_00 },
      ],
    };

    const week2Report = buildWeeklyPayrollReport([completedOrderReassigned], {
      startDate: new Date("2026-09-14T00:00:00.000Z"),
      endDate: new Date("2026-09-20T00:00:00.000Z"),
      rangeLabel: "Semana 2",
      isCurrentWeek: true,
    });

    // In week 2, Maestro Carlos completes the order and receives remaining commission:
    // Base: $10,000 - $4,000 = $6,000. Commission @ 50%: $3,000
    expect(week2Report.workers).toHaveLength(1);
    const carlosWorker = week2Report.workers[0];
    expect(carlosWorker.displayName).toBe("Maestro Carlos");
    expect(carlosWorker.totalCommissionCents).toBe(3_000_00);
    expect(carlosWorker.workOrders[0].remainingBaseCents).toBe(6_000_00);
    expect(carlosWorker.workOrders[0].totalCommissionCents).toBe(3_000_00);
  });
});
