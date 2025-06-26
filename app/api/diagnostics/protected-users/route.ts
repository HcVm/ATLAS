// app/api/diagnostics/protected-users/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/users`, {
    headers: {
      Cookie: req.headers.get("cookie") || "",
    },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
