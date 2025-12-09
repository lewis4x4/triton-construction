import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';

interface DataPoint {
  date: string;
  value: number;
  label?: string;
}

interface KPITrendChartProps {
  title: string;
  data: DataPoint[];
  unit?: string;
  color?: string;
  target?: number;
  showTrend?: boolean;
  height?: number;
  timeRange?: '7d' | '30d' | '90d' | '1y';
  onTimeRangeChange?: (range: '7d' | '30d' | '90d' | '1y') => void;
}

export function KPITrendChart({
  title,
  data,
  unit = '',
  color = '#2EC4B6',
  target,
  showTrend = true,
  height = 200,
  timeRange = '30d',
  onTimeRangeChange,
}: KPITrendChartProps) {
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);

  useEffect(() => {
    if (!containerRef) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef);
    return () => observer.disconnect();
  }, [containerRef]);

  if (!data || data.length === 0) {
    return (
      <div className="gravity-card p-6 flex flex-col justify-center items-center h-[300px]">
        <h3 className="text-sm font-medium text-secondary mb-4">{title}</h3>
        <div className="flex items-center justify-center text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  // Calculate stats
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const latest = values[values.length - 1] ?? 0;
  const previous = values.length > 1 ? (values[values.length - 2] ?? latest) : latest;
  const percentChange = previous !== 0 ? ((latest - previous) / previous) * 100 : 0;
  const trend = percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'flat';

  // Chart Dimensions
  const padding = { top: 20, right: 20, bottom: 40, left: 0 }; // Reduced left padding to maximize space
  const chartHeight = height;
  const chartWidth = width || 100; // Fallback
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const innerWidth = chartWidth - padding.left - padding.right;

  // Scale functions
  const range = max - min || 1;
  // Add 10% padding to Y range so top/bottom points aren't cut off
  const paddedMin = min - (range * 0.1);
  const paddedRange = range * 1.2;

  const yScale = (value: number) =>
    padding.top + innerHeight - ((value - paddedMin) / paddedRange) * innerHeight;

  const xScale = (index: number) =>
    padding.left + (index / (data.length - 1)) * innerWidth;

  // Generate paths
  // Use simple straight lines for clear data representation
  const pathD = data
    .map((point, i) => {
      const x = xScale(i);
      const y = yScale(point.value);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  const areaD = `${pathD} L ${xScale(data.length - 1)} ${chartHeight - padding.bottom} L ${padding.left} ${chartHeight - padding.bottom} Z`;

  const targetY = target !== undefined ? yScale(target) : null;

  const timeRanges = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '1y', label: '1 Year' },
  ];

  return (
    <div className="gravity-card p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-xs font-bold text-secondary uppercase tracking-widest">{title}</h3>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold font-mono text-white tracking-tighter drop-shadow-md">
              {latest.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            {unit && <span className="text-sm font-mono text-secondary">{unit}</span>}
          </div>
          {showTrend && (
            <div className={`flex items-center gap-1 mt-1 text-xs font-mono font-bold ${trend === 'up' ? 'text-neon-cyan' :
              trend === 'down' ? 'text-neon-orange' :
                'text-secondary'
              }`}>
              {trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> :
                trend === 'down' ? <TrendingDown className="w-3.5 h-3.5" /> : null}
              <span>
                {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%
              </span>
              <span className="text-gray-500 font-normal ml-1">vs prev</span>
            </div>
          )}
        </div>

        {/* Time Range */}
        {onTimeRangeChange && (
          <div className="relative">
            <select
              value={timeRange}
              onChange={e => onTimeRangeChange(e.target.value as any)}
              className="appearance-none pl-3 pr-8 py-1.5 text-xs font-medium border border-white/10 rounded-lg bg-white/5 text-gray-300 cursor-pointer focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 hover:bg-white/10 transition-colors"
            >
              {timeRanges.map(r => (
                <option key={r.value} value={r.value} className="bg-[#0A0C14] text-gray-300">{r.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Chart Container */}
      <div className="relative flex-1 min-h-[200px]" ref={setContainerRef}>
        {width > 0 && (
          <>
            <svg width={width} height={chartHeight} className="overflow-visible">
              <defs>
                <linearGradient id={`gradient-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                const y = padding.top + innerHeight * t;
                return (
                  <line
                    key={t}
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Target Line */}
              {targetY !== null && (
                <g>
                  <line
                    x1={padding.left}
                    y1={targetY}
                    x2={width - padding.right}
                    y2={targetY}
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={width - padding.right}
                    y={targetY - 6}
                    textAnchor="end"
                    fill="#94A3B8"
                    fontSize="10"
                    className="font-mono"
                  >
                    Target: {target}
                  </text>
                </g>
              )}

              {/* Area */}
              <path d={areaD} fill={`url(#gradient-${title.replace(/\s+/g, '')})`} />

              {/* Line */}
              <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth="2"
                className="drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]"
              />

              {/* Interactive Points */}
              {data.map((point, i) => (
                <g key={i} onMouseEnter={() => setHoveredPoint(point)} onMouseLeave={() => setHoveredPoint(null)}>
                  {/* Invisible Hit Area */}
                  <circle
                    cx={xScale(i)}
                    cy={yScale(point.value)}
                    r="12"
                    fill="transparent"
                    className="cursor-crosshair"
                  />
                  {/* Visible Dot on Hover */}
                  {hoveredPoint === point && (
                    <circle
                      cx={xScale(i)}
                      cy={yScale(point.value)}
                      r="4"
                      fill="#fff"
                      stroke={color}
                      strokeWidth="2"
                    />
                  )}
                </g>
              ))}
            </svg>

            {/* Tooltip */}
            {hoveredPoint && (
              <div
                className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 bg-[#0F1219]/90 border border-white/20 backdrop-blur-md text-white text-xs rounded px-3 py-2 shadow-xl z-10"
                style={{
                  left: xScale(data.indexOf(hoveredPoint)),
                  top: yScale(hoveredPoint.value) - 10,
                }}
              >
                <div className="font-bold font-mono text-center">
                  {hoveredPoint.value.toLocaleString()} {unit}
                </div>
                <div className="text-gray-400 text-[10px] text-center">{hoveredPoint.date}</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Stats Footer */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5 text-xs font-mono opacity-60">
        <div>
          Avg: <span className="font-bold text-gray-300 ml-1">{avg.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
        </div>
        <div>
          Min: <span className="font-bold text-gray-300 ml-1">{min.toLocaleString()}</span>
        </div>
        <div>
          Max: <span className="font-bold text-gray-300 ml-1">{max.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

export default KPITrendChart;
