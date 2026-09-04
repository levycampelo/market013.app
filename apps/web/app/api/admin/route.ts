import { NextResponse } from "next/server";
import { isAdmin, readSession } from "../../../lib/auth";
import { getDatabase } from "../../../lib/db";

export const dynamic = "force-dynamic";

function unauthorized(request: Request) {
	const user = readSession(request);
	if (!user) return NextResponse.json({ error: "Autenticação necessária" }, { status: 401 });
	if (!isAdmin(user)) return NextResponse.json({ error: "Acesso administrativo negado" }, { status: 403 });
	return null;
}

export async function GET(request: Request) {
	const denied = unauthorized(request);
	if (denied) return denied;

	const status = new URL(request.url).searchParams.get("status");
	const allowedStatuses = ["pendente", "aprovado", "rejeitado", "expirado"];
	if (status && !allowedStatuses.includes(status)) {
		return NextResponse.json({ error: "Status inválido" }, { status: 400 });
	}

	try {
		const sql = getDatabase();
		const prices = status ? await sql`
			select
				pr.id,
				pr.product_id,
				p.name as product_name,
				pr.supermarket_id,
				s.name as supermarket_name,
				pr.price::float8,
				pr.source,
				pr.status,
				pr.observed_at,
				pr.created_at,
				u.name as contributor_name,
				u.email as contributor_email
			from prices pr
			join products p on p.id = pr.product_id
			join supermarkets s on s.id = pr.supermarket_id
			left join users u on u.id = pr.user_id
			where pr.status = ${status}
			order by pr.created_at desc
			limit 500
		` : await sql`
			select
				pr.id,
				pr.product_id,
				p.name as product_name,
				pr.supermarket_id,
				s.name as supermarket_name,
				pr.price::float8,
				pr.source,
				pr.status,
				pr.observed_at,
				pr.created_at,
				u.name as contributor_name,
				u.email as contributor_email
			from prices pr
			join products p on p.id = pr.product_id
			join supermarkets s on s.id = pr.supermarket_id
			left join users u on u.id = pr.user_id
			order by pr.created_at desc
			limit 500
		`;
		const summary = await sql`
			select status, count(*)::int as count
			from prices
			group by status
			order by status
		`;
		return NextResponse.json({ prices, summary });
	} catch (error) {
		console.error("admin_prices_list_error", error);
		return NextResponse.json({ error: "Não foi possível carregar a administração" }, { status: 503 });
	}
}

export async function PATCH(request: Request) {
	const denied = unauthorized(request);
	if (denied) return denied;

	try {
		const body = await request.json() as Record<string, unknown>;
		const priceId = typeof body.priceId === "string" ? body.priceId : "";
		const status = typeof body.status === "string" ? body.status : "";
		if (!priceId || !["aprovado", "rejeitado"].includes(status)) {
			return NextResponse.json({ error: "priceId e status aprovado ou rejeitado são obrigatórios" }, { status: 400 });
		}

		const sql = getDatabase();
		const prices = await sql`
			update prices
			set status = ${status}
			where id = ${priceId}
			returning id, status
		`;
		if (prices.length === 0) return NextResponse.json({ error: "Preço não encontrado" }, { status: 404 });
		return NextResponse.json({ price: prices[0] });
	} catch (error) {
		console.error("admin_price_update_error", error);
		return NextResponse.json({ error: "Não foi possível atualizar o preço" }, { status: 500 });
	}
}