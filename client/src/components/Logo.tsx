interface LogoProps {
  className?: string;
  variant?: 'full' | 'mark';
  theme?: 'dark' | 'light';
}

export function Logo({ className = '', variant = 'full', theme = 'dark' }: LogoProps) {
  const textColor = theme === 'dark' ? 'text-ivory' : 'text-ink';

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="28" height="28" rx="7" fill="#183C31" />
        <path
          d="M8 19V9L14 15V9M14 15L20 19V9"
          stroke="#C8E46A"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {variant === 'full' && (
        <span className={`font-display text-lg font-medium tracking-tight ${textColor}`}>
          Nexora
        </span>
      )}
    </span>
  );
}
