import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@triton/supabase-client';
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Users,
  Building2,
} from 'lucide-react';
import './PayPeriodDetail.css';

interface PayPeriod {
  id: string;
  organization_id: string;
  project_id: string;
  estimate_number: number;
  period_start_date: string | null;
  period_end_date: string;
  status: string;
  preliminary_received_at: string | null;
  final_received_at: string | null;
  posted_item_pay: number | null;
  asphalt_adjustment: number | null;
  fuel_adjustment: number | null;
  construction_stockpile: number | null;
  material_withheld: number | null;
  material_credit: number | null;
  liquidated_damages: number | null;
  incentive: number | null;
  disincentive: number | null;
  gross_item_pay: number | null;
  net_pay_amount: number | null;
  cumulative_posted_item_pay: number | null;
  cumulative_net_pay: number | null;
  funds_received_date: string | null;
  payment_deadline_date: string | null;
  preliminary_document_url: string | null;
  final_document_url: string | null;
  imr_document_url: string | null;
  project?: {
    name: string;
    contract_number: string | null;
  };
}

interface LineItem {
  id: string;
  line_number: string;
  item_number: string;
  description: string;
  unit: string;
  unit_price: number;
  plan_qty: number | null;
  this_estimate_qty: number;
  this_estimate_amount: number;
  total_to_date_qty: number;
  total_to_date_amount: number;
}

interface IMRItem {
  id: string;
  item_number: string;
  item_description: string;
  deficiency_description?: string | null;
  deficiency_type: string;
  amount_withheld: number | null;
  resolution_status: string;
  resolution_amount?: number | null;
}

interface SubPayment {
  id: string;
  subcontractor_name: string;
  this_period_amount: number;
  retainage_amount: number;
  net_payment: number;
  status: string;
}

// Demo data
const DEMO_PAY_PERIOD: PayPeriod = {
  id: 'demo-pp-1',
  organization_id: 'demo-org',
  project_id: 'demo-project-1',
  estimate_number: 15,
  period_start_date: '2024-11-01',
  period_end_date: '2024-11-30',
  status: 'FUNDS_RECEIVED',
  preliminary_received_at: '2024-12-01T10:30:00Z',
  final_received_at: '2024-12-02T14:15:00Z',
  posted_item_pay: 847592.50,
  asphalt_adjustment: 12340.00,
  fuel_adjustment: 3245.00,
  construction_stockpile: 45000.00,
  material_withheld: 24447.50,
  material_credit: 8500.00,
  liquidated_damages: 0,
  incentive: 0,
  disincentive: 0,
  gross_item_pay: 908677.50,
  net_pay_amount: 823145.00,
  cumulative_posted_item_pay: 12456780.25,
  cumulative_net_pay: 11234567.00,
  funds_received_date: '2024-12-03',
  payment_deadline_date: '2024-12-17',
  preliminary_document_url: null,
  final_document_url: null,
  imr_document_url: null,
  project: { name: 'Corridor H Section 12', contract_number: 'DOH-2024-0345' },
};

const DEMO_LINE_ITEMS: LineItem[] = [
  { id: '1', line_number: '0645', item_number: '636060-002', description: 'SUPERPAVE ASPHALT BASE, 25MM', unit: 'TON', unit_price: 85.50, plan_qty: 15000, this_estimate_qty: 1245.5, this_estimate_amount: 106490.25, total_to_date_qty: 12450, total_to_date_amount: 1064475.00 },
  { id: '2', line_number: '0650', item_number: '636060-007', description: 'SUPERPAVE ASPHALT WEARING, 9.5MM', unit: 'TON', unit_price: 92.75, plan_qty: 8500, this_estimate_qty: 850.0, this_estimate_amount: 78837.50, total_to_date_qty: 7650, total_to_date_amount: 709537.50 },
  { id: '3', line_number: '0710', item_number: '603030-002', description: 'PIPE CULVERT, 18" DIA', unit: 'LF', unit_price: 145.00, plan_qty: 2400, this_estimate_qty: 240, this_estimate_amount: 34800.00, total_to_date_qty: 1920, total_to_date_amount: 278400.00 },
  { id: '4', line_number: '0715', item_number: '603030-003', description: 'PIPE CULVERT, 24" DIA', unit: 'LF', unit_price: 185.00, plan_qty: 1200, this_estimate_qty: 80, this_estimate_amount: 14800.00, total_to_date_qty: 960, total_to_date_amount: 177600.00 },
  { id: '5', line_number: '0820', item_number: '615030-001', description: 'GUARDRAIL, TYPE 31', unit: 'LF', unit_price: 32.50, plan_qty: 24000, this_estimate_qty: 2400, this_estimate_amount: 78000.00, total_to_date_qty: 19200, total_to_date_amount: 624000.00 },
];

