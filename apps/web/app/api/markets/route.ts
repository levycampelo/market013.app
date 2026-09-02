import { NextResponse } from "next/server";
import { getDatabase } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = getDatabase();
    const markets = await sql`
      select id, name, address, latitude, longitude
      from supermarkets
      order by name
    `;
    return NextResponse.json({ markets });
  } catch (error) {
    console.error("markets_api_error", error);
    return NextResponse.json({ error: "Mercados indisponíveis" }, { status: 503 });
  }
}