import { qrPath, QUIET_ZONE } from '@/lib/qr';

/** A square QR drawn as one SVG path — sharp on screen and in print at any size. */
export function QrCode({
  value,
  size = 160,
  className,
}: {
  value: string;
  size?: number | string;
  className?: string;
}) {
  const { size: modules, d } = qrPath(value);
  const full = modules + QUIET_ZONE * 2;

  return (
    <svg
      viewBox={`${-QUIET_ZONE} ${-QUIET_ZONE} ${full} ${full}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={className}
      role="img"
      aria-label="QR code"
    >
      <rect x={-QUIET_ZONE} y={-QUIET_ZONE} width={full} height={full} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
}
