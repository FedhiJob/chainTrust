import { clearAuthCookie } from "@/lib/auth";
import { failure, success } from "@/lib/response";
import { assertSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) {
    return failure("Cross-site request blocked", 403);
  }

  await clearAuthCookie();
  return success({});
}
