'use client';

import { useEffect, useState } from 'react';
import { LogoMark } from '@/components/Logo';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');
  const [linkError, setLinkError] = useState('');

  // Supabase reports a failed email link in the query or in the hash.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search + '&' + window.location.hash.slice(1));
    const code = params.get('error_code');
    if (!code) return;
    setLinkError(
      code === 'otp_expired'
        ? 'Посилання для входу протерміноване або вже використане. Надішли нове й відкрий його одразу.'
        : 'Не вдалося увійти за посиланням. Надішли нове.',
    );
    window.history.replaceState(null, '', '/login');
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setState('error');
    } else setState('sent');
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-ink px-4 text-white">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <LogoMark size={72} />
          <h1 className="font-display text-4xl font-bold">askeza</h1>
          <p className="text-xs uppercase tracking-[0.2em] text-dim">Дисципліна · енергія · сила волі</p>
        </div>
        {state === 'sent' ? (
          <p role="status" className="rounded-2xl bg-ink-2 p-5 text-center leading-relaxed">Посилання для входу надіслано на <b>{email}</b>. Відкрий лист на цьому пристрої.</p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            {linkError && <p role="alert" className="rounded-xl bg-[#3a2a12] p-3 text-sm leading-relaxed text-[#ffd9a8]">{linkError}</p>}
            <label className="flex flex-col gap-2 text-sm text-dim-2">Email
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl border border-ink-3 bg-ink-2 px-4 text-base text-white" />
            </label>
            <button disabled={state === 'sending'} className="h-12 rounded-xl bg-volt font-bold text-ink disabled:opacity-60">
              {state === 'sending' ? 'Надсилаю…' : 'Отримати посилання для входу'}
            </button>
            {state === 'error' && <p role="alert" className="text-sm text-[#ff9a5c]">Не вдалося надіслати: {error}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
