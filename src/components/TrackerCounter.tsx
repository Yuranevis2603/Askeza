'use client';

import { useEffect, useState } from 'react';

const MILESTONES = [1, 3, 7, 14, 30, 60, 90, 180, 365, 730];
const DAY = 86400;

function plural(n: number, one: string, few: string, many: string) {
  const a = n % 10, b = n % 100;
  if (a === 1 && b !== 11) return one;
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
  return many;
}

export function TrackerCounter({ startedAt, bestSeconds }: { startedAt: string; bestSeconds: number }) {
  const start = new Date(startedAt).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Render nothing time-dependent on the server so hydration matches.
  const secs = now === null ? 0 : Math.max(0, Math.floor((now - start) / 1000));
  const days = Math.floor(secs / DAY);
  const hours = Math.floor((secs % DAY) / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  const next = MILESTONES.find((m) => m > days) ?? Math.ceil((days + 1) / 365) * 365;
  const prev = [...MILESTONES].reverse().find((m) => m <= days) ?? 0;
  const pct = ((secs / DAY - prev) / (next - prev)) * 100;
  const best = Math.floor(Math.max(bestSeconds, secs) / DAY);

  return (
    <div className="flex flex-col gap-2" aria-live="off">
      <div className="flex items-baseline gap-2">
        <span className="num font-display text-4xl font-semibold leading-none">{now === null ? '—' : days}</span>
        <span className="text-sm font-semibold">{plural(days, 'день', 'дні', 'днів')}</span>
        <span className="num ml-auto text-xs text-muted">{hours} год {mins} хв</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line-2"><div className="h-full rounded-full bg-volt" style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} /></div>
      <div className="flex justify-between text-xs text-muted">
        <span>Наступна віха: {next} {plural(next, 'день', 'дні', 'днів')}</span>
        <span className="num">Рекорд: {best} {plural(best, 'день', 'дні', 'днів')}</span>
      </div>
    </div>
  );
}
