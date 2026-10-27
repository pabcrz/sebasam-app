import { createPrismaClient } from "@/lib/prisma-client";

const prisma = createPrismaClient();

const ALLOWED_USERNAMES = ["pablo", "fede", "andres", "marco", "alfa", "cuco", "roberto"];

async function main() {
  console.log("🧹 Iniciando limpieza completa de base de datos...");

  // 1. Limpiar pagos y aplicaciones contables (respetando foreign keys)
  console.log("-> Limpiando pagos, transacciones y cuentas contables...");
  try {
    await prisma.$executeRawUnsafe('DELETE FROM "PaymentCorrectionApplication";');
    await prisma.$executeRawUnsafe('DELETE FROM "PaymentCorrection";');
  } catch {
    // Ignorar si no existen en todos los entornos
  }
  await prisma.ledgerEntry.deleteMany({});
  await prisma.paymentApplication.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.paymentRequest.deleteMany({});

  // 2. Limpiar órdenes de trabajo, asignaciones y ejecuciones
  console.log("-> Limpiando órdenes de trabajo y asignaciones...");
  await prisma.executionRecord.deleteMany({});
  await prisma.workAssignment.deleteMany({});
  await prisma.workOrder.deleteMany({});

  // 3. Limpiar cotizaciones y sus relaciones
  console.log("-> Limpiando cotizaciones, ítems y secciones...");
  await prisma.quoteLifecycleEvent.deleteMany({});
  await prisma.quoteDecision.deleteMany({});
  await prisma.sharedQuote.deleteMany({});
  await prisma.quoteItem.deleteMany({});
  await prisma.quoteSection.deleteMany({});
  await prisma.quote.deleteMany({});

  // 4. Limpiar vehículos y clientes
  console.log("-> Limpiando vehículos y clientes...");
  await prisma.customerFiscalProfile.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.customer.deleteMany({});

  // 5. Eliminar usuarios no autorizados (conservando solo fede, andres, alfa, cuco, roberto y super admin)
  console.log("-> Depurando usuarios...");
  const usersToDelete = await prisma.userProfile.findMany({
    where: {
      AND: [
        { username: { notIn: ALLOWED_USERNAMES } },
        { role: { not: "SUPER_ADMIN" } },
      ],
    },
    select: { id: true, username: true, displayName: true },
  });

  if (usersToDelete.length > 0) {
    for (const u of usersToDelete) {
      await prisma.userProfile.delete({ where: { id: u.id } });
      console.log(`   - Usuario eliminado: ${u.displayName} (@${u.username})`);
    }
  }

  // 6. Reporte final de usuarios conservados
  const remainingUsers = await prisma.userProfile.findMany({
    select: { id: true, username: true, displayName: true, role: true, workerKind: true },
    orderBy: { createdAt: "asc" },
  });

  console.log("\n✅ Limpieza completada con éxito!");
  console.log("👥 Usuarios conservados en la base de datos:");
  remainingUsers.forEach((u) => {
    console.log(`   • ${u.displayName} (@${u.username}) - Rol: ${u.role}${u.workerKind ? ` (${u.workerKind})` : ""}`);
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error durante la limpieza:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
