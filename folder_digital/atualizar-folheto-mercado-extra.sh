#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ENV_FILE:-${PROJECT_ROOT}/.env.test}"

if [[ -z "${DATABASE_URL:-}" && -f "$ENV_FILE" ]]; then
  DATABASE_URL="$(sed -n 's/^DATABASE_URL=//p' "$ENV_FILE" | head -n 1 | tr -d '\r')"
  export DATABASE_URL
fi

BASE_URL="${BASE_URL:-https://folheteria.clubeextra.com.br/home/sites/mercado/pubs/gfds/link_sp}"
OUTPUT_DIR="${OUTPUT_DIR:-$SCRIPT_DIR}"
PAGES="${PAGES:-1 2 3}"
REFERER="${BASE_URL}/index.html"
MARKET_NAME="Mercado Extra"
MARKET_ADDRESS="Avenida Dom Pedro I, Enseada, Guarujá - SP"
MARKET_LATITUDE="-23.9740252"
MARKET_LONGITUDE="-46.2192823"
OBSERVED_AT="${OBSERVED_AT:-2026-09-04T00:00:00Z}"
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
printf 'Validade indicada no folheto: 2026-09-04 a 2026-09-06\n\n'

mkdir -p "$OUTPUT_DIR"
for page in $PAGES; do
  url="${BASE_URL}/files/large/${page}.jpg"
  temporary_file="${TEMP_DIR}/${page}.jpg"
  output_file="${OUTPUT_DIR}/${page}.jpg"
  printf 'Baixando página %s...\n' "$page"
  curl --fail --silent --show-error --location --retry 3 --connect-timeout 15 --max-time 120 \
    --header 'User-Agent: Mozilla/5.0' --header "Referer: ${REFERER}" \
    "$url" --output "$temporary_file" || fail "não foi possível baixar a página ${page}"
  file "$temporary_file" | grep --ignore-case --extended-regexp 'JPEG image|image data' >/dev/null || fail "página ${page} não é uma imagem JPEG válida"
  mv "$temporary_file" "$output_file"
done

