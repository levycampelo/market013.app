"use client";

import { useEffect, useMemo, useState } from "react";
import { bestSingleMarket, optimizeBasket, type Market, type MarketPrice, type BasketResult } from "../../../../backend/domain/optimizer";

type Product = { id: string; name: string; brand: string | null; category: string | null };
type Price = { id: string; product_id: string; supermarket_id: string; price: number; source: string; observed_at: string; supermarket_name: string; supermarket_address: string };

export default function ComparePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [prices, setPrices] = useState<Record<string, Price[]>>({});
  const [markets, setMarkets] = useState<Market[]>([]);
  const [allPrices, setAllPrices] = useState<MarketPrice[]>([]);
  const [fuelPrice, setFuelPrice] = useState("6");
  const [vehicleEfficiency, setVehicleEfficiency] = useState("12");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [allowedMarketIds, setAllowedMarketIds] = useState<string[] | null>(null);
  const [locationMessage, setLocationMessage] = useState("Sem localização: deslocamento não incluído");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const selectedItems = useMemo(() => typeof window === "undefined" ? [] : new URLSearchParams(window.location.search).get("products")?.split(",").filter(Boolean).map((value) => {
    const [productId, quantity] = value.split(":");
    return { productId, quantity: Math.max(1, Number(quantity) || 1) };
  }) ?? [], []);
  const productIds = selectedItems.map((item) => item.productId);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const value = params.get("markets");
    setAllowedMarketIds(params.has("markets") ? (value ? value.split(",").filter(Boolean) : []) : null);
  }, []);

  useEffect(() => {
    if (productIds.length === 0) { setLoading(false); return; }
    Promise.all([
      fetch("/api/products").then((response) => response.json() as Promise<{ products: Product[] }>),
      fetch("/api/markets").then((response) => response.json() as Promise<{ markets: Market[] }>),
      ...productIds.map(async (id) => [id, await fetch(`/api/prices?productId=${encodeURIComponent(id)}`).then((response) => response.json() as Promise<{ prices: Price[] }>)] as const),
    ])
      .then(([productData, marketData, ...priceData]) => {
        setProducts(productData.products.filter((product) => productIds.includes(product.id)));
        setMarkets(allowedMarketIds ? marketData.markets.filter((market) => allowedMarketIds.includes(market.id)) : marketData.markets);
        const groupedPrices = Object.fromEntries(priceData.map(([id, data]) => [id, data.prices]));
        setPrices(groupedPrices);
        const allPrices: MarketPrice[] = Object.values(groupedPrices).flat().map((price) => ({ productId: price.product_id, marketId: price.supermarket_id, price: price.price }));
        setAllPrices(allPrices);
      })
      .catch(() => setError("Não foi possível carregar a comparação agora."))
      .finally(() => setLoading(false));
  }, [selectedItems, allowedMarketIds]);

  const recommendation = useMemo<BasketResult | null>(() => {
    if (allPrices.length === 0) return null;
    const parsedFuelPrice = Number(fuelPrice.replace(",", "."));
    const parsedEfficiency = Number(vehicleEfficiency.replace(",", "."));
    if (!Number.isFinite(parsedFuelPrice) || !Number.isFinite(parsedEfficiency) || parsedFuelPrice < 0 || parsedEfficiency <= 0) return null;
    const options = { fuelPricePerLiter: parsedFuelPrice, vehicleKmPerLiter: parsedEfficiency };
    if (latitude !== "" && longitude !== "") return optimizeBasket(selectedItems, markets, allPrices, { ...options, userLatitude: Number(latitude), userLongitude: Number(longitude) });
    return optimizeBasket(selectedItems, markets, allPrices, options);
  }, [allPrices, fuelPrice, vehicleEfficiency, latitude, longitude, selectedItems, markets]);
  const singleMarket = useMemo(() => {
    if (!allPrices.length) return null;
    const parsedFuelPrice = Number(fuelPrice.replace(",", "."));
    const parsedEfficiency = Number(vehicleEfficiency.replace(",", "."));
    if (!Number.isFinite(parsedFuelPrice) || !Number.isFinite(parsedEfficiency) || parsedFuelPrice < 0 || parsedEfficiency <= 0) return null;
    const options = { fuelPricePerLiter: parsedFuelPrice, vehicleKmPerLiter: parsedEfficiency };
    return bestSingleMarket(selectedItems, markets, allPrices, latitude !== "" && longitude !== "" ? { ...options, userLatitude: Number(latitude), userLongitude: Number(longitude) } : options);
  }, [allPrices, fuelPrice, vehicleEfficiency, latitude, longitude, selectedItems, markets]);
  const economy = recommendation && singleMarket ? Math.max(0, Math.round((singleMarket.total - recommendation.total) * 100) / 100) : 0;

  const recommendationMarkets = recommendation?.marketIds.map((id) => markets.find((market) => market.id === id)?.name).filter(Boolean).join(" + ");

  function useCurrentLocation() {
    if (!navigator.geolocation) { setLocationMessage("Seu navegador não oferece localização. Informe latitude e longitude."); return; }
    navigator.geolocation.getCurrentPosition(
      (position) => { setLatitude(position.coords.latitude.toFixed(6)); setLongitude(position.coords.longitude.toFixed(6)); setLocationMessage("Localização atual usada no cálculo"); },
      () => setLocationMessage("Não foi possível obter sua localização. Você pode informar as coordenadas manualmente."),
    );
  }

  return <main className="shell list-shell">
    <header className="topbar"><a className="brand-link" href="/" aria-label="market013.app"><img className="brand-logo" src="/img/guacamole_market013_preto.jpg" alt="market013.app" /></a><span>Comparação</span></header>
    <section className="list-heading"><div><p className="kicker">preços aprovados</p><h1>Onde compensa.</h1><p className="lede">Compare os mercados encontrados para cada item da sua lista.</p></div></section>
    <section className="optimizer-settings"><p className="kicker">parâmetros do cálculo</p><div className="optimizer-fields"><label>Gasolina (R$/L)<input type="number" min="0" step="0.01" value={fuelPrice} onChange={(event) => setFuelPrice(event.target.value)} /></label><label>Consumo (km/L)<input type="number" min="0.1" step="0.1" value={vehicleEfficiency} onChange={(event) => setVehicleEfficiency(event.target.value)} /></label><button type="button" onClick={useCurrentLocation}>Usar minha localização</button></div><div className="location-fields"><label>Latitude<input type="number" step="any" value={latitude} onChange={(event) => setLatitude(event.target.value)} placeholder="-23.550520" /></label><label>Longitude<input type="number" step="any" value={longitude} onChange={(event) => setLongitude(event.target.value)} placeholder="-46.633310" /></label><span>{locationMessage}</span></div></section>
    {loading && <p className="list-message">Calculando comparação...</p>}
    {error && <p className="list-message error-message">{error}</p>}
    {!loading && !error && products.length === 0 && <p className="list-message">Volte à lista e escolha pelo menos um produto.</p>}
    {!loading && !error && recommendation && recommendation.marketIds.length > 0 && <section className="recommendation"><p className="kicker">recomendação da cesta</p><h2>{recommendation.marketIds.length === 1 ? "Mais econômico comprar em" : "Cesta mista mais econômica"}</h2><strong>{recommendationMarkets}</strong><div className="recommendation-total"><span>Produtos</span><b>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(recommendation.productsTotal)}</b><span>Deslocamento</span><b>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(recommendation.travelCost)}</b><span>Total estimado</span><b>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(recommendation.total)}</b><span>Economia líquida</span><b>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(economy)}</b></div><p className="recommendation-note">{recommendation.travelCost > 0 ? "O total inclui gasolina estimada para visitar os mercados." : "Informe sua localização para incluir o custo de deslocamento."}</p>{recommendation.missingProductIds.length > 0 && <p className="summary-empty">Sem preço para {recommendation.missingProductIds.length} item(ns) da lista.</p>}</section>}
    <section className="comparison-grid">{products.map((product) => <article className="comparison-item" key={product.id}>
      <div><p className="kicker">{product.category ?? "produto"}</p><h2>{product.name}</h2><p>{product.brand ?? "Marca não informada"}</p></div>
      {(prices[product.id] ?? []).filter((price) => !allowedMarketIds || allowedMarketIds.includes(price.supermarket_id)).length === 0 ? <p className="summary-empty">Nenhum preço aprovado encontrado nos mercados próximos.</p> : <ul>{prices[product.id].filter((price) => !allowedMarketIds || allowedMarketIds.includes(price.supermarket_id)).map((price) => <li key={price.id}><strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price.price)}</strong><span>{price.supermarket_name}<br />{price.supermarket_address}</span></li>)}</ul>}
    </article>)}</section>
    <div className="actions"><a className="secondary" href="/lista">Voltar para lista <span>←</span></a></div>
  </main>;
}