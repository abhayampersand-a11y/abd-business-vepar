'use client';

import { useMemo, useState } from 'react';
import { formatAmountShort, parseISODate } from '@/lib/format';

type Point = { date: string; total: number };

/** The chart's one colour: the same warm gold as the ambient light. */
const GOLD = '#e0a91b';

/**
 * Small dependency-free area chart. The dashboard only ever plots one series,
 * so a hand-rolled SVG beats pulling in a charting library.
 */
export function SalesChart({
  data,
  from,
  to,
  height = 240,
}: {
  data: Point[];
  from: string;
  to: string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const series = useMemo(() => {
    // Fill every day in the window so gaps read as zero, not as missing.
    const byDate = new Map(data.map((d) => [d.date, d.total]));
    const out: Point[] = [];
    const start = parseISODate(from);
    const end = parseISODate(to);
    const cursor = new Date(start);
    let guard = 0;
    while (cursor <= end && guard < 400) {
      const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(
        cursor.getDate(),
      ).padStart(2, '0')}`;
      out.push({ date: iso, total: byDate.get(iso) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
      guard++;
    }
    return out;
  }, [data, from, to]);

  const width = 900;
  const padX = 42;
  const padY = 18;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2 - 22;

  const max = Math.max(1, ...series.map((s) => s.total));
  const niceMax = niceCeil(max);

  const x = (i: number) =>
    padX + (series.length <= 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
  const y = (v: number) => padY + innerH - (v / niceMax) * innerH;

  const linePath = series.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.total)}`).join(' ');
  const areaPath =
    series.length > 0
      ? `${linePath} L ${x(series.length - 1)} ${padY + innerH} L ${x(0)} ${padY + innerH} Z`
      : '';

  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((f) => niceMax * f);

  // Roughly six date labels, evenly spaced.
  const labelEvery = Math.max(1, Math.ceil(series.length / 6));

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="saleFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0.28" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
          </linearGradient>
          {/* A faint halo under the line so it reads as lit, not drawn. */}
          <filter id="saleGlow" x="-10%" y="-40%" width="120%" height="180%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
        </defs>

        {gridValues.map((v, i) => (
          <g key={i}>
            <line
              x1={padX}
              x2={width - padX}
              y1={y(v)}
              y2={y(v)}
              stroke="rgb(28 27 24 / 0.07)"
              strokeWidth="1"
              strokeDasharray={i === 0 ? undefined : '3 5'}
            />
            <text
              x={padX - 8}
              y={y(v) + 4}
              textAnchor="end"
              fontSize="10.5"
              fill="var(--color-ink-faint)"
            >
              {v >= 1000 ? `${Math.round(v / 1000)}k` : Math.round(v)}
            </text>
          </g>
        ))}

        {series.length > 1 && (
          <>
            <path d={areaPath} fill="url(#saleFill)" />
            <path
              d={linePath}
              fill="none"
              stroke={GOLD}
              strokeOpacity="0.45"
              strokeWidth="6"
              filter="url(#saleGlow)"
            />
            <path
              d={linePath}
              fill="none"
              stroke={GOLD}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        )}

        {series.map((p, i) =>
          p.total > 0 ? (
            <circle key={i} cx={x(i)} cy={y(p.total)} r="3.5" fill={GOLD} stroke="#fff" strokeWidth="1.5" />
          ) : null,
        )}

        {series.map((p, i) =>
          i % labelEvery === 0 ? (
            <text
              key={`l-${i}`}
              x={x(i)}
              y={height - 6}
              textAnchor="middle"
              fontSize="10.5"
              fill="var(--color-ink-faint)"
            >
              {formatTick(p.date)}
            </text>
          ) : null,
        )}

        {/* Invisible hover targets */}
        {series.map((p, i) => (
          <rect
            key={`h-${i}`}
            x={x(i) - innerW / Math.max(1, series.length) / 2}
            y={padY}
            width={innerW / Math.max(1, series.length)}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}

        {hover !== null && series[hover] && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={padY}
            y2={padY + innerH}
            stroke={GOLD}
            strokeOpacity="0.6"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}
      </svg>

      {hover !== null && series[hover] && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-xl bg-white/90 px-3 py-2 text-[11.5px] whitespace-nowrap text-ink shadow-[0_12px_28px_-14px_rgb(60_48_20/0.45)] ring-1 ring-white backdrop-blur"
          style={{ left: `${(x(hover) / width) * 100}%`, top: 4 }}
        >
          <div className="text-ink-faint">{formatTick(series[hover].date)}</div>
          <div className="mt-0.5 flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full" style={{ background: GOLD }} />
            Sales: {formatAmountShort(series[hover].total)}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTick(iso: string) {
  const d = parseISODate(iso);
  return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })}`;
}

/** Rounds an axis maximum up to a friendly number. */
function niceCeil(v: number) {
  if (v <= 1) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  const norm = v / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * mag;
}
