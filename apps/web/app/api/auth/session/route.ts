import { NextResponse } from "next/server";
import { readSession } from "../../../../../lib/auth";

export function GET(request: Request) {
  const user = readSession(request);
  return user ? NextResponse.json({ user }) : NextResponse.json({ user: null }, { status: 401 });
}