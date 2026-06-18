import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

function loadLocalEnv() {
  if (!existsSync(".env")) {
    return;
  }

  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=").trim().replace(/^['\"]|['\"]$/g, "");

    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

const internalEmailDomain = "sebasam.local";

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function usernameToInternalEmail(username: string) {
  return `${username}@${internalEmailDomain}`;
}

async function main() {
  loadLocalEnv();

  const supabaseUrl = readRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const username = normalizeUsername(readRequiredEnv("AUTH_USERNAME"));
  const password = readRequiredEnv("AUTH_PASSWORD");
  const authUserId = readOptionalEnv("AUTH_USER_ID");
  const email = usernameToInternalEmail(username);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  if (authUserId) {
    const { data, error } = await supabase.auth.admin.updateUserById(authUserId, {
      email,
      email_confirm: true,
      password,
      user_metadata: { username },
    });

    if (error) {
      throw error;
    }

    console.log("Updated Auth user password:", {
      id: data.user.id,
      email: data.user.email,
      username,
    });

    return;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: { username },
  });

  if (error) {
    throw new Error(
      `${error.message}. If the Auth user already exists, rerun with AUTH_USER_ID to reset the password.`,
    );
  }

  console.log("Created Auth user:", {
    id: data.user.id,
    email: data.user.email,
    username,
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
