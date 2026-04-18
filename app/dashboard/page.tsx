import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";

export default async function DashboardIndex() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "admin") {
    redirect("/dashboard/admin");
  }

  if (user.role === "distributor") {
    redirect("/dashboard/distributor");
  }

  if (user.role === "receiver") {
    redirect("/dashboard/receiver");
  }

  redirect("/login");
}
