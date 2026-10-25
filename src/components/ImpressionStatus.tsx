'use client';

import { useTransition } from 'react';
import { setImpressionStatus } from '@/app/actions';

const STYLE: Record<string, string> = {
  idea: 'bg-line-2 text-[#4d4a44] border-edge',
  planned: 'bg-[#e6ecff] text-[#2246c7] border-[#c3d0ff]',
  prep: 'bg-[#fff1d6] text-[#7a4a00] border-[#f1d49a]',
  done: 'bg-ink text-volt border-ink',
};

export function ImpressionStatus({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      Статус
      <select value={status} disabled={pending} onChange={(e) => { const v = e.target.value; start(() => setImpressionStatus(id, v)); }}
        className={`h-9 rounded-full border px-2.5 text-[13px] font-bold ${STYLE[status] ?? STYLE.idea}`}>
        <option value="idea">Ідея</option>
        <option value="planned">Заплановано</option>
        <option value="prep">Готуюся</option>
        <option value="done">Виконано</option>
      </select>
    </label>
  );
}
