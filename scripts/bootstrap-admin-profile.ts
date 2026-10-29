import { type UserRole } from "@/generated/prisma/client";
import { createPrismaClient } from "@/lib/prisma-client";

const prisma = createPrismaClient();

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function readRole(): Extract<UserRole, "ADMIN" | "ADMIN_ASSISTANT"> {
  const value = process.env.BOOTSTRAP_ROLE?.trim() || "ADMIN";

  if (value !== "ADMIN" && value !== "ADMIN_ASSISTANT") {
    throw new Error("BOOTSTRAP_ROLE must be ADMIN or ADMIN_ASSISTANT.");
  }

  return value;
}

async function main() {
  const id = readRequiredEnv("BOOTSTRAP_AUTH_USER_ID");
  const username = readRequiredEnv("BOOTSTRAP_USERNAME").toLowerCase();
  const email = readRequiredEnv("BOOTSTRAP_EMAIL").toLowerCase();
  const displayName = process.env.BOOTSTRAP_DISPLAY_NAME?.trim() || username;
  const role = readRole();

  if (!uuidPattern.test(id)) {
    throw new Error("BOOTSTRAP_AUTH_USER_ID must be the Supabase Auth user UUID.");
  }

  const profile = await prisma.userProfile.upsert({
    where: { id },
    update: {
      username,
      email,
      displayName,
      role,
      workerKind: null,
      isActive: true,
    },
    create: {
      id,
      username,
      email,
      displayName,
      role,
      workerKind: null,
      isActive: true,
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  console.log("Bootstrapped UserProfile:", profile);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });
