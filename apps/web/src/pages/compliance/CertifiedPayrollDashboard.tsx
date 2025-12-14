import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import {
  FileText,
  FileSpreadsheet,
  Calendar,
  Users,
  DollarSign,
  Clock,
  Building2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Download,
  Plus,
  Search,
  Eye,
  Edit,
  Send,
  RefreshCw,
  Printer,
  Shield,
  ClipboardCheck,
  PenTool,
  X
} from 'lucide-react';
import './CertifiedPayrollDashboard.css';

interface CertifiedPayroll {
  id: string;
  payroll_number: string;
  week_ending_date: string;
  project_id: string;
  project_name: string;
  project_number: string;
  contract_number: string;
  contractor_name: string;
  contractor_address: string;
  total_workers: number;
  total_hours: number;
  total_gross_pay: number;
  total_fringe_owed: number;
  total_deductions: number;
  total_net_pay: number;
  status: PayrollStatus;
  certified_by: string | null;
  certifier_name: string | null;
  certifier_title: string | null;
  certified_at: string | null;
  submitted_at: string | null;
  submitted_to: string | null;
  created_at: string;
}

interface PayrollLine {
  id: string;
  line_number: number;
  employee_name: string;
  ssn_last_four: string;
  work_classification: string;
  hourly_rate: number;
  fringe_rate: number;
  sat_hours: number;
  sun_hours: number;
  mon_hours: number;
  tue_hours: number;
  wed_hours: number;
  thu_hours: number;
  fri_hours: number;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  gross_pay: number;
  fica_deduction: number;
  federal_tax: number;
  state_tax: number;
  other_deductions: number;
  net_pay: number;
}

interface Project {
  id: string;
  name: string;
  project_number: string;
  contract_number: string;
  davis_bacon_required: boolean;
  wage_determination_number: string | null;
}

type PayrollStatus = 'DRAFT' | 'GENERATED' | 'REVIEWED' | 'CERTIFIED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
type TabType = 'payrolls' | 'generate' | 'pending' | 'history';

const STATUS_CONFIG: Record<PayrollStatus, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: { label: 'Draft', color: '#6b7280', icon: <Edit size={14} /> },
  GENERATED: { label: 'Generated', color: '#3b82f6', icon: <FileText size={14} /> },
  REVIEWED: { label: 'Reviewed', color: '#8b5cf6', icon: <Eye size={14} /> },
  CERTIFIED: { label: 'Certified', color: '#10b981', icon: <CheckCircle size={14} /> },
  SUBMITTED: { label: 'Submitted', color: '#f59e0b', icon: <Send size={14} /> },
  ACCEPTED: { label: 'Accepted', color: '#059669', icon: <Shield size={14} /> },
  REJECTED: { label: 'Rejected', color: '#ef4444', icon: <XCircle size={14} /> },
};

