import Link from 'next/link';
import { addTask, deleteTask, setMetric, toggleHabit, toggleTask } from '@/app/actions';
import { FocusTimer } from '@/components/FocusTimer';
import { CriteriaGrid, EventBanner, MissionList } from '@/components/game';
import { Icon } from '@/components/Icon';
import { AREA, Bar, Card } from '@/components/ui';
import { comebackDone, nextLevelCriteria } from '@/lib/game/engine';
import { COMEBACK_MISSIONS, levelByN, unlockedFeatures } from '@/lib/game/levels';
import { getCtx, loadGame, must, xpToday } from '@/lib/game/server';

export const dynamic = 'force-dynamic';

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
  const taskList = must(tasks);
  const doneHabits = new Set(must(logs).map((l) => l.habit_id));
  const reels = must(reelsToday)[0]?.value;
  const level = levelByN(player.level);
  const next = nextLevelCriteria(player, stats, today);
  const features = unlockedFeatures(player.maxLevel);
  const dayPct = Math.min(100, Math.round((xp / ctx.row.daily_goal) * 100));
  const dateLabel = new Intl.DateTimeFormat('uk-UA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: ctx.row.time_zone }).format(new Date());

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-sm font-medium capitalize text-muted">{dateLabel}</p>
          <h1 className="font-display text-[28px] font-semibold tracking-tight sm:text-[34px]">Твій день</h1>
        </div>
        <span className="num inline-flex h-10 items-center gap-2 rounded-full bg-ink px-3.5 text-sm font-semibold text-volt"><Icon name="bolt" size={16} />+{xp} XP сьогодні</span>
      </header>

      <EventBanner event={event} level={player.level} levelName={level.name} />

      <section aria-label="Прогрес дня" className="flex flex-wrap items-center gap-8 rounded-3xl bg-ink p-6 text-white sm:p-7">
        <div className="flex flex-[1_1_260px] items-center gap-5">
          <div className="relative h-[120px] w-[120px] flex-none">
            <svg width="120" height="120" viewBox="0 0 132 132" aria-hidden="true">
              <circle cx="66" cy="66" r="56" fill="none" stroke="#2B2B2B" strokeWidth="12" />
              <circle cx="66" cy="66" r="56" fill="none" stroke="#F5DF2E" strokeWidth="12" strokeLinecap="round" pathLength={100} strokeDasharray={`${dayPct} 100`} transform="rotate(-90 66 66)" />
            </svg>
            <div className="num absolute inset-0 grid place-items-center font-display text-2xl font-semibold">{dayPct}%</div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-dim">Прогрес дня</span>
            <span className="num text-[22px] font-bold">{xp} / {ctx.row.daily_goal} XP</span>
            <span className="num text-sm text-dim-2">{taskList.filter((t) => t.done).length} з {taskList.length} справ · {doneHabits.size} з {must(habits).length} звичок</span>
          </div>
        </div>
        <div className="flex flex-[999_1_360px] flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[15px] font-semibold">Рівень {player.level} · {level.name}</span>
            <Link href="/levels" className="text-[13px] font-semibold text-volt">Шлях рівнів</Link>
          </div>
          {player.comeback ? (
            <p className="text-sm text-dim-2">Режим повернення: {comebackDone(stats)} з 3 місій. Виконай їх — і рівень повернеться.</p>
          ) : next ? (
            <>
              <span className="text-[13px] text-dim">До рівня {next.next.n} «{next.next.name}» · {next.criteria.filter((c) => c.met).length} з {next.criteria.length} умов</span>
              <CriteriaGrid criteria={next.criteria} compact />
            </>
          ) : (
            <p className="text-sm text-dim-2">Найвищий рівень. Тепер правила пишеш ти.</p>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-6">
          <Card aria-labelledby="plan-h" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="plan-h" className="text-[19px] font-bold">План на день</h2>
              <span className="num text-sm font-medium text-muted">{taskList.filter((t) => t.done).length}/{taskList.length} виконано</span>
            </div>
            {taskList.length === 0 && <p className="text-sm text-muted">Поки порожньо. Додай 3–5 справ, які наблизять тебе до цілей.</p>}
            <ul className="flex flex-col">
              {taskList.map((t) => (
                <li key={t.id} className="flex items-center gap-3 border-t border-line-2 py-2">
                  <form action={toggleTask.bind(null, t.id)}>
                    <button aria-pressed={t.done} aria-label={`Виконано: ${t.title}`} className="grid h-11 w-11 place-items-center">
                      <span className={`grid h-[26px] w-[26px] place-items-center rounded-lg border-2 ${t.done ? 'border-volt bg-volt text-ink' : 'border-[#bdb8ae] bg-white text-transparent'}`}><Icon name="check" size={16} stroke={3} /></span>
                    </button>
                  </form>
                  {t.time && <span className="num w-11 flex-none text-[13px] font-medium text-[#6e6a62]">{t.time}</span>}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={`text-[15px] font-medium ${t.done ? 'text-[#6e6a62] line-through' : ''}`}>{t.title}</span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted"><span className={`h-[7px] w-[7px] rounded-full ${AREA[t.area].dot}`} />{AREA[t.area].name}</span>
                  </div>
                  <span className={`num flex-none rounded-full px-2.5 py-1 text-[13px] font-bold ${t.done ? 'bg-volt text-ink' : 'bg-paper text-body'}`}>+{t.xp} XP</span>
                  <form action={deleteTask.bind(null, t.id)}>
                    <button aria-label={`Видалити: ${t.title}`} className="grid h-11 w-9 place-items-center text-[#8a857b] hover:text-ink"><Icon name="trash" size={16} /></button>
                  </form>
                </li>
              ))}
            </ul>
            <form action={addTask} className="flex flex-wrap items-end gap-2 border-t border-line-2 pt-4">
              <label className="flex min-w-[200px] flex-[1_1_240px] flex-col gap-1.5 text-[13px] font-medium text-body">Нова справа
                <input name="title" required maxLength={200} placeholder="Наприклад, 20 хв над прототипом" className="h-11 rounded-xl border border-[#cfcac1] bg-white px-3 text-[15px]" />
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-body">Час
                <input name="time" type="time" className="h-11 rounded-xl border border-[#cfcac1] bg-white px-2 text-[15px]" />
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-body">Напрям
                <select name="area" className="h-11 rounded-xl border border-[#cfcac1] bg-white px-2 text-[15px]">
                  <option value="focus">Фокус</option>
                  {features.has('goal_project') && <option value="project">Проєкт</option>}
                  {features.has('goal_instagram') && <option value="instagram">Instagram</option>}
                  {features.has('goal_body') && <option value="body">Тіло</option>}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-body">XP
                <select name="xp" defaultValue="10" className="h-11 rounded-xl border border-[#cfcac1] bg-white px-2 text-[15px]">
                  <option value="10">10 · легко</option><option value="20">20</option><option value="30">30</option><option value="50">50 · важко</option>
                </select>
              </label>
              <button className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-white"><Icon name="plus" size={16} />Додати</button>
            </form>
          </Card>

          <div className="flex flex-wrap gap-6">
            <Card aria-labelledby="focus-h" className="flex flex-[1_1_300px] flex-col gap-4">
              <h2 id="focus-h" className="flex items-center gap-2.5 text-[19px] font-bold"><Icon name="clock" className="text-project" />Фокус-сесія</h2>
              {features.has('focus') ? <FocusTimer sessionsToday={focusToday.count ?? 0} /> : (
                <p className="flex items-center gap-2 text-sm text-muted"><Icon name="lock" size={16} />Відкриється на рівні 3 «Ясність». Поки тренуй дихання й увагу.</p>
              )}
            </Card>
            <Card aria-labelledby="reels-h" className="flex flex-[1_1_300px] flex-col gap-4">
              <h2 id="reels-h" className="text-[19px] font-bold">Час у Reels сьогодні</h2>
              <p className="text-sm leading-relaxed text-body">Подивись екранний час у телефоні й запиши хвилини. Це один із результатів, від яких залежать рівні.</p>
              <form action={setMetric} className="flex items-end gap-2">
                <input type="hidden" name="key" value="reels_minutes" />
                <label className="flex flex-1 flex-col gap-1.5 text-[13px] font-medium text-body">Хвилин
                  <input name="value" inputMode="numeric" defaultValue={reels ?? ''} placeholder="0" className="h-12 rounded-xl border border-[#cfcac1] bg-white px-3.5 text-lg font-semibold" />
                </label>
                <button className="h-12 rounded-xl bg-ink px-4 text-[15px] font-semibold text-white">Зберегти</button>
              </form>
              {stats.metrics.reels_avg_7d != null && <span className="num text-[13px] text-muted">У середньому за 7 днів: {Math.round(stats.metrics.reels_avg_7d)} хв</span>}
            </Card>
          </div>
        </div>

        <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-6">
          <Card aria-labelledby="hab-h" className="flex flex-col gap-4">
            <div className="flex items-center justify-between"><h2 id="hab-h" className="text-[19px] font-bold">Звички</h2><span className="text-[13px] font-medium text-muted">+5 XP кожна</span></div>
            <div className="grid grid-cols-2 gap-2.5">
              {must(habits).map((h) => {
                const on = doneHabits.has(h.id);
                return (
                  <form key={h.id} action={toggleHabit.bind(null, h.id)}>
                    <button aria-pressed={on} className={`flex min-h-[60px] w-full items-center justify-between gap-2 rounded-[14px] border p-3 text-left text-sm font-semibold ${on ? 'border-volt bg-volt' : 'border-line bg-white'}`}>
                      {h.name}
                      <span className={`grid h-5 w-5 flex-none place-items-center rounded-full ${on ? 'bg-ink text-volt' : 'border-[1.5px] border-[#bdb8ae] text-transparent'}`}><Icon name="check" size={12} stroke={3.2} /></span>
                    </button>
                  </form>
                );
              })}
            </div>
          </Card>

          <Card aria-labelledby="mis-h" className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <h2 id="mis-h" className="text-[19px] font-bold">{player.comeback ? 'Місії повернення' : `Місії рівня ${player.level}`}</h2>
              <Link href="/levels" className="text-[13px] font-semibold">Усі рівні</Link>
            </div>
            <MissionList missions={player.comeback ? COMEBACK_MISSIONS : level.missions} progress={stats.missionProgress} />
            <p className="text-xs leading-snug text-muted">Відмічай прогрес сам: агента, що рахує його автоматично, додамо в наступній версії.</p>
          </Card>

          {features.has('goal_instagram') && (
            <Card aria-labelledby="ig-h" className="flex flex-col gap-3">
              <h2 id="ig-h" className="text-[19px] font-bold">Instagram</h2>
              <form action={setMetric} className="flex items-end gap-2">
                <input type="hidden" name="key" value="followers" />
                <label className="flex flex-1 flex-col gap-1.5 text-[13px] font-medium text-body">Підписників зараз
                  <input name="value" inputMode="numeric" defaultValue={stats.metrics.followers ?? ''} className="h-11 rounded-xl border border-[#cfcac1] bg-white px-3 text-[15px]" />
                </label>
                <button className="h-11 rounded-xl bg-ink px-4 text-sm font-semibold text-white">Зберегти</button>
              </form>
              {features.has('reels') && (
                <form action={setMetric} className="flex items-end gap-2">
                  <input type="hidden" name="key" value="reels_published" />
                  <label className="flex flex-1 flex-col gap-1.5 text-[13px] font-medium text-body">Опубліковано Reels усього
                    <input name="value" inputMode="numeric" defaultValue={stats.metrics.reels_published ?? ''} className="h-11 rounded-xl border border-[#cfcac1] bg-white px-3 text-[15px]" />
                  </label>
                  <button className="h-11 rounded-xl bg-ink px-4 text-sm font-semibold text-white">Зберегти</button>
                </form>
              )}
              <Bar pct={((stats.metrics.followers ?? 0) / 10000) * 100} color="bg-ig" />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
