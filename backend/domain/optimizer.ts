export type ShoppingItem = { productId: string; quantity: number };

export type Market = { id: string; name: string; latitude: number; longitude: number };

export type MarketPrice = { productId: string; marketId: string; price: number };

export type OptimizerOptions = {
  userLatitude?: number;
  userLongitude?: number;
  fuelPricePerLiter: number;
  vehicleKmPerLiter: number;
};

export type BasketLine = ShoppingItem & { marketId: string; unitPrice: number; total: number };

export type BasketResult = {
  lines: BasketLine[];
  marketIds: string[];
  productsTotal: number;
  travelCost: number;
  total: number;
  missingProductIds: string[];
};

export function haversineKm(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number) {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(latitudeB - latitudeA);
  const longitudeDelta = toRadians(longitudeB - longitudeA);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(latitudeA)) * Math.cos(toRadians(latitudeB)) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function optimizeBasket(items: ShoppingItem[], markets: Market[], prices: MarketPrice[], options: OptimizerOptions): BasketResult {
  validateOptions(options);
  const priceByProduct = groupPrices(prices);
  const marketIds = new Set(markets.map((market) => market.id));
  for (const [productId, productPrices] of priceByProduct) {
    priceByProduct.set(productId, productPrices.filter((price) => marketIds.has(price.marketId)));
  }
  const availableItems = items.filter((item) => item.quantity > 0 && (priceByProduct.get(item.productId)?.length ?? 0) > 0);
  const missingProductIds = items.filter((item) => item.quantity > 0 && !priceByProduct.has(item.productId)).map((item) => item.productId);
  if (availableItems.length === 0 || markets.length === 0) return emptyResult(missingProductIds);

  const marketById = new Map(markets.map((market) => [market.id, market]));
  let best: BasketResult | null = null;
  searchAssignments(availableItems, 0, [], new Set(), (assignment, marketIds) => {
    const lines = assignment.map(({ item, price }) => ({
      ...item,
      marketId: price.marketId,
      unitPrice: price.price,
      total: roundMoney(price.price * item.quantity),
    }));
    const productsTotal = roundMoney(lines.reduce((sum, line) => sum + line.total, 0));
    const travelCost = roundMoney([...marketIds].reduce((sum, marketId) => sum + getTravelCost(marketById.get(marketId), options), 0));
    const candidate = { lines, marketIds: [...marketIds].sort(), productsTotal, travelCost, total: roundMoney(productsTotal + travelCost), missingProductIds };
    if (!best || candidate.total < best.total) best = candidate;
  }, priceByProduct);
  return best ?? emptyResult(missingProductIds);
}

function searchAssignments(items: ShoppingItem[], index: number, assignment: Array<{ item: ShoppingItem; price: MarketPrice }>, marketIds: Set<string>, onCandidate: (assignment: Array<{ item: ShoppingItem; price: MarketPrice }>, marketIds: Set<string>) => void, priceByProduct: Map<string, MarketPrice[]>) {
  if (index === items.length) { onCandidate(assignment, marketIds); return; }
  const item = items[index];
  for (const price of priceByProduct.get(item.productId) ?? []) {
    assignment.push({ item, price });
    marketIds.add(price.marketId);
    searchAssignments(items, index + 1, assignment, marketIds, onCandidate, priceByProduct);
    assignment.pop();
    if (!assignment.some((line) => line.price.marketId === price.marketId)) marketIds.delete(price.marketId);
  }
}

function getTravelCost(market: Market | undefined, options: OptimizerOptions) {
  if (!market || options.userLatitude === undefined || options.userLongitude === undefined) return 0;
  const distanceKm = haversineKm(options.userLatitude, options.userLongitude, market.latitude, market.longitude) * 2;
  return distanceKm / options.vehicleKmPerLiter * options.fuelPricePerLiter;
}

function groupPrices(prices: MarketPrice[]) {
  const grouped = new Map<string, MarketPrice[]>();
  for (const price of prices) {
    if (!Number.isFinite(price.price) || price.price < 0) continue;
    const productPrices = grouped.get(price.productId) ?? [];
    productPrices.push(price);
    grouped.set(price.productId, productPrices);
  }
  return grouped;
}

function emptyResult(missingProductIds: string[]): BasketResult {
  return { lines: [], marketIds: [], productsTotal: 0, travelCost: 0, total: 0, missingProductIds };
}

function roundMoney(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100; }
function toRadians(value: number) { return value * Math.PI / 180; }
function validateOptions(options: OptimizerOptions) {
  if (!Number.isFinite(options.fuelPricePerLiter) || options.fuelPricePerLiter < 0) throw new Error("fuelPricePerLiter must be non-negative");
  if (!Number.isFinite(options.vehicleKmPerLiter) || options.vehicleKmPerLiter <= 0) throw new Error("vehicleKmPerLiter must be positive");
}