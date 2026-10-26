'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { logFocus } from '@/app/actions';

const LENGTH = 25 * 60;
const AREAS = [
  { v: 'project', label: 'Проєкт' },
  { v: 'instagram', label: 'Instagram' },
  { v: 'focus', label: 'Інше' },
];

export function FocusTimer({ sessionsToday }: { sessionsToday: number }) {
  const [left, setLeft] = useState(LENGTH);
  const [running, setRunning] = useState(false);
  const [area, setArea] = useState('project');
  const [pending, start] = useTransition();
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (tick.current) clearInterval(tick.current);
    tick.current = null;
    setRunning(false);
  };

  const finish = (secondsDone: number) => {
    stop();
    setLeft(LENGTH);
    const minutes = Math.round(secondsDone / 60);
    if (minutes >= 1) start(() => logFocus(minutes, area));
  };

  useEffect(() => () => { if (tick.current) clearInterval(tick.current); }, []);
  useEffect(() => { if (running && left <= 0) finish(LENGTH); });

  const toggle = () => {
    if (running) return stop();
    setRunning(true);
    tick.current = setInterval(() => setLeft((s) => s - 1), 1000);
  };

  const mm = String(Math.floor(Math.max(left, 0) / 60)).padStart(2, '0');
  const ss = String(Math.max(left, 0) % 60).padStart(2, '0');
  const elapsed = LENGTH - left;

  return (
    <div className="flex items-center gap-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <span role="timer" className="num font-display text-[28px] font-semibold leading-tight tracking-tight">{mm}:{ss}</span>
        <label className="flex items-center gap-1 text-xs text-muted">
          <span className="num">{sessionsToday} сьогодні ·</span>
          <span className="sr-only">Над чим працюєш</span>
          <select value={area} onChange={(e) => setArea(e.target.value)} disabled={running} className="-ml-1 bg-transparent font-semibold text-body">
            {AREAS.map((a) => <option key={a.v} value={a.v}>{a.label}</option>)}
          </select>
        </label>
      </div>
      {elapsed >= 60 && (
        <button type="button" onClick={() => finish(elapsed)} disabled={pending} className="h-11 rounded-xl border border-line bg-white px-3 text-sm font-semibold disabled:opacity-40">
          {pending ? '…' : 'Готово'}
        </button>
      )}
      <button type="button" onClick={toggle} aria-label={running ? 'Пауза' : 'Почати фокус-сесію'} className="h-11 rounded-xl bg-volt px-4 text-sm font-bold text-ink">
        {running ? 'Пауза' : elapsed > 0 ? 'Далі' : 'Старт'}
      </button>
    </div>
  );
}
