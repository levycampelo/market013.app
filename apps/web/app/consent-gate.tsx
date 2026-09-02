"use client";

import { useEffect, useState } from "react";

const consentKey = "market013-consent-v1";

export default function ConsentGate({ children }: Readonly<{ children: React.ReactNode }>) {
  const [accepted, setAccepted] = useState<boolean | null>(null);

  useEffect(() => setAccepted(window.localStorage.getItem(consentKey) === "accepted"), []);

  function acceptTerms() {
    window.localStorage.setItem(consentKey, "accepted");
    setAccepted(true);
  }

  if (accepted === null) return null;
  if (accepted) return children;

  return <main className="consent-page">
    <section className="consent-panel" role="dialog" aria-labelledby="consent-title" aria-modal="true">
      <p className="kicker">antes de começar</p>
      <h1 id="consent-title">Transparência<br /><em>em primeiro lugar.</em></h1>
      <p className="consent-lede">O market013 usa dados colaborativos para ajudar você a comparar compras. Leia os pontos essenciais e aceite para continuar.</p>
      <div className="consent-columns">
        <section><h2>Termos de Uso</h2><p>Os preços são informativos e podem mudar na gôndola. A decisão final de compra é sua e o market013 não garante disponibilidade ou valor.</p></section>
        <section><h2>Privacidade</h2><p>Usamos os dados necessários para oferecer o comparador. Localização, câmera e imagens só serão solicitadas quando você escolher a função correspondente.</p></section>
      </div>
      <label className="consent-check"><input type="checkbox" id="consent-checkbox" /> <span>Li e aceito os Termos de Uso e a Política de Privacidade.</span></label>
      <button className="consent-button" type="button" onClick={() => { const checkbox = document.getElementById("consent-checkbox") as HTMLInputElement; if (checkbox.checked) acceptTerms(); }}>Aceitar e continuar <span>→</span></button>
      <p className="consent-footnote">O aceite fica registrado neste navegador como versão 1.</p>
    </section>
  </main>;
}