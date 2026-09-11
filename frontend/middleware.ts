import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/register(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/auth/callback(.*)",
]);

/**
 * Always call auth() — required for Clerk to finish __clerk_handshake and set session cookies.
 * Skipping auth() on public routes was leaving users signed-out after login.
 */
export default clerkMiddleware(async (auth, request) => {
  const session = await auth();

  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  if (!session.userId) {
    const login = new URL("/login/student", request.url);
    // Land on callback after sign-in so handshake can complete before /dashboard.
    login.searchParams.set("redirect_url", `${request.nextUrl.origin}/auth/callback`);
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
