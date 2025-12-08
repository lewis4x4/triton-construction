import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@triton/supabase-client';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  FileText,
  Upload,
  ChevronRight,
  Building2,
  Calendar,
  ArrowUpRight,
  RefreshCw,
  Users,
  TrendingUp,
} from 'lucide-react';
import './PayEstimateDashboard.css';

interface PayPeriod {
  id: string;
  organization_id: string;
  project_id: string;
  estimate_number: number;
  period_start_date: string | null;
  period_end_date: string;
  status: PayPeriodStatus;
  posted_item_pay: number | null;
  net_pay_amount: number | null;
  material_withheld: number | null;
  funds_received_date: string | null;
  payment_deadline_date: string | null;
  created_at: string;
  project?: {
    name: string;
    contract_number: string | null;
  };
}

interface ProjectSummary {
  project_id: string;
  project_name: string;
  contract_number: string | null;
  total_estimates: number;
  total_net_pay: number;
  pending_count: number;
  imr_open_count: number;
}

type PayPeriodStatus =
  | 'PRELIMINARY_RECEIVED'
  | 'IMR_UNDER_REVIEW'
  | 'DISPUTED_WITH_STATE'
  | 'FINAL_RECEIVED'
  | 'FUNDS_RECEIVED'
  | 'SUB_WS_IN_PROGRESS'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'CHECKS_CUT'
  | 'CRL_SUBMITTED'
  | 'CLOSED';

const STATUS_CONFIG: Record<PayPeriodStatus, { label: string; color: string; bgColor: string }> = {
  PRELIMINARY_RECEIVED: { label: 'Preliminary', color: '#6B7280', bgColor: '#F3F4F6' },
  IMR_UNDER_REVIEW: { label: 'IMR Review', color: '#F59E0B', bgColor: '#FEF3C7' },
  DISPUTED_WITH_STATE: { label: 'Disputed', color: '#EF4444', bgColor: '#FEE2E2' },
  FINAL_RECEIVED: { label: 'Final Received', color: '#3B82F6', bgColor: '#DBEAFE' },
  FUNDS_RECEIVED: { label: 'Funds Received', color: '#10B981', bgColor: '#D1FAE5' },
  SUB_WS_IN_PROGRESS: { label: 'Sub Worksheet', color: '#8B5CF6', bgColor: '#EDE9FE' },
  PENDING_APPROVAL: { label: 'Pending Approval', color: '#F59E0B', bgColor: '#FEF3C7' },
  APPROVED: { label: 'Approved', color: '#10B981', bgColor: '#D1FAE5' },
  CHECKS_CUT: { label: 'Checks Cut', color: '#10B981', bgColor: '#D1FAE5' },
  CRL_SUBMITTED: { label: 'CRL Submitted', color: '#6B7280', bgColor: '#F3F4F6' },
  CLOSED: { label: 'Closed', color: '#6B7280', bgColor: '#F3F4F6' },
};

