import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    try {
        // 1. Filtrar IMEDIATAMENTE antes de qualquer inicialização pesada
        if (
            request.nextUrl.pathname.startsWith('/_next') ||
            request.nextUrl.pathname.startsWith('/api') ||
            request.nextUrl.pathname.startsWith('/favicon.ico') ||
            request.nextUrl.pathname.endsWith('.png') ||
            request.nextUrl.pathname.endsWith('.jpg') ||
            request.nextUrl.pathname.endsWith('.jpeg') ||
            request.nextUrl.pathname.endsWith('.gif') ||
            request.nextUrl.pathname.endsWith('.svg')
        ) {
            return NextResponse.next({ request })
        }

        let supabaseResponse = NextResponse.next({
            request,
        })

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                        supabaseResponse = NextResponse.next({
                            request,
                        })
                        cookiesToSet.forEach(({ name, value, options }) =>
                            supabaseResponse.cookies.set(name, value, options)
                        )
                    },
                },
            }
        )

        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (
            !user &&
            request.nextUrl.pathname !== '/' &&
            !request.nextUrl.pathname.startsWith('/login') &&
            !request.nextUrl.pathname.startsWith('/auth')
        ) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }

        return supabaseResponse
    } catch (e) {
        console.error('CRITICAL MIDDLEWARE ERROR:', e);
        // Se tudo falhar, permite a requisição seguir para evitar 503 total
        return NextResponse.next({ request });
    }
}
