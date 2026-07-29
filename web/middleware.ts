import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Garde serveur pour /admin/* : évite qu'une requête réseau non authentifiée
// (ou authentifiée mais sans rôle admin) atteigne les pages du back-office.
// Complète — ne remplace pas — la vérification déjà faite par l'API FastAPI
// (require_admin) et par les policies RLS Supabase, qui restent la barrière
// de sécurité de fond.
export async function middleware(request: NextRequest) {
  // La racine /admin sert aussi de formulaire de connexion : on la laisse
  // toujours passer, le layout client gère l'affichage login/dashboard.
  if (request.nextUrl.pathname === '/admin' || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
