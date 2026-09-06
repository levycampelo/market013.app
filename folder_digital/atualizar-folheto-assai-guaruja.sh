#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ENV_FILE:-${PROJECT_ROOT}/.env.test}"

if [[ -z "${DATABASE_URL:-}" && -f "$ENV_FILE" ]]; then
  DATABASE_URL="$(sed -n 's/^DATABASE_URL=//p' "$ENV_FILE" | head -n 1 | tr -d '\r')"
  export DATABASE_URL
fi

CAMPAIGN_ID="${CAMPAIGN_ID:-170731}"
CLUSTER_ID="${CLUSTER_ID:-784}"
BASE_URL="${BASE_URL:-https://d2q57q7k4hzryv.cloudfront.net/RPA/v3/${CAMPAIGN_ID}}"
SOURCE_URL="${SOURCE_URL:-https://www.assai.com.br/ofertas/sao-paulo/assai-guaruja}"
OUTPUT_DIR="${OUTPUT_DIR:-$SCRIPT_DIR}"
PAGES="${PAGES:-1}"
REFERER="$SOURCE_URL"
MARKET_NAME="Assaí Atacadista - Guarujá"
MARKET_ADDRESS="Rua Waldomiro Macário, 570, Vicente de Carvalho, Guarujá - SP"
MARKET_LATITUDE="-23.9737912"
MARKET_LONGITUDE="-46.2695399"
OBSERVED_AT="${OBSERVED_AT:-2026-09-01T00:00:00Z}"
VALID_UNTIL="${VALID_UNTIL:-2026-09-13}"
TEMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

fail() {
  printf 'ERRO: %s\n' "$1" >&2
  exit 1
}

[[ -n "${DATABASE_URL:-}" ]] || fail "DATABASE_URL não configurada. Crie ${ENV_FILE} a partir de .env.test.example ou exporte DATABASE_URL antes de executar."
command -v psql >/dev/null 2>&1 || fail "psql não encontrado"

printf 'Ambiente: teste local (%s)\n' "$ENV_FILE"

printf 'Atualizando folheto do %s\n' "$MARKET_NAME"
printf 'Mercado: %s (%s, %s)\n' "$MARKET_ADDRESS" "$MARKET_LATITUDE" "$MARKET_LONGITUDE"
printf 'Validade indicada no folheto: 2026-09-01 a %s\n\n' "$VALID_UNTIL"

mkdir -p "$OUTPUT_DIR"
for page in $PAGES; do
  url="${BASE_URL}/campanha-${CAMPAIGN_ID}-cluster-${CLUSTER_ID}-pagina-${page}.jpeg"
  temporary_file="${TEMP_DIR}/assai-guaruja-${page}.jpg"
  output_file="${OUTPUT_DIR}/assai-guaruja-${page}.jpg"
  printf 'Baixando página %s...\n' "$page"
  curl --fail --silent --show-error --location --retry 3 --connect-timeout 15 --max-time 120 \
    --header 'User-Agent: Mozilla/5.0' --header "Referer: ${REFERER}" \
    "$url" --output "$temporary_file" || fail "não foi possível baixar a página ${page}"
  file "$temporary_file" | grep --ignore-case --extended-regexp 'JPEG image|image data' >/dev/null || fail "página ${page} não é uma imagem JPEG válida"
  mv "$temporary_file" "$output_file"
done

cat > "${OUTPUT_DIR}/manifest-assai-guaruja.json" <<EOF
{
  "market": "${MARKET_NAME}",
  "address": "${MARKET_ADDRESS}",
  "latitude": ${MARKET_LATITUDE},
  "longitude": ${MARKET_LONGITUDE},
  "source": "${SOURCE_URL}",
  "observedAt": "${OBSERVED_AT}",
  "validUntil": "${VALID_UNTIL}"
}
EOF

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<SQL
begin;

