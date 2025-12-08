import { useState, useEffect } from 'react';
import {
  FileText,
  Calendar,
  DollarSign,
  Fuel,
  MapPin,
  TrendingUp,
  RefreshCw,
  Plus,
  ChevronRight,
  Download,
  CheckCircle,
  Clock,
  Eye,
  Send,
  Truck,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './IFTAReporting.css';

interface IFTAReport {
  id: string;
  report_year: number;
  report_quarter: number;
  period_start: string;
  period_end: string;
  total_miles: number;
  total_gallons: number;
  avg_mpg: number;
  jurisdiction_details: JurisdictionDetail[];
  net_tax_due: number;
  tax_credits: number;
  tax_owed: number;
  filed: boolean;
  filed_date: string;
  confirmation_number: string;
  paid: boolean;
  paid_date: string;
  paid_amount: number;
  payment_reference: string;
  notes: string;
  created_at: string;
}

interface JurisdictionDetail {
  state: string;
  miles: number;
  gallons: number;
  tax_rate: number;
  tax_due: number;
}

interface IFTAStats {
  totalReports: number;
  filedReports: number;
  pendingReports: number;
  totalMiles: number;
  totalGallons: number;
  avgMpg: number;
  totalTaxOwed: number;
}

export function IFTAReporting() {
  const [reports, setReports] = useState<IFTAReport[]>([]);
  const [stats, setStats] = useState<IFTAStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<IFTAReport | null>(null);

  useEffect(() => {
    loadReports();
  }, [yearFilter]);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      let query = (supabase as any)
        .from('ifta_reports')
        .select('*')
        .order('report_year', { ascending: false })
        .order('report_quarter', { ascending: false });

      if (yearFilter !== 'all') {
        query = query.eq('report_year', parseInt(yearFilter));
      }

      const { data, error } = await query;

      if (error) throw error;

      const reportList: IFTAReport[] = (data || []).map((r: any) => ({
        id: r.id,
        report_year: r.report_year,
        report_quarter: r.report_quarter,
        period_start: r.period_start,
        period_end: r.period_end,
        total_miles: r.total_miles,
        total_gallons: parseFloat(r.total_gallons) || 0,
        avg_mpg: parseFloat(r.avg_mpg) || 0,
        jurisdiction_details: r.jurisdiction_details || [],
        net_tax_due: parseFloat(r.net_tax_due) || 0,
        tax_credits: parseFloat(r.tax_credits) || 0,
        tax_owed: parseFloat(r.tax_owed) || 0,
        filed: r.filed,
        filed_date: r.filed_date,
        confirmation_number: r.confirmation_number,
        paid: r.paid,
        paid_date: r.paid_date,
        paid_amount: parseFloat(r.paid_amount) || 0,
        payment_reference: r.payment_reference,
        notes: r.notes,
        created_at: r.created_at,
      }));

      setReports(reportList);

      // Calculate stats
      const filed = reportList.filter(r => r.filed).length;
      const pending = reportList.filter(r => !r.filed).length;
      const totalMiles = reportList.reduce((sum, r) => sum + (r.total_miles || 0), 0);
      const totalGallons = reportList.reduce((sum, r) => sum + (r.total_gallons || 0), 0);
      const avgMpg = totalGallons > 0 ? totalMiles / totalGallons : 0;
      const totalTaxOwed = reportList.reduce((sum, r) => sum + (r.tax_owed || 0), 0);

      setStats({
        totalReports: reportList.length,
        filedReports: filed,
        pendingReports: pending,
        totalMiles,
        totalGallons,
        avgMpg,
        totalTaxOwed,
      });
    } catch (err) {
      console.error('Error loading IFTA reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getQuarterLabel = (quarter: number) => {
    return `Q${quarter}`;
  };

  const getQuarterDates = (_year: number, quarter: number) => {
    const quarters: Record<number, string> = {
      1: 'Jan 1 - Mar 31',
      2: 'Apr 1 - Jun 30',
      3: 'Jul 1 - Sep 30',
      4: 'Oct 1 - Dec 31',
    };
    return quarters[quarter] || '';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const formatNumber = (num: number) => {
    return num?.toLocaleString() || '0';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  const getStatusBadge = (report: IFTAReport) => {
    if (report.paid) {
      return { label: 'Paid', class: 'status-paid' };
    } else if (report.filed) {
      return { label: 'Filed', class: 'status-filed' };
    } else {
      return { label: 'Pending', class: 'status-pending' };
    }
  };

  const filteredReports = reports.filter(r => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'filed') return r.filed && !r.paid;
    if (statusFilter === 'paid') return r.paid;
    if (statusFilter === 'pending') return !r.filed;
    return true;
  });

  const years = [...new Set(reports.map(r => r.report_year))].sort((a, b) => b - a);
  if (!years.includes(new Date().getFullYear())) {
    years.unshift(new Date().getFullYear());
  }

  return (
    <div className="ifta-reporting-page">
      <div className="page-header">
        <div className="header-content">
          <h1><FileText size={28} /> IFTA Reporting</h1>
          <p>Quarterly fuel tax reports by jurisdiction</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={loadReports}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn btn-primary">
            <Plus size={16} /> New Report
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon reports"><FileText size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.totalReports}</span>
              <span className="stat-label">Total Reports</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon miles"><Truck size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{formatNumber(stats.totalMiles)}</span>
              <span className="stat-label">Total Miles</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon gallons"><Fuel size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{formatNumber(Math.round(stats.totalGallons))}</span>
              <span className="stat-label">Total Gallons</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon mpg"><TrendingUp size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.avgMpg.toFixed(2)}</span>
              <span className="stat-label">Avg MPG</span>
            </div>
          </div>
          <div className={`stat-card ${stats.pendingReports > 0 ? 'warning' : ''}`}>
            <div className="stat-icon pending"><Clock size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.pendingReports}</span>
              <span className="stat-label">Pending Filing</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <Calendar size={16} />
          <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            <option value="all">All Years</option>
            {years.map(y => (
              <option key={y} value={y.toString()}>{y}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="filed">Filed</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {/* Reports List */}
      <div className="reports-list">
        {isLoading ? (
          <div className="loading-state">
            <RefreshCw className="spinning" size={32} />
            <p>Loading IFTA reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <p>No IFTA reports found</p>
            <span>Create a new quarterly report to get started</span>
          </div>
        ) : (
          filteredReports.map(report => {
            const status = getStatusBadge(report);
            return (
              <div
                key={report.id}
                className={`report-card ${selectedReport?.id === report.id ? 'selected' : ''}`}
                onClick={() => setSelectedReport(report)}
              >
                <div className="report-header">
                  <div className="report-identity">
                    <div className="quarter-badge">
                      {getQuarterLabel(report.report_quarter)} {report.report_year}
                    </div>
                    <span className="period-dates">
                      {getQuarterDates(report.report_year, report.report_quarter)}
                    </span>
                    <span className={`status-badge ${status.class}`}>
                      {status.label === 'Paid' && <CheckCircle size={14} />}
                      {status.label === 'Filed' && <Send size={14} />}
                      {status.label === 'Pending' && <Clock size={14} />}
                      {status.label}
                    </span>
                  </div>
                  <ChevronRight size={20} className="chevron" />
                </div>

                <div className="report-summary">
                  <div className="summary-item">
                    <Truck size={16} />
                    <span className="summary-value">{formatNumber(report.total_miles)}</span>
                    <span className="summary-label">Miles</span>
                  </div>
                  <div className="summary-item">
                    <Fuel size={16} />
                    <span className="summary-value">{formatNumber(Math.round(report.total_gallons))}</span>
                    <span className="summary-label">Gallons</span>
                  </div>
                  <div className="summary-item">
                    <TrendingUp size={16} />
                    <span className="summary-value">{report.avg_mpg?.toFixed(2) || 'N/A'}</span>
                    <span className="summary-label">MPG</span>
                  </div>
                  <div className="summary-item">
                    <MapPin size={16} />
                    <span className="summary-value">{report.jurisdiction_details?.length || 0}</span>
                    <span className="summary-label">States</span>
                  </div>
                  <div className="summary-item highlight">
                    <DollarSign size={16} />
                    <span className="summary-value">{formatCurrency(report.tax_owed)}</span>
                    <span className="summary-label">Tax {report.tax_owed >= 0 ? 'Owed' : 'Credit'}</span>
                  </div>
                </div>

                {report.jurisdiction_details && report.jurisdiction_details.length > 0 && (
                  <div className="jurisdiction-preview">
                    {report.jurisdiction_details.slice(0, 5).map((j, i) => (
                      <span key={i} className="state-tag">{j.state}</span>
                    ))}
                    {report.jurisdiction_details.length > 5 && (
                      <span className="more-states">+{report.jurisdiction_details.length - 5} more</span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Report Detail Panel */}
      {selectedReport && (
        <div className="detail-panel">
          <div className="panel-header">
            <h2>Q{selectedReport.report_quarter} {selectedReport.report_year} IFTA Report</h2>
            <button className="close-btn" onClick={() => setSelectedReport(null)}>&times;</button>
          </div>
          <div className="panel-content">
            <div className="report-status-banner">
              {selectedReport.paid ? (
                <div className="status-info paid">
                  <CheckCircle size={20} />
                  <div>
                    <strong>Payment Complete</strong>
                    <p>Paid {formatCurrency(selectedReport.paid_amount)} on {formatDate(selectedReport.paid_date)}</p>
                    {selectedReport.payment_reference && (
                      <span className="ref">Ref: {selectedReport.payment_reference}</span>
                    )}
                  </div>
                </div>
              ) : selectedReport.filed ? (
                <div className="status-info filed">
                  <Send size={20} />
                  <div>
                    <strong>Filed - Awaiting Payment</strong>
                    <p>Filed on {formatDate(selectedReport.filed_date)}</p>
                    {selectedReport.confirmation_number && (
                      <span className="ref">Confirmation: {selectedReport.confirmation_number}</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="status-info pending">
                  <Clock size={20} />
                  <div>
                    <strong>Pending Filing</strong>
                    <p>Report ready for submission</p>
                  </div>
                </div>
              )}
            </div>

            <div className="detail-section">
              <h3>Report Period</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Quarter</label>
                  <span>Q{selectedReport.report_quarter} {selectedReport.report_year}</span>
                </div>
                <div className="detail-item">
                  <label>Period</label>
                  <span>{formatDate(selectedReport.period_start)} - {formatDate(selectedReport.period_end)}</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3>Fleet Summary</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Total Miles</label>
                  <span>{formatNumber(selectedReport.total_miles)}</span>
                </div>
                <div className="detail-item">
                  <label>Total Gallons</label>
                  <span>{formatNumber(Math.round(selectedReport.total_gallons))}</span>
                </div>
                <div className="detail-item">
                  <label>Average MPG</label>
                  <span>{selectedReport.avg_mpg?.toFixed(2) || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3>Tax Calculation</h3>
              <div className="tax-summary">
                <div className="tax-row">
                  <span>Net Tax Due</span>
                  <span>{formatCurrency(selectedReport.net_tax_due)}</span>
                </div>
                <div className="tax-row">
                  <span>Tax Credits</span>
                  <span className="credit">-{formatCurrency(selectedReport.tax_credits)}</span>
                </div>
                <div className="tax-row total">
                  <span>Total {selectedReport.tax_owed >= 0 ? 'Owed' : 'Credit'}</span>
                  <span className={selectedReport.tax_owed >= 0 ? '' : 'credit'}>
                    {formatCurrency(Math.abs(selectedReport.tax_owed))}
                  </span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3>Jurisdiction Details ({selectedReport.jurisdiction_details?.length || 0})</h3>
              {selectedReport.jurisdiction_details && selectedReport.jurisdiction_details.length > 0 ? (
                <div className="jurisdiction-table">
                  <div className="table-header">
                    <span>State</span>
                    <span>Miles</span>
                    <span>Gallons</span>
                    <span>Rate</span>
                    <span>Tax Due</span>
                  </div>
                  {selectedReport.jurisdiction_details.map((j, i) => (
                    <div key={i} className="table-row">
                      <span className="state">{j.state}</span>
                      <span>{formatNumber(j.miles)}</span>
                      <span>{formatNumber(Math.round(j.gallons))}</span>
                      <span>${j.tax_rate?.toFixed(4) || '0.0000'}</span>
                      <span className={j.tax_due >= 0 ? '' : 'credit'}>
                        {formatCurrency(j.tax_due)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-data">No jurisdiction data available</p>
              )}
            </div>

            {selectedReport.notes && (
              <div className="detail-section">
                <h3>Notes</h3>
                <p className="notes-text">{selectedReport.notes}</p>
              </div>
            )}
          </div>
          <div className="panel-actions">
            <button className="btn btn-secondary">
              <Download size={16} /> Export PDF
            </button>
            {!selectedReport.filed && (
              <button className="btn btn-primary">
                <Send size={16} /> Mark as Filed
              </button>
            )}
            {selectedReport.filed && !selectedReport.paid && (
              <button className="btn btn-primary">
                <CheckCircle size={16} /> Record Payment
              </button>
            )}
            {selectedReport.paid && (
              <button className="btn btn-secondary">
                <Eye size={16} /> View Receipt
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default IFTAReporting;
