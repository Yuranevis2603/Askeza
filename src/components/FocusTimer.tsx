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
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-body">
        Над чим працюєш
        <select value={area} onChange={(e) => setArea(e.target.value)} disabled={running} className="h-11 rounded-xl border border-edge bg-white px-3 text-[15px]">
          {AREAS.map((a) => <option key={a.v} value={a.v}>{a.label}</option>)}
        </select>
      </label>
      <div role="timer" className="num font-display text-6xl font-semibold leading-none tracking-tight">{mm}:{ss}</div>
      <span className="num text-[13px] text-muted">{sessionsToday} сесій сьогодні · +20 XP за сесію від 15 хв</span>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={toggle} className="h-12 flex-1 rounded-[14px] bg-volt px-4 text-[15px] font-bold text-ink">
          {running ? 'Пауза' : elapsed > 0 ? 'Продовжити' : 'Почати 25 хв'}
        </button>
        <button type="button" onClick={() => finish(elapsed)} disabled={elapsed < 60 || pending} className="h-12 rounded-[14px] border border-line bg-white px-4 text-sm font-semibold disabled:opacity-40">
          {pending ? 'Зберігаю…' : 'Завершити'}
        </button>
      </div>
    </div>
  );
}
