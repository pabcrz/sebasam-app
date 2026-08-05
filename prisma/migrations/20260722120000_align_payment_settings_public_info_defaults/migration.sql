-- Align new rows with the populated defaults used by the Prisma schema.
ALTER TABLE "PaymentSettings"
ALTER COLUMN "services" SET DEFAULT ARRAY['Alineación de ejes', 'Brio a muelles', 'Refuerzos', 'Soldadura']::TEXT[],
ALTER COLUMN "products" SET DEFAULT ARRAY['Abrazaderas', 'Bujes', 'Perchas', 'Columpios', 'Tensores', 'Balancines']::TEXT[];