insert into supermarkets (id, name, address, latitude, longitude)
select gen_random_uuid(), '$MARKET_NAME', '$MARKET_ADDRESS', $MARKET_LATITUDE, $MARKET_LONGITUDE
where not exists (
  select 1 from supermarkets
  where lower(name) = lower('$MARKET_NAME') and lower(address) = lower('$MARKET_ADDRESS')
);

create temporary table flyer_prices (
  name text not null,
  brand text,
  category text,
  price numeric(10,2) not null
) on commit drop;

insert into flyer_prices (name, brand, category, price) values
('Chocolate 5Star Lacta caixeta 18x40 g', 'Lacta', 'Mercearia', 61.99),
('Chocolate ao leite ou branco Bis Lacta embalagem 302,4 g', 'Lacta', 'Mercearia', 16.99),
('Bombons Sonho de Valsa ou Ouro Branco Lacta caixeta 220 g', 'Lacta', 'Mercearia', 9.99),
('Chocolate Lacta tipos tablete 80 g, 90 g ou 98 g', 'Lacta', 'Mercearia', 6.99),
('Chocolate recheado Lacta tipos tablete 104 g', 'Lacta', 'Mercearia', 6.99),
('Biscoito recheado Oreo sabores pacote 90 g', 'Oreo', 'Mercearia', 3.49),
('Biscoito recheado Oreo sabores pacote 270 g', 'Oreo', 'Mercearia', 9.89),
('Biscoito snack Club Social Nabisco sabores pacote 68 g', 'Club Social', 'Mercearia', 4.79),
('Biscoito snack Club Social Nabisco sabores pacote 115 g', 'Club Social', 'Mercearia', 7.99),
('Biscoito Club Social Nabisco sabores pacote 141 g', 'Club Social', 'Mercearia', 5.09),
('Chiclete Trident sabores caixeta 21x8 g', 'Trident', 'Mercearia', 38.85),
('Chiclete Trident sabores pacote 32 g', 'Trident', 'Mercearia', 5.99),
('Chiclete Trident sabores pote 48,3 g', 'Trident', 'Mercearia', 8.89),
('Chiclete X Senses Trident sabores pote 54 g', 'Trident', 'Mercearia', 8.89),
('Bala Halls sabores caixeta 21x10 g', 'Halls', 'Mercearia', 24.95),
('Fermento químico em pó Royal pote 100 g', 'Royal', 'Mercearia', 3.99),
('Fermento químico em pó Royal pote 250 g', 'Royal', 'Mercearia', 9.99),
('Pó para preparo de refresco Tang sabores caixeta 15x18 g', 'Tang', 'Bebidas', 12.99),
('Pó para preparo de refresco Tang sabores sachê 18 g', 'Tang', 'Bebidas', 0.89);

with product_rows as (
  insert into products (id, name, brand, category)
  select gen_random_uuid(), f.name, f.brand, f.category
  from flyer_prices f
  where not exists (
    select 1 from products p where lower(p.name) = lower(f.name)
  )
  returning id, name
), resolved_products as (
  select f.name, coalesce(p_new.id, p_existing.id) as product_id, f.price
  from flyer_prices f
  left join product_rows p_new on lower(p_new.name) = lower(f.name)
  left join products p_existing on lower(p_existing.name) = lower(f.name)
), target_market as (
  select id as supermarket_id from supermarkets
  where lower(name) = lower('$MARKET_NAME') and lower(address) = lower('$MARKET_ADDRESS')
  limit 1
)
insert into prices (id, product_id, supermarket_id, price, source, status, observed_at)
select gen_random_uuid(), r.product_id, m.supermarket_id, r.price, 'encarte', 'pendente', '$OBSERVED_AT'::timestamptz
from resolved_products r cross join target_market m
where not exists (
  select 1 from prices pr
  where pr.product_id = r.product_id
    and pr.supermarket_id = m.supermarket_id
    and pr.source = 'encarte'
    and pr.observed_at::date = '$OBSERVED_AT'::date
);

commit;
SQL

printf '\nFolheto e preços importados como pendentes com sucesso.\n'
printf 'Revise e aprove os registros em /administracao.\n'
