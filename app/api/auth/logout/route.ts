import { clearAuthCookie } from "@/lib/auth";
import { success } from "@/lib/response";

export async function POST() {
  await clearAuthCookie();
  return success({});
}
