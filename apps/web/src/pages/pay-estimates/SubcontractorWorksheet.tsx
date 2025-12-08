import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@triton/supabase-client';
import {
  ArrowLeft,
  Users,
  AlertTriangle,
  CheckCircle,
  Save,
  Send,
  Plus,
  Trash2,
  RefreshCw,
  Building2,
} from 'lucide-react';
import './SubcontractorWorksheet.css';

interface PayPeriod {
  id: string;
  estimate_number: number;
  period_end_date: string;
  net_pay_amount: number | null;
  payment_deadline_date: string | null;
  project?: {
    name: string;
    contract_number: string | null;
  };
}

interface Subcontractor {
  id: string;
  company_name: string;
  is_dbe_certified?: boolean;
  is_dbe: boolean;
}

interface SubAllocation {
  id: string;
  subcontractor_id: string;
  subcontractor_name: string;
  contract_amount: number;
  paid_to_date: number;
  this_period_amount: number;
  retainage_percent: number;
  retainage_amount: number;
  net_payment: number;
  is_dbe: boolean;
  status: string;
  notes: string;
  isNew?: boolean;
}

// Demo data
const DEMO_PAY_PERIOD: PayPeriod = {
  id: 'demo-pp-1',
  estimate_number: 15,
  period_end_date: '2024-11-30',
  net_pay_amount: 823145.00,
  payment_deadline_date: '2024-12-17',
  project: { name: 'Corridor H Section 12', contract_number: 'DOH-2024-0345' },
};

const DEMO_SUBCONTRACTORS: Subcontractor[] = [
  { id: 'sub-1', company_name: 'Valley Paving Inc.', is_dbe: false },
  { id: 'sub-2', company_name: 'Mountain Guardrail Systems', is_dbe: true },
  { id: 'sub-3', company_name: 'River Drainage Solutions', is_dbe: true },
  { id: 'sub-4', company_name: 'Summit Electrical Contractors', is_dbe: false },
  { id: 'sub-5', company_name: 'Blue Ridge Striping Co.', is_dbe: true },
];

const DEMO_ALLOCATIONS: SubAllocation[] = [
  { id: 'alloc-1', subcontractor_id: 'sub-1', subcontractor_name: 'Valley Paving Inc.', contract_amount: 2450000, paid_to_date: 1875000, this_period_amount: 185240.00, retainage_percent: 5, retainage_amount: 9262.00, net_payment: 175978.00, is_dbe: false, status: 'DRAFT', notes: '' },
  { id: 'alloc-2', subcontractor_id: 'sub-2', subcontractor_name: 'Mountain Guardrail Systems', contract_amount: 780000, paid_to_date: 624000, this_period_amount: 78000.00, retainage_percent: 5, retainage_amount: 3900.00, net_payment: 74100.00, is_dbe: true, status: 'DRAFT', notes: '' },
  { id: 'alloc-3', subcontractor_id: 'sub-3', subcontractor_name: 'River Drainage Solutions', contract_amount: 456000, paid_to_date: 342000, this_period_amount: 49600.00, retainage_percent: 5, retainage_amount: 2480.00, net_payment: 47120.00, is_dbe: true, status: 'DRAFT', notes: '' },
];

