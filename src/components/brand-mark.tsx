export function BrandMark({ size = 44 }: { size?: number }) {
  const h = size;
  const w = (size * 52) / 44;
  return (
    <svg width={w} height={h} viewBox="0 0 52 44" fill="none" aria-hidden>
      <path d="M2 2 C 2 2, 22 10, 24 26 L 24 42 C 24 42, 22 22, 2 6 Z" fill="#0b1526" />
      <path d="M50 2 C 50 2, 30 10, 28 26 L 28 42 C 28 42, 30 22, 50 6 Z" fill="#c79a52" />
    </svg>
  );
}

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span
      className={`font-extrabold tracking-tight ${light ? "text-white" : "text-navy"}`}
    >
      Vagas <span className={light ? "text-gold-2" : "text-gold-3"}>Consulting</span>
    </span>
  );
}
