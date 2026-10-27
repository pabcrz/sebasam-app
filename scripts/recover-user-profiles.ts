import { Prisma, type PrismaClient, type UserRole } from "@/generated/prisma/client";
import { createPrismaClient } from "@/lib/prisma-client";

type AuthIdentity = {
  id: string;
  email: string | null;
  username: string | null;
};

type RecoveryAccount = {
  username: string;
  displayName: string;
  role: UserRole;
};

type RecoveryPlanItem = RecoveryAccount & {
  authIdentity: AuthIdentity | null;
};

export type RecoveryResult = {
  username: string;
  role: UserRole;
  status: "missing-auth-identity" | "upserted";
};

const recoveryAccounts = [
  { username: "pablo", displayName: "Pablo", role: "SUPER_ADMIN" },
  { username: "fede", displayName: "Fede", role: "ADMIN" },
  { username: "andres", displayName: "Andres", role: "ADMIN_ASSISTANT" },
] satisfies RecoveryAccount[];

const recoveryAccountsByUsername = new Map(
  recoveryAccounts.map((account) => [account.username, account]),
);

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function usernameFromIdentity({ email, username }: AuthIdentity) {
  return normalizeUsername(username || email?.split("@", 1)[0] || "");
}

export function buildProfileRecoveryPlan(authIdentities: AuthIdentity[]): RecoveryPlanItem[] {
  const identitiesByUsername = new Map<string, AuthIdentity>();

  for (const identity of authIdentities) {
    const username = usernameFromIdentity(identity);

    if (!recoveryAccountsByUsername.has(username)) {
      continue;
    }

    if (identitiesByUsername.has(username)) {
      throw new Error(`Multiple Auth identities match recovery username ${username}.`);
    }

    identitiesByUsername.set(username, identity);
  }

  return recoveryAccounts.map((account) => ({
    ...account,
    authIdentity: identitiesByUsername.get(account.username) ?? null,
  }));
}

type RecoveryDatabase = Pick<PrismaClient, "$queryRaw" | "userProfile">;

export async function recoverUserProfiles(prisma: RecoveryDatabase): Promise<RecoveryResult[]> {
  const usernames = recoveryAccounts.map((account) => account.username);
  const authIdentities = await prisma.$queryRaw<AuthIdentity[]>(Prisma.sql`
    SELECT id::text, email, raw_user_meta_data ->> 'username' AS username
    FROM auth.users
    WHERE lower(COALESCE(raw_user_meta_data ->> 'username', split_part(email, '@', 1))) IN (${Prisma.join(usernames)})
  `);
  const plan = buildProfileRecoveryPlan(authIdentities);
  const results: RecoveryResult[] = [];

  for (const item of plan) {
    if (!item.authIdentity || !item.authIdentity.email) {
      results.push({ username: item.username, role: item.role, status: "missing-auth-identity" });
      continue;
    }

    const profile = {
      username: item.username,
      email: item.authIdentity.email.toLowerCase(),
      displayName: item.displayName,
      role: item.role,
      workerKind: null,
      isActive: true,
    };

    await prisma.userProfile.upsert({
      where: { id: item.authIdentity.id },
      update: profile,
      create: { id: item.authIdentity.id, ...profile },
    });
    results.push({ username: item.username, role: item.role, status: "upserted" });
  }

  return results;
}

async function main() {
  const prisma = createPrismaClient();

  try {
    const results = await recoverUserProfiles(prisma);
    for (const result of results) {
      console.log(result);
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith("recover-user-profiles.ts")) {
  main().catch(() => {
    console.error("Profile recovery failed.");
    process.exit(1);
  });
}