// Demo data for fallback
const DEMO_PAY_PERIODS: PayPeriod[] = [
  {
    id: 'demo-pp-1',
    organization_id: 'demo-org',
    project_id: 'demo-project-1',
    estimate_number: 15,
    period_start_date: '2024-11-01',
    period_end_date: '2024-11-30',
    status: 'FUNDS_RECEIVED',
    posted_item_pay: 847592.50,
    net_pay_amount: 823145.00,
    material_withheld: 24447.50,
    funds_received_date: '2024-12-03',
    payment_deadline_date: '2024-12-17',
    created_at: '2024-12-01T00:00:00Z',
    project: { name: 'Corridor H Section 12', contract_number: 'DOH-2024-0345' },
  },
  {
    id: 'demo-pp-2',
    organization_id: 'demo-org',
    project_id: 'demo-project-2',
    estimate_number: 8,
    period_start_date: '2024-11-01',
    period_end_date: '2024-11-30',
    status: 'SUB_WS_IN_PROGRESS',
    posted_item_pay: 1245780.00,
    net_pay_amount: 1198500.00,
    material_withheld: 47280.00,
    funds_received_date: '2024-12-01',
    payment_deadline_date: '2024-12-15',
    created_at: '2024-11-28T00:00:00Z',
    project: { name: 'Route 9 Bridge Replacement', contract_number: 'DOH-2024-0567' },
  },
  {
    id: 'demo-pp-3',
    organization_id: 'demo-org',
    project_id: 'demo-project-1',
    estimate_number: 14,
    period_start_date: '2024-10-01',
    period_end_date: '2024-10-31',
    status: 'CRL_SUBMITTED',
    posted_item_pay: 923450.75,
    net_pay_amount: 912200.00,
    material_withheld: 11250.75,
    funds_received_date: '2024-11-05',
    payment_deadline_date: '2024-11-19',
    created_at: '2024-11-01T00:00:00Z',
    project: { name: 'Corridor H Section 12', contract_number: 'DOH-2024-0345' },
  },
  {
    id: 'demo-pp-4',
    organization_id: 'demo-org',
    project_id: 'demo-project-3',
    estimate_number: 3,
    period_start_date: '2024-11-01',
    period_end_date: '2024-11-30',
    status: 'IMR_UNDER_REVIEW',
    posted_item_pay: 456230.00,
    net_pay_amount: null,
    material_withheld: 38450.00,
    funds_received_date: null,
    payment_deadline_date: null,
    created_at: '2024-12-02T00:00:00Z',
    project: { name: 'US-60 Resurfacing Phase 2', contract_number: 'DOH-2024-0892' },
  },
  {
    id: 'demo-pp-5',
    organization_id: 'demo-org',
    project_id: 'demo-project-2',
    estimate_number: 7,
    period_start_date: '2024-10-01',
    period_end_date: '2024-10-31',
    status: 'CLOSED',
    posted_item_pay: 1098670.25,
    net_pay_amount: 1087500.00,
    material_withheld: 11170.25,
    funds_received_date: '2024-11-02',
    payment_deadline_date: '2024-11-16',
    created_at: '2024-10-28T00:00:00Z',
    project: { name: 'Route 9 Bridge Replacement', contract_number: 'DOH-2024-0567' },
  },
];

