import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getSessionUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSessionUserId()) redirect("/app");
  return <AuthForm />;
}
