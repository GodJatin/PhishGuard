import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Define protected routes
  const isProtectedRoute = path.startsWith('/dashboard') || 
                           path.startsWith('/history') ||
                           path.startsWith('/scan')

  if (isProtectedRoute) {
    // Check if any cookie contains "auth-token"
    const cookies = request.cookies.getAll()
    const hasAuthCookie = cookies.some((cookie) => cookie.name.includes('auth-token'))

    if (!hasAuthCookie) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - image/asset files (.svg, .png, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
