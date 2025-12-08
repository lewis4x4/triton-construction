import { TrendingUp, TrendingDown, Minus, AlertTriangle, Info } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  target?: number;
  previousValue?: number;
  trend?: 'up' | 'down' | 'flat';
  trendIsGood?: boolean;
  percentChange?: number;
  icon?: React.ReactNode;
  description?: string;
  status?: 'good' | 'warning' | 'critical' | 'neutral';
  onClick?: () => void;
  compact?: boolean;
}

export function KPICard({
  title,
  value,
  unit,
  target,
  previousValue: _previousValue,
  trend,
  trendIsGood = true,
  percentChange,
  icon,
  description,
  status = 'neutral',
  onClick,
  compact = false,
}: KPICardProps) {
  const statusColors = {
    good: 'border-green-200 bg-green-50',
    warning: 'border-yellow-200 bg-yellow-50',
    critical: 'border-red-200 bg-red-50',
    neutral: 'border-gray-200 bg-white',
  };

  const trendColors = {
    up: trendIsGood ? 'text-green-600' : 'text-red-600',
    down: trendIsGood ? 'text-red-600' : 'text-green-600',
    flat: 'text-gray-500',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  if (compact) {
    return (
      <div
        className={`p-4 rounded-lg border ${statusColors[status]} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">{title}</div>
          {icon && <div className="text-gray-400">{icon}</div>}
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold text-gray-900">{value}</span>
          {unit && <span className="text-sm text-gray-500">{unit}</span>}
        </div>
        {percentChange !== undefined && trend && (
          <div className={`flex items-center gap-1 mt-1 text-xs ${trendColors[trend]}`}>
            <TrendIcon className="w-3 h-3" />
            <span>{Math.abs(percentChange).toFixed(1)}%</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`p-6 rounded-xl border ${statusColors[status]} ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-gray-600">{title}</h3>
            {description && (
              <div className="group relative">
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  {description}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-gray-900">{value}</span>
            {unit && <span className="text-lg text-gray-500">{unit}</span>}
          </div>
        </div>
        {icon && (
          <div className={`p-3 rounded-lg ${
            status === 'good' ? 'bg-green-100 text-green-600' :
            status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
            status === 'critical' ? 'bg-red-100 text-red-600' :
            'bg-gray-100 text-gray-600'
          }`}>
            {icon}
          </div>
        )}
      </div>

      {/* Trend & Target */}
      <div className="flex items-center justify-between mt-4">
        {percentChange !== undefined && trend ? (
          <div className={`flex items-center gap-1 ${trendColors[trend]}`}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-sm font-medium">
              {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%
            </span>
            <span className="text-xs text-gray-500 ml-1">vs last period</span>
          </div>
        ) : (
          <div />
        )}

        {target !== undefined && (
          <div className="text-sm text-gray-500">
            Target: <span className="font-medium text-gray-700">{target}{unit}</span>
          </div>
        )}
      </div>

      {/* Progress toward target */}
      {target !== undefined && typeof value === 'number' && (
        <div className="mt-3">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                (value / target) >= 1 ? 'bg-green-500' :
                (value / target) >= 0.8 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${Math.min((value / target) * 100, 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {((value / target) * 100).toFixed(0)}% of target
          </div>
        </div>
      )}

      {/* Status Indicator */}
      {status !== 'neutral' && (
        <div className={`flex items-center gap-2 mt-4 pt-4 border-t text-sm ${
          status === 'good' ? 'text-green-700 border-green-200' :
          status === 'warning' ? 'text-yellow-700 border-yellow-200' :
          'text-red-700 border-red-200'
        }`}>
          {status === 'critical' && <AlertTriangle className="w-4 h-4" />}
          <span>
            {status === 'good' ? 'On track' :
             status === 'warning' ? 'Needs attention' :
             'Requires action'}
          </span>
        </div>
      )}
    </div>
  );
}

export default KPICard;
