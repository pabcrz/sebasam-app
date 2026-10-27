import { createPrismaClient } from "@/lib/prisma-client";

const prisma = createPrismaClient();

async function main() {
  await prisma.customer.upsert({
    where: { id: "seed-customer-sebasam" },
    update: {},
    create: {
      id: "seed-customer-sebasam",
      name: "Sample Customer",
      email: "operations@example.com",
      phone: "+1 555 0100",
      notes: "Safe local seed record. Replace before real operations.",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
