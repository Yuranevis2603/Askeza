import { addImpression, deleteImpression, planNextAction, setGoalValue, setNextAction, toggleStep } from '@/app/actions';
import { Icon } from '@/components/Icon';
import { ImpressionStatus } from '@/components/ImpressionStatus';
import { AREA, Bar, Card } from '@/components/ui';
import { getCtx, loadGame, must } from '@/lib/game/server';

export const dynamic = 'force-dynamic';

type Goal = {
  id: string; kind: string; area: string | null; title: string; note: string | null; status: string | null;
  current_value: number | null; target_value: number | null; unit: string | null; unlock_level: number | null;
  next_action: string | null; next_action_xp: number | null;
};
type Step = { id: string; goal_id: string; title: string; done: boolean; unlock_level: number | null; due: string | null };

const STATUS_LABEL: Record<string, string> = { idea: 'Ідея', planned: 'Заплановано', prep: 'Готуюся', done: 'Виконано' };
const input = 'h-10 min-w-0 flex-1 rounded-lg bg-paper px-3 text-sm';

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
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Цілі 2027</h1>

      <section aria-labelledby="dev-h" className="flex flex-col gap-3">
        <h2 id="dev-h" className="text-sm font-bold uppercase tracking-wider text-muted">Розвиток</h2>
        {dev.map((g) => {
          const a = AREA[g.area ?? 'focus'];
          const locked = (g.unlock_level ?? 1) > player.maxLevel;
          if (locked) {
            return (
              <div key={g.id} className="flex items-center gap-3 rounded-2xl border border-dashed border-[#cfcac1] bg-soft px-4 py-3">
                <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-line-2 text-[#6e6a62]"><Icon name="lock" size={16} /></span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-semibold">{g.title}</span>
                  <span className="text-xs text-muted">Відкриється на рівні {g.unlock_level}</span>
                </div>
                <span className={`h-2.5 w-2.5 flex-none rounded-full ${a.dot}`} />
              </div>
            );
          }
          const value = Number(g.area === 'instagram' ? stats.metrics.followers ?? g.current_value ?? 0 : g.current_value ?? 0);
          const target = Number(g.target_value ?? 100);
          const gs = steps.filter((s) => s.goal_id === g.id);
          const current = gs.find((s) => !s.done && !((s.unlock_level ?? 0) > player.maxLevel));
          return (
            <Card key={g.id} aria-label={g.title} className="flex flex-col gap-3 !p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col">
                  <span className={`text-xs font-semibold ${a.ink}`}>{a.name}</span>
                  <h3 className="text-base font-bold leading-snug">{g.title}</h3>
                </div>
                <span className="num flex-none font-display text-xl font-semibold">
                  {g.unit === '%' ? `${Math.round(value)}%` : value.toLocaleString('uk-UA')}
                  {g.unit !== '%' && <span className="text-xs font-medium text-muted"> / {target.toLocaleString('uk-UA')}</span>}
                </span>
              </div>
              <Bar pct={(value / target) * 100} color={a.bar} h="h-1.5" />
              {current && <p className="text-sm text-body"><span className="text-muted">Етап:</span> <b className="font-semibold text-ink">{current.title}</b></p>}
              {g.next_action && (
                <div className="flex items-center gap-2 rounded-xl bg-soft p-2 pl-3">
                  <span className="min-w-0 flex-1 text-sm leading-snug">{g.next_action}</span>
                  <form action={planNextAction.bind(null, g.id)}>
                    <button className="h-10 flex-none rounded-lg bg-ink px-3 text-xs font-bold text-white">У план +{g.next_action_xp ?? 20}</button>
                  </form>
                </div>
              )}
              <details className="group">
                <summary className="cursor-pointer list-none text-xs font-semibold text-muted group-open:mb-2">Етапи й редагування ▾</summary>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col">
                    {gs.map((s) => {
                      const sl = (s.unlock_level ?? 0) > player.maxLevel;
                      return (
                        <form key={s.id} action={toggleStep.bind(null, s.id)}>
                          <button disabled={sl} aria-pressed={s.done} className="flex min-h-10 w-full items-center gap-2.5 text-left text-sm disabled:cursor-default">
                            <span className={`grid h-5 w-5 flex-none place-items-center rounded-full ${s.done ? 'bg-ink text-volt' : sl ? 'bg-line-2 text-[#6e6a62]' : 'border-2 border-[#cfcac1] text-transparent'}`}>
                              <Icon name={sl ? 'lock' : 'check'} size={11} stroke={3} />
                            </span>
                            <span className={`flex-1 ${s.done ? 'text-muted line-through' : sl ? 'text-muted' : ''}`}>{s.title}</span>
                            <span className="flex-none text-xs text-muted">{sl ? `з рівня ${s.unlock_level}` : s.due}</span>
                          </button>
                        </form>
                      );
                    })}
                  </div>
                  <form action={setGoalValue} className="flex gap-2">
                    <input type="hidden" name="id" value={g.id} />
                    <label className="sr-only" htmlFor={`v-${g.id}`}>Прогрес</label>
                    <input id={`v-${g.id}`} name="value" inputMode="numeric" defaultValue={value} className={input} />
                    <button className="h-10 rounded-lg border border-edge px-3 text-xs font-semibold">Оновити прогрес</button>
                  </form>
                  <form action={setNextAction} className="flex gap-2">
                    <input type="hidden" name="id" value={g.id} />
                    <label className="sr-only" htmlFor={`n-${g.id}`}>Найближча дія</label>
                    <input id={`n-${g.id}`} name="next_action" defaultValue={g.next_action ?? ''} maxLength={200} placeholder="Найближча дія" className={input} />
                    <button className="h-10 rounded-lg border border-edge px-3 text-xs font-semibold">Зберегти</button>
                  </form>
                </div>
              </details>
            </Card>
          );
        })}
      </section>

      <section aria-labelledby="imp-h" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 id="imp-h" className="text-sm font-bold uppercase tracking-wider text-muted">Враження</h2>
          <span className="num text-xs text-muted">{counts.done} з {imps.length} · +300 XP кожне</span>
        </div>
        <form action={addImpression} className="flex gap-2">
          <label className="sr-only" htmlFor="new-imp">Нове враження</label>
          <input id="new-imp" name="title" required maxLength={200} placeholder="Додати враження…" className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-3 text-[15px]" />
          <button aria-label="Додати враження" className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-volt text-ink"><Icon name="plus" size={18} /></button>
        </form>
        <nav aria-label="Фільтр за статусом" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
          {[['', 'Усі', imps.length], ...Object.entries(STATUS_LABEL).map(([k, l]) => [k, l, counts[k]])].map(([k, l, n]) => {
            const on = (filter ?? '') === k;
            return (
              <a key={String(k)} href={k ? `/goals?status=${k}#imp-h` : '/goals#imp-h'} aria-current={on ? 'true' : undefined}
                className={`inline-flex h-9 flex-none items-center gap-1 rounded-full border px-3 text-xs font-semibold ${on ? 'border-ink bg-ink text-white' : 'border-edge bg-white text-body'}`}>
                {l} <span className={`num ${on ? 'text-volt' : 'text-[#6e6a62]'}`}>{n}</span>
              </a>
            );
          })}
        </nav>
        <Card className="!p-0">
          {shown.length === 0 && <p className="p-4 text-sm text-muted">Тут поки порожньо.</p>}
          <ul>
            {shown.map((i) => (
              <li key={i.id} className={`flex items-center gap-2 border-b border-line-2 px-4 py-2 last:border-b-0 ${i.status === 'done' ? 'bg-[#fffbe0]' : ''}`}>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className={`truncate text-[15px] font-semibold ${i.status === 'done' ? 'line-through decoration-1' : ''}`}>{i.title}</span>
                  {i.note && <span className="truncate text-xs text-muted">{i.note}</span>}
                </div>
                <ImpressionStatus id={i.id} status={i.status ?? 'idea'} />
                <form action={deleteImpression.bind(null, i.id)}>
                  <button aria-label={`Видалити: ${i.title}`} className="grid h-10 w-8 place-items-center text-[#bdb8ae] hover:text-ink"><Icon name="trash" size={15} /></button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
