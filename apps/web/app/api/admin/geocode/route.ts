import { NextResponse } from "next/server";
import { isAdmin, readSession } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = readSession(request);
  if (!user) return NextResponse.json({ error: "Autenticação necessária" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "Acesso administrativo negado" }, { status: 403 });

  const apiKey = process.env.GEOCODE_MAPS_KEY;
  if (!apiKey) return NextResponse.json({ error: "Geocodificação não configurada" }, { status: 503 });

  try {
    const body = await request.json() as { address?: unknown };
    const address = typeof body.address === "string" ? body.address.trim() : "";
    if (!address) return NextResponse.json({ error: "Endereço é obrigatório" }, { status: 400 });

    const url = new URL("https://geocode.maps.co/search");
    url.searchParams.set("q", address);
    url.searchParams.set("format", "json");
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("geocode_provider_error", response.status);
      return NextResponse.json({ error: "Não foi possível localizar o endereço" }, { status: 502 });
    }

    const results = await response.json() as Array<{ lat?: string; lon?: string; display_name?: string }>;
    const first = results.find((result) => Number.isFinite(Number(result.lat)) && Number.isFinite(Number(result.lon)));
    if (!first) return NextResponse.json({ error: "Nenhuma coordenada encontrada para esse endereço" }, { status: 404 });
    return NextResponse.json({ latitude: Number(first.lat), longitude: Number(first.lon), displayName: first.display_name ?? address });
  } catch (error) {
    console.error("geocode_request_error", error);
    return NextResponse.json({ error: "Não foi possível consultar a geocodificação" }, { status: 502 });
  }
}
