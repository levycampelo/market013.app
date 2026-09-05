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
type Market = { id: string; name: string; latitude: number; longitude: number };
const MARKET_RADIUS_KM = 15;

export default function ListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [nearbyMarketIds, setNearbyMarketIds] = useState<string[] | null>(null);
  const [locationMessage, setLocationMessage] = useState("Todos os mercados");
  const [locationLoading, setLocationLoading] = useState(false);

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

  function normalizeSearch(value: string) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  }

  useEffect(() => loadProducts(), []);

  const categories = useMemo(() => [
    "Todas",
    ...Array.from(new Set(products.map((product) => product.category).filter(Boolean) as string[])).sort(),
  ], [products]);

  const filteredProducts = useMemo(() => {
    const value = normalizeSearch(query.trim());
    return products.filter((product) => {
      const matchesCategory = category === "Todas" || product.category === category;
      const matchesQuery = !value || normalizeSearch([product.name, product.brand, product.category]
        .filter(Boolean).join(" ")).includes(value);
      return matchesCategory && matchesQuery;
    });
  }, [products, query, category]);

  const selectedProducts = products.filter((product) => quantities[product.id]);
  const itemCount = Object.values(quantities).reduce((total, quantity) => total + quantity, 0);
  const comparisonParams = new URLSearchParams({ products: selectedProducts.map((product) => `${product.id}:${quantities[product.id]}`).join(",") });
  if (nearbyMarketIds) comparisonParams.set("markets", nearbyMarketIds.join(","));
  const comparisonUrl = `/comparar?${comparisonParams.toString()}`;

  function distanceKm(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number) {
    const radians = Math.PI / 180;
    const latitudeDelta = (latitudeB - latitudeA) * radians;
    const longitudeDelta = (longitudeB - longitudeA) * radians;
    const value = Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(latitudeA * radians) * Math.cos(latitudeB * radians) * Math.sin(longitudeDelta / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  }

  function useNearbyMarkets() {
    if (!navigator.geolocation) {
      setLocationMessage("Seu navegador não oferece geolocalização.");
      return;
    }
    setLocationLoading(true);
    setLocationMessage("Localizando mercados em até 15 km...");
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const response = await fetch("/api/markets");
        if (!response.ok) throw new Error("markets request failed");
        const data = await response.json() as { markets: Market[] };
        const nearby = data.markets.filter((market) => distanceKm(position.coords.latitude, position.coords.longitude, market.latitude, market.longitude) <= MARKET_RADIUS_KM);
        setMarkets(data.markets);
        setNearbyMarketIds(nearby.map((market) => market.id));
        setLocationMessage(nearby.length ? `${nearby.length} mercado${nearby.length === 1 ? "" : "s"} em até 15 km` : "Nenhum mercado encontrado em até 15 km");
      } catch {
        setLocationMessage("Não foi possível carregar os mercados próximos.");
      } finally {
        setLocationLoading(false);
      }
    }, () => {
      setLocationLoading(false);
      setLocationMessage("Localização recusada. Todos os mercados continuam disponíveis.");
    });
  }

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
      <header className="topbar"><a className="brand-link" href="/" aria-label="market013.app"><img className="brand-logo" src="/img/guacamole_market013_preto.jpg" alt="market013.app" /></a><span>Minha lista</span></header>
      <section className="list-heading">
        <div><p className="kicker">cesta de compras</p><h1>Monte sua lista.</h1><p className="lede">Escolha os produtos e veja onde a economia começa a fazer sentido.</p></div>
        <div className="list-total"><strong>{itemCount}</strong><span>itens</span></div>
      </section>
      <section className="nearby-market-panel" aria-label="Mercados próximos"><div><p className="kicker">filtro por localização</p><strong>Mercados perto de mim</strong><span>{locationMessage}</span></div><button type="button" onClick={useNearbyMarkets} disabled={locationLoading}>{locationLoading ? "Localizando..." : "Usar minha localização"}</button>{nearbyMarketIds && <button type="button" className="nearby-reset" onClick={() => { setNearbyMarketIds(null); setLocationMessage("Todos os mercados"); }}>Limpar filtro</button>}</section>
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
