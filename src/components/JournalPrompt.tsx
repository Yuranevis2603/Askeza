'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { addJournal } from '@/app/actions';

function Save() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="h-11 flex-1 rounded-xl bg-volt font-bold text-ink disabled:opacity-60">
      {pending ? 'Зберігаю…' : 'Зберегти'}
    </button>
  );
}

/** Opens once all of today's tasks are done, unless the user already wrote today or chose "later". */
export function JournalPrompt({ day, show }: { day: string; show: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const key = `askeza-journal-later-${day}`;
  const [later, setLater] = useState(true);

  useEffect(() => {
    try { setLater(localStorage.getItem(key) === '1'); } catch { setLater(false); }
  }, [key]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (show && !later && !d.open) d.showModal();
    if (!show && d.open) d.close();
  }, [show, later]);

  const dismiss = () => {
    try { localStorage.setItem(key, '1'); } catch {}
    setLater(true);
    ref.current?.close();
  };

  return (
    <dialog ref={ref} onCancel={dismiss} aria-labelledby="jp-h"
      className="m-auto w-[min(520px,calc(100%-32px))] rounded-2xl bg-white p-0 text-ink backdrop:bg-black/50">
      <form action={addJournal} className="flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">Усі справи на сьогодні виконано</span>
          <h2 id="jp-h" className="font-display text-xl font-semibold">Як пройшов день?</h2>
        </div>
        <label htmlFor="jp-body" className="sr-only">Твої думки</label>
        <textarea id="jp-body" name="body" required maxLength={10000} rows={6} autoFocus
          placeholder="Що вдалося, що заважало, що зробиш завтра інакше…"
          className="w-full resize-y rounded-xl bg-paper p-3 text-[15px] leading-relaxed" />
        <div className="flex gap-2">
          <button type="button" onClick={dismiss} className="h-11 rounded-xl border border-edge px-4 text-sm font-semibold">Пізніше</button>
          <Save />
        </div>
      </form>
    </dialog>
  );
}
