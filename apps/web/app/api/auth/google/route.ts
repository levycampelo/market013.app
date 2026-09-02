import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createSession, sessionCookie } from "../../../../lib/auth";
import { getDatabase } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!url.searchParams.get("code")) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return NextResponse.redirect(new URL("/contribuir?authError=Google não configurado", request.url));
    const state = randomBytes(24).toString("hex");
    const callback = process.env.AUTH_URL ?? `${url.origin}/api/auth/google`;
    const loginUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    loginUrl.searchParams.set("client_id", clientId);
    loginUrl.searchParams.set("redirect_uri", callback);
    loginUrl.searchParams.set("response_type", "code");
    loginUrl.searchParams.set("scope", "openid email profile");
    loginUrl.searchParams.set("state", state);
    const response = NextResponse.redirect(loginUrl);
    response.headers.append("Set-Cookie", `market013_oauth_state=${state}; Path=/; Max-Age=600; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
    return response;
  }

  const expectedState = request.headers.get("cookie")?.match(/(?:^|; )market013_oauth_state=([^;]+)/)?.[1];
  if (!expectedState || expectedState !== url.searchParams.get("state")) return NextResponse.redirect(new URL("/contribuir?authError=Estado OAuth inválido", request.url));
  try {
    const callback = process.env.AUTH_URL ?? `${url.origin}/api/auth/google`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code: url.searchParams.get("code") ?? "", client_id: process.env.GOOGLE_CLIENT_ID ?? "", client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "", redirect_uri: callback, grant_type: "authorization_code" }) });
    const token = await tokenResponse.json() as { access_token?: string };
    if (!tokenResponse.ok || !token.access_token) throw new Error("Google token exchange failed");
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` } });
    const profile = await profileResponse.json() as { email?: string; name?: string };
    if (!profileResponse.ok || !profile.email) throw new Error("Google profile unavailable");
    const sql = getDatabase();
    const users = await sql`insert into users (id, name, email) values (gen_random_uuid(), ${profile.name ?? profile.email}, ${profile.email}) on conflict (email) do update set name = excluded.name returning id, name, email`;
    const response = NextResponse.redirect(new URL("/contribuir", request.url));
    response.headers.append("Set-Cookie", sessionCookie(createSession(users[0] as { id: string; name: string; email: string })));
    response.headers.append("Set-Cookie", "market013_oauth_state=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
    return response;
  } catch (error) {
    console.error("google_auth_error", error);
    return NextResponse.redirect(new URL("/contribuir?authError=Não foi possível entrar com Google", request.url));
  }
}

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", sessionCookie("", 0));
  return response;
}