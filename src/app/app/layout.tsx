import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <AppShell>{children}</AppShell>;
}
