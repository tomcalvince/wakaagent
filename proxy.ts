import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

// Public routes that don't require authentication
const publicRoutes = ["/login", "/register", "/forgot-password"]

/**
 * Check if a path is a public route
 */
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some((route) => pathname.toLowerCase().startsWith(route.toLowerCase()))
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow NextAuth API routes
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next()
  }

  // Allow public static files and assets
  const publicStaticFiles = [
    "/icons/",
    "/assets/",
    "/placeholder.svg",
  ]
  
  if (publicStaticFiles.some((file) => pathname.startsWith(file))) {
    return NextResponse.next()
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Check for authentication token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // If no token and trying to access protected route, redirect to login
  if (!token) {
    const loginUrl = new URL("/login", request.url)
    // Only set callbackUrl if it's a valid app route (not static files)
    if (
      !pathname.includes(".") && // No file extensions
      pathname !== "/" && // Not root (already redirects to login)
      !publicStaticFiles.some((file) => pathname.startsWith(file))
    ) {
      loginUrl.searchParams.set("callbackUrl", pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  // Token exists, allow request
  return NextResponse.next()
}

// Configure which routes this proxy should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
