/**
 * Custom Auth Middleware
 * Verifies JWT cookie and handles route protection
 */
import { NextResponse, type NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";

const publicPaths = ["/", "/login", "/api/auth/login", "/api/auth/logout"];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some((p) => pathname === p || pathname.startsWith("/api/auth/"));
}

function isDashboardPath(pathname: string): boolean {
  return pathname.startsWith("/dashboard");
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("auth_token")?.value;

  // Let API routes (except dashboard) pass through
  if (pathname.startsWith("/api/") && !isDashboardPath(pathname)) {
    // For protected API routes, verify token
    if (!isPublicPath(pathname) && !token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Verify token
  const user = token ? await verifyToken(token) : null;

  // If accessing dashboard without auth, redirect to login
  if (!user && isDashboardPath(pathname)) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated and accessing root or login, redirect to dashboard
  if (user && (pathname === "/" || pathname === "/login")) {
    const dashboardUrl = new URL("/dashboard", req.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
