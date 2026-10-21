import { useState } from 'react';
import type { ChartPoint } from '@/types/report';

type ChartProps = { data: ChartPoint[]; format?: (v: number) => string; height?: number };

export function BarChart({ data, format = String, height = 200 }: ChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div className="bar-chart" style={{ height }}>
      {data.map((d, i) => (
        <div
          key={`${d.label}-${i}`}
          className="bar-col"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
          title={`${d.label}: ${format(d.value)}`}
        >
          {hover === i && <div className="bar-tip">{format(d.value)}</div>}
          <div className="bar" style={{ height: `${(d.value / max) * 100}%` }} />
          <div className="bar-label">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

export function HBars({ data, format = String }: ChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="hbars">
      {data.map((d) => (
        <div key={d.label} className="hbar-row">
          <div className="hbar-top">
            <span>{d.label}</span>
            <strong>{format(d.value)}</strong>
          </div>
          <div className="hbar-track">
            <div className="hbar" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
