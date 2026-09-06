-- Habilitar RLS en todas las tablas operativas del esquema public
ALTER TABLE "UserProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vehicle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Quote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SharedQuote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuoteDecision" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuoteLifecycleEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuoteSection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuoteItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExecutionRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerFiscalProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentApplication" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LedgerEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BankAccount" ENABLE ROW LEVEL SECURITY;

-- Revocar permisos DDL/DML a roles anon y authenticated de PostgREST
-- (incluye _prisma_migrations y cualquier tabla futura en public)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated;

-- Prevenir permisos automáticos a anon/authenticated en tablas futuras
-- creadas por el rol postgres (rol que ejecuta las migraciones Prisma)
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon, authenticated;
