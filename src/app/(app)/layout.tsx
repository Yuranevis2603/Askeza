import Link from 'next/link';
import { signOut } from '@/app/actions';
import { Icon } from '@/components/Icon';
import { Logo, LogoMark } from '@/components/Logo';
import { BottomNav, SideNav } from '@/components/Nav';
import { levelByN } from '@/lib/game/levels';
import { getCtx } from '@/lib/game/server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { row } = await getCtx();
  const level = levelByN(row.level);
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-[260px] flex-none flex-col gap-7 bg-ink px-[18px] py-7 text-[#eeece7] lg:flex">
        <div className="px-2"><Logo /></div>
        <SideNav />
        <div className="mt-auto flex flex-col gap-2.5 rounded-2xl bg-ink-2 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] text-dim">Рівень · {level.name}</span>
            <span className="font-display text-xl font-semibold">{row.level}</span>
          </div>
          {row.comeback && <span className="text-xs text-dim-2">Режим повернення активний</span>}
          <Link href="/levels" className="inline-flex min-h-8 items-center text-[13px] font-semibold text-volt">Що відкриється далі</Link>
        </div>
        <form action={signOut}>
          <button className="flex min-h-11 items-center gap-2 px-2 text-sm text-dim hover:text-white"><Icon name="out" />Вийти</button>
        </form>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between bg-ink px-4 py-3 text-white lg:hidden">
          <div className="flex items-center gap-2"><LogoMark size={30} /><span className="font-display text-lg font-bold">askeza</span></div>
          <Link href="/levels" aria-label={`Рівень ${row.level}`} className="grid h-9 w-9 place-items-center rounded-[11px] bg-volt font-display text-[15px] font-bold text-ink">{row.level}</Link>
        </header>
        <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 px-4 pb-28 pt-4 sm:px-6 lg:px-10 lg:pb-14 lg:pt-8">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
