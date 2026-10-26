import { CriteriaGrid, EventBanner, MissionList } from '@/components/game';
import { Icon, IconName } from '@/components/Icon';
import { comebackDone, levelStatus, nextLevelCriteria } from '@/lib/game/engine';
import { COMEBACK_MISSIONS, LEVELS, levelByN, PHASES, Requirement, UnlockKind } from '@/lib/game/levels';
import { getCtx, loadGame } from '@/lib/game/server';

export const dynamic = 'force-dynamic';

const KIND: Record<UnlockKind, { title: string; icon: IconName }> = {
  goal: { title: 'Ціль', icon: 'target' },
  training: { title: 'Тренування', icon: 'dumbbell' },
  mission: { title: 'Місії', icon: 'flag' },
  skill: { title: 'Навичка', icon: 'star' },
};

const CHIP = {
  done: ['Відкрито', 'bg-line-2 text-body'],
  current: ['Зараз', 'bg-volt text-ink'],
  next: ['Далі', 'bg-ink text-volt'],
  ahead: ['Попереду', 'border border-edge bg-white text-[#4d4a44]'],
} as const;

function reqText(r: Requirement, prev: number): string {
  switch (r.type) {
    case 'xp': return `${r.value.toLocaleString('uk-UA')} XP загалом`;
    case 'missions': return `Усі місії рівня ${prev}`;
    case 'regularity': return `${r.minDays}+ активних днів на тиждень, ${r.weeks} тиж. поспіль`;
    case 'metric': return r.label;
  }
}

export default async function LevelsPage() {
  const ctx = await getCtx();
  const { player, stats, event } = await loadGame(ctx);
  const level = levelByN(player.level);
  const next = nextLevelCriteria(player, stats, ctx.today);

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Рівні</h1>

      <EventBanner event={event} level={player.level} levelName={level.name} />

      <section aria-label="Поточний рівень" className="flex flex-col gap-4 rounded-2xl bg-ink p-4 text-white">
        <div className="flex items-center gap-3">
          <div className={`grid h-14 w-14 flex-none place-items-center rounded-2xl font-display text-2xl font-bold ${player.comeback ? 'border-2 border-dashed border-volt text-volt' : 'bg-volt text-ink'}`}>{player.level}</div>
          <div className="flex min-w-0 flex-col">
            <span className="font-display text-xl font-semibold">{level.name}</span>
            <span className="text-xs text-dim">
              {player.comeback ? `Повернення: ${comebackDone(stats)} з 3 місій` : next ? `До «${next.next.name}»: ${next.criteria.filter((c) => c.met).length} з ${next.criteria.length} умов` : 'Найвищий рівень'}
            </span>
          </div>
        </div>
        {player.comeback ? (
          <p className="text-sm leading-relaxed text-dim-2">Після паузи рівень тимчасово {player.level}. Усе відкрите до рівня {player.maxLevel} залишається. Виконай 3 місії повернення нижче — і рівень повернеться.</p>
        ) : next && <CriteriaGrid criteria={next.criteria} compact />}
      </section>

      <section aria-labelledby="path-h" className="flex flex-col gap-1 rounded-2xl border border-line bg-white p-2">
        <h2 id="path-h" className="sr-only">Шлях рівнів</h2>
        {PHASES.map((ph, pi) => (
          <div key={ph.name} className="flex flex-col">
            <div className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-muted">Фаза {pi + 1} · {ph.name}</div>
            {LEVELS.filter((l) => l.phase === pi).map((l) => {
              const st = levelStatus(l.n, player);
              const open = st === 'done' || st === 'current';
              return (
                <details key={l.n} open={l.n === player.level + 1 || undefined} className="rounded-xl open:bg-soft">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-3 py-1.5">
                    <span className={`grid h-8 w-8 flex-none place-items-center rounded-lg font-display text-sm font-bold ${st === 'done' ? 'bg-ink text-volt' : st === 'current' ? 'bg-volt text-ink' : st === 'next' ? 'border-2 border-ink' : 'bg-line-2 text-[#4d4a44]'}`}>{l.n}</span>
                    <span className="flex min-w-0 flex-1 flex-col"><span className="text-sm font-bold">{l.name}</span><span className="truncate text-xs text-[#4d4a44]">{l.theme}</span></span>
                    <span className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-bold ${CHIP[st][1]}`}>{CHIP[st][0]}</span>
                  </summary>
                  <div className="flex flex-col gap-3 px-3 pb-3 pl-14 text-sm">
                    <ul className="flex flex-col gap-1.5">
                      {l.unlocks.map((u) => (
                        <li key={u.title} className="flex items-center gap-2">
                          <Icon name={KIND[u.kind].icon} size={15} className={open ? 'text-ink' : 'text-[#8a857b]'} />
                          <span><span className="text-muted">{KIND[u.kind].title}:</span> {u.title}</span>
                        </li>
                      ))}
                    </ul>
                    {l.requirements.length > 0 && (
                      <p className="text-xs leading-relaxed text-muted">Щоб дійти: {l.requirements.map((r) => reqText(r, l.n - 1)).join(' · ')}</p>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        ))}
      </section>

      <details open={player.comeback || undefined} className="rounded-2xl border border-line bg-white p-4">
        <summary className="cursor-pointer list-none text-base font-bold">Якщо рівень знизився ▾</summary>
        <div className="mt-3 flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-body">Лише після 2 тижнів, коли було менше 3 активних днів на тиждень. Усе відкрите залишається. Три місії повернення — і рівень повертається без повторного набору XP.</p>
          <MissionList missions={COMEBACK_MISSIONS} progress={stats.missionProgress} editable={player.comeback} />
        </div>
      </details>
    </div>
  );
}
