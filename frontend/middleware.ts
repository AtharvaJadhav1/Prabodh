import { NextResponse } from "next/server";

/** Pass-through — dashboard access is enforced client-side in AuthProvider. */
export function middleware(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname.startsWith("/register") && !pathname.startsWith("/register/maintenance")) {
    return NextResponse.redirect(new URL("/register/maintenance", request.url));
  }

  if (pathname.startsWith("/login/forgot") && !pathname.startsWith("/login/forgot/maintenance")) {
    return NextResponse.redirect(new URL("/login/forgot/maintenance", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
