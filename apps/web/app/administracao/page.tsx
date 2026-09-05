"use client";

import { FormEvent, useEffect, useState } from "react";
import BrandLogo from "../components/brand-logo";

type Price = {
	id: string;
	product_name: string;
	supermarket_name: string;
	price: number;
	source: string;
	status: string;
	observed_at: string;
	created_at: string;
	total_count: number;
	contributor_name: string | null;
	contributor_email: string | null;
};

type AdminData = { prices: Price[]; summary: { status: string; count: number }[]; counts: { markets: number; clients: number; prices: number; reports: number }[]; page: number; pageSize: number; total: number };
type Client = { id: string; name: string; email: string; score_contribuicoes: number; created_at: string };
type ClientsData = { users: Client[] };
type Market = { id: string; name: string; address: string; latitude: number; longitude: number; created_at: string };
type MarketsData = { markets: Market[] };
type AuditLog = { id: string; action: string; entity_type: string; entity_id: string; previous_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null; created_at: string; admin_name: string; admin_email: string };
type AuditData = { logs: AuditLog[] };
type SessionResponse = { user: { name: string; email: string } | null };

export default function AdminPage() {
	const [data, setData] = useState<AdminData | null>(null);
	const [clients, setClients] = useState<ClientsData | null>(null);
	const [markets, setMarkets] = useState<MarketsData | null>(null);
	const [audit, setAudit] = useState<AuditData | null>(null);
	const [user, setUser] = useState<SessionResponse["user"]>(null);
	const [sessionChecked, setSessionChecked] = useState(false);
	const [section, setSection] = useState<"precos" | "clientes" | "mercados" | "historico">("precos");
	const [filter, setFilter] = useState("pendente");
	const [search, setSearch] = useState("");
	const [source, setSource] = useState("");
	const [fromDate, setFromDate] = useState("");
	const [toDate, setToDate] = useState("");
	const [page, setPage] = useState(1);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(true);
	const [editingMarketId, setEditingMarketId] = useState<string | null>(null);
	const [marketName, setMarketName] = useState("");
	const [marketCep, setMarketCep] = useState("");
	const [marketAddress, setMarketAddress] = useState("");
	const [marketLatitude, setMarketLatitude] = useState("");
	const [marketLongitude, setMarketLongitude] = useState("");
	const [cepLoading, setCepLoading] = useState(false);

	async function loadPrices(selectedStatus = filter) {
		setLoading(true);
		setError("");
		const params = new URLSearchParams();
		if (selectedStatus !== "todos") params.set("status", selectedStatus);
		if (search.trim()) params.set("q", search.trim());
		if (source) params.set("source", source);
		if (fromDate) params.set("from", fromDate);
		if (toDate) params.set("to", toDate);
		params.set("page", String(page));
		params.set("pageSize", "20");
		const suffix = `?${params.toString()}`;
		const response = await fetch(`/api/admin${suffix}`);
		const body = await response.json() as AdminData & { error?: string };
		if (!response.ok) setError(body.error ?? "Não foi possível carregar a administração");
		else setData(body);
		setLoading(false);
	}

	async function loadClients() {
		setLoading(true);
		setError("");
		const response = await fetch("/api/admin?view=clientes");
		const body = await response.json() as ClientsData & { error?: string };
		if (!response.ok) setError(body.error ?? "Não foi possível carregar os clientes");
		else setClients(body);
		setLoading(false);
	}

	async function loadMarkets() {
		setLoading(true);
		setError("");
		const response = await fetch("/api/admin?view=mercados");
		const body = await response.json() as MarketsData & { error?: string };
		if (!response.ok) setError(body.error ?? "Não foi possível carregar os mercados");
		else setMarkets(body);
		setLoading(false);
	}

	async function loadAudit() {
		setLoading(true);
		setError("");
		const response = await fetch("/api/admin?view=historico");
		const body = await response.json() as AuditData & { error?: string };
		if (!response.ok) setError(body.error ?? "Não foi possível carregar o histórico");
		else setAudit(body);
		setLoading(false);
	}

	useEffect(() => {
		fetch("/api/auth/session")
			.then(async (response) => {
				const session = await response.json() as SessionResponse;
				setUser(session.user);
				setSessionChecked(true);
				if (response.ok && session.user) await loadPrices();
				else setLoading(false);
			})
			.catch(() => {
				setError("Não foi possível verificar sua sessão.");
				setSessionChecked(true);
				setLoading(false);
			});
	}, []);

	useEffect(() => {
		if (sessionChecked && user && section === "precos") void loadPrices();
	}, [page]);

	async function updateStatus(priceId: string, status: "aprovado" | "rejeitado") {
		const response = await fetch("/api/admin", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ priceId, status }),
		});
		if (!response.ok) {
			const body = await response.json() as { error?: string };
			setError(body.error ?? "Não foi possível atualizar o preço");
			return;
		}
		await loadPrices();
	}

	async function deleteApprovedPrice(priceId: string) {
		if (!window.confirm("Deletar este preço aprovado? Essa ação não pode ser desfeita.")) return;
		const response = await fetch("/api/admin", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ priceId }),
		});
		if (!response.ok) {
			const body = await response.json() as { error?: string };
			setError(body.error ?? "Não foi possível deletar o preço");
			return;
		}
		await loadPrices("aprovado");
	}

	async function saveMarket(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError("");
		const response = await fetch("/api/admin", {
			method: editingMarketId ? "PUT" : "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ marketId: editingMarketId, name: marketName, address: marketAddress, latitude: Number(marketLatitude), longitude: Number(marketLongitude) }),
		});
		const body = await response.json() as { error?: string };
		if (!response.ok) {
			setError(body.error ?? "Não foi possível salvar o mercado");
			return;
		}
		clearMarketForm();
		await loadMarkets();
	}

	async function lookupCep() {
		const cep = marketCep.replace(/\D/g, "");
		if (cep.length !== 8) return;
		setCepLoading(true);
		setError("");
		try {
			const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
			if (!response.ok) throw new Error("ViaCEP indisponível");
			const data = await response.json() as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
			if (data.erro) throw new Error("CEP não encontrado");
			const address = [data.logradouro, data.bairro, data.localidade && data.uf ? `${data.localidade} - ${data.uf}` : data.localidade].filter(Boolean).join(", ");
			setMarketAddress(address);
			await lookupCoordinates(address);
		} catch {
			setError("Não foi possível encontrar esse CEP. Confira o número e tente novamente.");
		} finally {
			setCepLoading(false);
		}
	}

	async function lookupCoordinates(address: string) {
		const response = await fetch("/api/admin/geocode", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ address }),
		});
		const body = await response.json() as { latitude?: number; longitude?: number; error?: string };
		if (!response.ok) {
			setError(body.error ?? "Não foi possível localizar as coordenadas");
			return;
		}
		setMarketLatitude(String(body.latitude));
		setMarketLongitude(String(body.longitude));
	}

	function clearMarketForm() {
		setEditingMarketId(null);
		setMarketName("");
		setMarketCep("");
		setMarketAddress("");
		setMarketLatitude("");
		setMarketLongitude("");
	}

	function editMarket(market: Market) {
		setEditingMarketId(market.id);
		setMarketName(market.name);
		setMarketCep("");
		setMarketAddress(market.address);
		setMarketLatitude(String(market.latitude));
		setMarketLongitude(String(market.longitude));
	}

	async function deleteMarket(marketId: string) {
		if (!window.confirm("Excluir este mercado? Mercados com preços vinculados não podem ser excluídos.")) return;
		const response = await fetch("/api/admin", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ marketId }) });
		const body = await response.json() as { error?: string };
		if (!response.ok) {
			setError(body.error ?? "Não foi possível excluir o mercado");
			return;
		}
		await loadMarkets();
	}

	const countFor = (status: string) => data?.summary.find((item) => item.status === status)?.count ?? 0;
	const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 20)));
	const globalCounts = data?.counts[0];
	const selectSection = (nextSection: "precos" | "clientes" | "mercados" | "historico") => {
		setSection(nextSection);
		if (nextSection === "clientes" && !clients) void loadClients();
		if (nextSection === "mercados" && !markets) void loadMarkets();
		if (nextSection === "historico" && !audit) void loadAudit();
	};
	const auditAction = (action: string) => ({
		price_approved: "Preço aprovado",
		price_rejected: "Preço rejeitado",
		price_deleted: "Preço excluído",
		market_created: "Mercado cadastrado",
		market_updated: "Mercado alterado",
		market_deleted: "Mercado excluído",
	}[action] ?? action);

	return <main className="shell admin-shell">
		<header className="topbar"><a className="brand-link" href="/" aria-label="market013.app"><BrandLogo /></a><span>Administração</span></header>
		{!sessionChecked && <p className="admin-empty">Verificando sua sessão...</p>}
		{sessionChecked && !user && <section className="login-panel admin-login-panel"><p className="kicker">área restrita</p><h2>Entre para administrar.</h2><p>Faça login com Google para acessar as aprovações e a qualidade dos preços.</p><a className="compare-button" href="/api/auth/google">Entrar com Google <span>→</span></a></section>}
		{sessionChecked && user && <>
		<p className="signed-user">Conectado como {user.name} · <button type="button" onClick={async () => { await fetch("/api/auth/google", { method: "POST" }); window.location.reload(); }}>sair</button></p>
		<nav className="admin-nav" aria-label="Seções da administração">
			<button className={section === "precos" ? "active" : ""} onClick={() => selectSection("precos")}>Preços para revisar</button>
			<button className={section === "clientes" ? "active" : ""} onClick={() => selectSection("clientes")}>Clientes cadastrados</button>
			<button className={section === "mercados" ? "active" : ""} onClick={() => selectSection("mercados")}>Cadastrar mercado</button>
			<button className={section === "historico" ? "active" : ""} onClick={() => selectSection("historico")}>Histórico</button>
		</nav>
		{section === "precos" && <>
		<section className="form-heading"><p className="kicker">controle de qualidade</p><h1>Preços para revisar.</h1><p className="lede">Aprove contribuições confiáveis e rejeite registros que precisam ser corrigidos antes de aparecerem no comparador.</p></section>
		<section className="admin-counts" aria-label="Contagem geral"><div><strong>{globalCounts?.markets ?? 0}</strong><span>mercados</span></div><div><strong>{globalCounts?.clients ?? 0}</strong><span>clientes</span></div><div><strong>{globalCounts?.prices ?? 0}</strong><span>preços</span></div><div><strong>{globalCounts?.reports ?? 0}</strong><span>reports</span></div></section>
		<section className="admin-summary" aria-label="Resumo dos preços">
			<button className={filter === "pendente" ? "active" : ""} onClick={() => { setFilter("pendente"); void loadPrices("pendente"); }}><strong>{countFor("pendente")}</strong><span>Pendentes</span></button>
			<button className={filter === "aprovado" ? "active" : ""} onClick={() => { setFilter("aprovado"); void loadPrices("aprovado"); }}><strong>{countFor("aprovado")}</strong><span>Aprovados</span></button>
			<button className={filter === "rejeitado" ? "active" : ""} onClick={() => { setFilter("rejeitado"); void loadPrices("rejeitado"); }}><strong>{countFor("rejeitado")}</strong><span>Rejeitados</span></button>
			<button className={filter === "todos" ? "active" : ""} onClick={() => { setFilter("todos"); void loadPrices("todos"); }}><strong>{Object.values(data?.summary ?? {}).reduce((total, item) => total + item.count, 0)}</strong><span>Todos</span></button>
		</section>
		<div className="admin-filters"><label>Buscar<input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} onKeyDown={(event) => { if (event.key === "Enter") void loadPrices(); }} placeholder="produto, e-mail ou mercado" /></label><label>Origem<select value={source} onChange={(event) => { setSource(event.target.value); setPage(1); }}><option value="">Todas</option><option value="encarte">Encarte</option><option value="colaborativo">Colaborativo</option></select></label><label>De<input type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1); }} /></label><label>Até<input type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(1); }} /></label><button className="filter-button" type="button" onClick={() => { setPage(1); void loadPrices(); }}>Filtrar</button></div>
		{error && <p className="form-feedback error-message">{error}</p>}
		{loading && <p className="admin-empty">Carregando registros...</p>}
		{!loading && !error && data?.prices.length === 0 && <p className="admin-empty">Nenhum preço neste filtro.</p>}
		{!loading && data && data.prices.length > 0 && <section className="admin-table" aria-label="Preços cadastrados">
			{data.prices.map((price) => <article className="admin-row" key={price.id}>
				<div><strong>{price.product_name}</strong><span>{price.supermarket_name}</span></div>
				<div><strong>R$ {price.price.toFixed(2).replace(".", ",")}</strong><span>{price.source} · {price.contributor_name ?? "seed"}</span></div>
				<div><span className={`admin-status status-${price.status}`}>{price.status}</span><small>{new Date(price.created_at).toLocaleString("pt-BR")}</small></div>
				{price.status === "pendente" && <div className="admin-actions"><button className="approve-button" onClick={() => void updateStatus(price.id, "aprovado")}>Aprovar</button><button className="reject-button" onClick={() => void updateStatus(price.id, "rejeitado")}>Rejeitar</button></div>}
				{price.status === "aprovado" && filter === "aprovado" && <div className="admin-actions"><button className="delete-button" onClick={() => void deleteApprovedPrice(price.id)}>Deletar preço</button></div>}
			</article>)}
		</section>}
		{!loading && data && data.total > 0 && <nav className="pagination" aria-label="Paginação de preços"><span>{data.total} registro{data.total === 1 ? "" : "s"} · página {page} de {totalPages}</span><div><button disabled={page <= 1} onClick={() => { setPage((current) => current - 1); }}>Anterior</button><button disabled={page >= totalPages} onClick={() => { setPage((current) => current + 1); }}>Próxima</button></div></nav>}
		</>}
		{section === "clientes" && <>
		<section className="form-heading"><p className="kicker">contas identificadas</p><h1>Clientes cadastrados.</h1><p className="lede">Pessoas que já entraram no market013 com a conta Google.</p></section>
		{!loading && !error && clients?.users.length === 0 && <p className="admin-empty">Nenhum cliente cadastrado.</p>}
		{!loading && clients && clients.users.length > 0 && <section className="admin-table" aria-label="Clientes cadastrados">
			{clients.users.map((client) => <article className="admin-row client-row" key={client.id}>
				<div><strong>{client.name}</strong><span>{client.email}</span></div>
				<div><strong>{client.score_contribuicoes}</strong><span>contribuições</span></div>
				<div><span className="admin-status status-aprovado">Google</span><small>Desde {new Date(client.created_at).toLocaleDateString("pt-BR")}</small></div>
			</article>)}
		</section>}
		</>}
		{section === "mercados" && <>
		<section className="form-heading"><p className="kicker">rede de mercados</p><h1>{editingMarketId ? "Alterar mercado." : "Cadastrar mercado."}</h1><p className="lede">Adicione ou atualize nome, endereço e coordenadas para que o mercado participe do comparador.</p></section>
		<form className="market-form" onSubmit={saveMarket}>
			<label>Nome do mercado<input required value={marketName} onChange={(event) => setMarketName(event.target.value)} placeholder="Mercado do Bairro" /></label>
			<label>CEP<input required inputMode="numeric" maxLength={9} value={marketCep} onChange={(event) => setMarketCep(event.target.value)} onBlur={() => void lookupCep()} placeholder="00000-000" /></label>
			{cepLoading && <p className="form-hint">Buscando endereço pelo CEP...</p>}
			<label>Endereço<input required value={marketAddress} onChange={(event) => setMarketAddress(event.target.value)} placeholder="Rua, número, bairro e cidade" /></label>
			<div className="market-coordinates"><label>Latitude<input required type="number" step="any" min="-90" max="90" value={marketLatitude} onChange={(event) => setMarketLatitude(event.target.value)} placeholder="-23.55052" /></label><label>Longitude<input required type="number" step="any" min="-180" max="180" value={marketLongitude} onChange={(event) => setMarketLongitude(event.target.value)} placeholder="-46.63331" /></label></div>
			<div className="market-form-actions"><button className="compare-button" type="submit">{editingMarketId ? "Salvar alterações" : "Cadastrar mercado"} <span>→</span></button>{editingMarketId && <button className="secondary cancel-market-button" type="button" onClick={clearMarketForm}>Cancelar</button>}</div>
		</form>
		{error && <p className="form-feedback error-message">{error}</p>}
		{loading && <p className="admin-empty">Carregando mercados...</p>}
		{!loading && !error && markets?.markets.length === 0 && <p className="admin-empty">Nenhum mercado cadastrado.</p>}
		{!loading && markets && markets.markets.length > 0 && <section className="admin-table" aria-label="Mercados cadastrados">{markets.markets.map((market) => <article className="admin-row market-row" key={market.id}><div><strong>{market.name}</strong><span>{market.address}</span></div><div><strong>{market.latitude}, {market.longitude}</strong><span>coordenadas</span></div><div className="admin-actions"><button className="approve-button" onClick={() => editMarket(market)}>Alterar</button><button className="delete-button" onClick={() => void deleteMarket(market.id)}>Excluir</button></div></article>)}</section>}
		</>}
		{section === "historico" && <>
		<section className="form-heading"><p className="kicker">rastreabilidade</p><h1>Histórico administrativo.</h1><p className="lede">Acompanhe quem alterou preços e mercados e quais dados foram registrados antes e depois de cada ação.</p></section>
		{loading && <p className="admin-empty">Carregando histórico...</p>}
		{!loading && !error && audit?.logs.length === 0 && <p className="admin-empty">Nenhuma ação administrativa registrada.</p>}
		{!loading && audit && audit.logs.length > 0 && <section className="admin-table" aria-label="Histórico administrativo">{audit.logs.map((log) => <article className="admin-row audit-row" key={log.id}><div><strong>{auditAction(log.action)}</strong><span>{log.entity_type} · {log.entity_id}</span></div><div><strong>{log.admin_name}</strong><span>{log.admin_email}</span></div><div><span>{new Date(log.created_at).toLocaleString("pt-BR")}</span><small>antes: {JSON.stringify(log.previous_data ?? null)}</small><small>depois: {JSON.stringify(log.new_data ?? null)}</small></div></article>)}</section>}
		</>}
		</>}
		<div className="actions"><a className="secondary" href="/">Voltar <span>←</span></a></div>
	</main>;
}
