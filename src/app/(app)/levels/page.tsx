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
    <>
      <header>
        <p className="mb-1.5 text-sm font-medium text-muted">Кожен рівень відкриває нове. Відкрите залишається з тобою назавжди.</p>
        <h1 className="font-display text-[28px] font-semibold tracking-tight sm:text-[34px]">Рівні</h1>
      </header>

      <EventBanner event={event} level={player.level} levelName={level.name} />

      <section aria-label="Поточний рівень" className="flex flex-col gap-6 rounded-3xl bg-ink p-6 text-white sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className={`grid h-[76px] w-[76px] flex-none place-items-center rounded-3xl font-display text-[32px] font-bold ${player.comeback ? 'border-[3px] border-dashed border-volt text-volt' : 'bg-volt text-ink'}`}>{player.level}</div>
            <div className="flex flex-col gap-1">
              <span className="text-[13px] text-dim">Рівень {player.level} · фаза «{PHASES[level.phase].name}»</span>
              <span className="font-display text-[26px] font-semibold">{level.name}</span>
            </div>
          </div>
          {next && <span className="text-[17px] font-bold">Рівень {next.next.n} «{next.next.name}» · виконано {next.criteria.filter((c) => c.met).length} з {next.criteria.length} умов</span>}
        </div>
        {player.comeback ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-dim-2">Після паузи рівень тимчасово {player.level}. Усе, що ти відкрив до рівня {player.maxLevel}, залишається з тобою. Виконай 3 місії повернення нижче — і рівень повернеться.</p>
            <span className="num text-[13px] text-dim-2">Місії повернення: {comebackDone(stats)} з 3</span>
          </div>
        ) : next ? (
          <>
            <CriteriaGrid criteria={next.criteria} />
            <p className="text-sm leading-relaxed text-dim-2">Новий рівень — це не лише XP. Потрібні всі чотири умови: бали, місії рівня, регулярність і реальний результат.</p>
          </>
        ) : <p className="text-sm text-dim-2">Ти на вершині. Власні цілі й місії без обмежень.</p>}
      </section>

      <div className="flex flex-wrap items-start gap-6">
        <section aria-labelledby="path-h" className="flex min-w-0 flex-[999_1_520px] flex-col gap-4 rounded-[20px] border border-line bg-white p-5 sm:p-6">
          <h2 id="path-h" className="text-[19px] font-bold">Шлях</h2>
          {PHASES.map((ph, pi) => (
            <div key={ph.name} className="flex flex-col gap-1">
              <div className="flex justify-between py-1.5 text-xs font-bold uppercase tracking-wider text-muted"><span>Фаза {pi + 1} · {ph.name}</span><span className="font-semibold normal-case tracking-normal">рівні {ph.levels}</span></div>
              {LEVELS.filter((l) => l.phase === pi).map((l) => {
                const st = levelStatus(l.n, player);
                const open = st === 'done' || st === 'current';
                return (
                  <details key={l.n} open={l.n === player.level + 1 || undefined} className="group rounded-2xl border-2 border-transparent open:border-ink open:bg-soft">
                    <summary className="flex min-h-[60px] cursor-pointer list-none items-center gap-3 px-3 py-2">
                      <span className={`grid h-9 w-9 flex-none place-items-center rounded-xl font-display text-[15px] font-bold ${st === 'done' ? 'bg-ink text-volt' : st === 'current' ? 'bg-volt text-ink' : st === 'next' ? 'border-2 border-ink' : 'bg-line-2 text-[#4d4a44]'}`}>{l.n}</span>
                      <span className="flex min-w-0 flex-1 flex-col"><span className="text-[15px] font-bold">{l.name}</span><span className="text-xs text-[#4d4a44]">{l.theme}</span></span>
                      <span className={`flex-none rounded-full px-2.5 py-1 text-xs font-bold ${CHIP[st][1]}`}>{CHIP[st][0]}</span>
                    </summary>
                    <div className="flex flex-col gap-4 px-3 pb-4 pt-1">
                      <div className="flex flex-col gap-2">
                        <h3 className="text-sm font-bold">{open ? 'Уже відкрито тобі' : 'Що відкриється'}</h3>
                        <ul className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-2">
                          {l.unlocks.map((u) => (
                            <li key={u.title} className={`flex items-center gap-2.5 rounded-xl p-2.5 text-sm ${open ? 'border border-line bg-white' : 'border border-dashed border-[#cfcac1]'}`}>
                              <span className={`grid h-8 w-8 flex-none place-items-center rounded-lg ${open ? 'bg-volt text-ink' : 'bg-line-2 text-[#4d4a44]'}`}><Icon name={KIND[u.kind].icon} size={16} /></span>
                              <span><span className="font-semibold">{KIND[u.kind].title}:</span> {u.title}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {l.missions.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <h3 className="text-sm font-bold">Місії рівня</h3>
                          <ul className="flex flex-col gap-1 text-sm text-body">{l.missions.map((m) => <li key={m.key}>· {m.title} · +{m.reward} XP</li>)}</ul>
                        </div>
                      )}
                      {l.requirements.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <h3 className="text-sm font-bold">Щоб сюди дійти</h3>
                          <ul className="flex flex-col gap-1 text-sm text-body">{l.requirements.map((r, i) => <li key={i}>· {reqText(r, l.n - 1)}</li>)}</ul>
                        </div>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          ))}
        </section>

        <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-6">
          {!player.comeback && (
            <section aria-labelledby="lm-h" className="flex flex-col gap-4 rounded-[20px] border border-line bg-white p-5 sm:p-6">
              <h2 id="lm-h" className="text-[19px] font-bold">Місії рівня {player.level}</h2>
              <MissionList missions={level.missions} progress={stats.missionProgress} />
            </section>
          )}
          <section aria-labelledby="back-h" className="flex flex-col gap-4 rounded-[20px] border border-line bg-white p-5 sm:p-6">
            <h2 id="back-h" className="text-[19px] font-bold">Якщо рівень знизився</h2>
            <ul className="flex flex-col gap-3 text-sm leading-relaxed text-body">
              <li><b className="text-ink">Тільки після 2 тижнів паузи.</b> Рівень знижується на один, якщо 2 тижні поспіль було менше 3 активних днів. Пропущений день нічого не забирає.</li>
              <li><b className="text-ink">Відкрите залишається.</b> Цілі, тренування, навички й етапи нікуди не зникають.</li>
              <li><b className="text-ink">Три місії повернення.</b> Виконав усі — рівень повертається без повторного набору XP.</li>
            </ul>
            <MissionList missions={COMEBACK_MISSIONS} progress={stats.missionProgress} editable={player.comeback} />
          </section>
        </div>
      </div>
    </>
  );
}
