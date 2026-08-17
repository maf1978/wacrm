/**
 * GutiDental brand mark — a minimal tooth glyph used in the sidebar,
 * auth pages, and anywhere the brand appears.
 */
export function ToothIcon({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2C9 2 6.5 3.8 5.2 6.5 4.3 8.4 3.8 10.6 4.5 13c.5 1.9 1 3.7 1.6 5.4.3.9.9 1.8 1.9 1.8 1.1 0 1.6-.9 1.9-1.8.3-.9.5-1.8 1.1-2.4.8-.8 1.9-.8 2.7 0 .6.6.8 1.5 1.1 2.4.3.9.8 1.8 1.9 1.8 1 0 1.6-.9 1.9-1.8.6-1.7 1.1-3.5 1.6-5.4.7-2.4.2-4.6-.7-6.5C17.5 3.8 15 2 12 2z" />
    </svg>
  );
}
