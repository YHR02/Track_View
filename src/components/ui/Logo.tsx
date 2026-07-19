
interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * Track Wise - Premium Monochromatic Identity Logo
 * Concept: Monolith Grid (T/W Monogram)
 * Engineered with sharp bounds, dot matrix coordinates, and a technical grid alignment.
 */
export function Logo({ className = '', size = 24 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-zinc-100 ${className}`}
    >
      {/* Outer sharp structural outline */}
      <rect x="4" y="4" width="24" height="24" rx="1.5" strokeWidth="2.5" />
      
      {/* "T" Bar & Vertical Pillar */}
      <path d="M10 11h12" />
      <path d="M16 11v11" />
      
      {/* "W" Vector intersection at the bottom */}
      <path d="M10 17l6 5 6-5" strokeWidth="2" />
    </svg>
  );
}

export function Logo32(props: Omit<LogoProps, 'size'>) {
  return <Logo size={32} {...props} />;
}

export function Logo64(props: Omit<LogoProps, 'size'>) {
  return <Logo size={64} {...props} />;
}
