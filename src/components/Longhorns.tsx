// Longhorn logo (John-supplied image, white background knocked out to
// transparency so it sits clean on the dark theme).
export default function Longhorns({
  className = "h-12 w-auto",
}: {
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/longhorn-logo.png"
      alt="Longhorns"
      className={className}
      draggable={false}
    />
  );
}
