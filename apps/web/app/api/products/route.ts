import { NextResponse } from "next/server";
import { getDatabase } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = getDatabase();
    const products = await sql`
      select id, name, brand, category
      from products
      order by name
      limit 100
    `;
    return NextResponse.json({ products });
  } catch (error) {
    console.error("products_api_error", error);
    return NextResponse.json(
      { error: "Banco de dados indisponível" },
      { status: 503 },
    );
  }
}
