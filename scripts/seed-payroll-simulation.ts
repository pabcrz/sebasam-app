import { QuoteItemType, QuoteStatus, UserRole, WorkerKind, WorkOrderStatus, AssignmentStatus } from "@/generated/prisma/client";
import { createPrismaClient } from "@/lib/prisma-client";

const prisma = createPrismaClient();

async function main() {
  console.log("🌱 Iniciando simulación de datos de nómina para la semana del 24 al 29 de agosto de 2026 con 10 trabajos...");

  // 1. Crear o recuperar trabajadores (Maestros)
  const worker1Id = "11111111-1111-4111-8111-111111111111";
  const worker2Id = "22222222-2222-4222-8222-222222222222";
  const worker3Id = "33333333-3333-4333-8333-333333333333";

  const worker1 = await prisma.userProfile.upsert({
    where: { id: worker1Id },
    update: { displayName: "Maestro Juan Hernández", role: UserRole.WORKER, workerKind: WorkerKind.MASTER, isActive: true },
    create: {
      id: worker1Id,
      username: "juan.hernandez",
      email: "juan.hernandez@sebasam.local",
      displayName: "Maestro Juan Hernández",
      role: UserRole.WORKER,
      workerKind: WorkerKind.MASTER,
      isActive: true,
    },
  });

  const worker2 = await prisma.userProfile.upsert({
    where: { id: worker2Id },
    update: { displayName: "Maestro Pedro Ramírez", role: UserRole.WORKER, workerKind: WorkerKind.MASTER, isActive: true },
    create: {
      id: worker2Id,
      username: "pedro.ramirez",
      email: "pedro.ramirez@sebasam.local",
      displayName: "Maestro Pedro Ramírez",
      role: UserRole.WORKER,
      workerKind: WorkerKind.MASTER,
      isActive: true,
    },
  });

  const worker3 = await prisma.userProfile.upsert({
    where: { id: worker3Id },
    update: { displayName: "Maestro Carlos Ortiz", role: UserRole.WORKER, workerKind: WorkerKind.MASTER, isActive: true },
    create: {
      id: worker3Id,
      username: "carlos.ortiz",
      email: "carlos.ortiz@sebasam.local",
      displayName: "Maestro Carlos Ortiz",
      role: UserRole.WORKER,
      workerKind: WorkerKind.MASTER,
      isActive: true,
    },
  });

  console.log("✅ Maestros configurados:", worker1.displayName, ",", worker2.displayName, ",", worker3.displayName);

  // 2. Limpiar órdenes y cotizaciones de simulación previas si existen
  const existingSimQuotes = await prisma.quote.findMany({
    where: { number: { startsWith: "COT-SIM-" } },
    select: { id: true },
  });
  if (existingSimQuotes.length > 0) {
    const quoteIds = existingSimQuotes.map((q) => q.id);
    await prisma.workAssignment.deleteMany({
      where: { workOrder: { quoteId: { in: quoteIds } } },
    });
    await prisma.workOrder.deleteMany({
      where: { quoteId: { in: quoteIds } },
    });
    await prisma.quoteItem.deleteMany({
      where: { quoteId: { in: quoteIds } },
    });
    await prisma.quote.deleteMany({
      where: { id: { in: quoteIds } },
    });
    console.log(`🧹 Eliminadas ${existingSimQuotes.length} cotizaciones de simulación previas.`);
  }

  // 3. Clientes de prueba
  const customerA = await prisma.customer.upsert({
    where: { id: "sim-cust-aguila" },
    update: {},
    create: {
      id: "sim-cust-aguila",
      name: "Transportes Águila del Norte",
      email: "contacto@aguilanorte.com",
      phone: "5551234567",
    },
  });

  const customerB = await prisma.customer.upsert({
    where: { id: "sim-cust-logistica" },
    update: {},
    create: {
      id: "sim-cust-logistica",
      name: "Logística y Distribución del Centro",
      email: "mantenimiento@logcentro.com",
      phone: "5559876543",
    },
  });

  const customerC = await prisma.customer.upsert({
    where: { id: "sim-cust-cales" },
    update: {},
    create: {
      id: "sim-cust-cales",
      name: "Cales y Derivados Industriales",
      email: "flotilla@calesderivados.com",
      phone: "5553332211",
    },
  });

  // 4. Vehículos de prueba
  const vehicle1 = await prisma.vehicle.upsert({
    where: { customerId_plate: { customerId: customerA.id, plate: "78-AB-9K" } },
    update: {},
    create: {
      customerId: customerA.id,
      brand: "Kenworth",
      model: "T680",
      year: 2022,
      plate: "78-AB-9K",
    },
  });

  const vehicle2 = await prisma.vehicle.upsert({
    where: { customerId_plate: { customerId: customerB.id, plate: "45-TY-2M" } },
    update: {},
    create: {
      customerId: customerB.id,
      brand: "Freightliner",
      model: "Cascadia",
      year: 2021,
      plate: "45-TY-2M",
    },
  });

  const vehicle3 = await prisma.vehicle.upsert({
    where: { customerId_plate: { customerId: customerC.id, plate: "12-WZ-8P" } },
    update: {},
    create: {
      customerId: customerC.id,
      brand: "International",
      model: "ProStar",
      year: 2020,
      plate: "12-WZ-8P",
    },
  });

  // 5. Órdenes para Maestro Juan Hernández (10 trabajos en total)

  // ORDEN 1 - Maestro Juan: Lunes 24 Agosto 2026 (3 trabajos)
  const quote1 = await prisma.quote.create({
    data: {
      number: "COT-SIM-101",
      title: "Mantenimiento suspensión y soldadura chasis",
      status: QuoteStatus.APPROVED,
      customerId: customerA.id,
      vehicleId: vehicle1.id,
      operationalDate: new Date("2026-08-24T12:00:00Z"),
      subtotalCents: 350000,
      totalCents: 350000,
      taxEnabled: false,
      items: {
        create: [
          {
            type: QuoteItemType.LABOR,
            description: "Soldadura reforzada de chasis y anclaje",
            quantity: 1,
            unitPriceCents: 180000, // $1,800 (40% = $720)
            totalCents: 180000,
            sortOrder: 0,
          },
          {
            type: QuoteItemType.LABOR,
            description: "Cambio de perchas y bujes de muelle",
            quantity: 1,
            unitPriceCents: 120000, // $1,200 (50% = $600)
            totalCents: 120000,
            sortOrder: 1,
          },
          {
            type: QuoteItemType.LABOR,
            description: "Engrasado general de suspensión y pernos",
            quantity: 1,
            unitPriceCents: 50000, // $500 (50% = $250)
            totalCents: 50000,
            sortOrder: 2,
          },
        ],
      },
    },
  });

  await prisma.workOrder.create({
    data: {
      number: "OT-SIM-101",
      quoteId: quote1.id,
      status: WorkOrderStatus.COMPLETED,
      completedAt: new Date("2026-08-24T17:30:00Z"),
      assignments: {
        create: { workerId: worker1.id, status: AssignmentStatus.DONE },
      },
    },
  });

  // ORDEN 2 - Maestro Juan: Martes 25 Agosto 2026 (2 trabajos)
  const quote2 = await prisma.quote.create({
    data: {
      number: "COT-SIM-102",
      title: "Brio a muelles y alineación de eje",
      status: QuoteStatus.APPROVED,
      customerId: customerB.id,
      vehicleId: vehicle2.id,
      operationalDate: new Date("2026-08-25T12:00:00Z"),
      subtotalCents: 240000,
      totalCents: 240000,
      taxEnabled: false,
      items: {
        create: [
          {
            type: QuoteItemType.LABOR,
            description: "Brio y ajuste de muelles delanteros",
            quantity: 1,
            unitPriceCents: 150000, // $1,500 (50% = $750)
            totalCents: 150000,
            sortOrder: 0,
          },
          {
            type: QuoteItemType.LABOR,
            description: "Alineación y balanceo de eje direccional",
            quantity: 1,
            unitPriceCents: 90000, // $900 (50% = $450)
            totalCents: 90000,
            sortOrder: 1,
          },
        ],
      },
    },
  });

  await prisma.workOrder.create({
    data: {
      number: "OT-SIM-102",
      quoteId: quote2.id,
      status: WorkOrderStatus.COMPLETED,
      completedAt: new Date("2026-08-25T18:00:00Z"),
      assignments: {
        create: { workerId: worker1.id, status: AssignmentStatus.DONE },
      },
    },
  });

  // ORDEN 3 - Maestro Juan: Miércoles 26 Agosto 2026 (3 trabajos)
  const quote3 = await prisma.quote.create({
    data: {
      number: "COT-SIM-103",
      title: "Reparación y soldadura soportes",
      status: QuoteStatus.APPROVED,
      customerId: customerC.id,
      vehicleId: vehicle3.id,
      operationalDate: new Date("2026-08-26T12:00:00Z"),
      subtotalCents: 260000,
      totalCents: 260000,
      taxEnabled: false,
      items: {
        create: [
          {
            type: QuoteItemType.LABOR,
            description: "Soldadura de refuerzo en amortiguador",
            quantity: 1,
            unitPriceCents: 110000, // $1,100 (40% = $440)
            totalCents: 110000,
            sortOrder: 0,
          },
          {
            type: QuoteItemType.LABOR,
            description: "Revisión y ajuste de balatas delanteras",
            quantity: 1,
            unitPriceCents: 80000, // $800 (50% = $400)
            totalCents: 80000,
            sortOrder: 1,
          },
          {
            type: QuoteItemType.LABOR,
            description: "Instalación de abrazaderas tipo U",
            quantity: 1,
            unitPriceCents: 70000, // $700 (50% = $350)
            totalCents: 70000,
            sortOrder: 2,
          },
        ],
      },
    },
  });

  await prisma.workOrder.create({
    data: {
      number: "OT-SIM-103",
      quoteId: quote3.id,
      status: WorkOrderStatus.COMPLETED,
      completedAt: new Date("2026-08-26T16:45:00Z"),
      assignments: {
        create: { workerId: worker1.id, status: AssignmentStatus.DONE },
      },
    },
  });

  // ORDEN 4 - Maestro Juan: Jueves 27 Agosto 2026 (2 trabajos -> TOTAL 10 para Juan)
  const quote4 = await prisma.quote.create({
    data: {
      number: "COT-SIM-104",
      title: "Cambio de perno rey y soldadura eje",
      status: QuoteStatus.APPROVED,
      customerId: customerA.id,
      vehicleId: vehicle1.id,
      operationalDate: new Date("2026-08-27T12:00:00Z"),
      subtotalCents: 360000,
      totalCents: 360000,
      taxEnabled: false,
      items: {
        create: [
          {
            type: QuoteItemType.LABOR,
            description: "Cambio de perno rey y lainas de ajuste",
            quantity: 1,
            unitPriceCents: 220000, // $2,200 (50% = $1,100)
            totalCents: 220000,
            sortOrder: 0,
          },
          {
            type: QuoteItemType.LABOR,
            description: "Soldadura de placa base de eje trasero",
            quantity: 1,
            unitPriceCents: 140000, // $1,400 (40% = $560)
            totalCents: 140000,
            sortOrder: 1,
          },
        ],
      },
    },
  });

  await prisma.workOrder.create({
    data: {
      number: "OT-SIM-104",
      quoteId: quote4.id,
      status: WorkOrderStatus.COMPLETED,
      completedAt: new Date("2026-08-27T18:30:00Z"),
      assignments: {
        create: { workerId: worker1.id, status: AssignmentStatus.DONE },
      },
    },
  });

  // ORDEN 5 - Maestro Pedro: Viernes 28 Agosto 2026
  const quote5 = await prisma.quote.create({
    data: {
      number: "COT-SIM-105",
      title: "Ajuste integral de frenos de aire",
      status: QuoteStatus.APPROVED,
      customerId: customerB.id,
      vehicleId: vehicle2.id,
      operationalDate: new Date("2026-08-28T12:00:00Z"),
      subtotalCents: 100000,
      totalCents: 100000,
      taxEnabled: false,
      items: {
        create: [
          {
            type: QuoteItemType.LABOR,
            description: "Ajuste de matracas y purga de sistema de aire",
            quantity: 1,
            unitPriceCents: 100000, // $1,000 (50% = $500)
            totalCents: 100000,
            sortOrder: 0,
          },
        ],
      },
    },
  });

  await prisma.workOrder.create({
    data: {
      number: "OT-SIM-105",
      quoteId: quote5.id,
      status: WorkOrderStatus.COMPLETED,
      completedAt: new Date("2026-08-28T15:15:00Z"),
      assignments: {
        create: { workerId: worker2.id, status: AssignmentStatus.DONE },
      },
    },
  });

  // ORDEN 6 - Especial Taller Externo: Sábado 29 Agosto 2026
  const quote6 = await prisma.quote.create({
    data: {
      number: "COT-SIM-106",
      title: "Torneado de tambores y bujes especiales",
      status: QuoteStatus.APPROVED,
      customerId: customerC.id,
      vehicleId: vehicle3.id,
      operationalDate: new Date("2026-08-29T12:00:00Z"),
      subtotalCents: 80000,
      totalCents: 80000,
      taxEnabled: false,
      items: {
        create: [
          {
            type: QuoteItemType.LABOR,
            description: "Torneado y rectificación de tambores",
            quantity: 1,
            unitPriceCents: 80000, // $800 (50% = $400)
            totalCents: 80000,
            sortOrder: 0,
          },
        ],
      },
    },
  });

  await prisma.workOrder.create({
    data: {
      number: "OT-SIM-106",
      quoteId: quote6.id,
      status: WorkOrderStatus.COMPLETED,
      completedAt: new Date("2026-08-29T13:30:00Z"),
      isSpecial: true,
      specialAssigneeName: "Taller Torno Hermanos",
    },
  });

  console.log("🎉 Simulación con 10 trabajos creada con éxito!");
  console.log("📊 Maestro Juan Hernández tiene 10 conceptos de mano de obra en el período 24–29 de agosto de 2026.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