const DEMO_IMR_ITEMS: IMRItem[] = [
  { id: '1', item_number: '636060-002', item_description: 'SUPERPAVE ASPHALT BASE', deficiency_description: 'Lab QC gradation out of tolerance', deficiency_type: 'LAB_QC', amount_withheld: 15250.00, resolution_status: 'PENDING_STATE_REVIEW', resolution_amount: null },
  { id: '2', item_number: '603030-002', item_description: 'PIPE CULVERT', deficiency_description: 'Missing compaction test', deficiency_type: 'FIELD_QA', amount_withheld: 9197.50, resolution_status: 'DOCUMENTATION_SUBMITTED', resolution_amount: null },
];

const DEMO_SUB_PAYMENTS: SubPayment[] = [
  { id: '1', subcontractor_name: 'Valley Paving Inc.', this_period_amount: 185240.00, retainage_amount: 9262.00, net_payment: 175978.00, status: 'PENDING_APPROVAL' },
  { id: '2', subcontractor_name: 'Mountain Guardrail Systems', this_period_amount: 78000.00, retainage_amount: 3900.00, net_payment: 74100.00, status: 'PENDING_APPROVAL' },
  { id: '3', subcontractor_name: 'River Drainage Solutions', this_period_amount: 49600.00, retainage_amount: 2480.00, net_payment: 47120.00, status: 'DRAFT' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
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

export function PayPeriodDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [payPeriod, setPayPeriod] = useState<PayPeriod | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [imrItems, setImrItems] = useState<IMRItem[]>([]);
  const [subPayments, setSubPayments] = useState<SubPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUsingDemo, setIsUsingDemo] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('summary');

  useEffect(() => {
    if (id) {
      loadPayPeriodData(id);
    }
  }, [id]);

  async function loadPayPeriodData(payPeriodId: string) {
    setLoading(true);

    try {
      // Load pay period
      const { data: ppData, error: ppError } = await supabase
        .from('pay_periods')
        .select(`
          *,
          project:projects(name, contract_number)
        `)
        .eq('id', payPeriodId)
        .single();

      if (ppError) throw ppError;

      if (ppData) {
        setPayPeriod(ppData as PayPeriod);

        // Load line items
        const { data: lineData } = await supabase
          .from('pay_period_line_items')
          .select('*')
          .eq('pay_period_id', payPeriodId)
          .order('line_number');

        if (lineData && lineData.length > 0) {
          setLineItems(lineData as LineItem[]);
        } else {
          setLineItems(DEMO_LINE_ITEMS);
        }

        // Load IMR items
        const { data: imrData } = await supabase
          .from('imr_items')
          .select('*')
          .eq('pay_period_id', payPeriodId);

        if (imrData && imrData.length > 0) {
          setImrItems(imrData.map((item: any) => ({
            id: item.id,
            item_number: item.item_number,
            item_description: item.item_description,
            deficiency_description: item.deficiency_description,
            deficiency_type: item.deficiency_type,
            amount_withheld: item.amount_withheld,
            resolution_status: item.resolution_status,
            resolution_amount: item.resolution_amount,
          })));
        } else {
          setImrItems(DEMO_IMR_ITEMS);
        }

        // Load sub payments
        const { data: subData } = await supabase
          .from('sub_payments')
          .select(`
            *,
            subcontractor:subcontractors(company_name)
          `)
          .eq('pay_period_id', payPeriodId);

        if (subData && subData.length > 0) {
          setSubPayments(subData.map((s: any) => ({
            ...s,
            subcontractor_name: s.subcontractor?.company_name || 'Unknown',
          })));
        } else {
          setSubPayments(DEMO_SUB_PAYMENTS);
        }

        setIsUsingDemo(false);
      } else {
        // Use demo data
        setPayPeriod(DEMO_PAY_PERIOD);
        setLineItems(DEMO_LINE_ITEMS);
        setImrItems(DEMO_IMR_ITEMS);
        setSubPayments(DEMO_SUB_PAYMENTS);
        setIsUsingDemo(true);
      }
    } catch (err) {
      console.error('Error loading pay period:', err);
      setPayPeriod(DEMO_PAY_PERIOD);
      setLineItems(DEMO_LINE_ITEMS);
      setImrItems(DEMO_IMR_ITEMS);
      setSubPayments(DEMO_SUB_PAYMENTS);
      setIsUsingDemo(true);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
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

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getDaysRemaining = (deadlineStr: string | null) => {
    if (!deadlineStr) return null;
    const deadline = new Date(deadlineStr);
    const now = new Date();
    return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (loading) {
    return (
      <div className="pay-period-detail loading">
        <RefreshCw size={32} className="spin" />
        <p>Loading pay period details...</p>
      </div>
    );
  }

  if (!payPeriod) {
    return (
      <div className="pay-period-detail error">
        <AlertTriangle size={32} />
        <p>Pay period not found</p>
        <button onClick={() => navigate('/pay-estimates')}>Back to Dashboard</button>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining(payPeriod.payment_deadline_date);
  const statusConfig = STATUS_CONFIG[payPeriod.status] ?? { label: 'Unknown', color: '#6B7280', bgColor: '#F3F4F6' };

  return (
    <div className="pay-period-detail">
      {/* Header */}
      <div className="detail-header">
        <button className="back-button" onClick={() => navigate('/pay-estimates')}>
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="header-info">
          <div className="header-title">
            <h1>Pay Estimate #{payPeriod.estimate_number}</h1>
            <span
              className="status-badge"
              style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
            >
              {statusConfig.label}
            </span>
          </div>
          <div className="header-meta">
            <span className="project-name">
              <Building2 size={14} />
              {payPeriod.project?.name}
            </span>
            <span className="contract-number">{payPeriod.project?.contract_number}</span>
            <span className="period-dates">
              <Calendar size={14} />
              {formatDate(payPeriod.period_start_date)} - {formatDate(payPeriod.period_end_date)}
            </span>
          </div>
        </div>

        {payPeriod.final_document_url && (
          <a href={payPeriod.final_document_url} target="_blank" className="btn-secondary">
            <Download size={16} />
            View PDF
          </a>
        )}
      </div>

      {isUsingDemo && (
        <div className="demo-banner">
          <AlertTriangle size={16} />
          <span>Showing demo data for this pay period.</span>
        </div>
      )}

      {/* 14-Day Deadline Warning */}
      {payPeriod.payment_deadline_date && daysRemaining !== null && (
        <div className={`deadline-banner ${daysRemaining <= 0 ? 'overdue' : daysRemaining <= 3 ? 'urgent' : daysRemaining <= 7 ? 'warning' : 'ok'}`}>
          <Clock size={20} />
          <div className="deadline-content">
            <span className="deadline-title">14-Day Payment Deadline</span>
            <span className="deadline-date">
              {formatDate(payPeriod.payment_deadline_date)}
              {daysRemaining < 0
                ? ` (${Math.abs(daysRemaining)} days overdue)`
                : daysRemaining === 0
                ? ' (Today!)'
                : ` (${daysRemaining} days remaining)`}
            </span>
          </div>
          {['FUNDS_RECEIVED', 'SUB_WS_IN_PROGRESS', 'PENDING_APPROVAL'].includes(payPeriod.status) && (
            <Link to={`/pay-estimates/subcontractor?period=${payPeriod.id}`} className="deadline-action">
              Complete Sub Worksheet
            </Link>
          )}
        </div>
      )}

      {/* Financial Summary */}
      <div className="section">
        <button
          className="section-header collapsible"
          onClick={() => toggleSection('summary')}
        >
          <h2>
            <DollarSign size={18} />
            Financial Summary
          </h2>
          {expandedSection === 'summary' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {expandedSection === 'summary' && (
          <div className="section-content">
            <div className="summary-grid">
              <div className="summary-card primary">
                <span className="label">Posted Item Pay</span>
                <span className="value">{formatCurrency(payPeriod.posted_item_pay)}</span>
              </div>
              <div className="summary-card">
                <span className="label">Asphalt Adjustment</span>
                <span className="value">{formatCurrency(payPeriod.asphalt_adjustment)}</span>
              </div>
              <div className="summary-card">
                <span className="label">Fuel Adjustment</span>
                <span className="value">{formatCurrency(payPeriod.fuel_adjustment)}</span>
              </div>
              <div className="summary-card">
                <span className="label">Stockpile</span>
                <span className="value">{formatCurrency(payPeriod.construction_stockpile)}</span>
              </div>
              <div className="summary-card negative">
                <span className="label">Material Withheld (IMR)</span>
                <span className="value">({formatCurrency(payPeriod.material_withheld)})</span>
              </div>
              <div className="summary-card positive">
                <span className="label">Material Credit</span>
                <span className="value">{formatCurrency(payPeriod.material_credit)}</span>
              </div>
              <div className="summary-card highlight">
                <span className="label">Net Pay Amount</span>
                <span className="value">{formatCurrency(payPeriod.net_pay_amount)}</span>
              </div>
            </div>

            <div className="cumulative-totals">
              <h3>Cumulative Totals</h3>
              <div className="cumulative-row">
                <span className="label">Total Posted Item Pay to Date:</span>
                <span className="value">{formatCurrency(payPeriod.cumulative_posted_item_pay)}</span>
              </div>
              <div className="cumulative-row">
                <span className="label">Total Net Pay to Date:</span>
                <span className="value">{formatCurrency(payPeriod.cumulative_net_pay)}</span>
              </div>
            </div>

            <div className="timeline">
              <h3>Document Timeline</h3>
              <div className="timeline-items">
                <div className={`timeline-item ${payPeriod.preliminary_received_at ? 'completed' : ''}`}>
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <span className="timeline-label">Preliminary Received</span>
                    <span className="timeline-date">{formatDateTime(payPeriod.preliminary_received_at)}</span>
                  </div>
                </div>
                <div className={`timeline-item ${payPeriod.final_received_at ? 'completed' : ''}`}>
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <span className="timeline-label">Final Received</span>
                    <span className="timeline-date">{formatDateTime(payPeriod.final_received_at)}</span>
                  </div>
                </div>
                <div className={`timeline-item ${payPeriod.funds_received_date ? 'completed' : ''}`}>
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <span className="timeline-label">Funds Received</span>
                    <span className="timeline-date">{formatDate(payPeriod.funds_received_date)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Line Items */}
      <div className="section">
        <button
          className="section-header collapsible"
          onClick={() => toggleSection('lineitems')}
        >
          <h2>
            <FileText size={18} />
            Line Items ({lineItems.length})
          </h2>
          {expandedSection === 'lineitems' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {expandedSection === 'lineitems' && (
          <div className="section-content">
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Line #</th>
                    <th>Item #</th>
                    <th>Description</th>
                    <th>Unit</th>
                    <th>Unit Price</th>
                    <th>This Est Qty</th>
                    <th>This Est Amt</th>
                    <th>To Date Qty</th>
                    <th>To Date Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map(item => (
                    <tr key={item.id}>
                      <td>{item.line_number}</td>
                      <td className="mono">{item.item_number}</td>
                      <td>{item.description}</td>
                      <td>{item.unit}</td>
                      <td className="amount">{formatCurrency(item.unit_price)}</td>
                      <td className="amount">{item.this_estimate_qty.toLocaleString()}</td>
                      <td className="amount">{formatCurrency(item.this_estimate_amount)}</td>
                      <td className="amount">{item.total_to_date_qty.toLocaleString()}</td>
                      <td className="amount">{formatCurrency(item.total_to_date_amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={6}>Totals</td>
                    <td className="amount">
                      {formatCurrency(lineItems.reduce((sum, i) => sum + i.this_estimate_amount, 0))}
                    </td>
                    <td></td>
                    <td className="amount">
                      {formatCurrency(lineItems.reduce((sum, i) => sum + i.total_to_date_amount, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* IMR Items */}
      <div className="section">
        <button
          className="section-header collapsible"
          onClick={() => toggleSection('imr')}
        >
          <h2>
            <AlertTriangle size={18} />
            IMR Deficiencies ({imrItems.length})
          </h2>
          {expandedSection === 'imr' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {expandedSection === 'imr' && (
          <div className="section-content">
            {imrItems.length > 0 ? (
              <div className="imr-list">
                {imrItems.map(item => (
                  <div key={item.id} className="imr-card">
                    <div className="imr-header">
                      <span className="item-number">{item.item_number}</span>
                      <span className={`imr-status ${item.resolution_status.toLowerCase().replace(/_/g, '-')}`}>
                        {item.resolution_status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="imr-description">{item.item_description}{item.deficiency_description ? ` - ${item.deficiency_description}` : ''}</p>
                    <div className="imr-details">
                      <div className="imr-detail">
                        <span className="label">Type</span>
                        <span className="value">{item.deficiency_type.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="imr-detail">
                        <span className="label">Withheld</span>
                        <span className="value negative">{formatCurrency(item.amount_withheld)}</span>
                      </div>
                      {item.resolution_amount && (
                        <div className="imr-detail">
                          <span className="label">Resolved</span>
                          <span className="value positive">{formatCurrency(item.resolution_amount)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <CheckCircle size={32} />
                <p>No IMR deficiencies for this pay period</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Subcontractor Payments */}
      <div className="section">
        <button
          className="section-header collapsible"
          onClick={() => toggleSection('subpayments')}
        >
          <h2>
            <Users size={18} />
            Subcontractor Payments ({subPayments.length})
          </h2>
          {expandedSection === 'subpayments' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {expandedSection === 'subpayments' && (
          <div className="section-content">
            {subPayments.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Subcontractor</th>
                      <th>This Period</th>
                      <th>Retainage</th>
                      <th>Net Payment</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subPayments.map(sub => (
                      <tr key={sub.id}>
                        <td className="sub-name">{sub.subcontractor_name}</td>
                        <td className="amount">{formatCurrency(sub.this_period_amount)}</td>
                        <td className="amount negative">({formatCurrency(sub.retainage_amount)})</td>
                        <td className="amount highlight">{formatCurrency(sub.net_payment)}</td>
                        <td>
                          <span className={`status-pill ${sub.status.toLowerCase().replace(/_/g, '-')}`}>
                            {sub.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>Totals</td>
                      <td className="amount">
                        {formatCurrency(subPayments.reduce((sum, s) => sum + s.this_period_amount, 0))}
                      </td>
                      <td className="amount negative">
                        ({formatCurrency(subPayments.reduce((sum, s) => sum + s.retainage_amount, 0))})
                      </td>
                      <td className="amount highlight">
                        {formatCurrency(subPayments.reduce((sum, s) => sum + s.net_payment, 0))}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <Users size={32} />
                <p>No subcontractor payments allocated yet</p>
                <Link to={`/pay-estimates/subcontractor?period=${payPeriod.id}`} className="btn-primary">
                  Create Worksheet
                </Link>
              </div>
            )}

            {subPayments.length > 0 && (
              <div className="section-actions">
                <Link to={`/pay-estimates/subcontractor?period=${payPeriod.id}`} className="btn-secondary">
                  <ExternalLink size={16} />
                  Edit Worksheet
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
