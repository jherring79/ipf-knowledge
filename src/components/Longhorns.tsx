// Original longhorn-steer silhouette drawn for IPF Knowledge (not the UT mark).
export default function Longhorns({
  className = "h-10 w-auto",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 140 64"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M58 27 C 42 24, 22 20, 5 6 C 8 18, 16 27, 30 32 C 40 35, 52 35, 59 33 Z" />
      <path d="M82 27 C 98 24, 118 20, 135 6 C 132 18, 124 27, 110 32 C 100 35, 88 35, 81 33 Z" />
      <path d="M60 32 C 54 33, 49 36, 46 40 C 52 40, 58 38, 62 36 Z" />
      <path d="M80 32 C 86 33, 91 36, 94 40 C 88 40, 82 38, 78 36 Z" />
      <path d="M61 26 C 64 22, 76 22, 79 26 C 80 36, 78 48, 73 56 C 71 59, 69 59, 67 56 C 62 48, 60 36, 61 26 Z" />
    </svg>
  );
}
