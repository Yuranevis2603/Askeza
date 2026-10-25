export function Bar({ pct, color = 'bg-volt', track = 'bg-line-2', h = 'h-2' }: { pct: number; color?: string; track?: string; h?: string }) {
  return (
    <div className={`${h} ${track} overflow-hidden rounded-full`}>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export function Card({ children, className = '', ...rest }: React.HTMLAttributes<HTMLElement>) {
  return <section {...rest} className={`rounded-[20px] border border-line bg-white p-5 sm:p-6 ${className}`}>{children}</section>;
}

export const AREA: Record<string, { name: string; dot: string; bar: string; tint: string; ink: string }> = {
  focus: { name: 'Фокус', dot: 'bg-[#8a857b]', bar: 'bg-ink', tint: 'bg-line-2', ink: 'text-body' },
  instagram: { name: 'Instagram', dot: 'bg-ig', bar: 'bg-ig', tint: 'bg-[#ffede2]', ink: 'text-[#a8430a]' },
  project: { name: 'Проєкт', dot: 'bg-project', bar: 'bg-project', tint: 'bg-[#e6ecff]', ink: 'text-[#2246c7]' },
  body: { name: 'Тіло', dot: 'bg-body-goal', bar: 'bg-body-goal', tint: 'bg-[#e2f5e9]', ink: 'text-[#11633a]' },
};
