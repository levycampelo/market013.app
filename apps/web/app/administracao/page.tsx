"use client";

import { FormEvent, useEffect, useState } from "react";

type Price = {
	id: string;
	product_name: string;
	supermarket_name: string;
	price: number;
	source: string;
	status: string;
	observed_at: string;
	created_at: string;
	contributor_name: string | null;
	contributor_email: string | null;
};

type AdminData = { prices: Price[]; summary: { status: string; count: number }[] };
type Client = { id: string; name: string; email: string; score_contribuicoes: number; created_at: string };
type ClientsData = { users: Client[] };
type Market = { id: string; name: string; address: string; latitude: number; longitude: number; created_at: string };
type MarketsData = { markets: Market[] };
type SessionResponse = { user: { name: string; email: string } | null };

export default function AdminPage() {
	const [data, setData] = useState<AdminData | null>(null);
	const [clients, setClients] = useState<ClientsData | null>(null);
	const [markets, setMarkets] = useState<MarketsData | null>(null);
	const [user, setUser] = useState<SessionResponse["user"]>(null);
	const [sessionChecked, setSessionChecked] = useState(false);
	const [section, setSection] = useState<"precos" | "clientes" | "mercados">("precos");
	const [filter, setFilter] = useState("pendente");
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
		const suffix = selectedStatus === "todos" ? "" : `?status=${selectedStatus}`;
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
			setMarketAddress([data.logradouro, data.bairro, data.localidade && data.uf ? `${data.localidade} - ${data.uf}` : data.localidade].filter(Boolean).join(", "));
		} catch {
			setError("Não foi possível encontrar esse CEP. Confira o número e tente novamente.");
		} finally {
			setCepLoading(false);
		}
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
	const selectSection = (nextSection: "precos" | "clientes" | "mercados") => {
		setSection(nextSection);
		if (nextSection === "clientes" && !clients) void loadClients();
		if (nextSection === "mercados" && !markets) void loadMarkets();
	};

	return <main className="shell admin-shell">
		<header className="topbar"><a className="mark" href="/">m013</a><span>Administração</span></header>
		{!sessionChecked && <p className="admin-empty">Verificando sua sessão...</p>}
		{sessionChecked && !user && <section className="login-panel admin-login-panel"><p className="kicker">área restrita</p><h2>Entre para administrar.</h2><p>Faça login com Google para acessar as aprovações e a qualidade dos preços.</p><a className="compare-button" href="/api/auth/google">Entrar com Google <span>→</span></a></section>}
		{sessionChecked && user && <>
		<p className="signed-user">Conectado como {user.name} · <button type="button" onClick={async () => { await fetch("/api/auth/google", { method: "POST" }); window.location.reload(); }}>sair</button></p>
		<nav className="admin-nav" aria-label="Seções da administração">
			<button className={section === "precos" ? "active" : ""} onClick={() => selectSection("precos")}>Preços para revisar</button>
			<button className={section === "clientes" ? "active" : ""} onClick={() => selectSection("clientes")}>Clientes cadastrados</button>
			<button className={section === "mercados" ? "active" : ""} onClick={() => selectSection("mercados")}>Cadastrar mercado</button>
		</nav>
		{section === "precos" && <>
		<section className="form-heading"><p className="kicker">controle de qualidade</p><h1>Preços para revisar.</h1><p className="lede">Aprove contribuições confiáveis e rejeite registros que precisam ser corrigidos antes de aparecerem no comparador.</p></section>
		<section className="admin-summary" aria-label="Resumo dos preços">
			<button className={filter === "pendente" ? "active" : ""} onClick={() => { setFilter("pendente"); void loadPrices("pendente"); }}><strong>{countFor("pendente")}</strong><span>Pendentes</span></button>
			<button className={filter === "aprovado" ? "active" : ""} onClick={() => { setFilter("aprovado"); void loadPrices("aprovado"); }}><strong>{countFor("aprovado")}</strong><span>Aprovados</span></button>
			<button className={filter === "rejeitado" ? "active" : ""} onClick={() => { setFilter("rejeitado"); void loadPrices("rejeitado"); }}><strong>{countFor("rejeitado")}</strong><span>Rejeitados</span></button>
			<button className={filter === "todos" ? "active" : ""} onClick={() => { setFilter("todos"); void loadPrices("todos"); }}><strong>{Object.values(data?.summary ?? {}).reduce((total, item) => total + item.count, 0)}</strong><span>Todos</span></button>
		</section>
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
		</>}
		<div className="actions"><a className="secondary" href="/">Voltar <span>←</span></a></div>
	</main>;
}
