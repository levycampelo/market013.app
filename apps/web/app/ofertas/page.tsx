import { getDatabase } from "../../lib/db";
import BrandLogo from "../components/brand-logo";

export const dynamic = "force-dynamic";

type BestOffer = {
  product_id: string;
  product_name: string;
  brand: string | null;
  category: string | null;
  price: number;
  observed_at: string;
  supermarket_name: string;
  supermarket_address: string | null;
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

async function loadBestOffers(): Promise<{ offers: BestOffer[]; failed: boolean }> {
  try {
    const sql = getDatabase();
    const offers = await sql`
      select distinct on (pr.product_id)
        pr.product_id,
        p.name as product_name,
        p.brand,
        p.category,
        pr.price::float8 as price,
        pr.observed_at,
        s.name as supermarket_name,
        s.address as supermarket_address
      from prices pr
      join products p on p.id = pr.product_id
      join supermarkets s on s.id = pr.supermarket_id
      where pr.status = 'aprovado'
      order by pr.product_id, pr.price asc, pr.observed_at desc
    `;
    return { offers: (offers as BestOffer[]).sort((a, b) => a.product_name.localeCompare(b.product_name, "pt-BR")), failed: false };
  } catch (error) {
    console.error("best_offers_error", error);
    return { offers: [], failed: true };
  }
}

export default async function OfertasPage() {
  const { offers, failed } = await loadBestOffers();

  return (
    <main className="shell list-shell">
      <header className="topbar">
        <a className="brand-link" href="/" aria-label="market013.app"><BrandLogo /></a>
        <span>Melhores preços</span>
      </header>
      <section className="list-heading">
        <div>
          <p className="kicker">preços aprovados</p>
          <h1>Melhores valores.</h1>
          <p className="lede">O menor preço aprovado de cada produto cadastrado e em qual mercado ele está.</p>
        </div>
      </section>
      {failed && <p className="list-message error-message">Não foi possível carregar os melhores preços agora.</p>}
      {!failed && offers.length === 0 && <p className="list-message">Nenhum preço aprovado ainda. Contribua com o primeiro.</p>}
      <section className="comparison-grid">
        {offers.map((offer) => (
          <article className="comparison-item" key={offer.product_id}>
            <div>
              <p className="kicker">{offer.category ?? "produto"}</p>
              <h2>{offer.product_name}</h2>
              <p>{offer.brand ?? "Marca não informada"}</p>
            </div>
            <ul>
              <li>
                <strong>{currency.format(offer.price)}</strong>
                <span>{offer.supermarket_name}<br />{offer.supermarket_address ?? "Endereço não informado"}</span>
              </li>
            </ul>
          </article>
        ))}
      </section>
      <div className="actions">
        <a className="primary" href="/lista">Montar lista <span>→</span></a>
        <a className="secondary" href="/contribuir">Contribuir preço</a>
      </div>
    </main>
  );
}
