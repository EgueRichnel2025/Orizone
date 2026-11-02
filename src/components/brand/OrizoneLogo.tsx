type OrizoneMarkProps = {
  size?: number;
  className?: string;
};

/**
 * Symbole géométrique d'Orizone :
 * repère mathématique, chemin de progression et point optimal.
 */
export function OrizoneMark({
  size = 42,
  className,
}: OrizoneMarkProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="1"
        y="1"
        width="42"
        height="42"
        rx="12"
        fill="#2F5D50"
      />

      <path
        d="M11.5 12.5V32.5H32.5"
        stroke="#F4F1EA"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.78"
      />

      <path
        d="M14 28L20.5 21.8L25.8 24.9L32.8 14.5"
        stroke="#F4F1EA"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle cx="14" cy="28" r="2.1" fill="#F4F1EA" />
      <circle cx="20.5" cy="21.8" r="2.1" fill="#F4F1EA" />
      <circle cx="25.8" cy="24.9" r="2.1" fill="#F4F1EA" />

      <circle
        cx="32.8"
        cy="14.5"
        r="3.2"
        fill="#C98A3D"
        stroke="#F4F1EA"
        strokeWidth="1.15"
      />
    </svg>
  );
}

export default function OrizoneLogo() {
  return (
    <span className="orizone-logo-lockup" aria-hidden="true">
      <OrizoneMark className="orizone-logo-mark" />

      <span className="orizone-logo-copy">
        <span className="orizone-logo-name">ORIZONE</span>
        <span className="orizone-logo-tagline">
          OPTIMISATION MATHÉMATIQUE
        </span>
      </span>
    </span>
  );
}
