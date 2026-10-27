import { addTracker, deleteTracker } from '@/app/actions';
import { Icon } from '@/components/Icon';
import { ResetTracker } from '@/components/ResetTracker';
import { TrackerCounter } from '@/components/TrackerCounter';
import { Card } from '@/components/ui';
import { getCtx, must } from '@/lib/game/server';

export const dynamic = 'force-dynamic';

type Tracker = { id: string; name: string; started_at: string; best_seconds: number };

const PRESETS = ['Без сигарет', 'Без Reels', 'Без алкоголю', 'Без цукру'];

export default async function TrackersPage() {
  const { supabase, userId, today } = await getCtx();
  const [trackersRes, resetsRes] = await Promise.all([
    supabase.from('trackers').select('id, name, started_at, best_seconds').eq('user_id', userId).order('created_at'),
    supabase.from('tracker_resets').select('tracker_id').eq('user_id', userId),
  ]);
  const trackers = must(trackersRes) as Tracker[];
  const resets = must(resetsRes);
  const used = new Set(trackers.map((t) => t.name));

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Трекери</h1>
        <p className="text-sm text-muted">Скільки ти вже тримаєшся. Зрив — не провал, а новий старт: рекорд залишається.</p>
      </div>

      {trackers.map((t) => (
        <Card key={t.id} aria-label={t.name} className="flex flex-col gap-3 !p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-bold"><Icon name="flame" size={16} className="text-ig" />{t.name}</h2>
            <span className="text-xs text-muted">{resets.filter((r) => r.tracker_id === t.id).length} рестартів</span>
          </div>
          <TrackerCounter startedAt={t.started_at} bestSeconds={t.best_seconds} />
          <div className="flex items-center justify-between gap-2">
            <ResetTracker id={t.id} name={t.name} />
            <form action={deleteTracker.bind(null, t.id)}>
              <button aria-label={`Видалити трекер «${t.name}»`} className="grid h-10 w-9 place-items-center text-[#bdb8ae] hover:text-ink"><Icon name="trash" size={15} /></button>
            </form>
          </div>
        </Card>
      ))}

      <Card aria-labelledby="new-tr" className="flex flex-col gap-3 !p-4">
        <h2 id="new-tr" className="text-base font-bold">Новий трекер</h2>
        {PRESETS.some((p) => !used.has(p)) && (
          <div className="flex flex-wrap gap-2">
            {PRESETS.filter((p) => !used.has(p)).map((p) => (
              <form key={p} action={addTracker}>
                <input type="hidden" name="name" value={p} />
                <button className="inline-flex h-10 items-center gap-1.5 rounded-full border border-edge bg-white px-3.5 text-sm font-semibold"><Icon name="plus" size={14} />{p}</button>
              </form>
            ))}
          </div>
        )}
        <form action={addTracker} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <label htmlFor="tr-name" className="sr-only">Назва</label>
            <input id="tr-name" name="name" required maxLength={80} placeholder="Свій трекер, наприклад «Без фастфуду»" className="h-11 min-w-0 flex-1 rounded-xl bg-paper px-3 text-[15px]" />
            <button aria-label="Додати трекер" className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-ink text-white"><Icon name="plus" size={18} /></button>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted">
            Тримаюсь з
            <input name="since" type="date" max={today} className="h-9 rounded-lg border border-edge bg-white px-2 text-sm text-ink" />
            <span>(порожньо — від зараз)</span>
          </label>
        </form>
      </Card>
    </div>
  );
}
