import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/classes", "/organisation", "/eleves", "/enseignants", "/notes", "/bulletins", "/conseils", "/conseil", "/examens", "/viescolaire", "/finances", "/caisses", "/attestations", "/courrier", "/sante", "/communication", "/infrastructures", "/registres", "/rh", "/decisions", "/imports", "/parametres", "/profil", "/parent", "/eleve", "/platform-admin"];

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
  matcher: ["/login", "/dashboard/:path*", "/classes/:path*", "/organisation/:path*", "/eleves/:path*", "/enseignants/:path*", "/notes/:path*", "/bulletins/:path*", "/conseils/:path*", "/conseil/:path*", "/examens/:path*", "/viescolaire/:path*", "/finances/:path*", "/caisses/:path*", "/attestations/:path*", "/courrier/:path*", "/sante/:path*", "/communication/:path*", "/infrastructures/:path*", "/registres/:path*", "/rh/:path*", "/decisions/:path*", "/imports/:path*", "/parametres/:path*", "/profil/:path*", "/parent/:path*", "/eleve/:path*", "/platform-admin/:path*"],
};
