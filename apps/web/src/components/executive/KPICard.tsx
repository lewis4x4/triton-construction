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
  const statusConfig = {
    good: { border: 'border-cyan-500/30', bg: 'bg-cyan-500/5', text: 'text-cyan-400', icon: 'text-cyan-400' },
    warning: { border: 'border-yellow-500/30', bg: 'bg-yellow-500/5', text: 'text-yellow-400', icon: 'text-yellow-400' },
    critical: { border: 'border-red-500/30', bg: 'bg-red-500/5', text: 'text-red-400', icon: 'text-red-400' },
    neutral: { border: 'border-white/10', bg: 'bg-white/5', text: 'text-primary', icon: 'text-secondary' },
  };

  const currentStatus = statusConfig[status];

  const trendColors = {
    up: trendIsGood ? 'text-cyan-400' : 'text-red-400',
    down: trendIsGood ? 'text-red-400' : 'text-cyan-400',
    flat: 'text-secondary',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  if (compact) {
    return (
      <div
        className={`gravity-card p-4 border ${currentStatus.border} ${currentStatus.bg} ${onClick ? 'cursor-pointer hover:border-white/20' : ''}`}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-secondary uppercase tracking-wider">{title}</div>
          {icon && <div className={`${currentStatus.icon} opacity-80`}>{icon}</div>}
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-2xl font-bold font-mono text-white tracking-tight">{value}</span>
          {unit && <span className="text-xs text-secondary font-mono">{unit}</span>}
        </div>
        {percentChange !== undefined && trend && (
          <div className={`flex items-center gap-1 mt-1 text-xs font-mono ${trendColors[trend]}`}>
            <TrendIcon className="w-3 h-3" />
            <span>{Math.abs(percentChange).toFixed(1)}%</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`gravity-card p-6 border ${currentStatus.border} ${currentStatus.bg} ${onClick ? 'cursor-pointer hover:border-white/30 transition-all' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-secondary uppercase tracking-widest">{title}</h3>
            {description && (
              <div className="group relative">
                <Info className="w-3 h-3 text-secondary/50 cursor-help hover:text-primary transition-colors" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-void-mid border border-white/10 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl backdrop-blur-md">
                  {description}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-bold text-white font-mono tracking-tighter drop-shadow-md">{value}</span>
            {unit && <span className="text-sm text-secondary font-mono">{unit}</span>}
          </div>
        </div>
        {icon && (
          <div className={`p-3 rounded-lg border border-white/5 ${status === 'good' ? 'bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]' :
              status === 'warning' ? 'bg-yellow-500/10 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.2)]' :
                status === 'critical' ? 'bg-red-500/10 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]' :
                  'bg-white/5 text-gray-400'
            }`}>
            {icon}
          </div>
        )}
      </div>

      {/* Trend & Target */}
      <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/5">
        {percentChange !== undefined && trend ? (
          <div className={`flex items-center gap-1.5 ${trendColors[trend]} bg-black/20 px-2 py-1 rounded text-xs font-mono`}>
            <TrendIcon className="w-3.5 h-3.5" />
            <span className="font-bold">
              {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%
            </span>
            <span className="text-gray-500 opacity-60 ml-1">vs prev</span>
          </div>
        ) : (
          <div />
        )}

        {target !== undefined && (
          <div className="text-xs text-gray-500 font-mono">
            Target: <span className="text-gray-300">{target}{unit}</span>
          </div>
        )}
      </div>

      {/* Progress toward target */}
      {target !== undefined && typeof value === 'number' && (
        <div className="mt-3">
          <div className="h-1.5 bg-gray-700/30 rounded-full overflow-hidden backdrop-blur-sm">
            <div
              className={`h-full rounded-full transition-all relative ${(value / target) >= 1 ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]' :
                  (value / target) >= 0.8 ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]' :
                    'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                }`}
              style={{ width: `${Math.min((value / target) * 100, 100)}%` }}
            >
              <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white/50" />
            </div>
          </div>
        </div>
      )}

      {/* Status Indicator */}
      {status !== 'neutral' && (
        <div className={`flex items-center gap-2 mt-3 text-xs font-bold uppercase tracking-wider ${currentStatus.text}`}>
          {status === 'critical' && <AlertTriangle className="w-3.5 h-3.5" />}
          <span>
            {status === 'good' ? 'On Track' :
              status === 'warning' ? 'Needs Attention' :
                'Critical Action Required'}
          </span>
        </div>
      )}
    </div>
  );
}

export default KPICard;
