type IconProps = {
  size?: number;
  className?: string;
};

const base = {
  fill: "none",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconHome({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" className={className} {...base}>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

export function IconBriefcase({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" className={className} {...base}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}

export function IconChecklist({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" className={className} {...base}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}

export function IconMessage({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" className={className} {...base}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

export function IconUser({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" className={className} {...base}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" />
    </svg>
  );
}

export function IconBell({ size = 17, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" className={className} {...base}>
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 01-3.4 0" />
    </svg>
  );
}

export function IconSearch({ size = 15, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" className={className} {...base} strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

export function IconFilter({ size = 17, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" className={className} {...base} strokeWidth={2}>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}

export function IconHeart({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" className={className} {...base} strokeWidth={2}>
      <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 10-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" />
    </svg>
  );
}

export function IconChevronLeft({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" className={className} {...base} strokeWidth={2}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function IconShield({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" className={className} {...base} strokeWidth={2}>
      <path d="M12 2l8 4v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-4z" />
      <path d="M12 8v5" />
      <circle cx="12" cy="16.2" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function IconCheck({ size = 11, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" className={className} {...base} strokeWidth={3}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function IconUpload({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" className={className} {...base}>
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
      <path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
    </svg>
  );
}

export function IconEdit({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" className={className} {...base}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

export function IconDoc({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" className={className} {...base}>
      <path d="M14 3v4a1 1 0 001 1h4" />
      <path d="M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />
    </svg>
  );
}

export function IconPreferences({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" className={className} {...base}>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}

export function IconResume({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" className={className} {...base}>
      <path d="M9 12l2 2 4-4" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

export function IconShare({ size = 15, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" className={className} {...base} strokeWidth={2}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 10.5l6.8-3.9M8.6 13.5l6.8 3.9" />
    </svg>
  );
}
