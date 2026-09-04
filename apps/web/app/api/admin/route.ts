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
	const view = new URL(request.url).searchParams.get("view");
	const allowedStatuses = ["pendente", "aprovado", "rejeitado", "expirado"];
	if (status && !allowedStatuses.includes(status)) {
		return NextResponse.json({ error: "Status inválido" }, { status: 400 });
	}

	try {
		const sql = getDatabase();
		if (view === "clientes") {
			const users = await sql`
				select id, name, email, score_contribuicoes, created_at
				from users
				order by created_at desc
				limit 500
			`;
			return NextResponse.json({ users });
		}
		if (view === "mercados") {
			const markets = await sql`
				select id, name, address, latitude, longitude, created_at
				from supermarkets
				order by name
			`;
			return NextResponse.json({ markets });
		}
		if (view && view !== "precos") {
			return NextResponse.json({ error: "Visualização inválida" }, { status: 400 });
		}
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

export async function POST(request: Request) {
	const denied = unauthorized(request);
	if (denied) return denied;

	try {
		const body = await request.json() as Record<string, unknown>;
		const name = typeof body.name === "string" ? body.name.trim() : "";
		const address = typeof body.address === "string" ? body.address.trim() : "";
		const latitude = typeof body.latitude === "number" ? body.latitude : Number(body.latitude);
		const longitude = typeof body.longitude === "number" ? body.longitude : Number(body.longitude);
		if (!name || !address || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
			return NextResponse.json({ error: "Nome, endereço, latitude e longitude válidos são obrigatórios" }, { status: 400 });
		}

		const sql = getDatabase();
		const markets = await sql`
			insert into supermarkets (id, name, address, latitude, longitude)
			select gen_random_uuid(), ${name}, ${address}, ${latitude}, ${longitude}
			where not exists (
				select 1 from supermarkets
				where lower(name) = lower(${name}) and lower(address) = lower(${address})
			)
			returning id, name, address, latitude, longitude, created_at
		`;
		if (markets.length === 0) return NextResponse.json({ error: "Este mercado já está cadastrado" }, { status: 409 });
		return NextResponse.json({ market: markets[0] }, { status: 201 });
	} catch (error) {
		console.error("admin_market_create_error", error);
		return NextResponse.json({ error: "Não foi possível cadastrar o mercado" }, { status: 500 });
	}
}

export async function DELETE(request: Request) {
	const denied = unauthorized(request);
	if (denied) return denied;

	try {
		const body = await request.json() as Record<string, unknown>;
		const marketId = typeof body.marketId === "string" ? body.marketId : "";
		if (marketId) {
			const sql = getDatabase();
			const linkedPrices = await sql`select count(*)::int as count from prices where supermarket_id = ${marketId}`;
			if (Number(linkedPrices[0]?.count ?? 0) > 0) {
				return NextResponse.json({ error: "Não é possível excluir um mercado que possui preços cadastrados" }, { status: 409 });
			}
			const markets = await sql`delete from supermarkets where id = ${marketId} returning id`;
			if (markets.length === 0) return NextResponse.json({ error: "Mercado não encontrado" }, { status: 404 });
			return NextResponse.json({ deleted: true, marketId });
		}
		const priceId = typeof body.priceId === "string" ? body.priceId : "";
		if (!priceId) return NextResponse.json({ error: "priceId é obrigatório" }, { status: 400 });

		const sql = getDatabase();
		const prices = await sql`
			delete from prices
			where id = ${priceId} and status = 'aprovado'
			returning id
		`;
		if (prices.length === 0) {
			return NextResponse.json({ error: "Somente preços aprovados podem ser deletados" }, { status: 404 });
		}
		return NextResponse.json({ deleted: true, priceId });
	} catch (error) {
		console.error("admin_price_delete_error", error);
		return NextResponse.json({ error: "Não foi possível deletar o preço" }, { status: 500 });
	}
}

export async function PUT(request: Request) {
	const denied = unauthorized(request);
	if (denied) return denied;

	try {
		const body = await request.json() as Record<string, unknown>;
		const marketId = typeof body.marketId === "string" ? body.marketId : "";
		const name = typeof body.name === "string" ? body.name.trim() : "";
		const address = typeof body.address === "string" ? body.address.trim() : "";
		const latitude = typeof body.latitude === "number" ? body.latitude : Number(body.latitude);
		const longitude = typeof body.longitude === "number" ? body.longitude : Number(body.longitude);
		if (!marketId || !name || !address || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
			return NextResponse.json({ error: "Mercado, nome, endereço, latitude e longitude válidos são obrigatórios" }, { status: 400 });
		}

		const sql = getDatabase();
		const markets = await sql`
			update supermarkets
			set name = ${name}, address = ${address}, latitude = ${latitude}, longitude = ${longitude}
			where id = ${marketId}
			returning id, name, address, latitude, longitude, created_at
		`;
		if (markets.length === 0) return NextResponse.json({ error: "Mercado não encontrado" }, { status: 404 });
		return NextResponse.json({ market: markets[0] });
	} catch (error) {
		console.error("admin_market_update_error", error);
		return NextResponse.json({ error: "Não foi possível alterar o mercado" }, { status: 500 });
	}
}