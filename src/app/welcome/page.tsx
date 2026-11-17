import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Onboarding } from "@/components/onboarding";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return <Onboarding name={user.name} role={user.role} />;
}
