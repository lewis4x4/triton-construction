import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  MapPin,
  Camera,
  Building,
  RefreshCw,
  FileText,
  Zap,
  Target,
  Activity,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { supabase } from '@triton/supabase-client';
import './AnalyticsDashboard.css';

// Types
interface ComplianceMetrics {
  totalActiveTickets: number;
  fullyDocumented: number;
  partiallyDocumented: number;
  noPhotos: number;
  evidenceCoverageRatio: number;
}

interface SilentAssentMetrics {
  silentAssent: number;
  positiveResponse: number;
  manualClear: number;
  total: number;
}

interface PhotoBreakdown {
  category: string;
  count: number;
  percentage: number;
}

interface MobilizationBlocker {
  id: string;
  ticket_number: string;
  project_name: string;
  dig_site_address: string;
  status: string;
  scheduled_start: string;
  reason: string;
}

interface TicketChurn {
  ticketNumber: string;
  renewalCount: number;
  daysSinceCreated: number;
  hasRestoration: boolean;
}

interface TimeToGreen {
  county: string;
  avgHours: number;
  ticketCount: number;
}

interface UtilityScore {
  utilityName: string;
  totalTickets: number;
  conflicts: number;
  resends: number;
  avgResponseTime: number;
  score: number;
}

interface StrikeDensity {
  lat: number;
  lng: number;
  county: string;
  count: number;
}

interface AnalyticsData {
  compliance: ComplianceMetrics;
  silentAssent: SilentAssentMetrics;
  photoBreakdown: PhotoBreakdown[];
  mobilizationBlockers: MobilizationBlocker[];
  ticketChurn: TicketChurn[];
  timeToGreen: TimeToGreen[];
  utilityScores: UtilityScore[];
  strikeDensity: StrikeDensity[];
  weeklyTrend: { week: string; tickets: number; resolved: number }[];
}

const COLORS = {
  green: '#10b981',
  yellow: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  gray: '#6b7280',
  orange: '#f97316',
  cyan: '#06b6d4',
};

