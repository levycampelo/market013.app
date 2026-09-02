import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "market013-web",
    environment: process.env.VERCEL_ENV ?? "local",
    timestamp: new Date().toISOString(),
  });
}
