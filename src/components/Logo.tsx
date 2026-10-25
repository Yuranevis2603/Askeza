export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="flex-none">
      <circle cx="24" cy="24" r="16.5" fill="none" stroke="#F5DF2E" strokeWidth="4.5" />
      <path d="M28.5 3L11.5 27.5h11L18.5 45L37 19.5H26z" fill="#F5DF2E" stroke="#111111" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <span className="font-display text-[21px] font-bold tracking-tight text-white">askeza</span>
    </div>
  );
}
