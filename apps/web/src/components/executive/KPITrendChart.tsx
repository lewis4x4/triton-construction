import { useState } from 'react';
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
  color = '#3B82F6',
  target,
  showTrend = true,
  height = 200,
  timeRange = '30d',
  onTimeRangeChange,
}: KPITrendChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-48 text-gray-400">
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

  // Chart dimensions
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartHeight = height;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Scale values
  const range = max - min || 1;
  const yScale = (value: number) =>
    padding.top + innerHeight - ((value - min) / range) * innerHeight;
  const xScale = (index: number) =>
    padding.left + (index / (data.length - 1)) * (100 - padding.left - padding.right);

  // Generate path
  const pathD = data
    .map((point, i) => {
      const x = xScale(i);
      const y = yScale(point.value);
      return `${i === 0 ? 'M' : 'L'} ${x}% ${y}`;
    })
    .join(' ');

  // Area path
  const areaD = `${pathD} L ${xScale(data.length - 1)}% ${chartHeight - padding.bottom} L ${padding.left}% ${chartHeight - padding.bottom} Z`;

  // Target line
  const targetY = target !== undefined ? yScale(target) : null;

  const timeRanges = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '1y', label: '1 Year' },
  ];

  return (
    <div className="bg-white rounded-lg border p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700">{title}</h3>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-gray-900">
              {latest.toLocaleString()}
            </span>
            {unit && <span className="text-sm text-gray-500">{unit}</span>}
          </div>
          {showTrend && (
            <div className={`flex items-center gap-1 mt-1 text-sm ${
              trend === 'up' ? 'text-green-600' :
              trend === 'down' ? 'text-red-600' :
              'text-gray-500'
            }`}>
              {trend === 'up' ? <TrendingUp className="w-4 h-4" /> :
               trend === 'down' ? <TrendingDown className="w-4 h-4" /> : null}
              <span>
                {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%
              </span>
              <span className="text-gray-400">vs previous</span>
            </div>
          )}
        </div>

        {/* Time Range Selector */}
        {onTimeRangeChange && (
          <div className="relative">
            <select
              value={timeRange}
              onChange={e => onTimeRangeChange(e.target.value as any)}
              className="appearance-none pl-3 pr-8 py-1.5 text-sm border rounded-lg bg-white cursor-pointer focus:ring-2 focus:ring-blue-500"
            >
              {timeRanges.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="relative" style={{ height: chartHeight }}>
        <svg
          viewBox={`0 0 100 ${chartHeight}`}
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Area fill */}
          <path
            d={areaD}
            fill={`${color}20`}
            stroke="none"
          />

          {/* Target line */}
          {targetY !== null && (
            <>
              <line
                x1={`${padding.left}%`}
                y1={targetY}
                x2={`${100 - padding.right}%`}
                y2={targetY}
                stroke="#9CA3AF"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={`${100 - padding.right + 1}%`}
                y={targetY}
                fill="#6B7280"
                fontSize="8"
                dominantBaseline="middle"
              >
                Target
              </text>
            </>
          )}

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />

          {/* Data points */}
          {data.map((point, i) => (
            <circle
              key={i}
              cx={`${xScale(i)}%`}
              cy={yScale(point.value)}
              r="4"
              fill="white"
              stroke={color}
              strokeWidth="2"
              className="cursor-pointer hover:r-6"
              onMouseEnter={() => setHoveredPoint(point)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}

          {/* Y-axis labels */}
          <text x="2%" y={padding.top} fill="#9CA3AF" fontSize="8" dominantBaseline="middle">
            {max.toLocaleString()}
          </text>
          <text x="2%" y={chartHeight - padding.bottom} fill="#9CA3AF" fontSize="8" dominantBaseline="middle">
            {min.toLocaleString()}
          </text>
        </svg>

        {/* Tooltip */}
        {hoveredPoint && (
          <div className="absolute bg-gray-900 text-white text-xs rounded px-2 py-1 pointer-events-none transform -translate-x-1/2"
            style={{
              left: '50%',
              top: '10px',
            }}
          >
            <div className="font-medium">{hoveredPoint.value.toLocaleString()} {unit}</div>
            <div className="text-gray-400">{hoveredPoint.date}</div>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm">
        <div className="text-gray-500">
          Avg: <span className="font-medium text-gray-700">{avg.toFixed(1)}</span>
        </div>
        <div className="text-gray-500">
          Min: <span className="font-medium text-gray-700">{min.toLocaleString()}</span>
        </div>
        <div className="text-gray-500">
          Max: <span className="font-medium text-gray-700">{max.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

export default KPITrendChart;
