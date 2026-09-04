#!/usr/bin/env bash

set -Eeuo pipefail

BASE_URL="${BASE_URL:-https://market013-app-web-phi.vercel.app}"
PRODUCT_ID="00000000-0000-0000-0000-000000000001"
TEMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TEMP_DIR"
}

trap cleanup EXIT

pass() {
  printf 'PASS  %s\n' "$1"
}

fail() {
  printf 'FAIL  %s\n' "$1" >&2
  exit 1
}

response_file() {
  printf '%s/%s.json' "$TEMP_DIR" "$1"
}

check_status() {
  local name="$1"
  local path="$2"
  local expected_status="$3"
  local output_file
  local status

  output_file="$(response_file "$name")"
  status="$({
    curl --silent --show-error \
      --output "$output_file" \
      --write-out '%{http_code}' \
      --connect-timeout 10 \
      --max-time 30 \
      "$BASE_URL$path"
  })" || fail "$name: falha de conexão"

  if [[ "$status" != "$expected_status" ]]; then
    printf 'Resposta recebida em %s:\n' "$BASE_URL$path" >&2
    sed -n '1,20p' "$output_file" >&2 || true
    fail "$name: esperado HTTP $expected_status, recebido HTTP $status"
  fi

  pass "$name: HTTP $status"
}

check_json() {
  local name="$1"
  local validation="$2"
  local file

  file="$(response_file "$name")"

  node - "$file" "$validation" <<'NODE'
const fs = require("node:fs");

const [file, validation] = process.argv.slice(2);
const data = JSON.parse(fs.readFileSync(file, "utf8"));

if (validation === "health") {
  if (data.ok !== true || data.service !== "market013-web") {
    throw new Error("health inválido");
  }
}

if (validation === "products") {
  if (!Array.isArray(data.products) || data.products.length < 10) {
    throw new Error("esperados pelo menos 10 produtos");
  }
}

if (validation === "markets") {
  if (!Array.isArray(data.markets) || data.markets.length < 3) {
    throw new Error("esperados pelo menos 3 mercados");
  }
}

if (validation === "prices") {
  if (!Array.isArray(data.prices) || data.prices.length < 1) {
    throw new Error("esperado pelo menos 1 preço");
  }

  if (data.prices.some((price) => price.status !== "aprovado")) {
    throw new Error("a resposta contém preço que não está aprovado");
  }
}

console.log("JSON válido");
NODE

  pass "$name: contrato JSON válido"
}

check_page_content() {
  local name="$1"
  local path="$2"
  local pattern="$3"
  local output_file="$TEMP_DIR/${name}.html"

  curl --silent --show-error \
    --fail \
    --connect-timeout 10 \
    --max-time 30 \
    "$BASE_URL$path" > "$output_file" ||
    fail "$name: página não carregou"

  grep --ignore-case --extended-regexp "$pattern" "$output_file" > /dev/null ||
    fail "$name: conteúdo esperado não encontrado"

  pass "$name: conteúdo principal encontrado"
}

printf 'Validando Preview: %s\n\n' "$BASE_URL"

check_status "health" "/api/health" "200"
check_json "health" "health"

check_status "products" "/api/products" "200"
check_json "products" "products"

check_status "markets" "/api/markets" "200"
check_json "markets" "markets"

check_status "prices" "/api/prices?productId=$PRODUCT_ID" "200"
check_json "prices" "prices"

check_status "prices-sem-product-id" "/api/prices" "400"

check_page_content "home" "/" "Termos de Uso|Privacidade|market013"
check_page_content "lista" "/lista" "Termos de Uso|Privacidade|market013"
check_page_content "comparar" "/comparar" "Termos de Uso|Privacidade|market013"
check_page_content "contribuir" "/contribuir" "Termos de Uso|Privacidade|market013"

printf '\nValidação automática concluída com sucesso.\n'
printf 'OAuth, consentimento no navegador, geolocalização e contribuição autenticada exigem teste manual.\n'
