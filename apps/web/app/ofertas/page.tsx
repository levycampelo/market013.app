import { getDatabase } from "../../lib/db";
import BrandLogo from "../components/brand-logo";
import ProductArt from "../components/product-art";

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

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

function splitPrice(value: number) {
  const [reais, centavos] = value.toFixed(2).split(".");
  return { reais, centavos };
}

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
    return { offers: (offers as BestOffer[]).sort((a, b) => a.price - b.price), failed: false };
  } catch (error) {
    console.error("best_offers_error", error);
    return { offers: [], failed: true };
  }
}

function OfferCard({ offer, highlight }: { offer: BestOffer; highlight?: boolean }) {
  const { reais, centavos } = splitPrice(offer.price);
  return (
    <article className={highlight ? "offer-card offer-card-hero" : "offer-card"}>
      <span className="offer-flag">{highlight ? "Top oferta" : "Menor preço"}</span>
      <div className="offer-figure"><ProductArt category={offer.category} name={offer.product_name} /></div>
      <div className="offer-body">
        <p className="offer-category">{offer.category ?? "produto"}</p>
        <h3>{offer.product_name}</h3>
        <p className="offer-brand">{offer.brand ?? "Marca não informada"}</p>
        <p className="offer-price"><span>R$</span><strong>{reais}</strong><em>,{centavos}</em></p>
        <div className="offer-market">
          <span>no mercado</span>
          <strong>{offer.supermarket_name}</strong>
          <small>{offer.supermarket_address ?? "Endereço não informado"}</small>
        </div>
      </div>
    </article>
  );
}

export default async function OfertasPage() {
  const { offers, failed } = await loadBestOffers();
  const heroOffers = offers.slice(0, 3);
  const restOffers = offers.slice(3);

  return (
    <main className="shell flyer-shell">
      <header className="topbar">
        <a className="brand-link" href="/" aria-label="market013.app"><BrandLogo /></a>
        <span>Encarte digital</span>
      </header>

      <section className="flyer-hero">
        <div>
          <p className="kicker">encarte colaborativo</p>
          <h1>Ofertas<br /><em>da vez.</em></h1>
          <p className="lede">Os menores preços aprovados de cada produto cadastrado e o mercado onde eles estão.</p>
        </div>
        <aside className="flyer-stamp">
          <span>válido em</span>
          <strong>{dateFormat.format(new Date())}</strong>
          <small>{offers.length} produto(s) com preço aprovado</small>
        </aside>
      </section>

      {failed && <p className="list-message error-message">Não foi possível carregar os melhores preços agora.</p>}
      {!failed && offers.length === 0 && <p className="list-message">Nenhum preço aprovado ainda. Contribua com o primeiro.</p>}

      {heroOffers.length > 0 && (
        <section className="offer-hero-grid">
          {heroOffers.map((offer) => <OfferCard key={offer.product_id} offer={offer} highlight />)}
        </section>
      )}

      {restOffers.length > 0 && (
        <section className="offer-grid">
          {restOffers.map((offer) => <OfferCard key={offer.product_id} offer={offer} />)}
        </section>
      )}

      {offers.length > 0 && <p className="flyer-note">Preços informados pela comunidade e aprovados na moderação. Confira no mercado antes de comprar.</p>}

      <div className="actions">
        <a className="primary" href="/lista">Montar lista <span>→</span></a>
        <a className="secondary" href="/contribuir">Contribuir preço</a>
      </div>
    </main>
  );
}
