import { addJournal, deleteJournal } from '@/app/actions';
import { Icon } from '@/components/Icon';
import { Card } from '@/components/ui';
import { getCtx, must } from '@/lib/game/server';

export const dynamic = 'force-dynamic';

type Entry = { id: string; day: string; body: string; created_at: string };

export default async function JournalPage() {
  const { supabase, userId, row, today } = await getCtx();
  const entries = must(await supabase.from('journal_entries').select('id, day, body, created_at').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(200)) as Entry[];

  const dayFmt = new Intl.DateTimeFormat('uk-UA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const timeFmt = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit', timeZone: row.time_zone });
  const days = [...new Set(entries.map((e) => e.day))];

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Думки</h1>

      <Card className="!p-4">
        <form action={addJournal} className="flex flex-col gap-2">
          <label htmlFor="j-body" className="text-sm font-semibold">Запис на сьогодні</label>
          <textarea id="j-body" name="body" required maxLength={10000} rows={3} placeholder="Що в голові зараз?"
            className="w-full resize-y rounded-xl bg-paper p-3 text-[15px] leading-relaxed" />
          <button className="h-10 self-end rounded-xl bg-ink px-4 text-sm font-semibold text-white">Зберегти</button>
        </form>
      </Card>

      {entries.length === 0 && <p className="text-sm text-muted">Поки порожньо. Записи з’являться тут, щойно ти щось напишеш — наприклад, після останньої справи дня.</p>}

      {days.map((d) => (
        <section key={d} aria-label={d} className="flex flex-col gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">{d === today ? 'Сьогодні' : dayFmt.format(new Date(d + 'T00:00:00Z'))}</h2>
          {entries.filter((e) => e.day === d).map((e) => (
            <Card key={e.id} className="flex flex-col gap-2 !p-4">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{e.body}</p>
              <div className="flex items-center justify-between">
                <span className="num text-xs text-muted">{timeFmt.format(new Date(e.created_at))}</span>
                <form action={deleteJournal.bind(null, e.id)}>
                  <button aria-label="Видалити запис" className="grid h-9 w-9 place-items-center text-[#bdb8ae] hover:text-ink"><Icon name="trash" size={15} /></button>
                </form>
              </div>
            </Card>
          ))}
        </section>
      ))}
    </div>
  );
}
