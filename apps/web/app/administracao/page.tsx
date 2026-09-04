"use client";

import { useEffect, useState } from "react";

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
type SessionResponse = { user: { name: string; email: string } | null };

export default function AdminPage() {
	const [data, setData] = useState<AdminData | null>(null);
	const [user, setUser] = useState<SessionResponse["user"]>(null);
	const [sessionChecked, setSessionChecked] = useState(false);
	const [filter, setFilter] = useState("pendente");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(true);

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

	const countFor = (status: string) => data?.summary.find((item) => item.status === status)?.count ?? 0;

	return <main className="shell admin-shell">
		<header className="topbar"><a className="mark" href="/">m013</a><span>Administração</span></header>
		{!sessionChecked && <p className="admin-empty">Verificando sua sessão...</p>}
		{sessionChecked && !user && <section className="login-panel admin-login-panel"><p className="kicker">área restrita</p><h2>Entre para administrar.</h2><p>Faça login com Google para acessar as aprovações e a qualidade dos preços.</p><a className="compare-button" href="/api/auth/google">Entrar com Google <span>→</span></a></section>}
		{sessionChecked && user && <>
		<p className="signed-user">Conectado como {user.name} · <button type="button" onClick={async () => { await fetch("/api/auth/google", { method: "POST" }); window.location.reload(); }}>sair</button></p>
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
			</article>)}
		</section>}
		</>}
		<div className="actions"><a className="secondary" href="/">Voltar <span>←</span></a></div>
	</main>;
}
