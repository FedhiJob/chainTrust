import { cookies } from "next/headers";
import { success } from "@/lib/response";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set({
    name: "token",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return success({});
}
