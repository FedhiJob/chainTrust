import { NextResponse } from "next/server";
import { getSecurityHeaders } from "./security";

export function success<T>(data: T, status = 200) {
  return NextResponse.json(
    { success: true, data },
    {
      status,
      headers: getSecurityHeaders(),
    }
  );
}

export function failure(message: string, status = 400, headers?: HeadersInit) {
  return NextResponse.json(
    { success: false, message },
    {
      status,
      headers: {
        ...getSecurityHeaders(),
        ...headers,
      },
    }
  );
}
