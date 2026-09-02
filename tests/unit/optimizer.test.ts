import { describe, expect, it } from "vitest";
import { haversineKm, optimizeBasket, type Market, type MarketPrice } from "../../backend/domain/optimizer";

const markets: Market[] = [
  { id: "near", name: "Mercado perto", latitude: -23.55052, longitude: -46.63331 },
  { id: "far", name: "Mercado distante", latitude: -23.58000, longitude: -46.62000 },
];
const options = { userLatitude: -23.55052, userLongitude: -46.63331, fuelPricePerLiter: 6, vehicleKmPerLiter: 12 };

function price(productId: string, marketId: string, value: number): MarketPrice { return { productId, marketId, price: value }; }

describe("optimizeBasket", () => {
  it("chooses the cheapest single market when the basket is complete there", () => {
    const result = optimizeBasket([{ productId: "rice", quantity: 1 }, { productId: "beans", quantity: 1 }], markets, [price("rice", "near", 10), price("beans", "near", 8), price("rice", "far", 9), price("beans", "far", 10)], options);
    expect(result.marketIds).toEqual(["near"]);
    expect(result.total).toBe(18);
  });

  it("chooses a mixed basket when the savings exceed the extra travel", () => {
    const result = optimizeBasket([{ productId: "rice", quantity: 1 }, { productId: "beans", quantity: 1 }], markets, [price("rice", "near", 20), price("beans", "near", 20), price("rice", "far", 5), price("beans", "far", 30)], options);
    expect(result.marketIds).toEqual(["far", "near"]);
    expect(result.total).toBeLessThan(40);
  });

  it("keeps the basket in one market when travel cancels the savings", () => {
    const result = optimizeBasket([{ productId: "rice", quantity: 1 }, { productId: "beans", quantity: 1 }], markets, [price("rice", "near", 10), price("beans", "near", 10), price("rice", "far", 1), price("beans", "far", 10)], { ...options, fuelPricePerLiter: 100 });
    expect(result.marketIds).toEqual(["near"]);
  });

  it("reports missing products without inventing a price", () => {
    const result = optimizeBasket([{ productId: "rice", quantity: 1 }, { productId: "milk", quantity: 1 }], markets, [price("rice", "near", 10)], options);
    expect(result.missingProductIds).toEqual(["milk"]);
    expect(result.lines).toHaveLength(1);
  });

  it("returns an empty result when no market is available", () => {
    expect(optimizeBasket([{ productId: "rice", quantity: 1 }], [], [price("rice", "near", 10)], options).lines).toEqual([]);
  });
});

it("calculates a known distance", () => {
  expect(haversineKm(-23.55052, -46.63331, -23.56100, -46.65600)).toBeCloseTo(2.64, 1);
});