export function SubcontractorWorksheet() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const periodId = searchParams.get('period');

  const [payPeriod, setPayPeriod] = useState<PayPeriod | null>(null);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [allocations, setAllocations] = useState<SubAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUsingDemo, setIsUsingDemo] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [periodId]);

  async function loadData() {
    setLoading(true);

    try {
      if (periodId) {
        // Load pay period
        const { data: ppData } = await supabase
          .from('pay_periods')
          .select(`*, project:projects(name, contract_number)`)
          .eq('id', periodId)
          .single();

        if (ppData) {
          setPayPeriod(ppData as PayPeriod);

          // Load subcontractors
          const { data: subData } = await supabase
            .from('subcontractors')
            .select('id, company_name, is_dbe_certified')
            .eq('organization_id', ppData.organization_id)
            .order('company_name');

          if (subData && subData.length > 0) {
            setSubcontractors(subData.map((s: any) => ({
              id: s.id,
              company_name: s.company_name,
              is_dbe_certified: s.is_dbe_certified,
              is_dbe: s.is_dbe_certified || false,
            })));
          } else {
            setSubcontractors(DEMO_SUBCONTRACTORS);
          }

          // Load existing allocations
          const { data: allocData } = await supabase
            .from('sub_payment_allocations')
            .select(`
              *,
              subcontractor:subcontractors(company_name, is_dbe_certified)
            `)
            .eq('pay_period_id', periodId);

          if (allocData && allocData.length > 0) {
            setAllocations(allocData.map((a: any) => ({
              id: a.id,
              subcontractor_id: a.subcontractor_id,
              subcontractor_name: a.subcontractor?.company_name || 'Unknown',
              contract_amount: 0,
              paid_to_date: 0,
              this_period_amount: a.this_period_amount || 0,
              retainage_percent: a.retainage_percent || 5,
              retainage_amount: a.retainage_amount || 0,
              net_payment: a.net_payment || 0,
              is_dbe: a.subcontractor?.is_dbe_certified || false,
              status: a.status || 'DRAFT',
              notes: a.notes || '',
            })));
            setIsUsingDemo(false);
          } else {
            setAllocations(DEMO_ALLOCATIONS);
            setIsUsingDemo(true);
          }
        } else {
          setPayPeriod(DEMO_PAY_PERIOD);
          setSubcontractors(DEMO_SUBCONTRACTORS);
          setAllocations(DEMO_ALLOCATIONS);
          setIsUsingDemo(true);
        }
      } else {
        setPayPeriod(DEMO_PAY_PERIOD);
        setSubcontractors(DEMO_SUBCONTRACTORS);
        setAllocations(DEMO_ALLOCATIONS);
        setIsUsingDemo(true);
      }
    } catch (err) {
      console.error('Error loading worksheet data:', err);
      setPayPeriod(DEMO_PAY_PERIOD);
      setSubcontractors(DEMO_SUBCONTRACTORS);
      setAllocations(DEMO_ALLOCATIONS);
      setIsUsingDemo(true);
    } finally {
      setLoading(false);
    }
  }

  // Calculate totals
  const totals = useMemo(() => {
    const thisPeriod = allocations.reduce((sum, a) => sum + a.this_period_amount, 0);
    const retainage = allocations.reduce((sum, a) => sum + a.retainage_amount, 0);
    const netPayment = allocations.reduce((sum, a) => sum + a.net_payment, 0);
    const dbePeriod = allocations.filter(a => a.is_dbe).reduce((sum, a) => sum + a.this_period_amount, 0);
    const dbePercent = thisPeriod > 0 ? (dbePeriod / thisPeriod) * 100 : 0;

    return {
      thisPeriod,
      retainage,
      netPayment,
      dbePeriod,
      dbePercent,
      remaining: (payPeriod?.net_pay_amount || 0) - netPayment,
    };
  }, [allocations, payPeriod]);

  const handleAmountChange = (id: string, value: number) => {
    setAllocations(prev => prev.map(a => {
      if (a.id === id) {
        const retainageAmount = value * (a.retainage_percent / 100);
        return {
          ...a,
          this_period_amount: value,
          retainage_amount: retainageAmount,
          net_payment: value - retainageAmount,
        };
      }
      return a;
    }));
  };

  const handleRetainageChange = (id: string, percent: number) => {
    setAllocations(prev => prev.map(a => {
      if (a.id === id) {
        const retainageAmount = a.this_period_amount * (percent / 100);
        return {
          ...a,
          retainage_percent: percent,
          retainage_amount: retainageAmount,
          net_payment: a.this_period_amount - retainageAmount,
        };
      }
      return a;
    }));
  };

  const handleNotesChange = (id: string, notes: string) => {
    setAllocations(prev => prev.map(a => {
      if (a.id === id) {
        return { ...a, notes };
      }
      return a;
    }));
  };

  const handleAddSubcontractor = () => {
    if (!selectedSubId) return;

    const sub = subcontractors.find(s => s.id === selectedSubId);
    if (!sub) return;

    // Check if already added
    if (allocations.some(a => a.subcontractor_id === selectedSubId)) {
      alert('This subcontractor is already in the worksheet');
      return;
    }

    const newAllocation: SubAllocation = {
      id: `new-${Date.now()}`,
      subcontractor_id: sub.id,
      subcontractor_name: sub.company_name,
      contract_amount: 0,
      paid_to_date: 0,
      this_period_amount: 0,
      retainage_percent: 5,
      retainage_amount: 0,
      net_payment: 0,
      is_dbe: sub.is_dbe || sub.is_dbe_certified || false,
      status: 'DRAFT',
      notes: '',
      isNew: true,
    };

    setAllocations(prev => [...prev, newAllocation]);
    setShowAddModal(false);
    setSelectedSubId('');
  };

  const handleRemoveAllocation = (id: string) => {
    setAllocations(prev => prev.filter(a => a.id !== id));
  };

  const handleSave = async () => {
    if (isUsingDemo) {
      alert('Cannot save demo data. Please select a real pay period.');
      return;
    }

    setSaving(true);
    try {
      // Save logic would go here
      alert('Worksheet saved successfully!');
    } catch (err) {
      console.error('Error saving worksheet:', err);
      alert('Failed to save worksheet');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (totals.remaining < 0) {
      alert('Total allocations exceed available funds. Please adjust amounts.');
      return;
    }

    if (isUsingDemo) {
      alert('Cannot submit demo data. Please select a real pay period.');
      return;
    }

    setSaving(true);
    try {
      // Submit logic would go here
      alert('Worksheet submitted for approval!');
    } catch (err) {
      console.error('Error submitting worksheet:', err);
      alert('Failed to submit worksheet');
    } finally {
      setSaving(false);
    }
  };

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

  const getDaysRemaining = (deadlineStr: string | null) => {
    if (!deadlineStr) return null;
    const deadline = new Date(deadlineStr);
    const now = new Date();
    return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="subcontractor-worksheet loading">
        <RefreshCw size={32} className="spin" />
        <p>Loading worksheet...</p>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining(payPeriod?.payment_deadline_date || null);

  return (
    <div className="subcontractor-worksheet">
      {/* Header */}
      <div className="worksheet-header">
        <button className="back-button" onClick={() => navigate('/pay-estimates')}>
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="header-info">
          <h1>Subcontractor Payment Worksheet</h1>
          {payPeriod && (
            <div className="header-meta">
              <span className="project-name">
                <Building2 size={14} />
                {payPeriod.project?.name}
              </span>
              <span className="estimate">
                Estimate #{payPeriod.estimate_number}
              </span>
              <span className="period">
                Period Ending: {formatDate(payPeriod.period_end_date)}
              </span>
            </div>
          )}
        </div>

        <div className="header-actions">
          <button className="btn-secondary" onClick={handleSave} disabled={saving}>
            <Save size={16} />
            Save Draft
          </button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
            <Send size={16} />
            Submit for Approval
          </button>
        </div>
      </div>

      {isUsingDemo && (
        <div className="demo-banner">
          <AlertTriangle size={16} />
          <span>Showing demo data. Select a pay period to work with real data.</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="summary-row">
        <div className="summary-card">
          <span className="label">Net Pay from State</span>
          <span className="value primary">{formatCurrency(payPeriod?.net_pay_amount || 0)}</span>
        </div>
        <div className="summary-card">
          <span className="label">Total Sub Payments</span>
          <span className="value">{formatCurrency(totals.netPayment)}</span>
        </div>
        <div className="summary-card">
          <span className="label">Remaining Self-Perform</span>
          <span className={`value ${totals.remaining < 0 ? 'negative' : 'positive'}`}>
            {formatCurrency(totals.remaining)}
          </span>
        </div>
        <div className="summary-card">
          <span className="label">DBE Participation</span>
          <span className="value dbe">{totals.dbePercent.toFixed(1)}%</span>
          <span className="sub-label">{formatCurrency(totals.dbePeriod)} this period</span>
        </div>
        {daysRemaining !== null && (
          <div className={`summary-card deadline ${daysRemaining <= 3 ? 'urgent' : daysRemaining <= 7 ? 'warning' : ''}`}>
            <span className="label">Payment Deadline</span>
            <span className="value">{daysRemaining}d</span>
            <span className="sub-label">{formatDate(payPeriod?.payment_deadline_date || null)}</span>
          </div>
        )}
      </div>

      {/* Allocations Table */}
      <div className="allocations-section">
        <div className="section-header">
          <h2>
            <Users size={18} />
            Subcontractor Allocations
          </h2>
          <button className="btn-add" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            Add Subcontractor
          </button>
        </div>

        <div className="table-container">
          <table className="allocations-table">
            <thead>
              <tr>
                <th>Subcontractor</th>
                <th>Contract Amt</th>
                <th>Paid to Date</th>
                <th>This Period</th>
                <th>Ret %</th>
                <th>Retainage</th>
                <th>Net Payment</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {allocations.map(alloc => (
                <tr key={alloc.id} className={alloc.is_dbe ? 'dbe-row' : ''}>
                  <td className="sub-cell">
                    <span className="sub-name">{alloc.subcontractor_name}</span>
                    {alloc.is_dbe && <span className="dbe-badge">DBE</span>}
                  </td>
                  <td className="amount">{formatCurrency(alloc.contract_amount)}</td>
                  <td className="amount">{formatCurrency(alloc.paid_to_date)}</td>
                  <td>
                    <input
                      type="number"
                      className="amount-input"
                      value={alloc.this_period_amount || ''}
                      onChange={e => handleAmountChange(alloc.id, parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </td>
                  <td>
                    <select
                      className="retainage-select"
                      value={alloc.retainage_percent}
                      onChange={e => handleRetainageChange(alloc.id, parseFloat(e.target.value))}
                    >
                      <option value={0}>0%</option>
                      <option value={2.5}>2.5%</option>
                      <option value={5}>5%</option>
                      <option value={10}>10%</option>
                    </select>
                  </td>
                  <td className="amount negative">({formatCurrency(alloc.retainage_amount)})</td>
                  <td className="amount highlight">{formatCurrency(alloc.net_payment)}</td>
                  <td>
                    <input
                      type="text"
                      className="notes-input"
                      value={alloc.notes}
                      onChange={e => handleNotesChange(alloc.id, e.target.value)}
                      placeholder="Notes..."
                    />
                  </td>
                  <td>
                    <button
                      className="btn-remove"
                      onClick={() => handleRemoveAllocation(alloc.id)}
                      title="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {allocations.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty-row">
                    No subcontractor allocations yet. Click "Add Subcontractor" to begin.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Totals</td>
                <td className="amount">{formatCurrency(totals.thisPeriod)}</td>
                <td></td>
                <td className="amount negative">({formatCurrency(totals.retainage)})</td>
                <td className="amount highlight">{formatCurrency(totals.netPayment)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Validation Messages */}
      <div className="validation-section">
        {totals.remaining < 0 && (
          <div className="validation-message error">
            <AlertTriangle size={16} />
            <span>
              Total allocations exceed available funds by {formatCurrency(Math.abs(totals.remaining))}.
              Please reduce allocation amounts.
            </span>
          </div>
        )}
        {totals.remaining > 0 && totals.remaining < (payPeriod?.net_pay_amount || 0) * 0.1 && (
          <div className="validation-message success">
            <CheckCircle size={16} />
            <span>
              Worksheet is ready for submission. {formatCurrency(totals.remaining)} will be retained for self-perform work.
            </span>
          </div>
        )}
        {daysRemaining !== null && daysRemaining <= 3 && (
          <div className="validation-message warning">
            <AlertTriangle size={16} />
            <span>
              Payment deadline is in {daysRemaining} day(s). Complete and submit worksheet promptly to ensure 14-day compliance.
            </span>
          </div>
        )}
      </div>

      {/* Add Subcontractor Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Add Subcontractor</h3>
            <p>Select a subcontractor to add to this worksheet:</p>

            <select
              className="modal-select"
              value={selectedSubId}
              onChange={e => setSelectedSubId(e.target.value)}
            >
              <option value="">-- Select Subcontractor --</option>
              {subcontractors
                .filter(s => !allocations.some(a => a.subcontractor_id === s.id))
                .map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.company_name} {sub.is_dbe ? '(DBE)' : ''}
                  </option>
                ))}
            </select>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleAddSubcontractor}
                disabled={!selectedSubId}
              >
                Add to Worksheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
