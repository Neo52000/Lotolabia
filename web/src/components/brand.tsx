export function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dimension = size === 'sm' ? 'h-9 w-9' : 'h-10 w-10';
  const barGap = size === 'sm' ? 'gap-[2px] pb-[7px]' : 'gap-[3px] pb-2';
  return (
    <span
      className={`relative ${dimension} shrink-0 rounded-full bg-[radial-gradient(circle_at_32%_28%,#fff8dd,#F4C430_55%,#A8790E_100%)] shadow-[0_0_18px_rgba(244,196,48,0.5)]`}
    >
      <span className={`absolute inset-0 flex items-end justify-center ${barGap}`}>
        <span className="w-1 rounded-sm bg-night" style={{ height: '32%' }} />
        <span className="w-1 rounded-sm bg-night" style={{ height: '52%' }} />
        <span className="w-1 rounded-sm bg-night" style={{ height: '24%' }} />
      </span>
      <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-brand-pink shadow-[0_0_8px_#FF4D8D]" />
    </span>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-sora text-xl font-extrabold tracking-tight text-night ${className}`}>
      LotoLab{' '}
      <span className="bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">IA</span>
    </span>
  );
}
