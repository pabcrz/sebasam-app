"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireProfileForPasswordChange } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const loginPath = "/admin/login";
const internalEmailDomain = "sebasam.local";

function normalizeUsername(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function usernameToInternalEmail(username: string) {
  return `${username}@${internalEmailDomain}`;
}

export async function loginAdmin(formData: FormData) {
  const username = normalizeUsername(formData.get("username"));
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    redirect(`${loginPath}?error=missing`);
  }

  const email = usernameToInternalEmail(username);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`${loginPath}?error=invalid`);
  }

  redirect("/admin");
}

export async function logoutAdmin() {
  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut();

  redirect(loginPath);
}

export async function changePassword(formData: FormData): Promise<{ error?: string }> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  if (password !== confirmation) {
    return { error: "Las contraseñas no coinciden." };
  }

  const { user } = await requireProfileForPasswordChange();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: "No se pudo actualizar la contraseña. Inténtalo de nuevo." };
  }

  await prisma.userProfile.update({
    where: { id: user.id },
    data: { mustChangePassword: false },
  });

  redirect("/admin");
}