export function PayEstimateDashboard() {
  const navigate = useNavigate();
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUsingDemo, setIsUsingDemo] = useState(false);

  useEffect(() => {
    loadPayPeriods();
  }, []);

  async function loadPayPeriods() {
    setLoading(true);

    try {
      const { data, error: fetchError } = await supabase
        .from('pay_periods')
        .select(`
          *,
          project:projects(name, contract_number)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        setPayPeriods(data as PayPeriod[]);
        setIsUsingDemo(false);
      } else {
        // Use demo data if no records
        setPayPeriods(DEMO_PAY_PERIODS);
        setIsUsingDemo(true);
      }
    } catch (err) {
      console.error('Error loading pay periods:', err);
      setPayPeriods(DEMO_PAY_PERIODS);
      setIsUsingDemo(true);
    } finally {
      setLoading(false);
    }
  }

  // Calculate stats
  const stats = useMemo(() => {
    const activeStatuses: PayPeriodStatus[] = [
      'FUNDS_RECEIVED',
      'SUB_WS_IN_PROGRESS',
      'PENDING_APPROVAL',
      'APPROVED',
    ];

    const pendingPayments = payPeriods.filter(pp => activeStatuses.includes(pp.status));
    const pendingTotal = pendingPayments.reduce(
      (sum, pp) => sum + (pp.net_pay_amount || 0),
      0
    );

    const imrReview = payPeriods.filter(pp => pp.status === 'IMR_UNDER_REVIEW');
    const imrTotal = imrReview.reduce(
      (sum, pp) => sum + (pp.material_withheld || 0),
      0
    );

    // Count items with approaching deadlines (within 7 days)
    const now = new Date();
    const upcomingDeadlines = payPeriods.filter(pp => {
      if (!pp.payment_deadline_date) return false;
      const deadline = new Date(pp.payment_deadline_date);
      const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysRemaining >= 0 && daysRemaining <= 7 && activeStatuses.includes(pp.status);
    });

    const closed = payPeriods.filter(pp => ['CLOSED', 'CRL_SUBMITTED'].includes(pp.status));
    const closedTotal = closed.reduce((sum, pp) => sum + (pp.net_pay_amount || 0), 0);

    return {
      pendingCount: pendingPayments.length,
      pendingTotal,
      imrCount: imrReview.length,
      imrTotal,
      upcomingDeadlines: upcomingDeadlines.length,
      closedCount: closed.length,
      closedTotal,
    };
  }, [payPeriods]);

  // Group by project
  const projectSummaries = useMemo(() => {
    const summaryMap = new Map<string, ProjectSummary>();

    payPeriods.forEach(pp => {
      const key = pp.project_id;
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          project_id: pp.project_id,
          project_name: pp.project?.name || 'Unknown Project',
          contract_number: pp.project?.contract_number || null,
          total_estimates: 0,
          total_net_pay: 0,
          pending_count: 0,
          imr_open_count: 0,
        });
      }

      const summary = summaryMap.get(key)!;
      summary.total_estimates++;
      summary.total_net_pay += pp.net_pay_amount || 0;

      if (['FUNDS_RECEIVED', 'SUB_WS_IN_PROGRESS', 'PENDING_APPROVAL', 'APPROVED'].includes(pp.status)) {
        summary.pending_count++;
      }
      if (pp.status === 'IMR_UNDER_REVIEW') {
        summary.imr_open_count++;
      }
    });

    return Array.from(summaryMap.values()).sort((a, b) => b.total_net_pay - a.total_net_pay);
  }, [payPeriods]);

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysRemaining = (deadlineStr: string | null) => {
    if (!deadlineStr) return null;
    const deadline = new Date(deadlineStr);
    const now = new Date();
    const days = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getDeadlineClass = (days: number | null) => {
    if (days === null) return '';
    if (days < 0) return 'overdue';
    if (days <= 3) return 'urgent';
    if (days <= 7) return 'warning';
    return 'ok';
  };

  return (
    <div className="pay-estimate-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Pay Estimates</h1>
          <p>WVDOH pay estimate tracking and 14-day compliance management</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={loadPayPeriods}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <Link to="/pay-estimates/upload" className="btn-primary">
            <Upload size={16} />
            Upload Estimate
          </Link>
        </div>
      </div>

      {isUsingDemo && (
        <div className="demo-banner">
          <AlertTriangle size={16} />
          <span>Showing demo data. Upload pay estimates to see real data.</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card pending">
          <div className="stat-icon">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.pendingCount}</span>
            <span className="stat-label">Pending Payments</span>
            <span className="stat-detail">{formatCurrency(stats.pendingTotal)}</span>
          </div>
        </div>

        <div className="stat-card imr">
          <div className="stat-icon">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.imrCount}</span>
            <span className="stat-label">IMR Under Review</span>
            <span className="stat-detail">{formatCurrency(stats.imrTotal)} withheld</span>
          </div>
        </div>

        <div className="stat-card deadline">
          <div className="stat-icon">
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.upcomingDeadlines}</span>
            <span className="stat-label">Deadlines This Week</span>
            <span className="stat-detail">14-day compliance</span>
          </div>
        </div>

        <div className="stat-card completed">
          <div className="stat-icon">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.closedCount}</span>
            <span className="stat-label">Completed</span>
            <span className="stat-detail">{formatCurrency(stats.closedTotal)}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <Link to="/pay-estimates/upload" className="action-card">
          <Upload size={24} />
          <span className="action-title">Upload Estimate</span>
          <span className="action-desc">Upload WVDOH PDF</span>
          <ChevronRight size={16} className="action-arrow" />
        </Link>

        <Link to="/pay-estimates/validation" className="action-card">
          <FileText size={24} />
          <span className="action-title">Validation Queue</span>
          <span className="action-desc">Review pending validations</span>
          <ChevronRight size={16} className="action-arrow" />
        </Link>

        <Link to="/pay-estimates/compliance" className="action-card">
          <Clock size={24} />
          <span className="action-title">Compliance Dashboard</span>
          <span className="action-desc">14-day deadline tracking</span>
          <ChevronRight size={16} className="action-arrow" />
        </Link>

        <Link to="/pay-estimates/subcontractor" className="action-card">
          <Users size={24} />
          <span className="action-title">Subcontractor Worksheet</span>
          <span className="action-desc">Allocate sub payments</span>
          <ChevronRight size={16} className="action-arrow" />
        </Link>
      </div>

      {/* Project Summary Section */}
      <div className="section">
        <div className="section-header">
          <h2>
            <Building2 size={20} />
            Pay Estimates by Project
          </h2>
        </div>

        <div className="project-cards">
          {projectSummaries.map(project => (
            <div key={project.project_id} className="project-card">
              <div className="project-header">
                <h3>{project.project_name}</h3>
                <span className="contract-number">{project.contract_number}</span>
              </div>
              <div className="project-stats">
                <div className="project-stat">
                  <span className="value">{project.total_estimates}</span>
                  <span className="label">Estimates</span>
                </div>
                <div className="project-stat">
                  <span className="value">{formatCurrency(project.total_net_pay)}</span>
                  <span className="label">Total Net Pay</span>
                </div>
                <div className="project-stat">
                  <span className="value highlight">{project.pending_count}</span>
                  <span className="label">Pending</span>
                </div>
              </div>
              {project.imr_open_count > 0 && (
                <div className="imr-warning">
                  <AlertTriangle size={14} />
                  <span>{project.imr_open_count} IMR item(s) under review</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Pay Periods Table */}
      <div className="section">
        <div className="section-header">
          <h2>
            <TrendingUp size={20} />
            Recent Pay Periods
          </h2>
          <Link to="/pay-estimates/all" className="view-all">
            View All <ArrowUpRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="loading-state">
            <RefreshCw size={32} className="spin" />
            <p>Loading pay periods...</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="pay-periods-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Est #</th>
                  <th>Period End</th>
                  <th>Status</th>
                  <th>Net Pay</th>
                  <th>14-Day Deadline</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {payPeriods.slice(0, 10).map(pp => {
                  const daysRemaining = getDaysRemaining(pp.payment_deadline_date);
                  const deadlineClass = getDeadlineClass(daysRemaining);

                  return (
                    <tr key={pp.id}>
                      <td>
                        <div className="project-cell">
                          <span className="project-name">{pp.project?.name}</span>
                          <span className="contract-number">{pp.project?.contract_number}</span>
                        </div>
                      </td>
                      <td>
                        <span className="estimate-number">#{pp.estimate_number}</span>
                      </td>
                      <td>{formatDate(pp.period_end_date)}</td>
                      <td>
                        <span
                          className="status-badge"
                          style={{
                            backgroundColor: STATUS_CONFIG[pp.status]?.bgColor,
                            color: STATUS_CONFIG[pp.status]?.color,
                          }}
                        >
                          {STATUS_CONFIG[pp.status]?.label}
                        </span>
                      </td>
                      <td className="amount">{formatCurrency(pp.net_pay_amount)}</td>
                      <td>
                        {pp.payment_deadline_date ? (
                          <div className={`deadline-cell ${deadlineClass}`}>
                            <span className="deadline-date">{formatDate(pp.payment_deadline_date)}</span>
                            {daysRemaining !== null && (
                              <span className="days-remaining">
                                {daysRemaining < 0
                                  ? `${Math.abs(daysRemaining)}d overdue`
                                  : daysRemaining === 0
                                  ? 'Today'
                                  : `${daysRemaining}d remaining`}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="no-deadline">-</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn-icon"
                          onClick={() => navigate(`/pay-estimates/${pp.id}`)}
                          title="View Details"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
