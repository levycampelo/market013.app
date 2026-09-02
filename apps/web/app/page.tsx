export default function HomePage() {
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
        <div><strong>10</strong><span>produtos no teste</span></div>
        <div><strong>03</strong><span>mercados mapeados</span></div>
        <div><strong>R$ 0</strong><span>custo para começar</span></div>
      </section>
    </main>
  );
}
