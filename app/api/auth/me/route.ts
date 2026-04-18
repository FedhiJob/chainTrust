import { clearAuthCookie, getAuthenticatedUserFromRequest } from "@/lib/auth";
import { failure, success } from "@/lib/response";

export async function GET() {
  try {
    const user = await getAuthenticatedUserFromRequest();
    if (!user) {
      await clearAuthCookie();
      return failure("Unauthorized", 401);
    }

    return success(user);
  } catch {
    return failure("Failed to fetch user", 500);
  }
}
