import Link from 'next/link';
import { bumpMission } from '@/app/actions';
import type { Criterion, SyncEvent } from '@/lib/game/engine';
import type { Mission } from '@/lib/game/levels';
import { Icon } from './Icon';
import { Bar } from './ui';

export function EventBanner({ event, levelName, level }: { event: SyncEvent; levelName: string; level: number }) {
  if (!event) return null;
  const text = {
    up: { title: `Новий рівень ${level} «${levelName}»!`, body: 'Подивись, що відкрилося.', tone: 'bg-volt text-ink' },
    restored: { title: `Рівень ${level} «${levelName}» повернуто. З поверненням!`, body: 'Усе відкрите на місці, продовжуй з того ж етапу.', tone: 'bg-volt text-ink' },
    down: { title: `Рівень тимчасово ${level}, але все твоє з тобою`, body: 'Цілі, тренування й навички залишаються відкритими. Три короткі місії повернення відновлять рівень.', tone: 'bg-[#fff1d6] text-[#4a2e00]' },
  }[event];
  return (
    <div role="status" className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4 ${text.tone}`}>
      <div className="flex flex-col gap-1"><span className="font-bold">{text.title}</span><span className="text-sm">{text.body}</span></div>
      <Link href="/levels" className="inline-flex min-h-11 items-center rounded-xl bg-ink px-4 text-sm font-semibold text-white">До рівнів</Link>
    </div>
  );
}

export function CriteriaGrid({ criteria, compact = false }: { criteria: Criterion[]; compact?: boolean }) {
  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-[repeat(auto-fit,minmax(200px,1fr))]'}`}>
      {criteria.map((c) => (
        <div key={c.type} className={`flex flex-col gap-2 rounded-2xl border bg-ink-2 ${compact ? 'p-3' : 'p-4'} ${c.met ? 'border-volt' : 'border-ink-2'}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-dim-2">{c.label}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${c.met ? 'bg-volt text-ink' : 'bg-ink-3 text-dim-2'}`}>{c.met ? 'Виконано' : `${c.pct}%`}</span>
          </div>
          <span className={`num font-bold ${compact ? 'text-base' : 'text-[22px]'}`}>{c.value}</span>
          <Bar pct={c.pct} track="bg-ink-3" h="h-1.5" />
          {!compact && <span className="text-xs leading-snug text-dim">{c.target}</span>}
        </div>
      ))}
    </div>
  );
}

export function MissionList({ missions, progress, editable = true }: { missions: Mission[]; progress: Record<string, number>; editable?: boolean }) {
  if (!missions.length) return <p className="text-sm text-muted">На цьому рівні місій немає — створюй власні.</p>;
  return (
    <ul className="flex flex-col">
      {missions.map((m) => {
        const p = progress[m.key] ?? 0;
        const done = p >= m.target;
        return (
          <li key={m.key} className="flex items-center gap-3 border-t border-line-2 py-2 first:border-t-0 first:pt-0">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className={`text-sm font-medium leading-snug ${done ? 'text-muted line-through' : ''}`}>{m.title}</span>
                <span className="num flex-none text-xs text-muted">{p}/{m.target} · +{m.reward}</span>
              </div>
              <Bar pct={(p / m.target) * 100} color={done ? 'bg-volt' : 'bg-ink'} h="h-1.5" />
            </div>
            {editable && (done ? (
              <form action={bumpMission.bind(null, m.key, -1)}>
                <button aria-label={`Скасувати: ${m.title}`} className="grid h-10 w-10 place-items-center rounded-xl bg-volt text-ink"><Icon name="check" size={16} stroke={3} /></button>
              </form>
            ) : (
              <form action={bumpMission.bind(null, m.key, 1)}>
                <button aria-label={`+1: ${m.title}`} className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-white"><Icon name="plus" size={16} /></button>
              </form>
            ))}
          </li>
        );
      })}
    </ul>
  );
}
