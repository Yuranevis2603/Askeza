'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, IconName } from './Icon';

const ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Сьогодні', icon: 'sun' },
  { href: '/goals', label: 'Цілі 2027', icon: 'target' },
  { href: '/levels', label: 'Рівні', icon: 'stairs' },
  { href: '/journal', label: 'Думки', icon: 'pen' },
];

function useActive() {
  const path = usePathname();
  return (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
}

export function SideNav() {
  const isActive = useActive();
  return (
    <nav aria-label="Розділи" className="flex flex-col gap-1">
      {ITEMS.map((i) => {
        const on = isActive(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={on ? 'page' : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-[15px] ${on ? 'bg-volt font-semibold text-ink' : 'font-medium text-dim-2 hover:text-white'}`}>
            <Icon name={i.icon} />{i.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const isActive = useActive();
  return (
    <nav aria-label="Розділи" className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-line bg-white px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-1 lg:hidden">
      {ITEMS.map((i) => {
        const on = isActive(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={on ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-1 py-1 text-[11px] ${on ? 'font-bold text-ink' : 'font-semibold text-[#4d4a44]'}`}>
            <span className={`grid h-[30px] w-[52px] place-items-center rounded-full ${on ? 'bg-volt' : ''}`}><Icon name={i.icon} size={20} /></span>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
