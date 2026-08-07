import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/classes", "/eleves", "/notes", "/bulletins", "/conseils", "/examens", "/viescolaire", "/finances", "/parametres", "/parent", "/eleve"];

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get("jool_secondary_access_token");
  const refreshToken = request.cookies.get("jool_secondary_refresh_token");
  const hasSession = Boolean(accessToken || refreshToken);
  const { pathname } = request.nextUrl;

  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/login") && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/dashboard/:path*", "/classes/:path*", "/eleves/:path*", "/notes/:path*", "/bulletins/:path*", "/conseils/:path*", "/examens/:path*", "/viescolaire/:path*", "/finances/:path*", "/parametres/:path*", "/parent/:path*", "/eleve/:path*"],
};
