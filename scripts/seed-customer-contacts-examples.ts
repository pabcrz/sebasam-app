import { PrismaClient, CustomerContactRole, CustomerStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Sembrando ejemplos de clientes con contactos, operadores y ECO...");

  // Caso 1: Juan Pérez (Auto-patrón) con chofer "El Mariachi"
  const juan = await prisma.customer.upsert({
    where: { id: "customer-example-juan-perez" },
    update: {
      name: "Juan Pérez",
      phone: "+52 55 1234 5678",
      email: "juan.perez@example.com",
      status: CustomerStatus.ACTIVE,
      notes: "Auto-patrón. Trabaja con chofer de confianza 'El Mariachi'.",
    },
    create: {
      id: "customer-example-juan-perez",
      name: "Juan Pérez",
      phone: "+52 55 1234 5678",
      email: "juan.perez@example.com",
      status: CustomerStatus.ACTIVE,
      notes: "Auto-patrón. Trabaja con chofer de confianza 'El Mariachi'.",
    },
  });

  await prisma.customerContact.upsert({
    where: { id: "contact-example-el-mariachi" },
    update: {
      customerId: juan.id,
      name: "El Mariachi (Chofer)",
      phone: "+52 55 1234 5678",
      role: CustomerContactRole.DRIVER,
      isActive: true,
    },
    create: {
      id: "contact-example-el-mariachi",
      customerId: juan.id,
      name: "El Mariachi (Chofer)",
      phone: "+52 55 1234 5678",
      role: CustomerContactRole.DRIVER,
      isActive: true,
    },
  });

  // Caso 2: Grúas Mejía (Empresa) con Razón Social y chofer "Juanito"
  const gruasMejia = await prisma.customer.upsert({
    where: { id: "customer-example-gruas-mejia" },
    update: {
      name: "Grúas Mejía",
      legalName: "Grúas Mejía Cuautla S.A. de C.V.",
      phone: "+52 55 8765 4321",
      email: "contacto@gruasmejia.example.com",
      status: CustomerStatus.ACTIVE,
      notes: "Empresa de grúas y arrastre. Factura a Grúas Mejía Cuautla S.A. de C.V.",
    },
    create: {
      id: "customer-example-gruas-mejia",
      name: "Grúas Mejía",
      legalName: "Grúas Mejía Cuautla S.A. de C.V.",
      phone: "+52 55 8765 4321",
      email: "contacto@gruasmejia.example.com",
      status: CustomerStatus.ACTIVE,
      notes: "Empresa de grúas y arrastre. Factura a Grúas Mejía Cuautla S.A. de C.V.",
    },
  });

  await prisma.customerContact.upsert({
    where: { id: "contact-example-juanito" },
    update: {
      customerId: gruasMejia.id,
      name: "Juanito (Operador)",
      phone: "+52 55 8765 4321",
      role: CustomerContactRole.DRIVER,
      isActive: true,
    },
    create: {
      id: "contact-example-juanito",
      customerId: gruasMejia.id,
      name: "Juanito (Operador)",
      phone: "+52 55 8765 4321",
      role: CustomerContactRole.DRIVER,
      isActive: true,
    },
  });

  // Caso 3: The Bimb's (Empresa) con Encargado "Adán" y Unidad con ECO
  const theBimbs = await prisma.customer.upsert({
    where: { id: "customer-example-the-bimbs" },
    update: {
      name: "The Bimb's",
      legalName: "Distribuidora The Bimbs S.A. de C.V.",
      phone: "+52 55 9988 7766",
      email: "logistica@thebimbs.example.com",
      status: CustomerStatus.ACTIVE,
      notes: "Empresa de transporte. Contacto centralizado con el encargado Adán. Operación filtrada por ECO y placas.",
    },
    create: {
      id: "customer-example-the-bimbs",
      name: "The Bimb's",
      legalName: "Distribuidora The Bimbs S.A. de C.V.",
      phone: "+52 55 9988 7766",
      email: "logistica@thebimbs.example.com",
      status: CustomerStatus.ACTIVE,
      notes: "Empresa de transporte. Contacto centralizado con el encargado Adán. Operación filtrada por ECO y placas.",
    },
  });

  await prisma.customerContact.upsert({
    where: { id: "contact-example-adan" },
    update: {
      customerId: theBimbs.id,
      name: "Adán (Encargado Operativo)",
      phone: "+52 55 9988 7766",
      role: CustomerContactRole.CONTACT,
      isActive: true,
    },
    create: {
      id: "contact-example-adan",
      customerId: theBimbs.id,
      name: "Adán (Encargado Operativo)",
      phone: "+52 55 9988 7766",
      role: CustomerContactRole.CONTACT,
      isActive: true,
    },
  });

  await prisma.vehicle.upsert({
    where: { id: "vehicle-example-the-bimbs-eco-104" },
    update: {
      customerId: theBimbs.id,
      economicNumber: "ECO-104",
      plate: "ABC-123",
      brand: "Kenworth",
      model: "T680",
      year: 2022,
      color: "Blanco",
      notes: "Tractocamión asignado a ruta foránea.",
    },
    create: {
      id: "vehicle-example-the-bimbs-eco-104",
      customerId: theBimbs.id,
      economicNumber: "ECO-104",
      plate: "ABC-123",
      brand: "Kenworth",
      model: "T680",
      year: 2022,
      color: "Blanco",
      notes: "Tractocamión asignado a ruta foránea.",
    },
  });

  console.log("✅ Ejemplos sembrados exitosamente en la base de datos:");
  console.log("   1. Juan Pérez -> Chofer: El Mariachi (+52 55 1234 5678)");
  console.log("   2. Grúas Mejía (Razón Social: Grúas Mejía Cuautla S.A. de C.V.) -> Chofer: Juanito (+52 55 8765 4321)");
  console.log("   3. The Bimb's -> Encargado: Adán (+52 55 9988 7766) & Unidad ECO-104 (Placas: ABC-123)");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error al sembrar ejemplos:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
