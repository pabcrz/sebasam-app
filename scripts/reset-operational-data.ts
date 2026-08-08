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

  // 4. Update quotes: reset SENT or REJECTED quotes back to APPROVED so they can be assigned as jobs
  const updatedQuotes = await prisma.quote.updateMany({
    where: {
      status: {
        in: [QuoteStatus.SENT, QuoteStatus.APPROVED],
      },
    },
    data: {
      status: QuoteStatus.APPROVED,
      approvedAt: new Date(),
    },
  });
  console.log(`Reset ${updatedQuotes.count} quotes to APPROVED status (ready for work assignment).`);

  console.log("Operational data reset complete! All quotes are fresh and ready to be assigned as work orders.");
}

resetOperationalData()
  .catch((err) => {
    console.error("Error resetting operational data:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