cat > "${OUTPUT_DIR}/manifest-mercado-extra.json" <<EOF
{
  "market": "${MARKET_NAME}",
  "address": "${MARKET_ADDRESS}",
  "latitude": ${MARKET_LATITUDE},
  "longitude": ${MARKET_LONGITUDE},
  "source": "${BASE_URL}/index.html",
  "observedAt": "${OBSERVED_AT}",
  "validUntil": "2026-09-06"
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
('Alcatra com maminha bovina resfriada kg', null, 'Açougue', 44.90),
('Linguiça suína Perdigão kg', 'Perdigão', 'Açougue', 17.90),
('Cerveja Original lata 269 ml', 'Original', 'Bebidas', 2.99),
('Leite integral 1 litro', 'Italac', 'Laticínios', 5.09),
('Arroz agulhinha Pra Valer tipo 1 5 kg', 'Pra Valer', 'Mercearia', 14.99),
('Arroz Qualitá tipo 1 pacote 5 kg', 'Qualitá', 'Mercearia', 15.99),
('Papel higiênico compacto 12 rolos 20 m', 'Pra Valer', 'Higiene', 13.49),
('Papel higiênico folha dupla 12 rolos 30 m', 'Personal Vip', 'Higiene', 18.99),
('Uva clara sem semente 500 g', 'Qualitá', 'Hortifruti', 8.99),
('Mamão papaia a granel kg', null, 'Hortifruti', 7.99),
('Tangerina murkot a granel kg', null, 'Hortifruti', 4.99),
('Brócolis ninja 300 g', 'Qualitá', 'Hortifruti', 6.99),
('Cupim bovino resfriado kg', null, 'Açougue', 32.90),
('Picanha bovina especial resfriada kg', null, 'Açougue', 68.90),
('Coxinha da asa congelada IQF 1 kg', 'Canção', 'Congelados', 9.90),
('Coxinha da asa Buffalo Wings 800 g', 'Seara', 'Congelados', 16.70),
('Filé ou filezinho de frango congelado 1 kg', 'Sadia', 'Congelados', 17.90),
('Ragu de carne suína congelado 500 g', null, 'Congelados', 8.39),
('Costela suína congelada kg', null, 'Açougue', 18.90),
('Barriga ou copa lombo suínas resfriadas kg', null, 'Açougue', 19.90),
('Vinho tinto Pérgola suave 1 litro', 'Pérgola', 'Bebidas', 19.99),
('Whisky escocês Johnnie Walker Red Label 1 litro', 'Johnnie Walker', 'Bebidas', 89.99),
('Aguardente 51 garrafa 965 ml', '51', 'Bebidas', 11.99),
('Smirnoff Ice red garrafa 275 ml', 'Smirnoff', 'Bebidas', 5.99),
('Cerveja Heineken lata sleek 350 ml', 'Heineken', 'Bebidas', 5.29),
('Fanta uva ou laranja lata 350 ml', 'Fanta', 'Bebidas', 2.99),
('Guaraná Antarctica ou Guaraná Antarctica zero PET 1,5 litro', 'Antarctica', 'Bebidas', 6.59),
('Coca-Cola original ou sem açúcar 1,5 litro', 'Coca-Cola', 'Bebidas', 8.49),
('Energético Monster ou Monster Ultra lata 473 ml', 'Monster', 'Bebidas', 8.49),
('Batata frita Qualitá 90 g', 'Qualitá', 'Mercearia', 9.89),
('Suco integral uva tinto PET 1,35 litro', 'Qualitá', 'Bebidas', 16.59),
('Lava-roupas líquido 3 litros', 'Qualitá', 'Limpeza', 25.99),
('Toalha de papel com 2 rolos', 'Qualitá', 'Limpeza', 5.69),
('Macarrão com ovos parafuso ou espaguete 500 g', 'Dona Benta', 'Mercearia', 3.29),
('Orégano Kitano 15 g', 'Kitano', 'Mercearia', 5.35),
('Café torrado e moído 500 g', 'Pilão', 'Mercearia', 24.99),
('Biscoito recheado Bono chocolate ou Negresco original 90 g', 'Nestlé', 'Mercearia', 2.89),
('Batata frita clássica 115 g', 'Lays', 'Mercearia', 9.99),
('Salgadinho Doritos queijo nacho 75 g', 'Doritos', 'Mercearia', 5.53),
('Chocolate em tablete 80 g', 'Lacta', 'Mercearia', 6.99),
('Bombons sortidos 220 g', 'Garoto', 'Mercearia', 14.99),
('Bisnaguinha 300 g', 'Pullman', 'Padaria', 7.99),
('Margarina cremosa com ou sem sal 500 g', 'Qualy', 'Laticínios', 7.99),
('Requeijão cremoso tradicional ou light 200 g', 'Vigor', 'Laticínios', 7.99),
('Queijo prato ou muçarela fatiados 150 g', 'Tirolez', 'Laticínios', 10.90),
('Queijo prato Qualitá peça kg', 'Qualitá', 'Laticínios', 44.90),
('Queijo minas frescal 100 g', 'Juliana', 'Laticínios', 4.99),
('Queijo coalho em espeto 300 g', 'Quatá', 'Laticínios', 25.90),
('Mortadela bologna fatiada 100 g', 'Perdigão', 'Frios', 2.29),
('Presunto cozido fatiado 100 g', 'Perdigão', 'Frios', 2.79),
('Nuggets de frango 300 g', 'Sadia', 'Congelados', 8.99),
('Pizza congelada sabores 460 g', 'Perdigão', 'Congelados', 16.99),
('Sorvete Duo sabores 1,3 litro', 'Nobrelli', 'Congelados', 14.99),
('Sorvete linha tradicional 1,5 litro', 'Nestlé', 'Congelados', 22.99),
('Linguiça calabresa curada a granel kg', 'Seara', 'Açougue', 25.90),
('Salsicha hot dog a granel kg', 'Perdigão', 'Açougue', 10.90),
('Kit shampoo 400 ml e condicionador 175 ml', 'Pantene', 'Higiene', 31.99),
('Pack sabonete com 6 unidades de 80 g', 'Nivea', 'Higiene', 22.99),
('Detergente em pó 2,2 kg', 'Brilhante', 'Limpeza', 20.99),
('Amaciante de roupas 1 litro', 'Downy', 'Limpeza', 19.99),
('Carvão 2 kg', 'Pega Bem', 'Limpeza', 21.24);

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
