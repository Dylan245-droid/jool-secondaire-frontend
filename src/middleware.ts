import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/classes", "/eleves", "/notes", "/bulletins", "/conseils", "/examens", "/vie-scolaire", "/parent"];

export function middleware(request: NextRequest) {
  const hasAccess = request.cookies.get("jool_access_token");
  const { pathname } = request.nextUrl;

  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) && !hasAccess) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/login") && hasAccess) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/dashboard/:path*", "/classes/:path*", "/eleves/:path*", "/notes/:path*", "/bulletins/:path*", "/conseils/:path*", "/examens/:path*", "/vie-scolaire/:path*", "/parent/:path*"],
};
