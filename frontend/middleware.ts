import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/register(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/auth/callback(.*)",
]);

const isLoginRoute = createRouteMatcher(["/login(.*)", "/register(.*)", "/sign-in(.*)", "/sign-up(.*)"]);

/**
 * Render binds Next to localhost:10000. request.nextUrl.origin is therefore
 * https://localhost:10000 — which breaks Clerk redirect_url / cookies.
 * Always prefer the public app URL.
 */
function publicOrigin(request: NextRequest) {
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL ?? "")
    .split(",")[0]
    .trim()
    .replace(/\/$/, "");
  if (fromEnv && !/localhost|127\.0\.0\.1/i.test(fromEnv)) {
    return fromEnv;
  }

  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
    .split(",")[0]
    .trim();
  const proto = (request.headers.get("x-forwarded-proto") ?? "https").split(",")[0].trim();

  if (host && !/localhost|127\.0\.0\.1/i.test(host)) {
    return `${proto}://${host}`;
  }

  return "https://prabodh-2.onrender.com";
}

function isBadRedirectTarget(value: string | null) {
  if (!value) return false;
  return /localhost|127\.0\.0\.1/i.test(value);
}

function safeNextPath(pathname: string) {
  if (!pathname.startsWith("/dashboard")) return "/dashboard/student";
  return pathname;
}

export default clerkMiddleware(async (auth, request) => {
  // Must call auth() so __clerk_handshake can set cookies.
  const session = await auth();
  const origin = publicOrigin(request);
  const url = request.nextUrl.clone();

  // Strip poisoned redirect_url=https://localhost:10000/... that Render internals create.
  if (isLoginRoute(request) && isBadRedirectTarget(url.searchParams.get("redirect_url"))) {
    url.searchParams.set("redirect_url", `${origin}/auth/callback`);
    return NextResponse.redirect(url);
  }

  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  if (!session.userId) {
    // Never bounce straight to /login — that races the Clerk cookie and causes
    // dashboard flash → login loops. Finish the handshake on /auth/callback first.
    const callback = new URL("/auth/callback", origin);
    callback.searchParams.set("next", safeNextPath(request.nextUrl.pathname));
    return NextResponse.redirect(callback);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
