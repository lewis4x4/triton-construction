import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@triton/supabase-client';
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle,
  Calendar,
  DollarSign,
  RefreshCw,
  ChevronRight,
  Bell,
  Building2,
  ExternalLink,
  Shield,
  XCircle,
  Users,
  Briefcase,
} from 'lucide-react';
import './ComplianceDashboard.css';

interface PayPeriodDeadline {
  id: string;
  estimate_number: number;
  period_end_date: string;
  status: string;
  net_pay_amount: number | null;
  funds_received_date: string | null;
  payment_deadline_date: string | null;
  days_remaining: number;
  project_name: string;
  contract_number: string | null;
  sub_payments_total: number;
  sub_payments_pending: number;
}

interface EscalationItem {
  id: string;
  pay_period_id: string;
  escalation_level: 'LEVEL_1_WARNING' | 'LEVEL_2_URGENT' | 'LEVEL_3_DEADLINE' | 'LEVEL_4_VIOLATION';
  escalation_date: string;
  message: string;
  acknowledged_at: string | null;
  project_name: string;
  estimate_number: number;
}

interface ComplianceStats {
  onTrack: number;
  warning: number;
  urgent: number;
  overdue: number;
  totalPending: number;
  totalAmount: number;
}

interface ComplianceViolation {
  id: string;
  violation_type: string;
  severity: 'info' | 'warning' | 'critical' | 'blocking';
  status: string;
  title: string;
  description: string;
  expected_value: number | null;
  actual_value: number | null;
  variance_amount: number | null;
  affected_date: string | null;
  affected_entity_name: string | null;
  project_name: string | null;
  created_at: string;
}

interface ViolationStats {
  total: number;
  open: number;
  critical: number;
  blocking: number;
  wageViolations: number;
  certViolations: number;
  paymentViolations: number;
}

// Demo data
const DEMO_DEADLINES: PayPeriodDeadline[] = [
  {
    id: 'pp-1',
    estimate_number: 15,
    period_end_date: '2024-11-30',
    status: 'SUB_WS_IN_PROGRESS',
    net_pay_amount: 823145.00,
    funds_received_date: '2024-12-01',
    payment_deadline_date: '2024-12-15',
    days_remaining: 7,
    project_name: 'Route 9 Bridge Replacement',
    contract_number: 'DOH-2024-0567',
    sub_payments_total: 312840.00,
    sub_payments_pending: 3,
  },
  {
    id: 'pp-2',
    estimate_number: 8,
    period_end_date: '2024-11-30',
    status: 'FUNDS_RECEIVED',
    net_pay_amount: 456230.00,
    funds_received_date: '2024-12-03',
    payment_deadline_date: '2024-12-17',
    days_remaining: 9,
    project_name: 'Corridor H Section 12',
    contract_number: 'DOH-2024-0345',
    sub_payments_total: 0,
    sub_payments_pending: 0,
  },
  {
    id: 'pp-3',
    estimate_number: 12,
    period_end_date: '2024-11-30',
    status: 'PENDING_APPROVAL',
    net_pay_amount: 1245780.00,
    funds_received_date: '2024-12-06',
    payment_deadline_date: '2024-12-20',
    days_remaining: 12,
    project_name: 'US-60 Resurfacing Phase 2',
    contract_number: 'DOH-2024-0892',
    sub_payments_total: 548200.00,
    sub_payments_pending: 2,
  },
  {
    id: 'pp-4',
    estimate_number: 6,
    period_end_date: '2024-10-31',
    status: 'APPROVED',
    net_pay_amount: 678450.00,
    funds_received_date: '2024-11-02',
    payment_deadline_date: '2024-11-16',
    days_remaining: -22,
    project_name: 'I-64 Interchange Improvements',
    contract_number: 'DOH-2024-0234',
    sub_payments_total: 289500.00,
    sub_payments_pending: 0,
  },
];

