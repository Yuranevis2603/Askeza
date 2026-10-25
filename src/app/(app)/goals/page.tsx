import { addImpression, deleteImpression, planNextAction, setGoalValue, setNextAction, toggleStep } from '@/app/actions';
import { Icon } from '@/components/Icon';
import { ImpressionStatus } from '@/components/ImpressionStatus';
import { AREA, Bar } from '@/components/ui';
import { getCtx, loadGame, must } from '@/lib/game/server';

export const dynamic = 'force-dynamic';

type Goal = {
  id: string; kind: string; area: string | null; title: string; note: string | null; status: string | null;
  current_value: number | null; target_value: number | null; unit: string | null; unlock_level: number | null;
  next_action: string | null; next_action_xp: number | null;
};
type Step = { id: string; goal_id: string; title: string; done: boolean; unlock_level: number | null; due: string | null };

const STATUS_LABEL: Record<string, string> = { idea: 'Ідея', planned: 'Заплановано', prep: 'Готуюся', done: 'Виконано' };

export default async function GoalsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const ctx = await getCtx();
  const { supabase, userId } = ctx;
  const { player, stats } = await loadGame(ctx);
  const [goalsRes, stepsRes] = await Promise.all([
    supabase.from('goals').select('*').eq('user_id', userId).order('sort'),
    supabase.from('goal_steps').select('*').eq('user_id', userId).order('sort'),
  ]);
  const goals = must(goalsRes) as Goal[];
  const steps = must(stepsRes) as Step[];
  const dev = goals.filter((g) => g.kind === 'development');
  const imps = goals.filter((g) => g.kind === 'impression');
  const filter = (await searchParams).status;
  const shown = filter && STATUS_LABEL[filter] ? imps.filter((i) => i.status === filter) : imps;
  const counts = Object.fromEntries(Object.keys(STATUS_LABEL).map((k) => [k, imps.filter((i) => i.status === k).length]));

  return (
    <>
      <header>
        <p className="mb-1.5 text-sm font-medium text-muted">Рік, коли система працює на тебе</p>
        <h1 className="font-display text-[28px] font-semibold tracking-tight sm:text-[34px]">Цілі 2027</h1>
      </header>

      <section aria-labelledby="dev-h" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="dev-h" className="font-display text-[22px] font-semibold">1 · Розвиток</h2>
          <p className="text-sm text-body">Три довгі цілі. Нові етапи відкриваються разом із рівнями.</p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-5">
          {dev.map((g) => {
            const a = AREA[g.area ?? 'focus'];
            const locked = (g.unlock_level ?? 1) > player.maxLevel;
            const value = g.area === 'instagram' ? stats.metrics.followers ?? g.current_value ?? 0 : g.current_value ?? 0;
            const target = g.target_value ?? 100;
            const pct = (Number(value) / Number(target)) * 100;
            const gs = steps.filter((s) => s.goal_id === g.id);
            const currentIdx = gs.findIndex((s) => !s.done && !((s.unlock_level ?? 0) > player.maxLevel));
            return (
              <article key={g.id} aria-label={g.title} className={`flex flex-col gap-4 rounded-[20px] border p-6 ${locked ? 'border-dashed border-[#cfcac1] bg-soft' : 'border-line bg-white'}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[13px] font-semibold ${a.tint} ${a.ink}`}><span className={`h-2 w-2 rounded-full ${a.dot}`} />{a.name}</span>
                  <span className="text-xs text-muted">{locked ? `відкриється на рівні ${g.unlock_level}` : `відкрито на рівні ${g.unlock_level}`}</span>
                </div>
                <h3 className="text-xl font-bold leading-tight">{g.title}</h3>
                {locked ? (
                  <p className="flex items-start gap-2 text-sm leading-relaxed text-body"><Icon name="lock" size={16} className="mt-0.5 flex-none" />Ця ціль чекає на тебе. Спершу збудуй фундамент: фокус, менше скролингу, регулярність. Так вона не стане ще одним кинутим планом.</p>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="num font-display text-[40px] font-semibold tracking-tight">{g.unit === '%' ? `${Math.round(Number(value))}%` : Number(value).toLocaleString('uk-UA')}</span>
                      <span className="num text-[15px] text-muted">{g.unit === '%' ? 'готовності' : `/ ${Number(target).toLocaleString('uk-UA')}`}</span>
                    </div>
                    <Bar pct={pct} color={a.bar} h="h-2.5" />
                    <details className="text-sm">
                      <summary className="cursor-pointer text-[13px] font-semibold text-muted">Оновити прогрес</summary>
                      <form action={setGoalValue} className="mt-2 flex gap-2">
                        <input type="hidden" name="id" value={g.id} />
                        <label className="sr-only" htmlFor={`v-${g.id}`}>Поточне значення</label>
                        <input id={`v-${g.id}`} name="value" inputMode="numeric" defaultValue={Number(value)} className="h-11 flex-1 rounded-xl border border-[#cfcac1] px-3" />
                        <button className="h-11 rounded-xl bg-ink px-4 font-semibold text-white">Зберегти</button>
                      </form>
                    </details>
                  </>
                )}
                <div className="flex flex-col">
                  <div className="mb-1 text-[13px] font-semibold text-muted">Етапи</div>
                  {gs.map((s, i) => {
                    const sl = (s.unlock_level ?? 0) > player.maxLevel;
                    const cur = i === currentIdx && !locked;
                    return (
                      <form key={s.id} action={toggleStep.bind(null, s.id)}>
                        <button disabled={sl || locked} aria-pressed={s.done} className="flex min-h-10 w-full items-center gap-3 text-left text-sm disabled:cursor-default">
                          <span className={`grid h-6 w-6 flex-none place-items-center rounded-full ${s.done ? 'bg-ink text-volt' : sl ? 'bg-line-2 text-[#6e6a62]' : cur ? `border-[3px] border-current ${a.ink} text-transparent` : 'border-2 border-[#cfcac1] text-transparent'}`}>
                            <Icon name={sl ? 'lock' : 'check'} size={12} stroke={sl ? 2.6 : 3.2} className={sl ? '' : s.done ? '' : 'opacity-0'} />
                          </span>
                          <span className={`flex-1 leading-snug ${cur ? 'font-bold' : s.done ? 'text-body' : 'text-muted'}`}>{s.title}</span>
                          {sl ? <span className="flex-none rounded-full bg-line-2 px-2 py-0.5 text-xs font-semibold text-[#4d4a44]">з рівня {s.unlock_level}</span>
                            : s.due && <span className="flex-none text-xs text-muted">{s.due}</span>}
                        </button>
                      </form>
                    );
                  })}
                </div>
                {!locked && (
                  <div className="flex flex-col gap-2.5 rounded-2xl bg-soft p-4">
                    <span className="text-xs font-semibold text-muted">Найближча дія</span>
                    {g.next_action ? <span className="text-[15px] font-semibold leading-snug">{g.next_action}</span> : <span className="text-sm text-muted">Запиши один маленький крок.</span>}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {g.next_action && (
                        <form action={planNextAction.bind(null, g.id)}>
                          <button className="h-11 rounded-xl bg-ink px-4 text-sm font-semibold text-white">Додати в план · +{g.next_action_xp ?? 20} XP</button>
                        </form>
                      )}
                      <details className="text-sm">
                        <summary className="cursor-pointer text-[13px] font-semibold text-muted">Змінити</summary>
                        <form action={setNextAction} className="mt-2 flex gap-2">
                          <input type="hidden" name="id" value={g.id} />
                          <label className="sr-only" htmlFor={`n-${g.id}`}>Найближча дія</label>
                          <input id={`n-${g.id}`} name="next_action" defaultValue={g.next_action ?? ''} maxLength={200} className="h-11 min-w-0 flex-1 rounded-xl border border-[#cfcac1] px-3" />
                          <button className="h-11 rounded-xl border border-edge bg-white px-3 font-semibold">OK</button>
                        </form>
                      </details>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="imp-h" className="flex flex-col gap-5 rounded-3xl border border-line bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h2 id="imp-h" className="font-display text-[22px] font-semibold">2 · Враження</h2>
            <p className="text-sm text-body">Одноразові цілі в будь-якому порядку. Кожне виконане — +300 XP.</p>
          </div>
          <form action={addImpression} className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-body">Нове враження
              <input name="title" required maxLength={200} placeholder="Наприклад, дайвінг" className="h-12 w-[260px] max-w-full rounded-xl border border-[#cfcac1] px-3.5 text-[15px]" />
            </label>
            <button className="inline-flex h-12 items-center gap-2 rounded-xl bg-volt px-4 text-[15px] font-bold text-ink"><Icon name="plus" size={16} />Додати</button>
          </form>
        </div>
        <nav aria-label="Фільтр за статусом" className="flex flex-wrap gap-2">
          {[['', 'Усі', imps.length], ...Object.entries(STATUS_LABEL).map(([k, l]) => [k, l, counts[k]])].map(([k, l, n]) => {
            const on = (filter ?? '') === k;
            return (
              <a key={String(k)} href={k ? `/goals?status=${k}#imp-h` : '/goals#imp-h'} aria-current={on ? 'true' : undefined}
                className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold ${on ? 'border-ink bg-ink text-white' : 'border-edge bg-white text-body'}`}>
                {l} <span className={`num ${on ? 'text-volt' : 'text-[#6e6a62]'}`}>{n}</span>
              </a>
            );
          })}
        </nav>
        {shown.length === 0 && <p className="text-sm text-muted">Тут поки порожньо.</p>}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5">
          {shown.map((i) => (
            <div key={i.id} className={`flex min-h-[140px] flex-col gap-3 rounded-[18px] border p-4 ${i.status === 'done' ? 'border-[#ebd65a] bg-[#fffbe0]' : 'border-line bg-white'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-base font-bold leading-tight">{i.title}</span>
                  {i.note && <span className="text-[13px] text-[#4d4a44]">{i.note}</span>}
                </div>
                <form action={deleteImpression.bind(null, i.id)}>
                  <button aria-label={`Видалити: ${i.title}`} className="grid h-9 w-9 place-items-center text-[#8a857b] hover:text-ink"><Icon name="trash" size={16} /></button>
                </form>
              </div>
              <div className="mt-auto flex items-center justify-between gap-2">
                <ImpressionStatus id={i.id} status={i.status ?? 'idea'} />
                <span className={`num text-xs font-bold ${i.status === 'done' ? '' : 'text-[#6e6a62]'}`}>{i.status === 'done' ? '+300 XP отримано' : '+300 XP'}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
