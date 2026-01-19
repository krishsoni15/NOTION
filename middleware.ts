import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/", "/login(.*)"]);
const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // If accessing dashboard without authentication, redirect to login
  if (!userId && isDashboardRoute(req)) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated and accessing root or login, redirect to dashboard
  // EXCEPT when adding another account (mode=add-account)
  if (userId && (req.nextUrl.pathname === "/" || req.nextUrl.pathname === "/login")) {
    // Allow access to login page if adding another account
    const mode = req.nextUrl.searchParams.get("mode");
    if (mode === "add-account") {
      return NextResponse.next(); // Allow access
    }

    // Prevent infinite redirect loop if dashboard fails
    const hasRedirected = req.headers.get("x-redirected-from");
    if (!hasRedirected) {
      const dashboardUrl = new URL("/dashboard", req.url);
      const response = NextResponse.redirect(dashboardUrl);
      response.headers.set("x-redirected-from", req.nextUrl.pathname);
      return response;
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

