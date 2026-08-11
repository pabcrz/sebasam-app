"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { DuplicateWorkerError, WorkerNotFoundError } from "./domain";
import { workerInputSchema, type WorkerInput } from "./schemas";

const workersPath = "/admin/workers";

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function toWorkerData(data: WorkerInput) {
  return {
    displayName: data.displayName,
    username: data.username,
    email: data.email,
    role: UserRole.WORKER,
    workerKind: data.workerKind,
  };
}

async function requireWorker(workerId: string) {
  const worker = await prisma.userProfile.findFirst({
    where: { id: workerId, role: UserRole.WORKER },
    select: { id: true },
  });

  if (!worker) {
    throw new WorkerNotFoundError();
  }
}

export async function createWorker(input: unknown) {
  await requireOperationalRole();

  const data = workerInputSchema.parse(input);

  try {
    return await prisma.userProfile.create({
      data: {
        id: randomUUID(),
        ...toWorkerData(data),
        isActive: true,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new DuplicateWorkerError();
    }
    throw error;
  }
}

export async function updateWorker(workerId: string, input: unknown) {
  await requireOperationalRole();

  const data = workerInputSchema.parse(input);
  await requireWorker(workerId);

  try {
    return await prisma.userProfile.update({
      where: { id: workerId },
      data: toWorkerData(data),
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new DuplicateWorkerError();
    }
    throw error;
  }
}

export async function setWorkerActive(workerId: string, isActive: boolean) {
  await requireOperationalRole();
  await requireWorker(workerId);

  return prisma.userProfile.update({
    where: { id: workerId },
    data: { isActive },
  });
}

function workerFormDataToInput(formData: FormData) {
  return {
    displayName: formData.get("displayName"),
    username: formData.get("username"),
    workerKind: formData.get("workerKind"),
  };
}

function redirectForWorkerError(path: string, error: unknown): never {
  if (error instanceof DuplicateWorkerError) {
    redirect(`${path}?error=duplicate`);
  }
  throw error;
}

function getWorkerReturnPath(formData: FormData, fallbackPath: string) {
  return formData.get("returnTo") === "/admin/workers" ? "/admin/workers" : fallbackPath;
}

export async function createWorkerFromForm(formData: FormData) {
  await requireOperationalRole();

  const parsed = workerInputSchema.safeParse(workerFormDataToInput(formData));
  if (!parsed.success) {
    redirect(`${workersPath}?error=invalid`);
  }

  try {
    await createWorker(parsed.data);
  } catch (error) {
    redirectForWorkerError(workersPath, error);
  }

  revalidatePath(workersPath);
  redirect(`${workersPath}?created=1`);
}

export async function updateWorkerFromForm(workerId: string, formData: FormData) {
  await requireOperationalRole();

  const parsed = workerInputSchema.safeParse(workerFormDataToInput(formData));
  const editPath = `${workersPath}/${workerId}/edit`;
  const returnPath = getWorkerReturnPath(formData, editPath);
  if (!parsed.success) {
    redirect(`${returnPath}?error=invalid`);
  }

  try {
    await updateWorker(workerId, parsed.data);
  } catch (error) {
    redirectForWorkerError(returnPath, error);
  }

  revalidatePath(workersPath);
  revalidatePath(editPath);
  redirect(`${workersPath}?updated=1`);
}

export async function deleteWorker(workerId: string) {
  await requireOperationalRole();
  await requireWorker(workerId);

  return prisma.$transaction(async (tx) => {
    await tx.workAssignment.deleteMany({ where: { workerId } });
    await tx.executionRecord.deleteMany({ where: { workerId } });
    return tx.userProfile.delete({ where: { id: workerId } });
  });
}

export async function setWorkerActiveFromForm(workerId: string, formData: FormData) {
  await requireOperationalRole();

  const value = formData.get("isActive");
  const returnPath = getWorkerReturnPath(formData, `${workersPath}/${workerId}/edit`);
  if (value !== "true" && value !== "false") {
    redirect(`${returnPath}?error=invalid`);
  }

  await setWorkerActive(workerId, value === "true");
  revalidatePath(workersPath);
  revalidatePath(`${workersPath}/${workerId}/edit`);
  redirect(`${workersPath}?updated=1`);
}

export async function deleteWorkerFromForm(workerId: string, formData: FormData) {
  await requireOperationalRole();
  const returnPath = getWorkerReturnPath(formData, `${workersPath}/${workerId}/edit`);

  await deleteWorker(workerId);
  revalidatePath(workersPath);
  revalidatePath(returnPath);
  redirect(`${workersPath}?deleted=1`);
}

