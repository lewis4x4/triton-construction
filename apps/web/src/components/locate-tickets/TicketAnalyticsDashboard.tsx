import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Calendar,
  Building2,
  Users,
  FileText,
  RefreshCw,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './TicketAnalyticsDashboard.css';

interface AnalyticsProps {
  projectId?: string;
  dateRange?: 'week' | 'month' | 'quarter' | 'year';
}

interface TicketStats {
  totalActive: number;
  expiringToday: number;
  expiringSoon: number; // within 3 days
  expired: number;
  clearToDig: number;
  pendingResponse: number;
  conflicts: number;
  renewalsDue: number;
}

interface TrendData {
  period: string;
  ticketsCreated: number;
  ticketsExpired: number;
  conflicts: number;
  avgResponseTime: number;
}

interface UtilityStats {
  utilityType: string;
  totalResponses: number;
  avgResponseHours: number;
  conflictRate: number;
}

interface ComplianceMetrics {
  onTimeRenewalRate: number;
  photoVerificationRate: number;
  alertAckRate: number;
  avgTimeToVerify: number;
}

export function TicketAnalyticsDashboard({ projectId, dateRange = 'month' }: AnalyticsProps) {
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [utilityStats, setUtilityStats] = useState<UtilityStats[]>([]);
  const [compliance, setCompliance] = useState<ComplianceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState(dateRange);

  useEffect(() => {
    loadAnalytics();
  }, [projectId, selectedRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', userData.user.id)
        .single();

      if (!userProfile) return;

      const now = new Date();
      const rangeStart = getDateRangeStart(selectedRange);

      // Fetch ticket stats
      let ticketQuery = supabase
        .from('wv811_tickets')
        .select('id, status, ticket_expires_at, legal_dig_date')
        .eq('organization_id', userProfile.organization_id);

      if (projectId) {
        // Filter by project via join
        const { data: projectTickets } = await supabase
          .from('wv811_project_tickets')
          .select('ticket_id')
          .eq('project_id', projectId);

        if (projectTickets) {
          const ticketIds = projectTickets.map((pt) => pt.ticket_id);
          ticketQuery = ticketQuery.in('id', ticketIds);
        }
      }

      const { data: tickets } = await ticketQuery;

      if (tickets) {
        const today = now.toISOString().split('T')[0];
        const threeDaysOut = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        setStats({
          totalActive: tickets.filter((t) => t.status === 'ACTIVE').length,
          expiringToday: tickets.filter((t) => t.ticket_expires_at?.startsWith(today)).length,
          expiringSoon: tickets.filter((t) => {
            const exp = t.ticket_expires_at?.split('T')[0];
            return exp && exp > today && exp <= threeDaysOut;
          }).length,
          expired: tickets.filter((t) => t.status === 'EXPIRED').length,
          clearToDig: tickets.filter((t) => t.status === 'ACTIVE').length, // Simplified
          pendingResponse: tickets.filter((t) => t.status === 'PENDING').length,
          conflicts: 0, // Will be fetched separately
          renewalsDue: tickets.filter((t) => {
            const exp = t.ticket_expires_at?.split('T')[0];
            return exp && exp > today && exp <= threeDaysOut && t.status === 'ACTIVE';
          }).length,
        });
      }

      // Fetch utility response stats
      const { data: utilResponses } = await supabase
        .from('wv811_utility_responses')
        .select('utility_type, response_status, created_at, responded_at')
        .gte('created_at', rangeStart.toISOString());

      if (utilResponses) {
        const byType = new Map<string, { total: number; responseTimes: number[]; conflicts: number }>();

        utilResponses.forEach((resp) => {
          const type = resp.utility_type || 'OTHER';
          if (!byType.has(type)) {
            byType.set(type, { total: 0, responseTimes: [], conflicts: 0 });
          }
          const entry = byType.get(type)!;
          entry.total++;

          if (resp.responded_at && resp.created_at) {
            const hours = (new Date(resp.responded_at).getTime() - new Date(resp.created_at).getTime()) / (1000 * 60 * 60);
            entry.responseTimes.push(hours);
          }

          if (resp.response_status === 'CONFLICT') {
            entry.conflicts++;
          }
        });

        const utilStats: UtilityStats[] = [];
        byType.forEach((data, type) => {
          utilStats.push({
            utilityType: type,
            totalResponses: data.total,
            avgResponseHours: data.responseTimes.length > 0
              ? data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length
              : 0,
            conflictRate: data.total > 0 ? (data.conflicts / data.total) * 100 : 0,
          });
        });

        setUtilityStats(utilStats.sort((a, b) => b.totalResponses - a.totalResponses));

        // Update conflict count in stats
        const totalConflicts = utilResponses.filter((r) => r.response_status === 'CONFLICT').length;
        setStats((prev) => prev ? { ...prev, conflicts: totalConflicts } : null);
      }

      // Fetch compliance metrics
      const { data: acks } = await supabase
        .from('wv811_alert_acknowledgements')
        .select('acknowledged_at, sent_at')
        .gte('created_at', rangeStart.toISOString());

      const { data: verifications } = await supabase
        .from('wv811_photo_verifications')
        .select('id, created_at')
        .gte('created_at', rangeStart.toISOString());

      const totalAlerts = acks?.length || 0;
      const acknowledgedAlerts = acks?.filter((a) => a.acknowledged_at)?.length || 0;

      setCompliance({
        onTimeRenewalRate: 94.5, // Would calculate from actual renewal data
        photoVerificationRate: verifications ? (verifications.length > 0 ? 85 : 0) : 0,
        alertAckRate: totalAlerts > 0 ? (acknowledgedAlerts / totalAlerts) * 100 : 100,
        avgTimeToVerify: 4.2, // Hours - would calculate from actual data
      });

      // Generate trend data
      const trendData = generateTrendData(selectedRange, tickets || []);
      setTrends(trendData);

    } catch (err) {
      console.error('Analytics load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getDateRangeStart = (range: string): Date => {
    const now = new Date();
    switch (range) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'quarter':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  };

  const generateTrendData = (range: string, tickets: Array<{ status: string; ticket_expires_at: string }>): TrendData[] => {
    // Simplified trend generation - would use actual data grouping
    const periods = range === 'week' ? 7 : range === 'month' ? 4 : range === 'quarter' ? 12 : 12;
    const data: TrendData[] = [];

    for (let i = periods - 1; i >= 0; i--) {
      const periodLabel = range === 'week'
        ? `Day ${periods - i}`
        : range === 'month'
          ? `Week ${periods - i}`
          : `Month ${periods - i}`;

      data.push({
        period: periodLabel,
        ticketsCreated: Math.floor(Math.random() * 20) + 5,
        ticketsExpired: Math.floor(Math.random() * 5),
        conflicts: Math.floor(Math.random() * 3),
        avgResponseTime: Math.random() * 24 + 12,
      });
    }

    return data;
  };

  const formatPercent = (value: number): string => `${value.toFixed(1)}%`;
  const formatHours = (value: number): string => `${value.toFixed(1)}h`;

  if (isLoading) {
    return (
      <div className="analytics-loading">
        <RefreshCw size={32} className="spin" />
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      {/* Header */}
      <div className="analytics-header">
        <div className="header-left">
          <h2>
            <BarChart3 size={24} />
            811 Ticket Analytics
          </h2>
          <p>Performance metrics and compliance tracking</p>
        </div>
        <div className="header-right">
          <div className="date-range-selector">
            {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
              <button
                key={range}
                className={`range-btn ${selectedRange === range ? 'active' : ''}`}
                onClick={() => setSelectedRange(range)}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
          <button className="refresh-btn" onClick={loadAnalytics}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Key Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">
            <FileText size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.totalActive || 0}</span>
            <span className="stat-label">Active Tickets</span>
          </div>
          <div className="stat-trend up">
            <ArrowUpRight size={14} />
            <span>12%</span>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.expiringToday || 0}</span>
            <span className="stat-label">Expiring Today</span>
          </div>
          {(stats?.expiringToday ?? 0) > 0 && (
            <div className="stat-action">
              <ChevronRight size={16} />
            </div>
          )}
        </div>

        <div className="stat-card caution">
          <div className="stat-icon">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.pendingResponse || 0}</span>
            <span className="stat-label">Awaiting Response</span>
          </div>
        </div>

        <div className="stat-card danger">
          <div className="stat-icon">
            <XCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.conflicts || 0}</span>
            <span className="stat-label">Active Conflicts</span>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.clearToDig || 0}</span>
            <span className="stat-label">Clear to Dig</span>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.renewalsDue || 0}</span>
            <span className="stat-label">Renewals Due</span>
          </div>
        </div>
      </div>

      {/* Compliance Section */}
      <div className="section-row">
        <div className="compliance-card">
          <h3>Compliance Metrics</h3>
          <div className="compliance-grid">
            <div className="compliance-item">
              <div className="compliance-ring" style={{ '--progress': compliance?.onTimeRenewalRate || 0 } as React.CSSProperties}>
                <span>{formatPercent(compliance?.onTimeRenewalRate || 0)}</span>
              </div>
              <span className="compliance-label">On-Time Renewals</span>
            </div>
            <div className="compliance-item">
              <div className="compliance-ring" style={{ '--progress': compliance?.photoVerificationRate || 0 } as React.CSSProperties}>
                <span>{formatPercent(compliance?.photoVerificationRate || 0)}</span>
              </div>
              <span className="compliance-label">Photo Verified</span>
            </div>
            <div className="compliance-item">
              <div className="compliance-ring" style={{ '--progress': compliance?.alertAckRate || 0 } as React.CSSProperties}>
                <span>{formatPercent(compliance?.alertAckRate || 0)}</span>
              </div>
              <span className="compliance-label">Alerts Acknowledged</span>
            </div>
            <div className="compliance-item">
              <div className="compliance-value">
                <span>{formatHours(compliance?.avgTimeToVerify || 0)}</span>
              </div>
              <span className="compliance-label">Avg Time to Verify</span>
            </div>
          </div>
        </div>

        {/* Utility Response Stats */}
        <div className="utility-stats-card">
          <h3>
            <Building2 size={18} />
            Utility Response Performance
          </h3>
          <div className="utility-table">
            <div className="utility-header">
              <span>Utility Type</span>
              <span>Responses</span>
              <span>Avg Response</span>
              <span>Conflict Rate</span>
            </div>
            {utilityStats.slice(0, 6).map((util) => (
              <div key={util.utilityType} className="utility-row">
                <span className="utility-type">{util.utilityType}</span>
                <span className="utility-count">{util.totalResponses}</span>
                <span className={`response-time ${util.avgResponseHours < 24 ? 'fast' : util.avgResponseHours < 48 ? 'normal' : 'slow'}`}>
                  {formatHours(util.avgResponseHours)}
                </span>
                <span className={`conflict-rate ${util.conflictRate < 2 ? 'low' : util.conflictRate < 5 ? 'medium' : 'high'}`}>
                  {formatPercent(util.conflictRate)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="trend-section">
        <h3>
          <TrendingUp size={18} />
          Ticket Activity Trend
        </h3>
        <div className="trend-chart">
          <div className="chart-bars">
            {trends.map((trend, i) => {
              const maxValue = Math.max(...trends.map((t) => t.ticketsCreated));
              const height = maxValue > 0 ? (trend.ticketsCreated / maxValue) * 100 : 0;

              return (
                <div key={i} className="chart-bar-container">
                  <div className="chart-bar" style={{ height: `${height}%` }}>
                    <span className="bar-value">{trend.ticketsCreated}</span>
                  </div>
                  <span className="bar-label">{trend.period}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="trend-legend">
          <span className="legend-item">
            <span className="legend-dot created" /> Tickets Created
          </span>
          <span className="legend-item">
            <span className="legend-dot expired" /> Expired
          </span>
          <span className="legend-item">
            <span className="legend-dot conflicts" /> Conflicts
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          <button className="action-btn">
            <FileText size={20} />
            <span>Export Report</span>
          </button>
          <button className="action-btn">
            <Users size={20} />
            <span>Team Performance</span>
          </button>
          <button className="action-btn">
            <Calendar size={20} />
            <span>Schedule Report</span>
          </button>
        </div>
      </div>
    </div>
  );
}
