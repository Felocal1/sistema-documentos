import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { verifyClientLink } from "@/lib/link-token";

// Rotas que não precisam de autenticação
const PUBLIC_PATHS = ["/login", "/register", "/api/auth", "/api/users/register"];

// Rotas que podem ser acessadas por link externo assinado (tela de anexos)
function isLinkAccessible(pathname: string): boolean {
  return (
    pathname.startsWith("/clients/") ||
    pathname.startsWith("/api/clients/") ||
    pathname.startsWith("/api/documents")
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // Sessão normal do sistema
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (token) return NextResponse.next();

  // Acesso externo via link assinado (tela de anexos)
  const linkToken = request.nextUrl.searchParams.get("linkToken");
  if (linkToken && isLinkAccessible(pathname) && verifyClientLink(linkToken)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|icons).*)"],
};
