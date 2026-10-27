'use client';

import { useTransition } from 'react';
import { resetTracker } from '@/app/actions';

export function ResetTracker({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending}
      onClick={() => { if (window.confirm(`Почати «${name}» з нуля? Рекорд збережеться.`)) start(() => resetTracker(id)); }}
      className="h-10 rounded-lg border border-edge px-3 text-xs font-semibold text-body disabled:opacity-50">
      {pending ? '…' : 'Почати знову'}
    </button>
  );
}