const DEMO_ESCALATIONS: EscalationItem[] = [
  {
    id: 'esc-1',
    pay_period_id: 'pp-1',
    escalation_level: 'LEVEL_1_WARNING',
    escalation_date: '2024-12-08T10:00:00Z',
    message: 'Payment deadline in 7 days. Subcontractor worksheet in progress with 3 pending payments.',
    acknowledged_at: null,
    project_name: 'Route 9 Bridge Replacement',
    estimate_number: 15,
  },
  {
    id: 'esc-2',
    pay_period_id: 'pp-4',
    escalation_level: 'LEVEL_4_VIOLATION',
    escalation_date: '2024-11-17T08:00:00Z',
    message: 'Payment deadline exceeded. 22 days overdue - requires immediate attention.',
    acknowledged_at: null,
    project_name: 'I-64 Interchange Improvements',
    estimate_number: 6,
  },
];

const DEMO_VIOLATIONS: ComplianceViolation[] = [
  {
    id: 'viol-1',
    violation_type: 'wage_rate_below_minimum',
    severity: 'critical',
    status: 'open',
    title: 'Wage Rate Below Prevailing Minimum',
    description: 'Applied rate $24.50 is below prevailing wage $28.75 for Equipment Operator classification',
    expected_value: 28.75,
    actual_value: 24.50,
    variance_amount: 4.25,
    affected_date: '2024-12-10',
    affected_entity_name: 'John Smith',
    project_name: 'Route 9 Bridge Replacement',
    created_at: '2024-12-10T14:30:00Z',
  },
  {
    id: 'viol-2',
    violation_type: 'certification_expired',
    severity: 'warning',
    status: 'open',
    title: 'OSHA 30-Hour Certification Expired',
    description: 'OSHA 30-hour certification expired on 12/01/2024. Worker cannot perform foreman duties.',
    expected_value: null,
    actual_value: null,
    variance_amount: null,
    affected_date: '2024-12-01',
    affected_entity_name: 'Mike Johnson',
    project_name: 'Corridor H Section 12',
    created_at: '2024-12-08T09:00:00Z',
  },
  {
    id: 'viol-3',
    violation_type: 'payment_deadline_violation',
    severity: 'blocking',
    status: 'open',
    title: 'Payment Deadline Exceeded',
    description: 'Subcontractor payment deadline exceeded by 22 days. Immediate action required.',
    expected_value: null,
    actual_value: null,
    variance_amount: null,
    affected_date: '2024-11-16',
    affected_entity_name: 'ABC Paving LLC',
    project_name: 'I-64 Interchange Improvements',
    created_at: '2024-11-17T08:00:00Z',
  },
];

const LEVEL_CONFIG = {
  LEVEL_1_WARNING: { label: 'Warning', color: '#d97706', bgColor: '#fef3c7', icon: Clock },
  LEVEL_2_URGENT: { label: 'Urgent', color: '#ea580c', bgColor: '#fed7aa', icon: AlertCircle },
  LEVEL_3_DEADLINE: { label: 'Deadline', color: '#dc2626', bgColor: '#fee2e2', icon: AlertTriangle },
  LEVEL_4_VIOLATION: { label: 'Violation', color: '#991b1b', bgColor: '#fecaca', icon: AlertTriangle },
};

const SEVERITY_CONFIG = {
  info: { label: 'Info', color: '#3b82f6', bgColor: '#dbeafe', icon: Shield },
  warning: { label: 'Warning', color: '#d97706', bgColor: '#fef3c7', icon: AlertCircle },
  critical: { label: 'Critical', color: '#dc2626', bgColor: '#fee2e2', icon: AlertTriangle },
  blocking: { label: 'Blocking', color: '#991b1b', bgColor: '#fecaca', icon: XCircle },
};

const VIOLATION_TYPE_ICONS: Record<string, typeof DollarSign> = {
  wage_rate_below_minimum: DollarSign,
  wage_rate_expired: Clock,
  wage_rate_missing: DollarSign,
  certification_expired: Users,
  certification_missing: Users,
  payment_deadline_warning: Calendar,
  payment_deadline_urgent: AlertCircle,
  payment_deadline_violation: AlertTriangle,
  insurance_expired: Briefcase,
  default: Shield,
};

