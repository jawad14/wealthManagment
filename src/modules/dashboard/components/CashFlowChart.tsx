import { formatMoney, type Money } from '@/shared/lib/money';
import type { CashFlowPoint } from '../model';

/** Geometry ported from the design prototype's inline chart. */
const VIEW_WIDTH = 640;
const VIEW_HEIGHT = 220;
const PLOT_TOP = 10;
const BASELINE_Y = 160;
const PLOT_HEIGHT = BASELINE_Y - PLOT_TOP;
const AXIS_X = 40;
const GROUP_WIDTH = 100;
const BAR_WIDTH = 30;
const GRID_INTERVALS = 3;

/** Round the axis maximum up to a clean $10k step so the gridlines stay legible. */
function niceMaximum(values: readonly number[]): number {
  const peak = Math.max(...values, 1);
  const step = 1_000_000; // $10,000 in cents
  return Math.max(Math.ceil(peak / step) * step, step);
}

function formatAxisTick(cents: number): string {
  return `$${Math.round(cents / 100_000)}k`;
}

export interface CashFlowChartProps {
  readonly points: readonly CashFlowPoint[];
  /** Caption under the chart explaining the basis and any one-offs. */
  readonly note: string | null;
}

/**
 * Grouped bar chart of monthly receipts against outgoings.
 *
 * Rendered as inline SVG using the design's own geometry and CSS variables, so
 * it repaints correctly in dark mode without any JavaScript.
 */
export function CashFlowChart({ points, note }: CashFlowChartProps) {
  const maxCents = niceMaximum(points.flatMap((point) => [point.receipts.cents, point.outgoings.cents]));
  const toY = (value: Money): number => BASELINE_Y - (value.cents / maxCents) * PLOT_HEIGHT;
  const toHeight = (value: Money): number => Math.max((value.cents / maxCents) * PLOT_HEIGHT, 0);

  const gridYs = Array.from({ length: GRID_INTERVALS + 1 }, (_, index) => PLOT_TOP + (PLOT_HEIGHT / GRID_INTERVALS) * index);
  const first = points[0]?.label ?? '';
  const last = points[points.length - 1]?.label ?? '';

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      role="img"
      aria-label={`Bar chart of monthly receipts and outgoings, ${first} to ${last}`}
    >
      <g fontSize="11" fill="var(--muted)" fontFamily="IBM Plex Sans, sans-serif">
        {gridYs.map((y, index) => (
          <text key={y} x="0" y={y + 4}>
            {formatAxisTick(maxCents - (maxCents / GRID_INTERVALS) * index)}
          </text>
        ))}
      </g>

      <g stroke="var(--line-2)">
        {gridYs.map((y) => (
          <line key={y} x1={AXIS_X} x2={VIEW_WIDTH} y1={y} y2={y} />
        ))}
      </g>

      <g>
        {points.map((point, index) => {
          const groupX = 62 + index * GROUP_WIDTH;
          return (
            <g key={point.month}>
              <rect
                x={groupX}
                y={toY(point.receipts)}
                width={BAR_WIDTH}
                height={toHeight(point.receipts)}
                rx="3"
                fill="var(--bar)"
              >
                <title>{`${point.label} receipts ${formatMoney(point.receipts)}`}</title>
              </rect>
              <rect
                x={groupX + 34}
                y={toY(point.outgoings)}
                width={BAR_WIDTH}
                height={toHeight(point.outgoings)}
                rx="3"
                fill="var(--gold)"
              >
                <title>{`${point.label} outgoings ${formatMoney(point.outgoings)}`}</title>
              </rect>
            </g>
          );
        })}
      </g>

      <g fontSize="11.5" fill="var(--muted)" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif">
        {points.map((point, index) => (
          <text key={point.month} x={94 + index * GROUP_WIDTH} y="185">
            {point.label}
          </text>
        ))}
      </g>

      <text x={AXIS_X} y="212" fontSize="11" fill="var(--faint)" fontFamily="IBM Plex Sans, sans-serif">
        {['Cash basis (BR-03) · transfers and loan drawdowns excluded', note].filter(Boolean).join(' · ')}
      </text>
    </svg>
  );
}