export function CertifiedPayrollDashboard() {
  const [payrolls, setPayrolls] = useState<CertifiedPayroll[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('payrolls');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedPayroll, setSelectedPayroll] = useState<CertifiedPayroll | null>(null);
  const [payrollLines, setPayrollLines] = useState<PayrollLine[]>([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showCertifyModal, setShowCertifyModal] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Generate form state
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [weekEndingDate, setWeekEndingDate] = useState('');

  // Certify form state
  const [certifierName, setCertifierName] = useState('');
  const [certifierTitle, setCertifierTitle] = useState('');

  // Demo data
  const demoPayrolls: CertifiedPayroll[] = [
    {
      id: 'payroll-001',
      payroll_number: 'CP-001',
      week_ending_date: '2024-12-06',
      project_id: 'proj-001',
      project_name: 'Corridor H Section 12',
      project_number: '2024-001',
      contract_number: 'DOH-2024-0123',
      contractor_name: 'Triton Construction, Inc.',
      contractor_address: '123 Main Street, St. Albans, WV 25177',
      total_workers: 12,
      total_hours: 480,
      total_gross_pay: 24680.50,
      total_fringe_owed: 5890.20,
      total_deductions: 6170.13,
      total_net_pay: 18510.37,
      status: 'CERTIFIED',
      certified_by: 'user-001',
      certifier_name: 'Brian Lewis',
      certifier_title: 'Project Manager',
      certified_at: '2024-12-07T10:30:00Z',
      submitted_at: '2024-12-07T14:00:00Z',
      submitted_to: 'WVDOH District 3',
      created_at: '2024-12-06T16:00:00Z'
    },
    {
      id: 'payroll-002',
      payroll_number: 'CP-002',
      week_ending_date: '2024-12-13',
      project_id: 'proj-001',
      project_name: 'Corridor H Section 12',
      project_number: '2024-001',
      contract_number: 'DOH-2024-0123',
      contractor_name: 'Triton Construction, Inc.',
      contractor_address: '123 Main Street, St. Albans, WV 25177',
      total_workers: 14,
      total_hours: 560,
      total_gross_pay: 28750.00,
      total_fringe_owed: 6860.00,
      total_deductions: 7187.50,
      total_net_pay: 21562.50,
      status: 'GENERATED',
      certified_by: null,
      certifier_name: null,
      certifier_title: null,
      certified_at: null,
      submitted_at: null,
      submitted_to: null,
      created_at: '2024-12-13T16:00:00Z'
    },
    {
      id: 'payroll-003',
      payroll_number: 'CP-001',
      week_ending_date: '2024-12-06',
      project_id: 'proj-002',
      project_name: 'I-64 Bridge Rehabilitation',
      project_number: '2024-002',
      contract_number: 'DOH-2024-0456',
      contractor_name: 'Triton Construction, Inc.',
      contractor_address: '123 Main Street, St. Albans, WV 25177',
      total_workers: 8,
      total_hours: 320,
      total_gross_pay: 18240.00,
      total_fringe_owed: 4352.00,
      total_deductions: 4560.00,
      total_net_pay: 13680.00,
      status: 'SUBMITTED',
      certified_by: 'user-001',
      certifier_name: 'Brian Lewis',
      certifier_title: 'Project Manager',
      certified_at: '2024-12-07T09:15:00Z',
      submitted_at: '2024-12-07T11:30:00Z',
      submitted_to: 'WVDOH District 5',
      created_at: '2024-12-06T17:00:00Z'
    },
    {
      id: 'payroll-004',
      payroll_number: 'CP-002',
      week_ending_date: '2024-12-13',
      project_id: 'proj-002',
      project_name: 'I-64 Bridge Rehabilitation',
      project_number: '2024-002',
      contract_number: 'DOH-2024-0456',
      contractor_name: 'Triton Construction, Inc.',
      contractor_address: '123 Main Street, St. Albans, WV 25177',
      total_workers: 9,
      total_hours: 360,
      total_gross_pay: 20520.00,
      total_fringe_owed: 4896.00,
      total_deductions: 5130.00,
      total_net_pay: 15390.00,
      status: 'DRAFT',
      certified_by: null,
      certifier_name: null,
      certifier_title: null,
      certified_at: null,
      submitted_at: null,
      submitted_to: null,
      created_at: '2024-12-13T17:30:00Z'
    },
  ];

  const demoProjects: Project[] = [
    {
      id: 'proj-001',
      name: 'Corridor H Section 12',
      project_number: '2024-001',
      contract_number: 'DOH-2024-0123',
      davis_bacon_required: true,
      wage_determination_number: 'WV20240001'
    },
    {
      id: 'proj-002',
      name: 'I-64 Bridge Rehabilitation',
      project_number: '2024-002',
      contract_number: 'DOH-2024-0456',
      davis_bacon_required: true,
      wage_determination_number: 'WV20240002'
    },
    {
      id: 'proj-003',
      name: 'Route 9 Widening',
      project_number: '2024-003',
      contract_number: 'DOH-2024-0789',
      davis_bacon_required: true,
      wage_determination_number: 'WV20230015'
    },
  ];

  const demoPayrollLines: PayrollLine[] = [
    { id: 'line-001', line_number: 1, employee_name: 'Smith, John', ssn_last_four: '1234', work_classification: 'Equipment Operator', hourly_rate: 32.50, fringe_rate: 16.45, sat_hours: 0, sun_hours: 0, mon_hours: 8, tue_hours: 8, wed_hours: 8, thu_hours: 8, fri_hours: 8, total_hours: 40, regular_hours: 40, overtime_hours: 0, gross_pay: 1958.00, fica_deduction: 149.79, federal_tax: 234.96, state_tax: 97.90, other_deductions: 0, net_pay: 1475.35 },
    { id: 'line-002', line_number: 2, employee_name: 'Johnson, Mike', ssn_last_four: '5678', work_classification: 'Equipment Operator', hourly_rate: 34.25, fringe_rate: 16.45, sat_hours: 4, sun_hours: 0, mon_hours: 8, tue_hours: 8, wed_hours: 8, thu_hours: 8, fri_hours: 8, total_hours: 44, regular_hours: 40, overtime_hours: 4, gross_pay: 2296.70, fica_deduction: 175.70, federal_tax: 275.60, state_tax: 114.84, other_deductions: 0, net_pay: 1730.56 },
    { id: 'line-003', line_number: 3, employee_name: 'Williams, Robert', ssn_last_four: '9012', work_classification: 'Laborer Group 1', hourly_rate: 22.45, fringe_rate: 12.85, sat_hours: 0, sun_hours: 0, mon_hours: 8, tue_hours: 8, wed_hours: 8, thu_hours: 8, fri_hours: 8, total_hours: 40, regular_hours: 40, overtime_hours: 0, gross_pay: 1412.00, fica_deduction: 108.02, federal_tax: 169.44, state_tax: 70.60, other_deductions: 0, net_pay: 1063.94 },
    { id: 'line-004', line_number: 4, employee_name: 'Brown, James', ssn_last_four: '3456', work_classification: 'Laborer Group 2', hourly_rate: 24.15, fringe_rate: 12.85, sat_hours: 0, sun_hours: 0, mon_hours: 8, tue_hours: 8, wed_hours: 8, thu_hours: 8, fri_hours: 8, total_hours: 40, regular_hours: 40, overtime_hours: 0, gross_pay: 1480.00, fica_deduction: 113.22, federal_tax: 177.60, state_tax: 74.00, other_deductions: 0, net_pay: 1115.18 },
    { id: 'line-005', line_number: 5, employee_name: 'Davis, William', ssn_last_four: '7890', work_classification: 'Truck Driver', hourly_rate: 24.50, fringe_rate: 11.25, sat_hours: 0, sun_hours: 0, mon_hours: 8, tue_hours: 8, wed_hours: 8, thu_hours: 8, fri_hours: 8, total_hours: 40, regular_hours: 40, overtime_hours: 0, gross_pay: 1430.00, fica_deduction: 109.40, federal_tax: 171.60, state_tax: 71.50, other_deductions: 0, net_pay: 1077.50 },
    { id: 'line-006', line_number: 6, employee_name: 'Miller, David', ssn_last_four: '2345', work_classification: 'Cement Mason', hourly_rate: 27.90, fringe_rate: 14.65, sat_hours: 0, sun_hours: 0, mon_hours: 8, tue_hours: 8, wed_hours: 8, thu_hours: 10, fri_hours: 8, total_hours: 42, regular_hours: 40, overtime_hours: 2, gross_pay: 1819.70, fica_deduction: 139.21, federal_tax: 218.36, state_tax: 90.99, other_deductions: 0, net_pay: 1371.14 },
  ];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Try to load from database
      const { data: payrollsData } = await (supabase as any)
        .from('certified_payrolls')
        .select(`
          *,
          projects (name, project_number)
        `)
        .order('created_at', { ascending: false });

      if (payrollsData && payrollsData.length > 0) {
        setPayrolls(payrollsData.map((p: any) => ({
          ...p,
          project_name: p.projects?.name,
          project_number: p.projects?.project_number
        })));
      } else {
        setPayrolls(demoPayrolls);
      }

      const { data: projectsData } = await (supabase as any)
        .from('projects')
        .select('id, name, project_number, contract_number, davis_bacon_required, wage_determination_number')
        .eq('davis_bacon_required', true)
        .order('name');

      if (projectsData && projectsData.length > 0) {
        setProjects(projectsData);
      } else {
        setProjects(demoProjects);
      }
    } catch (error) {
      console.error('Error loading payrolls:', error);
      setPayrolls(demoPayrolls);
      setProjects(demoProjects);
    }
    setLoading(false);
  }

  async function loadPayrollLines(payrollId: string) {
    try {
      const { data } = await (supabase as any)
        .from('certified_payroll_lines')
        .select('*')
        .eq('payroll_id', payrollId)
        .order('line_number');

      if (data && data.length > 0) {
        setPayrollLines(data);
      } else {
        setPayrollLines(demoPayrollLines);
      }
    } catch (error) {
      console.error('Error loading payroll lines:', error);
      setPayrollLines(demoPayrollLines);
    }
  }

  async function handleGeneratePayroll() {
    if (!selectedProjectId || !weekEndingDate) {
      alert('Please select a project and week ending date');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/certified-payroll-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          project_id: selectedProjectId,
          week_ending_date: weekEndingDate
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(`Payroll ${result.payroll_number} generated successfully!`);
        setShowGenerateModal(false);
        loadData();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      // Demo mode - create fake payroll
      const project = projects.find(p => p.id === selectedProjectId);
      const newPayroll: CertifiedPayroll = {
        id: `payroll-${Date.now()}`,
        payroll_number: `CP-00${payrolls.filter(p => p.project_id === selectedProjectId).length + 1}`,
        week_ending_date: weekEndingDate,
        project_id: selectedProjectId,
        project_name: project?.name || '',
        project_number: project?.project_number || '',
        contract_number: project?.contract_number || '',
        contractor_name: 'Triton Construction, Inc.',
        contractor_address: '123 Main Street, St. Albans, WV 25177',
        total_workers: 10,
        total_hours: 400,
        total_gross_pay: 22000,
        total_fringe_owed: 5280,
        total_deductions: 5500,
        total_net_pay: 16500,
        status: 'DRAFT',
        certified_by: null,
        certifier_name: null,
        certifier_title: null,
        certified_at: null,
        submitted_at: null,
        submitted_to: null,
        created_at: new Date().toISOString()
      };
      setPayrolls([newPayroll, ...payrolls]);
      setShowGenerateModal(false);
      alert(`Payroll ${newPayroll.payroll_number} generated (demo mode)`);
    }
    setGenerating(false);
    setSelectedProjectId('');
    setWeekEndingDate('');
  }

  async function handleCertifyPayroll() {
    if (!selectedPayroll || !certifierName || !certifierTitle) {
      alert('Please fill in all certification fields');
      return;
    }

    try {
      await (supabase as any)
        .from('certified_payrolls')
        .update({
          status: 'CERTIFIED',
          certifier_name: certifierName,
          certifier_title: certifierTitle,
          certified_at: new Date().toISOString()
        })
        .eq('id', selectedPayroll.id);

      // Update local state
      setPayrolls(payrolls.map(p =>
        p.id === selectedPayroll.id
          ? { ...p, status: 'CERTIFIED' as PayrollStatus, certifier_name: certifierName, certifier_title: certifierTitle, certified_at: new Date().toISOString() }
          : p
      ));
      setSelectedPayroll({ ...selectedPayroll, status: 'CERTIFIED', certifier_name: certifierName, certifier_title: certifierTitle });
      setShowCertifyModal(false);
      alert('Payroll certified successfully!');
    } catch (error) {
      console.error('Certification error:', error);
      // Demo mode update
      setPayrolls(payrolls.map(p =>
        p.id === selectedPayroll.id
          ? { ...p, status: 'CERTIFIED' as PayrollStatus, certifier_name: certifierName, certifier_title: certifierTitle, certified_at: new Date().toISOString() }
          : p
      ));
      setSelectedPayroll({ ...selectedPayroll, status: 'CERTIFIED', certifier_name: certifierName, certifier_title: certifierTitle });
      setShowCertifyModal(false);
      alert('Payroll certified (demo mode)');
    }
    setCertifierName('');
    setCertifierTitle('');
  }

  const filteredPayrolls = payrolls.filter(payroll => {
    const matchesSearch = searchTerm === '' ||
      payroll.payroll_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payroll.project_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = filterProject === '' || payroll.project_id === filterProject;
    const matchesStatus = filterStatus === '' || payroll.status === filterStatus;
    return matchesSearch && matchesProject && matchesStatus;
  });

  const pendingPayrolls = payrolls.filter(p => ['DRAFT', 'GENERATED', 'REVIEWED'].includes(p.status));
  const certifiedPayrolls = payrolls.filter(p => ['CERTIFIED', 'SUBMITTED', 'ACCEPTED'].includes(p.status));

  const stats = {
    total: payrolls.length,
    pending: pendingPayrolls.length,
    certified: certifiedPayrolls.length,
    totalGross: payrolls.reduce((sum, p) => sum + p.total_gross_pay, 0),
    totalWorkers: payrolls.reduce((sum, p) => sum + p.total_workers, 0),
    totalHours: payrolls.reduce((sum, p) => sum + p.total_hours, 0),
  };

  const tabs = [
    { id: 'payrolls', label: 'All Payrolls', icon: <FileText size={16} />, count: stats.total },
    { id: 'generate', label: 'Generate New', icon: <Plus size={16} />, count: null },
    { id: 'pending', label: 'Pending Action', icon: <Clock size={16} />, count: stats.pending },
    { id: 'history', label: 'Submitted', icon: <CheckCircle size={16} />, count: stats.certified },
  ];

  // Calculate next Friday for default week ending date
  function getNextFriday() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    const nextFriday = new Date(today);
    nextFriday.setDate(today.getDate() + daysUntilFriday);
    return nextFriday.toISOString().split('T')[0];
  }

  return (
    <div className="certified-payroll-dashboard">
      {/* Header */}
      <div className="cpd-header">
        <div className="cpd-header-content">
          <div className="cpd-header-left">
            <div className="cpd-header-icon">
              <FileSpreadsheet size={28} />
            </div>
            <div>
              <h1 className="cpd-title">Certified Payroll</h1>
              <p className="cpd-subtitle">WH-347 Davis-Bacon Compliance</p>
            </div>
          </div>
          <div className="cpd-header-right">
            <button className="cpd-btn secondary">
              <Download size={18} />
              <span>Export All</span>
            </button>
            <button className="cpd-btn primary" onClick={() => setShowGenerateModal(true)}>
              <Plus size={18} />
              <span>Generate Payroll</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="cpd-kpi-grid">
        <div className="cpd-kpi-card total">
          <div className="cpd-kpi-header">
            <span className="cpd-kpi-label">Total Payrolls</span>
            <FileText size={20} />
          </div>
          <div className="cpd-kpi-value">{stats.total}</div>
          <div className="cpd-kpi-footer">
            <span className="cpd-kpi-detail">This period</span>
          </div>
        </div>

        <div className="cpd-kpi-card pending">
          <div className="cpd-kpi-header">
            <span className="cpd-kpi-label">Pending Action</span>
            <Clock size={20} />
          </div>
          <div className="cpd-kpi-value">{stats.pending}</div>
          <div className="cpd-kpi-footer">
            <span className="cpd-kpi-detail">Awaiting certification</span>
          </div>
        </div>

        <div className="cpd-kpi-card certified">
          <div className="cpd-kpi-header">
            <span className="cpd-kpi-label">Certified</span>
            <CheckCircle size={20} />
          </div>
          <div className="cpd-kpi-value">{stats.certified}</div>
          <div className="cpd-kpi-footer">
            <span className="cpd-kpi-detail">Ready/Submitted</span>
          </div>
        </div>

        <div className="cpd-kpi-card gross">
          <div className="cpd-kpi-header">
            <span className="cpd-kpi-label">Total Gross Pay</span>
            <DollarSign size={20} />
          </div>
          <div className="cpd-kpi-value">${stats.totalGross.toLocaleString()}</div>
          <div className="cpd-kpi-footer">
            <span className="cpd-kpi-detail">All payrolls</span>
          </div>
        </div>

        <div className="cpd-kpi-card workers">
          <div className="cpd-kpi-header">
            <span className="cpd-kpi-label">Total Workers</span>
            <Users size={20} />
          </div>
          <div className="cpd-kpi-value">{stats.totalWorkers}</div>
          <div className="cpd-kpi-footer">
            <span className="cpd-kpi-detail">Reported</span>
          </div>
        </div>

        <div className="cpd-kpi-card hours">
          <div className="cpd-kpi-header">
            <span className="cpd-kpi-label">Total Hours</span>
            <Clock size={20} />
          </div>
          <div className="cpd-kpi-value">{stats.totalHours.toLocaleString()}</div>
          <div className="cpd-kpi-footer">
            <span className="cpd-kpi-detail">Labor hours</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="cpd-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`cpd-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id as TabType)}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== null && <span className="cpd-tab-count">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="cpd-loading">
          <div className="cpd-loading-spinner" />
          <span>Loading payrolls...</span>
        </div>
      ) : (
        <div className="cpd-content">
          {activeTab === 'payrolls' && (
            <div className="cpd-payrolls-section">
              {/* Filters */}
              <div className="cpd-filters">
                <div className="cpd-search">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Search payrolls..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
                  className="cpd-filter-select"
                >
                  <option value="">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.project_number} - {p.name}</option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="cpd-filter-select"
                >
                  <option value="">All Statuses</option>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
                <button className="cpd-refresh-btn" onClick={loadData}>
                  <RefreshCw size={16} />
                </button>
              </div>

              {/* Payrolls List */}
              <div className="cpd-payrolls-list">
                {filteredPayrolls.map((payroll) => {
                  const statusConfig = STATUS_CONFIG[payroll.status];
                  return (
                    <div
                      key={payroll.id}
                      className={`cpd-payroll-card ${selectedPayroll?.id === payroll.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedPayroll(payroll);
                        loadPayrollLines(payroll.id);
                      }}
                    >
                      <div className="cpd-payroll-header">
                        <div className="cpd-payroll-info">
                          <span className="cpd-payroll-number">{payroll.payroll_number}</span>
                          <span className={`cpd-payroll-status`} style={{ backgroundColor: `${statusConfig.color}20`, color: statusConfig.color }}>
                            {statusConfig.icon}
                            {statusConfig.label}
                          </span>
                        </div>
                        <ChevronRight size={18} />
                      </div>

                      <div className="cpd-payroll-project">
                        <Building2 size={14} />
                        <span>{payroll.project_number} - {payroll.project_name}</span>
                      </div>

                      <div className="cpd-payroll-details">
                        <div className="cpd-payroll-detail">
                          <Calendar size={14} />
                          <span>Week Ending: {new Date(payroll.week_ending_date).toLocaleDateString()}</span>
                        </div>
                        <div className="cpd-payroll-detail">
                          <Users size={14} />
                          <span>{payroll.total_workers} Workers</span>
                        </div>
                        <div className="cpd-payroll-detail">
                          <Clock size={14} />
                          <span>{payroll.total_hours} Hours</span>
                        </div>
                        <div className="cpd-payroll-detail">
                          <DollarSign size={14} />
                          <span>${payroll.total_gross_pay.toLocaleString()}</span>
                        </div>
                      </div>

                      {payroll.certified_at && (
                        <div className="cpd-payroll-certified">
                          <Shield size={14} />
                          <span>Certified by {payroll.certifier_name} on {new Date(payroll.certified_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'generate' && (
            <div className="cpd-generate-section">
              <div className="cpd-generate-card">
                <div className="cpd-generate-header">
                  <FileSpreadsheet size={32} />
                  <h2>Generate Certified Payroll</h2>
                  <p>Create a WH-347 certified payroll report from approved time entries</p>
                </div>

                <div className="cpd-generate-form">
                  <div className="cpd-form-group">
                    <label>Project</label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                    >
                      <option value="">Select a project...</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.project_number} - {p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="cpd-form-group">
                    <label>Week Ending Date (Friday)</label>
                    <input
                      type="date"
                      value={weekEndingDate}
                      onChange={(e) => setWeekEndingDate(e.target.value)}
                    />
                    <span className="cpd-form-hint">WH-347 uses Saturday-Friday weeks</span>
                  </div>

                  <div className="cpd-generate-info">
                    <AlertTriangle size={18} />
                    <p>This will generate a payroll from all APPROVED time entries for the selected week. Draft and pending entries will not be included.</p>
                  </div>

                  <button
                    className="cpd-generate-btn"
                    onClick={handleGeneratePayroll}
                    disabled={!selectedProjectId || !weekEndingDate || generating}
                  >
                    {generating ? (
                      <>
                        <RefreshCw size={18} className="spinning" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet size={18} />
                        <span>Generate Payroll</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pending' && (
            <div className="cpd-pending-section">
              <div className="cpd-section-header">
                <h2>Pending Certification</h2>
                <p>Payrolls awaiting review and certification</p>
              </div>

              {pendingPayrolls.length === 0 ? (
                <div className="cpd-empty-state">
                  <CheckCircle size={48} />
                  <h3>All Caught Up!</h3>
                  <p>No payrolls pending certification</p>
                </div>
              ) : (
                <div className="cpd-pending-list">
                  {pendingPayrolls.map((payroll) => {
                    const statusConfig = STATUS_CONFIG[payroll.status];
                    return (
                      <div key={payroll.id} className="cpd-pending-card">
                        <div className="cpd-pending-header">
                          <div>
                            <span className="cpd-pending-number">{payroll.payroll_number}</span>
                            <span className="cpd-pending-project">{payroll.project_name}</span>
                          </div>
                          <span className={`cpd-pending-status`} style={{ backgroundColor: `${statusConfig.color}20`, color: statusConfig.color }}>
                            {statusConfig.icon}
                            {statusConfig.label}
                          </span>
                        </div>

                        <div className="cpd-pending-stats">
                          <div className="cpd-pending-stat">
                            <Calendar size={14} />
                            <span>Week Ending: {new Date(payroll.week_ending_date).toLocaleDateString()}</span>
                          </div>
                          <div className="cpd-pending-stat">
                            <Users size={14} />
                            <span>{payroll.total_workers} Workers</span>
                          </div>
                          <div className="cpd-pending-stat">
                            <DollarSign size={14} />
                            <span>${payroll.total_gross_pay.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="cpd-pending-actions">
                          <button
                            className="cpd-pending-action review"
                            onClick={() => {
                              setSelectedPayroll(payroll);
                              loadPayrollLines(payroll.id);
                            }}
                          >
                            <Eye size={14} />
                            <span>Review</span>
                          </button>
                          <button
                            className="cpd-pending-action certify"
                            onClick={() => {
                              setSelectedPayroll(payroll);
                              setShowCertifyModal(true);
                            }}
                          >
                            <PenTool size={14} />
                            <span>Certify</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="cpd-history-section">
              <div className="cpd-section-header">
                <h2>Submitted Payrolls</h2>
                <p>Certified and submitted WH-347 forms</p>
              </div>

              {certifiedPayrolls.length === 0 ? (
                <div className="cpd-empty-state">
                  <FileText size={48} />
                  <h3>No Submitted Payrolls</h3>
                  <p>Certified payrolls will appear here after submission</p>
                </div>
              ) : (
                <div className="cpd-history-list">
                  {certifiedPayrolls.map((payroll) => {
                    const statusConfig = STATUS_CONFIG[payroll.status];
                    return (
                      <div key={payroll.id} className="cpd-history-card">
                        <div className="cpd-history-header">
                          <div className="cpd-history-info">
                            <span className="cpd-history-number">{payroll.payroll_number}</span>
                            <span className="cpd-history-project">{payroll.project_name}</span>
                          </div>
                          <span className={`cpd-history-status`} style={{ backgroundColor: `${statusConfig.color}20`, color: statusConfig.color }}>
                            {statusConfig.icon}
                            {statusConfig.label}
                          </span>
                        </div>

                        <div className="cpd-history-details">
                          <div className="cpd-history-detail">
                            <Calendar size={14} />
                            <span>Week: {new Date(payroll.week_ending_date).toLocaleDateString()}</span>
                          </div>
                          <div className="cpd-history-detail">
                            <DollarSign size={14} />
                            <span>Gross: ${payroll.total_gross_pay.toLocaleString()}</span>
                          </div>
                          {payroll.certifier_name && (
                            <div className="cpd-history-detail">
                              <PenTool size={14} />
                              <span>Certified by: {payroll.certifier_name}</span>
                            </div>
                          )}
                          {payroll.submitted_to && (
                            <div className="cpd-history-detail">
                              <Send size={14} />
                              <span>Submitted to: {payroll.submitted_to}</span>
                            </div>
                          )}
                        </div>

                        <div className="cpd-history-actions">
                          <button
                            className="cpd-history-action"
                            onClick={() => {
                              setSelectedPayroll(payroll);
                              loadPayrollLines(payroll.id);
                            }}
                          >
                            <Eye size={14} />
                            <span>View</span>
                          </button>
                          <button className="cpd-history-action">
                            <Download size={14} />
                            <span>PDF</span>
                          </button>
                          <button className="cpd-history-action">
                            <Printer size={14} />
                            <span>Print</span>
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
      )}

      {/* Payroll Detail Panel */}
      {selectedPayroll && (
        <div className="cpd-detail-overlay" onClick={() => setSelectedPayroll(null)}>
          <div className="cpd-detail-panel" onClick={(e) => e.stopPropagation()}>
            <div className="cpd-detail-header">
              <div>
                <h2>WH-347 Certified Payroll</h2>
                <span className="cpd-detail-number">{selectedPayroll.payroll_number}</span>
              </div>
              <button className="cpd-detail-close" onClick={() => setSelectedPayroll(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="cpd-detail-body">
              {/* Header Info */}
              <div className="cpd-wh347-header">
                <div className="cpd-wh347-row">
                  <div className="cpd-wh347-field">
                    <label>1. Contractor</label>
                    <span>{selectedPayroll.contractor_name}</span>
                  </div>
                  <div className="cpd-wh347-field">
                    <label>2. Address</label>
                    <span>{selectedPayroll.contractor_address}</span>
                  </div>
                </div>
                <div className="cpd-wh347-row">
                  <div className="cpd-wh347-field">
                    <label>3. Project/Contract</label>
                    <span>{selectedPayroll.project_name} ({selectedPayroll.contract_number})</span>
                  </div>
                  <div className="cpd-wh347-field">
                    <label>4. Payroll No.</label>
                    <span>{selectedPayroll.payroll_number}</span>
                  </div>
                  <div className="cpd-wh347-field">
                    <label>5. Week Ending</label>
                    <span>{new Date(selectedPayroll.week_ending_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Payroll Lines Table */}
              <div className="cpd-lines-table-wrapper">
                <table className="cpd-lines-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>SSN</th>
                      <th>Classification</th>
                      <th>Rate</th>
                      <th>Fringe</th>
                      <th>S</th>
                      <th>S</th>
                      <th>M</th>
                      <th>T</th>
                      <th>W</th>
                      <th>T</th>
                      <th>F</th>
                      <th>Total</th>
                      <th>OT</th>
                      <th>Gross</th>
                      <th>Ded.</th>
                      <th>Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollLines.map((line) => (
                      <tr key={line.id}>
                        <td>{line.line_number}</td>
                        <td className="cpd-name-cell">{line.employee_name}</td>
                        <td>XXX-XX-{line.ssn_last_four}</td>
                        <td>{line.work_classification}</td>
                        <td>${line.hourly_rate.toFixed(2)}</td>
                        <td>${line.fringe_rate.toFixed(2)}</td>
                        <td>{line.sat_hours || '-'}</td>
                        <td>{line.sun_hours || '-'}</td>
                        <td>{line.mon_hours || '-'}</td>
                        <td>{line.tue_hours || '-'}</td>
                        <td>{line.wed_hours || '-'}</td>
                        <td>{line.thu_hours || '-'}</td>
                        <td>{line.fri_hours || '-'}</td>
                        <td className="cpd-total-cell">{line.total_hours}</td>
                        <td>{line.overtime_hours || '-'}</td>
                        <td className="cpd-money-cell">${line.gross_pay.toFixed(2)}</td>
                        <td className="cpd-money-cell">${(line.fica_deduction + line.federal_tax + line.state_tax).toFixed(2)}</td>
                        <td className="cpd-money-cell">${line.net_pay.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={13}>TOTALS</td>
                      <td className="cpd-total-cell">{selectedPayroll.total_hours}</td>
                      <td>-</td>
                      <td className="cpd-money-cell">${selectedPayroll.total_gross_pay.toFixed(2)}</td>
                      <td className="cpd-money-cell">${selectedPayroll.total_deductions.toFixed(2)}</td>
                      <td className="cpd-money-cell">${selectedPayroll.total_net_pay.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Certification Section */}
              <div className="cpd-certification-section">
                <h3>Certification Statement</h3>
                <p className="cpd-cert-text">
                  I, the undersigned, certify that I have examined this payroll and that to the best of my knowledge the classifications and wage rates for each laborer and mechanic conform with the work classification and prevailing wage rates specified in the applicable wage determination(s), and that the payroll is correct and complete.
                </p>

                {selectedPayroll.certifier_name ? (
                  <div className="cpd-cert-signature">
                    <div className="cpd-cert-field">
                      <label>Signature</label>
                      <span className="cpd-signature">{selectedPayroll.certifier_name}</span>
                    </div>
                    <div className="cpd-cert-field">
                      <label>Title</label>
                      <span>{selectedPayroll.certifier_title}</span>
                    </div>
                    <div className="cpd-cert-field">
                      <label>Date</label>
                      <span>{selectedPayroll.certified_at ? new Date(selectedPayroll.certified_at).toLocaleDateString() : '-'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="cpd-cert-pending">
                    <AlertTriangle size={18} />
                    <span>This payroll has not been certified</span>
                  </div>
                )}
              </div>
            </div>

            <div className="cpd-detail-footer">
              {selectedPayroll.status === 'DRAFT' || selectedPayroll.status === 'GENERATED' || selectedPayroll.status === 'REVIEWED' ? (
                <>
                  <button className="cpd-detail-btn secondary" onClick={() => setSelectedPayroll(null)}>
                    Close
                  </button>
                  <button
                    className="cpd-detail-btn primary"
                    onClick={() => setShowCertifyModal(true)}
                  >
                    <PenTool size={16} />
                    <span>Certify Payroll</span>
                  </button>
                </>
              ) : (
                <>
                  <button className="cpd-detail-btn secondary" onClick={() => setSelectedPayroll(null)}>
                    Close
                  </button>
                  <button className="cpd-detail-btn secondary">
                    <Download size={16} />
                    <span>Download PDF</span>
                  </button>
                  <button className="cpd-detail-btn secondary">
                    <Printer size={16} />
                    <span>Print</span>
                  </button>
                  {selectedPayroll.status === 'CERTIFIED' && (
                    <button className="cpd-detail-btn primary">
                      <Send size={16} />
                      <span>Submit to WVDOH</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="cpd-modal-overlay" onClick={() => setShowGenerateModal(false)}>
          <div className="cpd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cpd-modal-header">
              <h2>Generate Certified Payroll</h2>
              <button className="cpd-modal-close" onClick={() => setShowGenerateModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="cpd-modal-body">
              <div className="cpd-form-group">
                <label>Project</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                >
                  <option value="">Select a project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.project_number} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div className="cpd-form-group">
                <label>Week Ending Date (Friday)</label>
                <input
                  type="date"
                  value={weekEndingDate || getNextFriday()}
                  onChange={(e) => setWeekEndingDate(e.target.value)}
                />
              </div>

              <div className="cpd-modal-info">
                <AlertTriangle size={16} />
                <p>This will generate a payroll from approved time entries for the selected week.</p>
              </div>
            </div>
            <div className="cpd-modal-footer">
              <button className="cpd-modal-btn secondary" onClick={() => setShowGenerateModal(false)}>
                Cancel
              </button>
              <button
                className="cpd-modal-btn primary"
                onClick={handleGeneratePayroll}
                disabled={!selectedProjectId || generating}
              >
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certify Modal */}
      {showCertifyModal && selectedPayroll && (
        <div className="cpd-modal-overlay" onClick={() => setShowCertifyModal(false)}>
          <div className="cpd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cpd-modal-header">
              <h2>Certify Payroll</h2>
              <button className="cpd-modal-close" onClick={() => setShowCertifyModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="cpd-modal-body">
              <div className="cpd-certify-info">
                <FileText size={24} />
                <div>
                  <strong>{selectedPayroll.payroll_number}</strong>
                  <span>{selectedPayroll.project_name}</span>
                  <span>Week Ending: {new Date(selectedPayroll.week_ending_date).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="cpd-cert-statement">
                <ClipboardCheck size={18} />
                <p>
                  By certifying, you confirm that all wage rates, classifications, and deductions are accurate and comply with Davis-Bacon prevailing wage requirements.
                </p>
              </div>

              <div className="cpd-form-group">
                <label>Your Name (as it will appear on certification)</label>
                <input
                  type="text"
                  value={certifierName}
                  onChange={(e) => setCertifierName(e.target.value)}
                  placeholder="e.g., John Smith"
                />
              </div>

              <div className="cpd-form-group">
                <label>Your Title</label>
                <input
                  type="text"
                  value={certifierTitle}
                  onChange={(e) => setCertifierTitle(e.target.value)}
                  placeholder="e.g., Project Manager"
                />
              </div>
            </div>
            <div className="cpd-modal-footer">
              <button className="cpd-modal-btn secondary" onClick={() => setShowCertifyModal(false)}>
                Cancel
              </button>
              <button
                className="cpd-modal-btn primary"
                onClick={handleCertifyPayroll}
                disabled={!certifierName || !certifierTitle}
              >
                <PenTool size={16} />
                <span>Certify Payroll</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CertifiedPayrollDashboard;