export function ComplianceDashboard() {
  const [deadlines, setDeadlines] = useState<PayPeriodDeadline[]>([]);
  const [escalations, setEscalations] = useState<EscalationItem[]>([]);
  const [violations, setViolations] = useState<ComplianceViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUsingDemo, setIsUsingDemo] = useState(false);
  const [activeTab, setActiveTab] = useState<'deadlines' | 'violations'>('deadlines');
  const [newViolationAlert, setNewViolationAlert] = useState<string | null>(null);

  // Real-time subscription for new violations
  useEffect(() => {
    loadData();

    // Subscribe to new compliance violations
    const violationsSubscription = supabase
      .channel('compliance-violations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'compliance_violations',
        },
        (payload) => {
          const newViolation = payload.new as ComplianceViolation;
          setViolations((prev) => [newViolation, ...prev]);

          // Show alert for critical/blocking violations
          if (newViolation.severity === 'critical' || newViolation.severity === 'blocking') {
            setNewViolationAlert(newViolation.title);
            setTimeout(() => setNewViolationAlert(null), 5000);
          }
        }
      )
      .subscribe();

    // Subscribe to new escalations
    const escalationsSubscription = supabase
      .channel('compliance-escalations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'compliance_escalations',
        },
        () => {
          loadData(); // Reload to get full escalation details
        }
      )
      .subscribe();

    return () => {
      violationsSubscription.unsubscribe();
      escalationsSubscription.unsubscribe();
    };
  }, []);

  async function loadData() {
    setLoading(true);

    try {
      // Load pay periods with upcoming deadlines
      const { data: ppData, error: ppError } = await supabase
        .from('pay_periods')
        .select(`
          *,
          project:projects(name, contract_number)
        `)
        .in('status', ['FUNDS_RECEIVED', 'SUB_WS_IN_PROGRESS', 'PENDING_APPROVAL', 'APPROVED'])
        .not('payment_deadline_date', 'is', null)
        .order('payment_deadline_date', { ascending: true });

      if (ppError) throw ppError;

      if (ppData && ppData.length > 0) {
        const now = new Date();
        const mapped = ppData.map((pp: any) => {
          const deadline = new Date(pp.payment_deadline_date);
          const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return {
            id: pp.id,
            estimate_number: pp.estimate_number,
            period_end_date: pp.period_end_date,
            status: pp.status,
            net_pay_amount: pp.net_pay_amount,
            funds_received_date: pp.funds_received_date,
            payment_deadline_date: pp.payment_deadline_date,
            days_remaining: daysRemaining,
            project_name: pp.project?.name || 'Unknown Project',
            contract_number: pp.project?.contract_number,
            sub_payments_total: 0,
            sub_payments_pending: 0,
          };
        });
        setDeadlines(mapped);
        setIsUsingDemo(false);
      } else {
        setDeadlines(DEMO_DEADLINES);
        setIsUsingDemo(true);
      }

      // Load escalations
      const { data: escData, error: escError } = await supabase
        .from('compliance_escalations' as any)
        .select(`
          *,
          pay_period:pay_periods(estimate_number, project:projects(name))
        `)
        .is('acknowledged_at', null)
        .order('escalation_date', { ascending: false });

      if (!escError && escData && escData.length > 0) {
        setEscalations(escData.map((e: any) => ({
          id: e.id,
          pay_period_id: e.pay_period_id,
          escalation_level: e.escalation_level,
          escalation_date: e.escalation_date,
          message: e.message,
          acknowledged_at: e.acknowledged_at,
          project_name: e.pay_period?.project?.name || 'Unknown',
          estimate_number: e.pay_period?.estimate_number,
        })));
      } else {
        setEscalations(DEMO_ESCALATIONS);
      }

      // Load compliance violations
      const { data: violData, error: violError } = await supabase
        .from('compliance_violations' as any)
        .select(`
          id,
          violation_type,
          severity,
          status,
          title,
          description,
          expected_value,
          actual_value,
          variance_amount,
          affected_date,
          affected_entity_name,
          created_at,
          project:projects(name)
        `)
        .in('status', ['open', 'acknowledged', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (!violError && violData && violData.length > 0) {
        setViolations(violData.map((v: any) => ({
          ...v,
          project_name: v.project?.name || null,
        })));
      } else {
        // Use demo data if no real violations
        setViolations(DEMO_VIOLATIONS);
      }
    } catch (err) {
      console.error('Error loading compliance data:', err);
      setDeadlines(DEMO_DEADLINES);
      setEscalations(DEMO_ESCALATIONS);
      setViolations(DEMO_VIOLATIONS);
      setIsUsingDemo(true);
    } finally {
      setLoading(false);
    }
  }

  // Calculate stats
  const stats = useMemo<ComplianceStats>(() => {
    let onTrack = 0;
    let warning = 0;
    let urgent = 0;
    let overdue = 0;
    let totalAmount = 0;

    deadlines.forEach(d => {
      totalAmount += d.net_pay_amount || 0;
      if (d.days_remaining < 0) {
        overdue++;
      } else if (d.days_remaining <= 3) {
        urgent++;
      } else if (d.days_remaining <= 7) {
        warning++;
      } else {
        onTrack++;
      }
    });

    return {
      onTrack,
      warning,
      urgent,
      overdue,
      totalPending: deadlines.length,
      totalAmount,
    };
  }, [deadlines]);

  // Group deadlines by urgency
  const groupedDeadlines = useMemo(() => {
    const overdue = deadlines.filter(d => d.days_remaining < 0);
    const urgent = deadlines.filter(d => d.days_remaining >= 0 && d.days_remaining <= 3);
    const warning = deadlines.filter(d => d.days_remaining > 3 && d.days_remaining <= 7);
    const onTrack = deadlines.filter(d => d.days_remaining > 7);

    return { overdue, urgent, warning, onTrack };
  }, [deadlines]);

  // Calculate violation stats
  const violationStats = useMemo<ViolationStats>(() => {
    const open = violations.filter(v => v.status === 'open').length;
    const critical = violations.filter(v => v.severity === 'critical').length;
    const blocking = violations.filter(v => v.severity === 'blocking').length;
    const wageViolations = violations.filter(v =>
      v.violation_type.includes('wage')
    ).length;
    const certViolations = violations.filter(v =>
      v.violation_type.includes('certification')
    ).length;
    const paymentViolations = violations.filter(v =>
      v.violation_type.includes('payment')
    ).length;

    return {
      total: violations.length,
      open,
      critical,
      blocking,
      wageViolations,
      certViolations,
      paymentViolations,
    };
  }, [violations]);

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

  const acknowledgeEscalation = async (id: string) => {
    if (isUsingDemo) {
      setEscalations(prev => prev.filter(e => e.id !== id));
      return;
    }

    const { error } = await supabase
      .from('compliance_escalations' as any)
      .update({ pm_notified_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      setEscalations(prev => prev.filter(e => e.id !== id));
    }
  };

  const acknowledgeViolation = useCallback(async (id: string) => {
    if (isUsingDemo) {
      setViolations(prev => prev.map(v =>
        v.id === id ? { ...v, status: 'acknowledged' } : v
      ));
      return;
    }

    const { error } = await supabase
      // @ts-expect-error Table not yet in generated types
      .from('compliance_violations' as const)
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (!error) {
      setViolations(prev => prev.map(v =>
        v.id === id ? { ...v, status: 'acknowledged' } : v
      ));
    }
  }, [isUsingDemo]);

  const resolveViolation = useCallback(async (id: string) => {
    if (isUsingDemo) {
      setViolations(prev => prev.filter(v => v.id !== id));
      return;
    }

    const { error } = await supabase
      // @ts-expect-error Table not yet in generated types
      .from('compliance_violations' as const)
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (!error) {
      setViolations(prev => prev.filter(v => v.id !== id));
    }
  }, [isUsingDemo]);

  if (loading) {
    return (
      <div className="compliance-dashboard loading">
        <RefreshCw size={32} className="spin" />
        <p>Loading compliance data...</p>
      </div>
    );
  }

  return (
    <div className="compliance-dashboard">
      {/* New Violation Alert Toast */}
      {newViolationAlert && (
        <div className="violation-alert-toast">
          <AlertTriangle size={18} />
          <span>New Compliance Violation: {newViolationAlert}</span>
          <button onClick={() => setNewViolationAlert(null)}>&times;</button>
        </div>
      )}

      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Compliance Dashboard</h1>
          <p>Track payment deadlines, wage compliance, and certification status</p>
        </div>
        <button className="btn-secondary" onClick={loadData}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'deadlines' ? 'active' : ''}`}
          onClick={() => setActiveTab('deadlines')}
        >
          <Calendar size={16} />
          Payment Deadlines
          {stats.overdue > 0 && (
            <span className="tab-badge overdue">{stats.overdue}</span>
          )}
        </button>
        <button
          className={`tab-btn ${activeTab === 'violations' ? 'active' : ''}`}
          onClick={() => setActiveTab('violations')}
        >
          <Shield size={16} />
          Compliance Violations
          {(violationStats.critical + violationStats.blocking) > 0 && (
            <span className="tab-badge critical">{violationStats.critical + violationStats.blocking}</span>
          )}
        </button>
      </div>

      {isUsingDemo && (
        <div className="demo-banner">
          <AlertTriangle size={16} />
          <span>Showing demo data. Upload pay estimates to see real compliance data.</span>
        </div>
      )}

      {/* Stats Grid - Deadlines Tab */}
      {activeTab === 'deadlines' && (
        <div className="stats-grid">
          <div className="stat-card overdue">
            <div className="stat-icon">
              <AlertTriangle size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.overdue}</span>
              <span className="stat-label">Overdue</span>
            </div>
          </div>

          <div className="stat-card urgent">
            <div className="stat-icon">
              <AlertCircle size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.urgent}</span>
              <span className="stat-label">Due in 3 days</span>
            </div>
          </div>

          <div className="stat-card warning">
            <div className="stat-icon">
              <Clock size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.warning}</span>
              <span className="stat-label">Due in 7 days</span>
            </div>
          </div>

          <div className="stat-card on-track">
            <div className="stat-icon">
              <CheckCircle size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.onTrack}</span>
              <span className="stat-label">On Track</span>
            </div>
          </div>

          <div className="stat-card total">
            <div className="stat-icon">
              <DollarSign size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{formatCurrency(stats.totalAmount)}</span>
              <span className="stat-label">Total Pending</span>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid - Violations Tab */}
      {activeTab === 'violations' && (
        <div className="stats-grid violations-stats">
          <div className="stat-card blocking">
            <div className="stat-icon">
              <XCircle size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{violationStats.blocking}</span>
              <span className="stat-label">Blocking</span>
            </div>
          </div>

          <div className="stat-card critical">
            <div className="stat-icon">
              <AlertTriangle size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{violationStats.critical}</span>
              <span className="stat-label">Critical</span>
            </div>
          </div>

          <div className="stat-card warning">
            <div className="stat-icon">
              <DollarSign size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{violationStats.wageViolations}</span>
              <span className="stat-label">Wage Rate</span>
            </div>
          </div>

          <div className="stat-card info">
            <div className="stat-icon">
              <Users size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{violationStats.certViolations}</span>
              <span className="stat-label">Certifications</span>
            </div>
          </div>

          <div className="stat-card total">
            <div className="stat-icon">
              <Shield size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{violationStats.open}</span>
              <span className="stat-label">Open Issues</span>
            </div>
          </div>
        </div>
      )}

      {/* Deadlines Tab Content */}
      {activeTab === 'deadlines' && (
        <>
          {/* Active Escalations */}
          {escalations.length > 0 && (
            <div className="escalations-section">
              <h2>
                <Bell size={18} />
                Active Alerts ({escalations.length})
              </h2>
              <div className="escalation-list">
                {escalations.map(esc => {
                  const config = LEVEL_CONFIG[esc.escalation_level];
                  const Icon = config.icon;
                  return (
                    <div
                      key={esc.id}
                      className="escalation-card"
                      style={{ borderLeftColor: config.color }}
                    >
                      <div className="escalation-header">
                        <span
                          className="escalation-badge"
                          style={{ backgroundColor: config.bgColor, color: config.color }}
                        >
                          <Icon size={14} />
                          {config.label}
                        </span>
                        <span className="escalation-date">{formatDate(esc.escalation_date)}</span>
                      </div>
                      <p className="escalation-message">{esc.message}</p>
                      <div className="escalation-meta">
                        <span>{esc.project_name}</span>
                        <span>Estimate #{esc.estimate_number}</span>
                      </div>
                      <div className="escalation-actions">
                        <Link to={`/pay-estimates/${esc.pay_period_id}`} className="link-action">
                          View Details <ExternalLink size={14} />
                        </Link>
                        <button className="btn-acknowledge" onClick={() => acknowledgeEscalation(esc.id)}>
                          Acknowledge
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Deadline Timeline */}
          <div className="timeline-section">
            <h2>
              <Calendar size={18} />
              Payment Deadline Timeline
            </h2>

            {/* Overdue */}
            {groupedDeadlines.overdue.length > 0 && (
              <div className="timeline-group overdue">
                <h3>
                  <AlertTriangle size={16} />
                  Overdue ({groupedDeadlines.overdue.length})
                </h3>
                <div className="deadline-list">
                  {groupedDeadlines.overdue.map(d => (
                    <DeadlineCard key={d.id} deadline={d} />
                  ))}
                </div>
              </div>
            )}

            {/* Urgent (0-3 days) */}
            {groupedDeadlines.urgent.length > 0 && (
              <div className="timeline-group urgent">
                <h3>
                  <AlertCircle size={16} />
                  Critical - Due Within 3 Days ({groupedDeadlines.urgent.length})
                </h3>
                <div className="deadline-list">
                  {groupedDeadlines.urgent.map(d => (
                    <DeadlineCard key={d.id} deadline={d} />
                  ))}
                </div>
              </div>
            )}

            {/* Warning (4-7 days) */}
            {groupedDeadlines.warning.length > 0 && (
              <div className="timeline-group warning">
                <h3>
                  <Clock size={16} />
                  Due Within 7 Days ({groupedDeadlines.warning.length})
                </h3>
                <div className="deadline-list">
                  {groupedDeadlines.warning.map(d => (
                    <DeadlineCard key={d.id} deadline={d} />
                  ))}
                </div>
              </div>
            )}

            {/* On Track (8+ days) */}
            {groupedDeadlines.onTrack.length > 0 && (
              <div className="timeline-group on-track">
                <h3>
                  <CheckCircle size={16} />
                  On Track ({groupedDeadlines.onTrack.length})
                </h3>
                <div className="deadline-list">
                  {groupedDeadlines.onTrack.map(d => (
                    <DeadlineCard key={d.id} deadline={d} />
                  ))}
                </div>
              </div>
            )}

            {deadlines.length === 0 && (
              <div className="empty-state">
                <CheckCircle size={48} />
                <h3>All Clear</h3>
                <p>No pending payment deadlines to track.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Violations Tab Content */}
      {activeTab === 'violations' && (
        <div className="violations-section">
          <h2>
            <Shield size={18} />
            Compliance Violations ({violations.length})
          </h2>

          {violations.length === 0 ? (
            <div className="empty-state">
              <CheckCircle size={48} />
              <h3>All Clear</h3>
              <p>No compliance violations detected.</p>
            </div>
          ) : (
            <div className="violations-list">
              {violations.map(violation => {
                const severityConfig = SEVERITY_CONFIG[violation.severity];
                const SeverityIcon = severityConfig.icon;
                const TypeIcon = VIOLATION_TYPE_ICONS[violation.violation_type] ?? Shield;

                return (
                  <div
                    key={violation.id}
                    className={`violation-card ${violation.severity}`}
                    style={{ borderLeftColor: severityConfig.color }}
                  >
                    <div className="violation-header">
                      <div className="violation-type">
                        <TypeIcon size={16} />
                        <span className="violation-title">{violation.title}</span>
                      </div>
                      <span
                        className="severity-badge"
                        style={{ backgroundColor: severityConfig.bgColor, color: severityConfig.color }}
                      >
                        <SeverityIcon size={12} />
                        {severityConfig.label}
                      </span>
                    </div>

                    <p className="violation-description">{violation.description}</p>

                    {(violation.expected_value !== null || violation.actual_value !== null) && (
                      <div className="violation-values">
                        {violation.expected_value !== null && (
                          <div className="value-item">
                            <span className="value-label">Expected:</span>
                            <span className="value">${violation.expected_value.toFixed(2)}</span>
                          </div>
                        )}
                        {violation.actual_value !== null && (
                          <div className="value-item">
                            <span className="value-label">Actual:</span>
                            <span className="value">${violation.actual_value.toFixed(2)}</span>
                          </div>
                        )}
                        {violation.variance_amount !== null && (
                          <div className="value-item variance">
                            <span className="value-label">Variance:</span>
                            <span className="value negative">
                              -${Math.abs(violation.variance_amount).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="violation-meta">
                      {violation.project_name && <span>{violation.project_name}</span>}
                      {violation.affected_entity_name && <span>{violation.affected_entity_name}</span>}
                      {violation.affected_date && <span>{formatDate(violation.affected_date)}</span>}
                    </div>

                    <div className="violation-actions">
                      {violation.status === 'open' && (
                        <button
                          className="btn-acknowledge"
                          onClick={() => acknowledgeViolation(violation.id)}
                        >
                          Acknowledge
                        </button>
                      )}
                      <button
                        className="btn-resolve"
                        onClick={() => resolveViolation(violation.id)}
                      >
                        Mark Resolved
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Deadline Card Component
function DeadlineCard({ deadline }: { deadline: PayPeriodDeadline }) {
  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Link to={`/pay-estimates/${deadline.id}`} className="deadline-card">
      <div className="deadline-progress">
        <div
          className={`progress-indicator ${
            deadline.days_remaining < 0 ? 'overdue' :
            deadline.days_remaining <= 3 ? 'urgent' :
            deadline.days_remaining <= 7 ? 'warning' : 'on-track'
          }`}
        >
          <span className="days">{Math.abs(deadline.days_remaining)}</span>
          <span className="label">{deadline.days_remaining < 0 ? 'days late' : 'days'}</span>
        </div>
      </div>

      <div className="deadline-info">
        <div className="deadline-project">
          <Building2 size={14} />
          <span className="project-name">{deadline.project_name}</span>
          <span className="contract">{deadline.contract_number}</span>
        </div>
        <div className="deadline-details">
          <span className="estimate">Est #{deadline.estimate_number}</span>
          <span className="deadline-date">
            Deadline: {formatDate(deadline.payment_deadline_date)}
          </span>
        </div>
      </div>

      <div className="deadline-amount">
        <span className="amount">{formatCurrency(deadline.net_pay_amount)}</span>
        {deadline.sub_payments_pending > 0 && (
          <span className="sub-status">
            {deadline.sub_payments_pending} sub payments pending
          </span>
        )}
      </div>

      <ChevronRight size={16} className="chevron" />
    </Link>
  );
}
