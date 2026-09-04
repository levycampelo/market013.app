import { NextResponse } from "next/server";
import { getDatabase } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
  const normalizedQuery = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  try {
    const sql = getDatabase();
    const products = normalizedQuery ? await sql`
      select
        p.id,
        p.name,
        p.brand,
        p.category,
        min(pr.price)::float8 as lowest_price,
        count(distinct pr.supermarket_id)::int as market_count,
        max(pr.observed_at) as latest_observed_at
      from products p
      left join prices pr on pr.product_id = p.id and pr.status = 'aprovado'
      where translate(lower(concat_ws(' ', p.name, p.brand, p.category)), 'áàãâäéèêëíìîïóòõôöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') like ${`%${normalizedQuery}%`}
      group by p.id, p.name, p.brand, p.category
      order by p.name
      limit 100
    ` : await sql`
      select
        p.id,
        p.name,
        p.brand,
        p.category,
        min(pr.price)::float8 as lowest_price,
        count(distinct pr.supermarket_id)::int as market_count,
        max(pr.observed_at) as latest_observed_at
      from products p
      left join prices pr on pr.product_id = p.id and pr.status = 'aprovado'
      group by p.id, p.name, p.brand, p.category
      order by p.name
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
