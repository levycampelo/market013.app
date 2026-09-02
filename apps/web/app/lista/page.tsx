"use client";

import { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  lowest_price: number | null;
  market_count: number;
  latest_observed_at: string | null;
};

export default function ListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function loadProducts() {
    setLoading(true);
    setError("");
    let active = true;
    fetch("/api/products")
      .then(async (response) => {
        if (!response.ok) throw new Error("products request failed");
        return (await response.json()) as { products: Product[] };
      })
      .then((data) => { if (active) setProducts(data.products); })
      .catch(() => { if (active) setError("Não foi possível carregar os produtos agora."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }

  useEffect(() => loadProducts(), []);

  const categories = useMemo(() => [
    "Todas",
    ...Array.from(new Set(products.map((product) => product.category).filter(Boolean) as string[])).sort(),
  ], [products]);

  const filteredProducts = useMemo(() => {
    const value = query.trim().toLocaleLowerCase("pt-BR");
    return products.filter((product) => {
      const matchesCategory = category === "Todas" || product.category === category;
      const matchesQuery = !value || [product.name, product.brand, product.category]
        .filter(Boolean).join(" ").toLocaleLowerCase("pt-BR").includes(value);
      return matchesCategory && matchesQuery;
    });
  }, [products, query, category]);

  const selectedProducts = products.filter((product) => quantities[product.id]);
  const itemCount = Object.values(quantities).reduce((total, quantity) => total + quantity, 0);
  const comparisonUrl = `/comparar?products=${selectedProducts.map((product) => product.id).join(",")}`;

  function changeQuantity(productId: string, change: number) {
    setQuantities((current) => {
      const nextQuantity = Math.max(0, (current[productId] ?? 0) + change);
      const next = { ...current };
      if (nextQuantity === 0) delete next[productId];
      else next[productId] = nextQuantity;
      return next;
    });
  }

  function formatPrice(price: number | null) {
    if (price === null) return "Sem preço";
    return `A partir de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price)}`;
  }

  function formatObservedAt(date: string | null) {
    if (!date) return "Ainda sem atualização";
    return `Atualizado em ${new Intl.DateTimeFormat("pt-BR").format(new Date(date))}`;
  }

  return (
    <main className="shell list-shell">
      <header className="topbar"><a className="mark" href="/">m013</a><span>Minha lista</span></header>
      <section className="list-heading">
        <div><p className="kicker">cesta de compras</p><h1>Monte sua lista.</h1><p className="lede">Escolha os produtos e veja onde a economia começa a fazer sentido.</p></div>
        <div className="list-total"><strong>{itemCount}</strong><span>itens</span></div>
      </section>
      <div className="list-layout">
        <section className="product-picker" aria-label="Produtos disponíveis">
          <label className="search-label" htmlFor="product-search">Buscar produto</label>
          <input id="product-search" className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="arroz, café, limpeza..." />
          <div className="catalog-toolbar">
            <label className="search-label" htmlFor="product-category">Categoria</label>
            <select id="product-category" value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
            <span className="result-count">{filteredProducts.length} resultado{filteredProducts.length === 1 ? "" : "s"}</span>
          </div>
          {loading && <p className="list-message">Buscando produtos...</p>}
          {error && <div className="list-message error-message"><p>{error}</p><button type="button" onClick={loadProducts}>Tentar novamente</button></div>}
          {!loading && !error && filteredProducts.length === 0 && <p className="list-message">Nenhum produto encontrado.</p>}
          <div className="product-grid">
            {filteredProducts.map((product) => {
              const quantity = quantities[product.id] ?? 0;
              return <article className={`product-row ${quantity ? "selected" : ""}`} key={product.id}>
                <div><strong>{product.name}</strong><span>{[product.brand, product.category].filter(Boolean).join(" · ")}</span><span className="price-meta">{formatPrice(product.lowest_price)} · {product.market_count} mercado{product.market_count === 1 ? "" : "s"}</span><span>{formatObservedAt(product.latest_observed_at)}</span></div>
                <div className="quantity-control"><button type="button" aria-label={`Remover ${product.name}`} onClick={() => changeQuantity(product.id, -1)}>-</button><output>{quantity}</output><button type="button" aria-label={`Adicionar ${product.name}`} onClick={() => changeQuantity(product.id, 1)}>+</button></div>
              </article>;
            })}
          </div>
        </section>
        <aside className="list-summary"><p className="kicker">sua seleção</p>
          {selectedProducts.length === 0 ? <p className="summary-empty">Sua lista está vazia. Adicione produtos para começar a comparação.</p> : <ul>{selectedProducts.map((product) => <li key={product.id}><span>{quantities[product.id]} × {product.name}</span><button type="button" onClick={() => changeQuantity(product.id, -quantities[product.id])}>remover</button></li>)}</ul>}
          {selectedProducts.length === 0 ? <button className="compare-button" type="button" disabled>Comparar preços <span>→</span></button> : <a className="compare-button" href={comparisonUrl}>Comparar preços <span>→</span></a>}
        </aside>
      </div>
    </main>
  );
}
