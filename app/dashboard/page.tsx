import { redirect } from "next/navigation";
import { getAuthPayload } from "@/lib/auth";

export default async function DashboardIndex() {
  const auth = await getAuthPayload();

  if (!auth) {
    redirect("/login");
  }

  if (auth.role === "admin") {
    redirect("/dashboard/admin");
  }

  if (auth.role === "distributor") {
    redirect("/dashboard/distributor");
  }

  if (auth.role === "receiver") {
    redirect("/dashboard/receiver");
  }

  redirect("/login");
}