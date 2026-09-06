type ArtProps = { category: string | null; name: string };

const PALETTE = ["#f6e7c9", "#e3efd6", "#f7dcd4", "#dde8f2", "#efe3f0", "#e8e5da"];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function pickKind(category: string | null, name: string) {
  const text = normalize(`${category ?? ""} ${name}`);
  if (/hortifruti|fruta|verdura|legume|banana|maca|tomate|batata/.test(text)) return "hortifruti";
  if (/laticinio|leite|queijo|iogurte|manteiga/.test(text)) return "laticinios";
  if (/acougue|carne|frango|linguica|peixe/.test(text)) return "acougue";
  if (/limpeza|sabao|detergente|amaciante|desinfetante/.test(text)) return "limpeza";
  if (/higiene|papel|shampoo|sabonete|creme dental/.test(text)) return "higiene";
  if (/bebida|refrigerante|suco|cerveja|agua|vinho/.test(text)) return "bebidas";
  if (/padaria|pao|bolo|biscoito|torrada/.test(text)) return "padaria";
  return "mercearia";
}

function hash(value: string) {
  let total = 0;
  for (const char of value) total = (total + char.charCodeAt(0)) % 997;
  return total;
}

export default function ProductArt({ category, name }: ArtProps) {
  const kind = pickKind(category, name);
  const background = PALETTE[hash(name) % PALETTE.length];

  return (
    <svg className="offer-art" viewBox="0 0 160 140" role="img" aria-hidden="true" focusable="false">
      <rect width="160" height="140" fill={background} />
      <circle cx="128" cy="26" r="34" fill="#ffffff" opacity=".45" />
      {kind === "hortifruti" && (
        <g>
          <path d="M80 128c-20 0-32-16-32-36 0-19 13-32 32-32s32 13 32 32c0 20-12 36-32 36z" fill="#e05c43" />
          <path d="M80 60c0-14 9-24 24-26-2 16-10 25-24 26z" fill="#5f9b4a" />
          <rect x="77" y="42" width="6" height="20" rx="3" fill="#6b4a2f" />
        </g>
      )}
      {kind === "laticinios" && (
        <g>
          <path d="M58 52h44v76H58z" fill="#ffffff" />
          <path d="M58 52l22-24 22 24z" fill="#dfe7ef" />
          <rect x="58" y="86" width="44" height="18" fill="#4a7fbd" />
          <rect x="68" y="20" width="24" height="12" rx="3" fill="#4a7fbd" />
        </g>
      )}
      {kind === "acougue" && (
        <g>
          <path d="M46 96c0-30 16-48 40-48s34 16 34 38c0 24-16 38-38 38S46 116 46 96z" fill="#e2705f" />
          <path d="M64 92c0-14 8-24 20-24s18 9 18 21-8 22-19 22-19-8-19-19z" fill="#f6cfc6" />
          <path d="M118 62c8 6 12 14 12 24l-14 2c0-10-2-18-8-24z" fill="#f4efe3" />
        </g>
      )}
      {kind === "limpeza" && (
        <g>
          <rect x="60" y="54" width="42" height="74" rx="8" fill="#4fa3a1" />
          <rect x="70" y="30" width="22" height="26" rx="6" fill="#2f7a78" />
          <path d="M102 44h22v10h-22z" fill="#2f7a78" />
          <rect x="66" y="76" width="30" height="26" rx="4" fill="#ffffff" opacity=".85" />
        </g>
      )}
      {kind === "higiene" && (
        <g>
          <rect x="52" y="60" width="56" height="60" rx="10" fill="#ffffff" />
          <ellipse cx="80" cy="60" rx="28" ry="12" fill="#f0efe9" />
          <circle cx="80" cy="60" r="8" fill="#cbd0c3" />
          <path d="M108 68c14 4 20 14 18 28l-18-4z" fill="#f4efe3" />
        </g>
      )}
      {kind === "bebidas" && (
        <g>
          <path d="M70 34h20v18l12 22v54H58V74l12-22z" fill="#6c9f4f" />
          <rect x="70" y="24" width="20" height="12" rx="3" fill="#3f6b31" />
          <rect x="58" y="88" width="44" height="24" fill="#f4efe3" opacity=".9" />
        </g>
      )}
      {kind === "padaria" && (
        <g>
          <ellipse cx="80" cy="92" rx="44" ry="28" fill="#d9a05b" />
          <path d="M52 82c8-8 16-12 28-12s20 4 28 12" stroke="#a9713a" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M60 100h40" stroke="#a9713a" strokeWidth="5" strokeLinecap="round" />
        </g>
      )}
      {kind === "mercearia" && (
        <g>
          <path d="M56 46h48l10 82H46z" fill="#e8c78c" />
          <path d="M56 46l6-18h36l6 18z" fill="#d3ad6d" />
          <rect x="62" y="76" width="36" height="26" rx="3" fill="#f4efe3" />
          <path d="M68 90h24" stroke="#c08a44" strokeWidth="4" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}
