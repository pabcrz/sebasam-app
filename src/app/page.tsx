import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getRootRedirectPath } from "@/lib/auth/root-redirect";

export default async function RootPage() {
  const user = await getCurrentUser();
  redirect(getRootRedirectPath(user));
}
