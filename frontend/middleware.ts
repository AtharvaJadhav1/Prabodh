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

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  const { userId } = await auth();
  if (!userId) {
    // Always send through /auth/callback after login — never redirect_url=/dashboard/*
    // which races the Clerk cookie and bounces users back to login.
    const login = new URL("/login/student", request.url);
    login.searchParams.set("redirect_url", new URL("/auth/callback", request.url).toString());
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
