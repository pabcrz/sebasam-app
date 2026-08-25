import { requireProfileForPage } from "@/lib/auth/session";

export default async function DocumentLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireProfileForPage();
  return children;
}
