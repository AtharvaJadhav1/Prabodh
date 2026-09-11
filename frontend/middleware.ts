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

export default clerkMiddleware(async (auth, request) => {
  // Must call auth() so __clerk_handshake can set cookies.
  const session = await auth();
  const origin = publicOrigin(request);

  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  if (!session.userId) {
    // Absolute public URLs only — never localhost:10000 from Render internals.
    const login = new URL("/login/student", origin);
    login.searchParams.set("redirect_url", `${origin}/auth/callback`);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
