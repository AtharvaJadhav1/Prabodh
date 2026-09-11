import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Pass-through middleware.
 * - Always call auth() so Clerk __clerk_handshake can set cookies.
 * - NEVER redirect /dashboard → /login (that race bounced users after every login on Render).
 * Dashboard access is enforced in AuthProvider on the client.
 */
export default clerkMiddleware(async (auth) => {
  await auth();
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
