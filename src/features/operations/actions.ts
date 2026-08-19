"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { OperationalWorkStatus, Prisma, QuoteItemType, QuoteStatus, type Prisma as PrismaTypes } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { nextQuoteNumber, nextOperationalWorkNumber } from "@/features/quotes/lib/sequence";
import { operationalWorkInputSchema, operationalWorkUpdateSchema } from "./schemas";
import { assertOperationalIdentity, normalizeOperationalConcepts, OperationalWorkValidationError } from "./domain";

const operationsPath = "/admin/operations";

type DbClient = PrismaTypes.TransactionClient;

async function assertActiveMaster(tx: DbClient, masterId: string) {
  const master = await tx.userProfile.findFirst({
    where: { id: masterId, role: "WORKER", workerKind: "MASTER", isActive: true },
    select: { id: true },
  });
  if (!master) throw new OperationalWorkValidationError("The selected master is not active or valid.");
}

async function assertCustomer(tx: DbClient, customerId: string | null) {
  if (!customerId) return;
  const customer = await tx.customer.findUnique({ where: { id: customerId }, select: { id: true } });
  if (!customer) throw new OperationalWorkValidationError("Customer not found.");
}

function parseInput(input: unknown) {
  const parsed = operationalWorkInputSchema.parse(input);
  assertOperationalIdentity(parsed);
  return parsed;
}

export async function createOperationalWork(input: unknown) {
  await requireOperationalRole();
  const data = parseInput(input);
  const concepts = normalizeOperationalConcepts(data.concepts);

  const created = await prisma.$transaction(async (tx) => {
    await assertActiveMaster(tx, data.masterId);
    await assertCustomer(tx, data.customerId);
    return tx.operationalWork.create({
      data: {
        id: randomUUID(),
        number: await nextOperationalWorkNumber(tx),
        masterId: data.masterId,
        customerId: data.customerId,
        plate: data.plate,
        brand: data.brand,
        model: data.model,
        report: data.report,
        notes: data.notes,
        concepts: { create: concepts },
      },
      include: { concepts: true },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  revalidatePath(operationsPath);
  return created;
}

export async function updateOperationalWork(operationalWorkId: string, input: unknown) {
  await requireOperationalRole();
  const data = operationalWorkUpdateSchema.parse({ ...((input ?? {}) as object), operationalWorkId });
  assertOperationalIdentity(data);
  const concepts = normalizeOperationalConcepts(data.concepts);

  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.operationalWork.findUnique({ where: { id: operationalWorkId }, select: { status: true } });
    if (!existing) throw new OperationalWorkValidationError("Operational work not found.");
    if (existing.status !== OperationalWorkStatus.OPEN) throw new OperationalWorkValidationError("Only open operational work can be edited.");
    await assertActiveMaster(tx, data.masterId);
    await assertCustomer(tx, data.customerId);
    await tx.operationalConcept.deleteMany({ where: { operationalWorkId } });
    return tx.operationalWork.update({
      where: { id: operationalWorkId },
      data: {
        masterId: data.masterId,
        customerId: data.customerId,
        plate: data.plate,
        brand: data.brand,
        model: data.model,
        report: data.report,
        notes: data.notes,
        concepts: { create: concepts },
      },
      include: { concepts: { orderBy: { sortOrder: "asc" } } },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  revalidatePath(operationsPath);
  revalidatePath(`${operationsPath}/${operationalWorkId}`);
  return updated;
}

export async function convertOperationalWorkToQuote(operationalWorkId: string) {
  await requireOperationalRole();
  try {
    const quote = await prisma.$transaction(async (tx) => {
      const work = await tx.operationalWork.findUnique({
        where: { id: operationalWorkId },
        include: { concepts: { orderBy: { sortOrder: "asc" } } },
      });
      if (!work) throw new OperationalWorkValidationError("Operational work not found.");
      await assertActiveMaster(tx, work.masterId);
      if (work.convertedQuoteId) return tx.quote.findUniqueOrThrow({ where: { id: work.convertedQuoteId } });
      if (work.status !== OperationalWorkStatus.OPEN) throw new OperationalWorkValidationError("Operational work cannot be converted.");

      const quoteId = randomUUID();
      const created = await tx.quote.create({
        data: {
          id: quoteId,
          number: await nextQuoteNumber(tx),
          status: QuoteStatus.DRAFT,
          customerId: work.customerId,
          title: `Trabajo operativo ${work.number}`,
          description: work.report,
          vehicleSnapshot: work.plate || work.brand || work.model ? { plate: work.plate, brand: work.brand, model: work.model, color: null, year: null } : Prisma.JsonNull,
          subtotalCents: null,
          discountCents: 0,
          taxCents: null,
          totalCents: null,
          taxEnabled: true,
          operationalDate: work.createdAt,
          sections: {
            create: {
              name: "Trabajo operativo",
              sortOrder: 0,
              isAuthorized: false,
              items: {
                create: work.concepts.map((concept) => ({
                  quote: { connect: { id: quoteId } },
                  type: QuoteItemType.SERVICE,
                  description: concept.description,
                  quantity: concept.quantity,
                  unitPriceCents: null,
                  totalCents: null,
                  sortOrder: concept.sortOrder,
                })),
              },
            },
          },
        },
      });
      await tx.operationalWork.update({ where: { id: operationalWorkId }, data: { status: OperationalWorkStatus.CONVERTED, convertedQuoteId: created.id } });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath(operationsPath);
    revalidatePath(`${operationsPath}/${operationalWorkId}`);
    revalidatePath("/admin/quotes");
    return quote;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.operationalWork.findUniqueOrThrow({ where: { id: operationalWorkId }, select: { convertedQuoteId: true } });
      if (existing.convertedQuoteId) return prisma.quote.findUniqueOrThrow({ where: { id: existing.convertedQuoteId } });
    }
    throw error;
  }
}

export async function createOperationalWorkFromForm(formData: FormData) {
  const concepts = conceptsFromForm(formData);
  await createOperationalWork({
    masterId: formData.get("masterId"), customerId: formData.get("customerId"), plate: formData.get("plate"), brand: formData.get("brand"), model: formData.get("model"), report: formData.get("report"), notes: formData.get("notes"), concepts,
  });
  redirect(`${operationsPath}?created=1`);
}

export async function updateOperationalWorkFromForm(operationalWorkId: string, formData: FormData) {
  const concepts = conceptsFromForm(formData);
  await updateOperationalWork(operationalWorkId, {
    masterId: formData.get("masterId"), customerId: formData.get("customerId"), plate: formData.get("plate"), brand: formData.get("brand"), model: formData.get("model"), report: formData.get("report"), notes: formData.get("notes"), concepts,
  });
  redirect(`${operationsPath}/${operationalWorkId}?updated=1`);
}

function conceptsFromForm(formData: FormData) {
  const concepts: Array<{ description: string; quantity: number }> = [];
  for (let index = 0; formData.has(`concept-description-${index}`); index += 1) {
    concepts.push({
      description: String(formData.get(`concept-description-${index}`) ?? ""),
      quantity: Number(formData.get(`concept-quantity-${index}`)),
    });
  }
  return concepts;
}

export async function convertOperationalWorkFromForm(formData: FormData) {
  const id = String(formData.get("operationalWorkId"));
  const quote = await convertOperationalWorkToQuote(id);
  redirect(`/admin/quotes/${quote.id}/edit`);
}
