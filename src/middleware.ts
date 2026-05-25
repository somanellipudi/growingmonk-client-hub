import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/access-denied", "/portal", "/api/auth/session", "/api/auth/dev-login", "/_next", "/favicon.ico", "/favicon-32.png"];

export function middleware(request: NextRequest) {
  const authRequired = (process.env.AUTH_REQUIRED ?? "false").toLowerCase() === "true";
  if (!authRequired) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) return NextResponse.next();

  const email = request.cookies.get("gm_hub_user_email")?.value;
  const allowlist = (process.env.ALLOWLIST_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (!email) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!allowlist.includes(email.toLowerCase())) {
    return NextResponse.redirect(new URL("/access-denied", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
