import { NextResponse } from "next/server";
import { getDatabase } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const productId = new URL(request.url).searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "productId é obrigatório" }, { status: 400 });

  try {
    const sql = getDatabase();
    const prices = await sql`
      select pr.id, pr.product_id, pr.supermarket_id, pr.price::float8, pr.source,
        pr.observed_at, pr.status, s.name as supermarket_name, s.address as supermarket_address
      from prices pr
      join supermarkets s on s.id = pr.supermarket_id
      where pr.product_id = ${productId} and pr.status = 'aprovado'
      order by pr.price asc, pr.observed_at desc
    `;
    return NextResponse.json({ prices });
  } catch (error) {
    console.error("prices_api_error", error);
    return NextResponse.json({ error: "Preços indisponíveis" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const productId = typeof body.productId === "string" ? body.productId : "";
    const supermarketId = typeof body.supermarketId === "string" ? body.supermarketId : "";
    const price = typeof body.price === "number" ? body.price : Number(body.price);
    if (!productId || !supermarketId || !Number.isFinite(price) || price < 0 || price > 100000) {
      return NextResponse.json({ error: "Produto, mercado e preço válido são obrigatórios" }, { status: 400 });
    }

    const sql = getDatabase();
    const rows = await sql`
      insert into prices (id, product_id, supermarket_id, price, source, status)
      select gen_random_uuid(), ${productId}, ${supermarketId}, ${price}, 'colaborativo', 'pendente'
      where exists (select 1 from products where id = ${productId})
        and exists (select 1 from supermarkets where id = ${supermarketId})
      returning id, product_id, supermarket_id, price::float8, source, status, observed_at
    `;
    if (rows.length === 0) return NextResponse.json({ error: "Produto ou mercado não encontrado" }, { status: 404 });
    return NextResponse.json({ price: rows[0] }, { status: 201 });
  } catch (error) {
    console.error("price_creation_error", error);
    return NextResponse.json({ error: "Não foi possível cadastrar o preço" }, { status: 500 });
  }
}