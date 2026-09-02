"use client";

import { useEffect, useMemo, useState } from "react";

type Product = { id: string; name: string; brand: string | null; category: string | null };
type Price = { id: string; product_id: string; price: number; source: string; observed_at: string; supermarket_name: string; supermarket_address: string };

export default function ComparePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [prices, setPrices] = useState<Record<string, Price[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const productIds = useMemo(() => typeof window === "undefined" ? [] : new URLSearchParams(window.location.search).get("products")?.split(",").filter(Boolean) ?? [], []);

  useEffect(() => {
    if (productIds.length === 0) { setLoading(false); return; }
    Promise.all([
      fetch("/api/products").then((response) => response.json() as Promise<{ products: Product[] }>),
      ...productIds.map(async (id) => [id, await fetch(`/api/prices?productId=${encodeURIComponent(id)}`).then((response) => response.json() as Promise<{ prices: Price[] }>)] as const),
    ])
      .then(([productData, ...priceData]) => {
        setProducts(productData.products.filter((product) => productIds.includes(product.id)));
        setPrices(Object.fromEntries(priceData.map(([id, data]) => [id, data.prices])));
      })
      .catch(() => setError("Não foi possível carregar a comparação agora."))
      .finally(() => setLoading(false));
  }, [productIds]);

  return <main className="shell list-shell">
    <header className="topbar"><a className="mark" href="/">m013</a><span>Comparação</span></header>
    <section className="list-heading"><div><p className="kicker">preços aprovados</p><h1>Onde compensa.</h1><p className="lede">Compare os mercados encontrados para cada item da sua lista.</p></div></section>
    {loading && <p className="list-message">Calculando comparação...</p>}
    {error && <p className="list-message error-message">{error}</p>}
    {!loading && !error && products.length === 0 && <p className="list-message">Volte à lista e escolha pelo menos um produto.</p>}
    <section className="comparison-grid">{products.map((product) => <article className="comparison-item" key={product.id}>
      <div><p className="kicker">{product.category ?? "produto"}</p><h2>{product.name}</h2><p>{product.brand ?? "Marca não informada"}</p></div>
      {(prices[product.id] ?? []).length === 0 ? <p className="summary-empty">Nenhum preço aprovado encontrado.</p> : <ul>{prices[product.id].map((price) => <li key={price.id}><strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price.price)}</strong><span>{price.supermarket_name}<br />{price.supermarket_address}</span></li>)}</ul>}
    </article>)}</section>
    <div className="actions"><a className="secondary" href="/lista">Voltar para lista <span>←</span></a></div>
  </main>;
}