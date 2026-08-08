import { PrismaClient, QuoteStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function resetOperationalData() {
  console.log("Starting operational data reset...");

  // 1. Delete all execution records
  const deletedExecutionRecords = await prisma.executionRecord.deleteMany({});
  console.log(`Deleted ${deletedExecutionRecords.count} execution records.`);

  // 2. Delete all work assignments
  const deletedAssignments = await prisma.workAssignment.deleteMany({});
  console.log(`Deleted ${deletedAssignments.count} work assignments.`);

  // 3. Delete all work orders
  const deletedWorkOrders = await prisma.workOrder.deleteMany({});
  console.log(`Deleted ${deletedWorkOrders.count} work orders.`);

  // 4. Reset ALL quotes back to DRAFT (borrador) status
  const updatedQuotes = await prisma.quote.updateMany({
    data: {
      status: QuoteStatus.DRAFT,
      approvedAt: null,
    },
  });
  console.log(`Reset ${updatedQuotes.count} quotes back to DRAFT status.`);

  console.log("Operational data reset complete! All quotes are back to DRAFT status.");
}

resetOperationalData()
  .catch((err) => {
    console.error("Error resetting operational data:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
