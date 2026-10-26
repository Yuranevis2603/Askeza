import Link from 'next/link';
import { addTask, deleteTask, setMetric, toggleHabit, toggleTask } from '@/app/actions';
import { FocusTimer } from '@/components/FocusTimer';
import { JournalPrompt } from '@/components/JournalPrompt';
import { EventBanner, MissionList } from '@/components/game';
import { Icon } from '@/components/Icon';
import { AREA, Bar, Card } from '@/components/ui';
import { comebackDone, nextLevelCriteria } from '@/lib/game/engine';
import { COMEBACK_MISSIONS, levelByN, unlockedFeatures } from '@/lib/game/levels';
import { getCtx, loadGame, must, xpToday } from '@/lib/game/server';

export const dynamic = 'force-dynamic';

const field = 'h-10 rounded-lg border border-[#cfcac1] bg-white px-2 text-sm';

export default async function TodayPage() {
  const ctx = await getCtx();
  const { supabase, userId, today } = ctx;
  const { player, stats, event } = await loadGame(ctx);
  const [tasks, habits, logs, reelsToday, focusToday, xp] = await Promise.all([
    supabase.from('tasks').select('id, time, title, area, xp, done').eq('user_id', userId).eq('day', today).order('time', { nullsFirst: false }).order('created_at'),
    supabase.from('habits').select('id, name, key').eq('user_id', userId).eq('archived', false).order('sort'),
    supabase.from('habit_logs').select('habit_id').eq('user_id', userId).eq('day', today),
    supabase.from('metrics').select('value').eq('user_id', userId).eq('key', 'reels_minutes').eq('day', today),
    supabase.from('focus_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('day', today),
    xpToday(ctx),
  ]);
  const wroteToday = must(await supabase.from('journal_entries').select('id').eq('user_id', userId).eq('day', today).limit(1)).length > 0;
  const taskList = must(tasks);
  const habitList = must(habits);
  const doneHabits = new Set(must(logs).map((l) => l.habit_id));
  const reels = must(reelsToday)[0]?.value;
  const level = levelByN(player.level);
  const next = nextLevelCriteria(player, stats, today);
  const features = unlockedFeatures(player.maxLevel);
  const dayPct = Math.min(100, Math.round((xp / ctx.row.daily_goal) * 100));
  const doneTasks = taskList.filter((t) => t.done).length;
  const allDone = taskList.length > 0 && doneTasks === taskList.length;
  const dateLabel = new Intl.DateTimeFormat('uk-UA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: ctx.row.time_zone }).format(new Date());

  const levelLine = player.comeback
    ? `Повернення рівня: ${comebackDone(stats)} з 3 місій`
    : next
      ? `До рівня ${next.next.n}: ${next.criteria.filter((c) => c.met).length} з ${next.criteria.length} умов`
      : 'Найвищий рівень';
  const levelPct = player.comeback
    ? (comebackDone(stats) / 3) * 100
    : next ? next.criteria.reduce((a, c) => a + c.pct, 0) / next.criteria.length : 100;

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium capitalize text-muted">{dateLabel}</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Сьогодні</h1>
        </div>
      </header>

      <EventBanner event={event} level={player.level} levelName={level.name} />
      <JournalPrompt day={today} show={allDone && !wroteToday} />

      <Link href="/levels" aria-label="Прогрес дня і рівень" className="flex items-center gap-4 rounded-2xl bg-ink p-4 text-white">
        <div className="relative h-14 w-14 flex-none">
          <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
            <circle cx="28" cy="28" r="23" fill="none" stroke="#2B2B2B" strokeWidth="6" />
            <circle cx="28" cy="28" r="23" fill="none" stroke="#F5DF2E" strokeWidth="6" strokeLinecap="round" pathLength={100} strokeDasharray={`${dayPct} 100`} transform="rotate(-90 28 28)" />
          </svg>
          <span className="num absolute inset-0 grid place-items-center text-xs font-bold">{dayPct}%</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="num text-[17px] font-bold">{xp} <span className="text-sm font-medium text-dim">/ {ctx.row.daily_goal} XP</span></span>
            <span className="truncate text-xs font-semibold text-volt">Рівень {player.level} · {level.name}</span>
          </div>
          <Bar pct={levelPct} track="bg-ink-3" h="h-1.5" />
          <span className="text-xs text-dim">{levelLine}</span>
        </div>
        <Icon name="stairs" size={18} className="flex-none text-dim" />
      </Link>

      <Card aria-labelledby="plan-h" className="flex flex-col gap-1 !p-4">
        <div className="flex items-center justify-between">
          <h2 id="plan-h" className="text-base font-bold">План</h2>
          <span className="num text-xs font-medium text-muted">{doneTasks}/{taskList.length}</span>
        </div>
        <ul className="flex flex-col">
          {taskList.map((t) => (
            <li key={t.id} className="group flex items-center gap-2 border-b border-line-2 py-0.5 last:border-b-0">
              <form action={toggleTask.bind(null, t.id)}>
                <button aria-pressed={t.done} aria-label={`Виконано: ${t.title}`} className="-ml-2 grid h-11 w-11 place-items-center">
                  <span className={`grid h-6 w-6 place-items-center rounded-md border-2 ${t.done ? 'border-volt bg-volt text-ink' : 'border-[#bdb8ae] text-transparent'}`}><Icon name="check" size={14} stroke={3} /></span>
                </button>
              </form>
              <span className={`h-2 w-2 flex-none rounded-full ${AREA[t.area].dot}`} title={AREA[t.area].name} />
              <span className={`min-w-0 flex-1 truncate text-[15px] ${t.done ? 'text-[#6e6a62] line-through' : ''}`}>
                {t.time && <span className="num mr-1.5 text-xs text-muted">{t.time}</span>}{t.title}
              </span>
              <span className={`num flex-none text-xs font-bold ${t.done ? 'text-ink' : 'text-muted'}`}>+{t.xp}</span>
              <form action={deleteTask.bind(null, t.id)}>
                <button aria-label={`Видалити: ${t.title}`} className="grid h-11 w-8 place-items-center text-[#bdb8ae] hover:text-ink"><Icon name="trash" size={15} /></button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addTask} className="flex flex-col gap-2 pt-2">
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="new-task">Нова справа</label>
            <input id="new-task" name="title" required maxLength={200} placeholder="Додати справу…" className="h-11 min-w-0 flex-1 rounded-xl bg-paper px-3 text-[15px] placeholder:text-[#8a857b]" />
            <button aria-label="Додати справу" className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-ink text-white"><Icon name="plus" size={18} /></button>
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-xs font-semibold text-muted">Час, напрям, XP</summary>
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="sr-only" htmlFor="new-time">Час</label>
              <input id="new-time" name="time" type="time" className={field} />
              <label className="sr-only" htmlFor="new-area">Напрям</label>
              <select id="new-area" name="area" className={field}>
                <option value="focus">Фокус</option>
                {features.has('goal_project') && <option value="project">Проєкт</option>}
                {features.has('goal_instagram') && <option value="instagram">Instagram</option>}
                {features.has('goal_body') && <option value="body">Тіло</option>}
              </select>
              <label className="sr-only" htmlFor="new-xp">XP</label>
              <select id="new-xp" name="xp" defaultValue="10" className={field}>
                <option value="10">+10 XP</option><option value="20">+20 XP</option><option value="30">+30 XP</option><option value="50">+50 XP</option>
              </select>
            </div>
          </details>
        </form>
      </Card>

      <Card aria-labelledby="hab-h" className="flex flex-col gap-3 !p-4">
        <div className="flex items-center justify-between">
          <h2 id="hab-h" className="text-base font-bold">Звички</h2>
          <span className="num text-xs font-medium text-muted">{doneHabits.size}/{habitList.length} · +5 XP</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {habitList.map((h) => {
            const on = doneHabits.has(h.id);
            return (
              <form key={h.id} action={toggleHabit.bind(null, h.id)}>
                <button aria-pressed={on} className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold ${on ? 'border-volt bg-volt text-ink' : 'border-edge bg-white text-body'}`}>
                  {on && <Icon name="check" size={14} stroke={3} />}{h.name}
                </button>
              </form>
            );
          })}
        </div>
      </Card>

      <Card aria-labelledby="mis-h" className="flex flex-col gap-3 !p-4">
        <div className="flex items-center justify-between">
          <h2 id="mis-h" className="text-base font-bold">{player.comeback ? 'Місії повернення' : `Місії рівня ${player.level}`}</h2>
          <Link href="/levels" className="text-xs font-semibold text-muted">Усі рівні</Link>
        </div>
        <MissionList missions={player.comeback ? COMEBACK_MISSIONS : level.missions} progress={stats.missionProgress} />
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card aria-label="Фокус-сесія" className="!p-4">
          {features.has('focus') ? <FocusTimer sessionsToday={focusToday.count ?? 0} /> : (
            <p className="flex items-center gap-2 text-sm text-muted"><Icon name="lock" size={16} />Фокус-таймер відкриється на рівні 3</p>
          )}
        </Card>
        <Card aria-label="Час у Reels" className="!p-4">
          <form action={setMetric} className="flex items-center gap-3">
            <input type="hidden" name="key" value="reels_minutes" />
            <label htmlFor="reels" className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-semibold">Reels сьогодні</span>
              <span className="num text-xs text-muted">{stats.metrics.reels_avg_7d != null ? `≈ ${Math.round(stats.metrics.reels_avg_7d)} хв/день за тиждень` : 'хвилин з екранного часу'}</span>
            </label>
            <input id="reels" name="value" inputMode="numeric" defaultValue={reels ?? ''} placeholder="хв" className="h-11 w-16 rounded-xl bg-paper px-2 text-center text-base font-semibold" />
            <button aria-label="Зберегти хвилини" className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-white"><Icon name="check" size={16} stroke={3} /></button>
          </form>
        </Card>
      </div>
    </div>
  );
}