const PIE_COLORS = [COLORS.green, COLORS.yellow, COLORS.red];

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'compliance' | 'operations' | 'vendors' | 'trends'>('compliance');

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all tickets with photos
      const { data: tickets, error: ticketsError } = await supabase
        .from('wv811_tickets')
        .select(`
          id,
          ticket_number,
          status,
          dig_site_address,
          dig_site_city,
          county,
          created_at,
          ticket_expires_at,
          legal_dig_date,
          work_date,
          done_for,
          excavator_company,
          cleared_at,
          cleared_method
        `)
        .not('status', 'eq', 'CANCELLED');

      if (ticketsError) throw ticketsError;

      // Fetch photos with categories
      const { data: photos, error: photosError } = await supabase
        .from('wv811_ticket_photos')
        .select('ticket_id, category, ai_categories');

      if (photosError) throw photosError;

      // Fetch utility responses
      const { data: utilities, error: utilitiesError } = await supabase
        .from('wv811_ticket_utilities')
        .select('ticket_id, utility_name, response_status, response_date, created_at');

      if (utilitiesError) throw utilitiesError;

      // Process the data
      const allTickets = tickets || [];
      const allPhotos = photos || [];
      const allUtilities = utilities || [];

      // Build photo map by ticket
      const photosByTicket = new Map<string, typeof allPhotos>();
      allPhotos.forEach(photo => {
        const existing = photosByTicket.get(photo.ticket_id) || [];
        existing.push(photo);
        photosByTicket.set(photo.ticket_id, existing);
      });

      // 1. COMPLIANCE METRICS
      const activeTickets = allTickets.filter(t =>
        ['ACTIVE', 'PENDING', 'GREEN', 'CLEAR_TO_DIG'].includes(t.status)
      );

      let fullyDocumented = 0;
      let partiallyDocumented = 0;
      let noPhotos = 0;

      activeTickets.forEach(ticket => {
        const ticketPhotos = photosByTicket.get(ticket.id) || [];
        if (ticketPhotos.length === 0) {
          noPhotos++;
        } else {
          // Check for evidence photos (white lines, paint marks)
          const categories = ticketPhotos.flatMap(p =>
            p.ai_categories || [p.category]
          ).filter(Boolean);

          const hasWhiteLines = categories.some(c =>
            c?.toLowerCase().includes('white') || c?.toLowerCase().includes('line')
          );
          const hasPaintMarks = categories.some(c =>
            c?.toLowerCase().includes('paint') || c?.toLowerCase().includes('mark')
          );

          if (hasWhiteLines && hasPaintMarks) {
            fullyDocumented++;
          } else {
            partiallyDocumented++;
          }
        }
      });

      const compliance: ComplianceMetrics = {
        totalActiveTickets: activeTickets.length,
        fullyDocumented,
        partiallyDocumented,
        noPhotos,
        evidenceCoverageRatio: activeTickets.length > 0
          ? Math.round((fullyDocumented / activeTickets.length) * 100)
          : 0,
      };

      // 2. SILENT ASSENT METRICS
      const clearedTickets = allTickets.filter(t =>
        ['GREEN', 'CLEAR', 'CLEAR_TO_DIG', 'EXPIRED'].includes(t.status)
      );

      const silentAssent: SilentAssentMetrics = {
        silentAssent: clearedTickets.filter(t => t.cleared_method === 'TIME_EXPIRATION' || t.cleared_method === 'SILENT_ASSENT').length,
        positiveResponse: clearedTickets.filter(t => t.cleared_method === 'POSITIVE_RESPONSE' || t.cleared_method === 'UTILITY_RESPONSE').length,
        manualClear: clearedTickets.filter(t => t.cleared_method === 'MANUAL' || !t.cleared_method).length,
        total: clearedTickets.length,
      };

      // 3. PHOTO BREAKDOWN
      const categoryCount = new Map<string, number>();
      allPhotos.forEach(photo => {
        const categories = photo.ai_categories || [photo.category || 'Uncategorized'];
        categories.forEach((cat: string) => {
          categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
        });
      });

      const totalPhotos = allPhotos.length;
      const photoBreakdown: PhotoBreakdown[] = Array.from(categoryCount.entries())
        .map(([category, count]) => ({
          category,
          count,
          percentage: totalPhotos > 0 ? Math.round((count / totalPhotos) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);

      // 4. MOBILIZATION BLOCKERS
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const mobilizationBlockers: MobilizationBlocker[] = allTickets
        .filter(t => {
          const workDate = t.work_date ? new Date(t.work_date) : null;
          return workDate && workDate <= tomorrow && !['GREEN', 'CLEAR', 'CLEAR_TO_DIG'].includes(t.status);
        })
        .map(t => ({
          id: t.id,
          ticket_number: t.ticket_number,
          project_name: t.done_for || 'Unknown Project',
          dig_site_address: t.dig_site_address,
          status: t.status,
          scheduled_start: t.work_date,
          reason: t.status === 'PENDING' ? 'Awaiting Utility Response'
                : t.status === 'CONFLICT' ? 'Utility Conflict'
                : 'Not Yet Cleared',
        }))
        .slice(0, 10);

      // 5. TICKET CHURN (Stale tickets)
      const ticketChurn: TicketChurn[] = allTickets
        .filter(t => ['ACTIVE', 'PENDING'].includes(t.status))
        .map(t => {
          const daysSince = Math.floor(
            (Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          const ticketPhotos = photosByTicket.get(t.id) || [];
          const hasRestoration = ticketPhotos.some(p =>
            p.category?.toLowerCase().includes('restoration') ||
            p.ai_categories?.some((c: string) => c?.toLowerCase().includes('restoration'))
          );
          return {
            ticketNumber: t.ticket_number,
            renewalCount: 0, // Would need renewal tracking
            daysSinceCreated: daysSince,
            hasRestoration,
          };
        })
        .filter(t => t.daysSinceCreated > 14)
        .sort((a, b) => b.daysSinceCreated - a.daysSinceCreated)
        .slice(0, 10);

      // 6. TIME TO GREEN BY COUNTY
      const countyTimes = new Map<string, { total: number; count: number }>();

      allTickets
        .filter(t => t.cleared_at && t.county)
        .forEach(t => {
          const created = new Date(t.created_at).getTime();
          const cleared = new Date(t.cleared_at).getTime();
          const hours = (cleared - created) / (1000 * 60 * 60);

          const existing = countyTimes.get(t.county) || { total: 0, count: 0 };
          existing.total += hours;
          existing.count++;
          countyTimes.set(t.county, existing);
        });

      const timeToGreen: TimeToGreen[] = Array.from(countyTimes.entries())
        .map(([county, data]) => ({
          county,
          avgHours: Math.round(data.total / data.count),
          ticketCount: data.count,
        }))
        .sort((a, b) => b.ticketCount - a.ticketCount)
        .slice(0, 10);

      // 7. UTILITY VENDOR SCORECARD
      const utilityMetrics = new Map<string, {
        total: number;
        conflicts: number;
        resends: number;
        responseTimes: number[];
      }>();

      allUtilities.forEach(u => {
        const name = u.utility_name || 'Unknown';
        const existing = utilityMetrics.get(name) || {
          total: 0, conflicts: 0, resends: 0, responseTimes: []
        };

        existing.total++;
        if (u.response_status === 'CONFLICT') existing.conflicts++;

        if (u.response_date && u.created_at) {
          const responseTime = (new Date(u.response_date).getTime() - new Date(u.created_at).getTime()) / (1000 * 60 * 60);
          if (responseTime > 0 && responseTime < 720) { // Less than 30 days
            existing.responseTimes.push(responseTime);
          }
        }

        utilityMetrics.set(name, existing);
      });

      const utilityScores: UtilityScore[] = Array.from(utilityMetrics.entries())
        .filter(([, data]) => data.total >= 3)
        .map(([utilityName, data]) => {
          const avgResponseTime = data.responseTimes.length > 0
            ? Math.round(data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length)
            : 0;

          // Score: Lower is worse (more conflicts, slower response)
          const conflictPenalty = (data.conflicts / data.total) * 50;
          const timePenalty = Math.min(avgResponseTime / 2, 30);
          const score = Math.max(0, Math.round(100 - conflictPenalty - timePenalty));

          return {
            utilityName,
            totalTickets: data.total,
            conflicts: data.conflicts,
            resends: data.resends,
            avgResponseTime,
            score,
          };
        })
        .sort((a, b) => a.score - b.score)
        .slice(0, 10);

      // 8. WEEKLY TREND
      const weeks: { [key: string]: { tickets: number; resolved: number } } = {};
      const now = new Date();

      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (i * 7));
        const weekKey = weekStart.toISOString().split('T')[0];
        weeks[weekKey] = { tickets: 0, resolved: 0 };
      }

      allTickets.forEach(t => {
        const createdWeek = new Date(t.created_at).toISOString().split('T')[0].slice(0, 10);
        const weekKeys = Object.keys(weeks);
        const matchingWeek = weekKeys.find(wk => createdWeek >= wk);
        if (matchingWeek && weeks[matchingWeek]) {
          weeks[matchingWeek].tickets++;
        }

        if (t.cleared_at) {
          const clearedWeek = new Date(t.cleared_at).toISOString().split('T')[0].slice(0, 10);
          const matchingClearedWeek = weekKeys.find(wk => clearedWeek >= wk);
          if (matchingClearedWeek && weeks[matchingClearedWeek]) {
            weeks[matchingClearedWeek].resolved++;
          }
        }
      });

      const weeklyTrend = Object.entries(weeks).map(([week, data]) => ({
        week: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        ...data,
      }));

      setData({
        compliance,
        silentAssent,
        photoBreakdown,
        mobilizationBlockers,
        ticketChurn,
        timeToGreen,
        utilityScores,
        strikeDensity: [], // Would need strike data
        weeklyTrend,
      });

    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const renderComplianceTab = () => {
    if (!data) return null;

    const pieData = [
      { name: 'Fully Documented', value: data.compliance.fullyDocumented, color: COLORS.green },
      { name: 'Partial Evidence', value: data.compliance.partiallyDocumented, color: COLORS.yellow },
      { name: 'No Photos', value: data.compliance.noPhotos, color: COLORS.red },
    ];

    const silentAssentData = [
      { name: 'Silent Assent', value: data.silentAssent.silentAssent, color: COLORS.orange },
      { name: 'Positive Response', value: data.silentAssent.positiveResponse, color: COLORS.green },
      { name: 'Manual Clear', value: data.silentAssent.manualClear, color: COLORS.blue },
    ];

    return (
      <div className="analytics-tab">
        {/* Evidence Coverage Ratio */}
        <div className="analytics-card card-ecr">
          <div className="card-header">
            <Shield size={20} />
            <h3>Evidence Coverage Ratio (ECR)</h3>
          </div>
          <div className="card-content">
            <div className="ecr-score">
              <div
                className={`score-ring ${
                  data.compliance.evidenceCoverageRatio >= 80 ? 'score-good' :
                  data.compliance.evidenceCoverageRatio >= 50 ? 'score-warning' : 'score-danger'
                }`}
              >
                <span className="score-value">{data.compliance.evidenceCoverageRatio}%</span>
                <span className="score-label">Coverage</span>
              </div>
              <div className="ecr-description">
                <p><strong>{data.compliance.totalActiveTickets}</strong> active tickets</p>
                <p className="text-success"><CheckCircle size={14} /> {data.compliance.fullyDocumented} fully documented</p>
                <p className="text-warning"><AlertTriangle size={14} /> {data.compliance.partiallyDocumented} partial evidence</p>
                <p className="text-danger"><AlertTriangle size={14} /> {data.compliance.noPhotos} exposed (no photos)</p>
              </div>
            </div>
            <div className="ecr-chart">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Silent Assent Risk Gauge */}
        <div className="analytics-card card-silent-assent">
          <div className="card-header">
            <Activity size={20} />
            <h3>Silent Assent Risk Gauge</h3>
          </div>
          <div className="card-content">
            <div className="silent-assent-stats">
              <div className="sa-stat">
                <span className="sa-value" style={{ color: COLORS.orange }}>{data.silentAssent.silentAssent}</span>
                <span className="sa-label">Silent Assent</span>
              </div>
              <div className="sa-stat">
                <span className="sa-value" style={{ color: COLORS.green }}>{data.silentAssent.positiveResponse}</span>
                <span className="sa-label">Positive Response</span>
              </div>
              <div className="sa-stat">
                <span className="sa-value" style={{ color: COLORS.blue }}>{data.silentAssent.manualClear}</span>
                <span className="sa-label">Manual Clear</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={silentAssentData} layout="vertical">
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {silentAssentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {data.silentAssent.total > 0 && (
              <div className="sa-warning">
                {((data.silentAssent.silentAssent / data.silentAssent.total) * 100).toFixed(0)}% of tickets cleared via Silent Assent
                {((data.silentAssent.silentAssent / data.silentAssent.total) * 100) > 60 && (
                  <span className="warning-flag"> - Consider calling 811 for human confirmation</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Photo Integrity Breakdown */}
        <div className="analytics-card card-photos card-full">
          <div className="card-header">
            <Camera size={20} />
            <h3>Photo Integrity Breakdown</h3>
          </div>
          <div className="card-content">
            {data.photoBreakdown.length === 0 ? (
              <p className="no-data">No photos uploaded yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.photoBreakdown} layout="vertical" margin={{ left: 120 }}>
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="category" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [`${value} photos`, 'Count']} />
                  <Bar dataKey="count" fill={COLORS.blue} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderOperationsTab = () => {
    if (!data) return null;

    return (
      <div className="analytics-tab">
        {/* Mobilization Blockers */}
        <div className="analytics-card card-blockers card-full">
          <div className="card-header">
            <AlertTriangle size={20} className="text-danger" />
            <h3>Mobilization Blockers</h3>
            <span className="badge badge-danger">{data.mobilizationBlockers.length} blocked</span>
          </div>
          <div className="card-content">
            {data.mobilizationBlockers.length === 0 ? (
              <div className="all-clear">
                <CheckCircle size={32} />
                <p>No projects blocked by 811 tickets</p>
              </div>
            ) : (
              <div className="blockers-list">
                {data.mobilizationBlockers.map((blocker) => (
                  <Link
                    key={blocker.id}
                    to={`/locate-tickets/${blocker.id}`}
                    className="blocker-item"
                  >
                    <div className="blocker-main">
                      <span className="blocker-ticket">{blocker.ticket_number}</span>
                      <span className={`blocker-status status-${blocker.status.toLowerCase()}`}>
                        {blocker.status}
                      </span>
                    </div>
                    <div className="blocker-details">
                      <span><Building size={14} /> {blocker.project_name}</span>
                      <span><MapPin size={14} /> {blocker.dig_site_address}</span>
                    </div>
                    <div className="blocker-reason">{blocker.reason}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stale Tickets (Churn) */}
        <div className="analytics-card card-churn">
          <div className="card-header">
            <Clock size={20} />
            <h3>Stale Tickets</h3>
          </div>
          <div className="card-content">
            {data.ticketChurn.length === 0 ? (
              <div className="all-clear">
                <CheckCircle size={24} />
                <p>No stale tickets</p>
              </div>
            ) : (
              <div className="churn-list">
                {data.ticketChurn.map((ticket, idx) => (
                  <div key={idx} className="churn-item">
                    <span className="churn-ticket">{ticket.ticketNumber}</span>
                    <span className="churn-days">{ticket.daysSinceCreated} days old</span>
                    {!ticket.hasRestoration && (
                      <span className="churn-warning">No restoration photo</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Time to Green by County */}
        <div className="analytics-card card-ttg">
          <div className="card-header">
            <TrendingUp size={20} />
            <h3>Avg. Time to Green by County</h3>
          </div>
          <div className="card-content">
            {data.timeToGreen.length === 0 ? (
              <p className="no-data">Not enough data</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.timeToGreen}>
                  <XAxis dataKey="county" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value: number) => [`${value} hours`, 'Avg Time']} />
                  <Bar dataKey="avgHours" fill={COLORS.cyan} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderVendorsTab = () => {
    if (!data) return null;

    return (
      <div className="analytics-tab">
        {/* Bad Actor Index */}
        <div className="analytics-card card-vendors card-full">
          <div className="card-header">
            <Target size={20} />
            <h3>Utility Vendor Scorecard</h3>
            <span className="card-subtitle">Lower score = More problematic</span>
          </div>
          <div className="card-content">
            {data.utilityScores.length === 0 ? (
              <p className="no-data">Not enough utility data</p>
            ) : (
              <div className="vendor-table">
                <div className="vendor-header">
                  <span>Rank</span>
                  <span>Utility Company</span>
                  <span>Tickets</span>
                  <span>Conflicts</span>
                  <span>Avg Response</span>
                  <span>Score</span>
                </div>
                {data.utilityScores.map((vendor, idx) => (
                  <div
                    key={vendor.utilityName}
                    className={`vendor-row ${idx < 3 ? 'vendor-bad' : ''}`}
                  >
                    <span className="vendor-rank">
                      {idx === 0 && '🥇'}
                      {idx === 1 && '🥈'}
                      {idx === 2 && '🥉'}
                      {idx > 2 && `#${idx + 1}`}
                    </span>
                    <span className="vendor-name">{vendor.utilityName}</span>
                    <span className="vendor-tickets">{vendor.totalTickets}</span>
                    <span className="vendor-conflicts">
                      {vendor.conflicts > 0 && <AlertTriangle size={14} />}
                      {vendor.conflicts}
                    </span>
                    <span className="vendor-response">
                      {vendor.avgResponseTime > 0 ? `${vendor.avgResponseTime}h` : '—'}
                    </span>
                    <span className={`vendor-score score-${
                      vendor.score >= 70 ? 'good' : vendor.score >= 40 ? 'warning' : 'bad'
                    }`}>
                      {vendor.score}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Conflict Rate Chart */}
        <div className="analytics-card card-conflicts">
          <div className="card-header">
            <Zap size={20} />
            <h3>Conflict Rate by Utility</h3>
          </div>
          <div className="card-content">
            {data.utilityScores.length === 0 ? (
              <p className="no-data">Not enough data</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={data.utilityScores.slice(0, 8).map(u => ({
                    ...u,
                    conflictRate: u.totalTickets > 0
                      ? Math.round((u.conflicts / u.totalTickets) * 100)
                      : 0
                  }))}
                  layout="vertical"
                  margin={{ left: 100 }}
                >
                  <XAxis type="number" domain={[0, 100]} unit="%" />
                  <YAxis type="category" dataKey="utilityName" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [`${value}%`, 'Conflict Rate']} />
                  <Bar dataKey="conflictRate" fill={COLORS.red} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTrendsTab = () => {
    if (!data) return null;

    return (
      <div className="analytics-tab">
        {/* Weekly Trend */}
        <div className="analytics-card card-trend card-full">
          <div className="card-header">
            <TrendingUp size={20} />
            <h3>Weekly Ticket Trend</h3>
          </div>
          <div className="card-content">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.weeklyTrend}>
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="tickets"
                  stroke={COLORS.blue}
                  strokeWidth={2}
                  name="New Tickets"
                />
                <Line
                  type="monotone"
                  dataKey="resolved"
                  stroke={COLORS.green}
                  strokeWidth={2}
                  name="Resolved"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="analytics-card card-quick-stats">
          <div className="card-header">
            <BarChart3 size={20} />
            <h3>Quick Stats</h3>
          </div>
          <div className="card-content">
            <div className="quick-stats-grid">
              <div className="quick-stat">
                <span className="qs-value">{data.compliance.totalActiveTickets}</span>
                <span className="qs-label">Active Tickets</span>
              </div>
              <div className="quick-stat">
                <span className="qs-value">{data.compliance.evidenceCoverageRatio}%</span>
                <span className="qs-label">Evidence Coverage</span>
              </div>
              <div className="quick-stat">
                <span className="qs-value">{data.mobilizationBlockers.length}</span>
                <span className="qs-label">Blocked Projects</span>
              </div>
              <div className="quick-stat">
                <span className="qs-value">{data.ticketChurn.length}</span>
                <span className="qs-label">Stale Tickets</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <Link to="/locate-tickets" className="back-link">
          <ArrowLeft size={16} />
          Back to Tickets
        </Link>
        <div className="header-content">
          <div className="header-title">
            <BarChart3 size={28} strokeWidth={1.5} />
            <h1>811 Analytics Dashboard</h1>
          </div>
          <p className="header-subtitle">Compliance, Operations & Vendor Performance</p>
        </div>
        <div className="header-actions">
          <button
            onClick={fetchAnalytics}
            className="btn btn-secondary"
            disabled={isLoading}
          >
            <RefreshCw size={18} className={isLoading ? 'spin' : ''} />
            Refresh
          </button>
          <button className="btn btn-primary">
            <FileText size={18} />
            Export Report
          </button>
        </div>
      </div>

      {error && (
        <div className="analytics-error">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="analytics-tabs">
        <button
          className={`tab-btn ${activeTab === 'compliance' ? 'active' : ''}`}
          onClick={() => setActiveTab('compliance')}
        >
          <Shield size={18} />
          Audit Shield
        </button>
        <button
          className={`tab-btn ${activeTab === 'operations' ? 'active' : ''}`}
          onClick={() => setActiveTab('operations')}
        >
          <TrendingUp size={18} />
          Operations
        </button>
        <button
          className={`tab-btn ${activeTab === 'vendors' ? 'active' : ''}`}
          onClick={() => setActiveTab('vendors')}
        >
          <Users size={18} />
          Vendor Scorecard
        </button>
        <button
          className={`tab-btn ${activeTab === 'trends' ? 'active' : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          <Activity size={18} />
          Trends
        </button>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading analytics...</p>
        </div>
      ) : data ? (
        <div className="analytics-content">
          {activeTab === 'compliance' && renderComplianceTab()}
          {activeTab === 'operations' && renderOperationsTab()}
          {activeTab === 'vendors' && renderVendorsTab()}
          {activeTab === 'trends' && renderTrendsTab()}
        </div>
      ) : null}
    </div>
  );
}
