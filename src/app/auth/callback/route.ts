import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/`);
  }
  // Pass Supabase's error (e.g. an expired link) on to the login page so it can explain it.
  const err = searchParams.get('error_code') ?? (code ? 'exchange_failed' : searchParams.get('error'));
  return NextResponse.redirect(`${origin}/login${err ? `?error_code=${encodeURIComponent(err)}` : ''}`);
}
