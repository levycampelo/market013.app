#!/usr/bin/env bash

set -Eeuo pipefail

BASE_URL="${BASE_URL:-https://market013-app-web-phi.vercel.app}"
PRODUCT_ID="${PRODUCT_ID:-00000000-0000-0000-0000-000000000001}"
MARKET_ID="${MARKET_ID:-10000000-0000-0000-0000-000000000001}"
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

request() {
  local name="$1"
  local method="$2"
  local path="$3"
  local expected_status="$4"
  local body="${5:-}"
  local output_file="$TEMP_DIR/$name.json"
  local status
  local -a curl_args

  curl_args=(
    --silent
    --show-error
    --output "$output_file"
    --write-out '%{http_code}'
    --connect-timeout 10
    --max-time 30
    --request "$method"
    "$BASE_URL$path"
  )

  if [[ -n "$body" ]]; then
    curl_args+=(--header 'Content-Type: application/json' --data "$body")
  fi

  if [[ -n "${ADMIN_COOKIE:-}" ]]; then
    curl_args+=(--cookie "$ADMIN_COOKIE")
  fi

  status="$(curl "${curl_args[@]}")" || fail "$name: falha de conexão"

  if [[ "$status" != "$expected_status" ]]; then
    printf 'Resposta recebida em %s:\n' "$BASE_URL$path" >&2
    sed -n '1,20p' "$output_file" >&2 || true
    fail "$name: esperado HTTP $expected_status, recebido HTTP $status"
  fi

  pass "$name: HTTP $status"
}

assert_json() {
  local name="$1"
  local file="$TEMP_DIR/$name.json"
  local check="$2"

  node - "$file" "$check" <<'NODE'
const fs = require("node:fs");

const [file, check] = process.argv.slice(2);
const data = JSON.parse(fs.readFileSync(file, "utf8"));

if (check === "session-anonymous" && data.user !== null) {
  throw new Error("sessão anônima deveria retornar user null");
}

if (check === "products" && (!Array.isArray(data.products) || data.products.length < 1)) {
  throw new Error("produtos ausentes");
}

if (check === "markets" && (!Array.isArray(data.markets) || data.markets.length < 1)) {
  throw new Error("mercados ausentes");
}

if (check === "prices-approved") {
  if (!Array.isArray(data.prices) || data.prices.length < 1) {
    throw new Error("preços ausentes");
  }
  if (data.prices.some((price) => price.status !== "aprovado")) {
    throw new Error("a API pública expôs preço que não está aprovado");
  }
}

if (check === "admin") {
  if (!Array.isArray(data.prices) || !Array.isArray(data.summary)) {
    throw new Error("contrato administrativo inválido");
  }
}

if (check === "clients") {
  if (!Array.isArray(data.users)) {
    throw new Error("lista de clientes inválida");
  }
}

console.log("JSON válido");
NODE

  pass "$name: contrato JSON válido"
}

printf 'Testando APIs do Preview: %s\n\n' "$BASE_URL"

request "health" "GET" "/api/health" "200"
request "session-anonymous" "GET" "/api/auth/session" "401"
assert_json "session-anonymous" "session-anonymous"

request "products" "GET" "/api/products" "200"
assert_json "products" "products"

request "markets" "GET" "/api/markets" "200"
assert_json "markets" "markets"

request "prices" "GET" "/api/prices?productId=$PRODUCT_ID" "200"
assert_json "prices" "prices-approved"

request "prices-missing-product" "GET" "/api/prices" "400"

request "contribution-anonymous" "POST" "/api/prices" "401" \
  "{\"productId\":\"$PRODUCT_ID\",\"supermarketId\":\"$MARKET_ID\",\"price\":9.99}"

request "admin-anonymous" "GET" "/api/admin" "401"
request "admin-clients-anonymous" "GET" "/api/admin?view=clientes" "401"
request "admin-update-anonymous" "PATCH" "/api/admin" "401" \
  "{\"priceId\":\"00000000-0000-0000-0000-000000000000\",\"status\":\"aprovado\"}"
request "admin-delete-anonymous" "DELETE" "/api/admin" "401" \
  "{\"priceId\":\"00000000-0000-0000-0000-000000000000\"}"

if [[ -n "${ADMIN_COOKIE:-}" ]]; then
  printf '\nCookie administrativo informado; validando leituras protegidas.\n'
  request "admin-authenticated" "GET" "/api/admin?status=pendente" "200"
  assert_json "admin-authenticated" "admin"
  request "admin-clients-authenticated" "GET" "/api/admin?view=clientes" "200"
  assert_json "admin-clients-authenticated" "clients"
else
  printf '\nADMIN_COOKIE não informado; testes autenticados foram pulados.\n'
fi

printf '\nTestes automatizados concluídos com sucesso.\n'
printf 'O envio real, aprovação e rejeição exigem sessão autenticada e alteração controlada no banco.\n'
