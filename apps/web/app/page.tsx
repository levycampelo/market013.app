import { getDatabase } from "../lib/db";

export const dynamic = "force-dynamic";

async function loadMetrics() {
  try {
    const sql = getDatabase();
    const [products, markets] = await Promise.all([
      sql`select count(*)::int as count from products`,
      sql`select count(*)::int as count from supermarkets`,
    ]);
    return {
      products: Number(products[0]?.count ?? 0),
      markets: Number(markets[0]?.count ?? 0),
    };
  } catch (error) {
    console.error("home_metrics_error", error);
    return { products: 0, markets: 0 };
  }
}

export default async function HomePage() {
  const metrics = await loadMetrics();

  return (
    <main className="shell">
      <header className="topbar">
        <span className="mark">m013</span>
        <span className="status"><i /> dados locais</span>
      </header>
      <section className="intro">
        <p className="kicker">comparador colaborativo</p>
        <h1>Compre melhor<br /><em>sem rodar à toa.</em></h1>
        <p className="lede">Monte sua lista, compare mercados perto de você e descubra onde a economia realmente compensa a gasolina.</p>
        <div className="actions">
          <a className="primary" href="/lista">Montar lista <span>→</span></a>
          <a className="secondary" href="/contribuir">Contribuir preço</a>
        </div>
      </section>
      <section className="metrics" aria-label="Resumo da plataforma">
        <div><strong>{metrics.products}</strong><span>produtos cadastrados</span></div>
        <div><strong>{metrics.markets}</strong><span>mercados mapeados</span></div>
        <div><strong>R$ 0</strong><span>custo para começar</span></div>
      </section>
    </main>
  );
}
