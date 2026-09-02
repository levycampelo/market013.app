"use client";

import { FormEvent, useEffect, useState } from "react";

type Option = { id: string; name: string };

export default function ContributePage() {
  const [products, setProducts] = useState<Option[]>([]);
  const [markets, setMarkets] = useState<Option[]>([]);
  const [productId, setProductId] = useState("");
  const [supermarketId, setSupermarketId] = useState("");
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((response) => response.json() as Promise<{ products: Option[] }>),
      fetch("/api/markets").then((response) => response.json() as Promise<{ markets: Option[] }>),
    ]).then(([productData, marketData]) => {
      setProducts(productData.products);
      setMarkets(marketData.markets);
    }).catch(() => setError("Não foi possível carregar os produtos e mercados."));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setMessage("");
    const response = await fetch("/api/prices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, supermarketId, price: Number(price.replace(",", ".")) }) });
    const data = await response.json() as { error?: string };
    if (!response.ok) { setError(data.error ?? "Não foi possível cadastrar o preço."); return; }
    setMessage("Preço enviado e aguardando aprovação. Obrigado por contribuir.");
    setPrice("");
  }

  return <main className="shell">
    <header className="topbar"><a className="mark" href="/">m013</a><span>Contribuição</span></header>
    <section className="form-heading"><p className="kicker">dados colaborativos</p><h1>Contribua um preço.</h1><p className="lede">Informe o valor que você encontrou. A contribuição entra como pendente antes de aparecer no comparador.</p></section>
    <form className="price-form" onSubmit={submit}>
      <label>Produto<select required value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">Selecione um produto</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Mercado<select required value={supermarketId} onChange={(event) => setSupermarketId(event.target.value)}><option value="">Selecione um mercado</option>{markets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Preço encontrado<input required min="0" max="100000" step="0.01" type="number" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0,00" /></label>
      <button className="compare-button" type="submit">Enviar para aprovação <span>→</span></button>
      {error && <p className="form-feedback error-message">{error}</p>}{message && <p className="form-feedback success-message">{message}</p>}
    </form>
    <div className="actions"><a className="secondary" href="/">Voltar <span>←</span></a></div>
  </main>;
}
