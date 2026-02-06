import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/supabase'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
      cookieOptions: {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isEmailVerified = !!user?.email_confirmed_at;

  // If user is logged in
  if (user) {
    // If NOT verified and trying to access protected routes or auth routes
    if (!isEmailVerified) {
      const protectedRoutes = ['/dashboard', '/account', '/settings', '/videos']
      const authRoutes = ['/login', '/signup']
      const isProtectedRoute = protectedRoutes.some(route => 
        request.nextUrl.pathname.startsWith(route)
      )
      const isAuthRoute = authRoutes.some(route => 
        request.nextUrl.pathname.startsWith(route)
      )

      if (isProtectedRoute || isAuthRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/verify-email'
        return NextResponse.redirect(url)
      }
    }

    // If verified and trying to access auth pages, landing page, or verify-email page
    if (isEmailVerified) {
      if (
        request.nextUrl.pathname === '/' ||
        request.nextUrl.pathname.startsWith('/login') ||
        request.nextUrl.pathname.startsWith('/signup') ||
        request.nextUrl.pathname.startsWith('/verify-email')
      ) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  // If user is NOT logged in and tries to access protected routes
  if (!user) {
    const protectedRoutes = ['/dashboard', '/account', '/settings', '/verify-email', '/videos']
    const isProtectedRoute = protectedRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    )

    if (isProtectedRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
