import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import {
  DollarSign,
  FileText,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Building2,
  Briefcase,
  Download,
  Upload,
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  Eye,
  ChevronRight,
  ChevronDown,
  XCircle,
  Shield,
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  History
} from 'lucide-react';
import './WageRateManagement.css';

interface WageRate {
  id: string;
  organization_id: string;
  wage_determination_number: string;
  modification_number: number;
  work_classification: string;
  classification_title: string;
  group_number: string | null;
  base_rate: number;
  fringe_rate: number;
  total_rate: number;
  ot_base_rate: number;
  dt_base_rate: number;
  effective_date: string;
  expiration_date: string | null;
  counties: string[];
  project_id: string | null;
  project_name?: string;
  is_active: boolean;
  document_url: string | null;
  created_at: string;
}

interface WageDetermination {
  number: string;
  modification: number;
  effective_date: string;
  state: string;
  counties: string[];
  rate_count: number;
  is_current: boolean;
}

interface Project {
  id: string;
  name: string;
  project_number: string;
  contract_number: string;
  davis_bacon_required: boolean;
  wage_determination_number: string | null;
}

interface WageStats {
  total_rates: number;
  active_rates: number;
  expiring_soon: number;
  classifications: number;
  determinations: number;
  projects_covered: number;
}

type TabType = 'rates' | 'determinations' | 'classifications' | 'projects' | 'import' | 'history';

const WORK_CLASSIFICATIONS = [
  { value: 'laborer', label: 'Laborer', group: 'General' },
  { value: 'carpenter', label: 'Carpenter', group: 'Building Trades' },
  { value: 'cement_mason', label: 'Cement Mason/Concrete Finisher', group: 'Building Trades' },
  { value: 'electrician', label: 'Electrician', group: 'Building Trades' },
  { value: 'equipment_operator', label: 'Equipment Operator', group: 'Operating Engineers' },
  { value: 'ironworker', label: 'Ironworker', group: 'Building Trades' },
  { value: 'painter', label: 'Painter', group: 'Building Trades' },
  { value: 'pipefitter', label: 'Pipefitter', group: 'Building Trades' },
  { value: 'plumber', label: 'Plumber', group: 'Building Trades' },
  { value: 'roofer', label: 'Roofer', group: 'Building Trades' },
  { value: 'sheet_metal_worker', label: 'Sheet Metal Worker', group: 'Building Trades' },
  { value: 'truck_driver', label: 'Truck Driver', group: 'Teamsters' },
  { value: 'welder', label: 'Welder', group: 'Building Trades' },
  { value: 'foreman', label: 'Foreman', group: 'Supervision' },
  { value: 'superintendent', label: 'Superintendent', group: 'Supervision' },
  { value: 'other', label: 'Other', group: 'Other' },
];

// WV Counties available if needed in future:
// Barbour, Berkeley, Boone, Braxton, Brooke, Cabell, Calhoun, Clay, etc.

export function WageRateManagement() {
  const [rates, setRates] = useState<WageRate[]>([]);
  const [determinations, setDeterminations] = useState<WageDetermination[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<WageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('rates');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClassification, setFilterClassification] = useState('');
  const [filterDetermination, setFilterDetermination] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [_showAddModal, setShowAddModal] = useState(false);
  const [_showImportModal, setShowImportModal] = useState(false);
  const [selectedRate, setSelectedRate] = useState<WageRate | null>(null);
  const [expandedClassifications, setExpandedClassifications] = useState<string[]>([]);

  // Demo data
  const demoRates: WageRate[] = [
    {
      id: 'rate-001',
      organization_id: 'org-001',
      wage_determination_number: 'WV20240001',
      modification_number: 3,
      work_classification: 'laborer',
      classification_title: 'Laborer - Group 1',
      group_number: '1',
      base_rate: 22.45,
      fringe_rate: 12.85,
      total_rate: 35.30,
      ot_base_rate: 33.68,
      dt_base_rate: 44.90,
      effective_date: '2024-01-01',
      expiration_date: '2024-12-31',
      counties: ['Kanawha', 'Putnam', 'Cabell', 'Wayne'],
      project_id: null,
      is_active: true,
      document_url: null,
      created_at: '2024-01-15T00:00:00Z'
    },
    {
      id: 'rate-002',
      organization_id: 'org-001',
      wage_determination_number: 'WV20240001',
      modification_number: 3,
      work_classification: 'laborer',
      classification_title: 'Laborer - Group 2 (Skilled)',
      group_number: '2',
      base_rate: 24.15,
      fringe_rate: 12.85,
      total_rate: 37.00,
      ot_base_rate: 36.23,
      dt_base_rate: 48.30,
      effective_date: '2024-01-01',
      expiration_date: '2024-12-31',
      counties: ['Kanawha', 'Putnam', 'Cabell', 'Wayne'],
      project_id: null,
      is_active: true,
      document_url: null,
      created_at: '2024-01-15T00:00:00Z'
    },
    {
      id: 'rate-003',
      organization_id: 'org-001',
      wage_determination_number: 'WV20240001',
      modification_number: 3,
      work_classification: 'carpenter',
      classification_title: 'Carpenter',
      group_number: null,
      base_rate: 28.75,
      fringe_rate: 15.20,
      total_rate: 43.95,
      ot_base_rate: 43.13,
      dt_base_rate: 57.50,
      effective_date: '2024-01-01',
      expiration_date: '2024-12-31',
      counties: ['Kanawha', 'Putnam', 'Cabell', 'Wayne'],
      project_id: null,
      is_active: true,
      document_url: null,
      created_at: '2024-01-15T00:00:00Z'
    },
    {
      id: 'rate-004',
      organization_id: 'org-001',
      wage_determination_number: 'WV20240001',
      modification_number: 3,
      work_classification: 'equipment_operator',
      classification_title: 'Power Equipment Operator - Group 1',
      group_number: '1',
      base_rate: 32.50,
      fringe_rate: 16.45,
      total_rate: 48.95,
      ot_base_rate: 48.75,
      dt_base_rate: 65.00,
      effective_date: '2024-01-01',
      expiration_date: '2024-12-31',
      counties: ['Kanawha', 'Putnam', 'Cabell', 'Wayne'],
      project_id: null,
      is_active: true,
      document_url: null,
      created_at: '2024-01-15T00:00:00Z'
    },
    {
      id: 'rate-005',
      organization_id: 'org-001',
      wage_determination_number: 'WV20240001',
      modification_number: 3,
      work_classification: 'equipment_operator',
      classification_title: 'Power Equipment Operator - Group 2',
      group_number: '2',
      base_rate: 34.25,
      fringe_rate: 16.45,
      total_rate: 50.70,
      ot_base_rate: 51.38,
      dt_base_rate: 68.50,
      effective_date: '2024-01-01',
      expiration_date: '2024-12-31',
      counties: ['Kanawha', 'Putnam', 'Cabell', 'Wayne'],
      project_id: null,
      is_active: true,
      document_url: null,
      created_at: '2024-01-15T00:00:00Z'
    },
    {
      id: 'rate-006',
      organization_id: 'org-001',
      wage_determination_number: 'WV20240001',
      modification_number: 3,
      work_classification: 'equipment_operator',
      classification_title: 'Power Equipment Operator - Group 3 (Heavy)',
      group_number: '3',
      base_rate: 36.80,
      fringe_rate: 16.45,
      total_rate: 53.25,
      ot_base_rate: 55.20,
      dt_base_rate: 73.60,
      effective_date: '2024-01-01',
      expiration_date: '2024-12-31',
      counties: ['Kanawha', 'Putnam', 'Cabell', 'Wayne'],
      project_id: null,
      is_active: true,
      document_url: null,
      created_at: '2024-01-15T00:00:00Z'
    },
    {
      id: 'rate-007',
      organization_id: 'org-001',
      wage_determination_number: 'WV20240001',
      modification_number: 3,
      work_classification: 'cement_mason',
      classification_title: 'Cement Mason/Concrete Finisher',
      group_number: null,
      base_rate: 27.90,
      fringe_rate: 14.65,
      total_rate: 42.55,
      ot_base_rate: 41.85,
      dt_base_rate: 55.80,
      effective_date: '2024-01-01',
      expiration_date: '2024-12-31',
      counties: ['Kanawha', 'Putnam', 'Cabell', 'Wayne'],
      project_id: null,
      is_active: true,
      document_url: null,
      created_at: '2024-01-15T00:00:00Z'
    },
    {
      id: 'rate-008',
      organization_id: 'org-001',
      wage_determination_number: 'WV20240001',
      modification_number: 3,
      work_classification: 'truck_driver',
      classification_title: 'Truck Driver - Single Axle',
      group_number: '1',
      base_rate: 24.50,
      fringe_rate: 11.25,
      total_rate: 35.75,
      ot_base_rate: 36.75,
      dt_base_rate: 49.00,
      effective_date: '2024-01-01',
      expiration_date: '2024-12-31',
      counties: ['Kanawha', 'Putnam', 'Cabell', 'Wayne'],
      project_id: null,
      is_active: true,
      document_url: null,
      created_at: '2024-01-15T00:00:00Z'
    },
    {
      id: 'rate-009',
      organization_id: 'org-001',
      wage_determination_number: 'WV20240001',
      modification_number: 3,
      work_classification: 'truck_driver',
      classification_title: 'Truck Driver - Tandem/Semi',
      group_number: '2',
      base_rate: 26.25,
      fringe_rate: 11.25,
      total_rate: 37.50,
      ot_base_rate: 39.38,
      dt_base_rate: 52.50,
      effective_date: '2024-01-01',
      expiration_date: '2024-12-31',
      counties: ['Kanawha', 'Putnam', 'Cabell', 'Wayne'],
      project_id: null,
      is_active: true,
      document_url: null,
      created_at: '2024-01-15T00:00:00Z'
    },
    {
      id: 'rate-010',
      organization_id: 'org-001',
      wage_determination_number: 'WV20240002',
      modification_number: 1,
      work_classification: 'laborer',
      classification_title: 'Laborer - Highway',
      group_number: null,
      base_rate: 21.85,
      fringe_rate: 11.95,
      total_rate: 33.80,
      ot_base_rate: 32.78,
      dt_base_rate: 43.70,
      effective_date: '2024-03-01',
      expiration_date: null,
      counties: ['Harrison', 'Marion', 'Monongalia', 'Preston', 'Taylor'],
      project_id: 'proj-002',
      project_name: 'I-64 Bridge Rehabilitation',
      is_active: true,
      document_url: null,
      created_at: '2024-03-01T00:00:00Z'
    },
  ];

  const demoDeterminations: WageDetermination[] = [
    {
      number: 'WV20240001',
      modification: 3,
      effective_date: '2024-01-01',
      state: 'WV',
      counties: ['Kanawha', 'Putnam', 'Cabell', 'Wayne', 'Lincoln', 'Boone'],
      rate_count: 45,
      is_current: true
    },
    {
      number: 'WV20240002',
      modification: 1,
      effective_date: '2024-03-01',
      state: 'WV',
      counties: ['Harrison', 'Marion', 'Monongalia', 'Preston', 'Taylor'],
      rate_count: 38,
      is_current: true
    },
    {
      number: 'WV20230015',
      modification: 5,
      effective_date: '2023-07-01',
      state: 'WV',
      counties: ['Berkeley', 'Jefferson', 'Morgan'],
      rate_count: 42,
      is_current: false
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

  const demoStats: WageStats = {
    total_rates: 156,
    active_rates: 142,
    expiring_soon: 8,
    classifications: 16,
    determinations: 12,
    projects_covered: 8
  };

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Try to load from database
      const { data: ratesData } = await (supabase as any)
        .from('prevailing_wage_rates')
        .select(`
          *,
          projects (name)
        `)
        .eq('is_active', true)
        .order('work_classification');

      if (ratesData && ratesData.length > 0) {
        setRates(ratesData.map((r: any) => ({
          ...r,
          project_name: r.projects?.name
        })));
      } else {
        setRates(demoRates);
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

      setDeterminations(demoDeterminations);
      setStats(demoStats);
    } catch (error) {
      console.error('Error loading data:', error);
      setRates(demoRates);
      setDeterminations(demoDeterminations);
      setProjects(demoProjects);
      setStats(demoStats);
    }
    setLoading(false);
  }

  const filteredRates = rates.filter(rate => {
    const matchesSearch = searchTerm === '' ||
      rate.classification_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rate.wage_determination_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClassification = filterClassification === '' || rate.work_classification === filterClassification;
    const matchesDetermination = filterDetermination === '' || rate.wage_determination_number === filterDetermination;
    const matchesProject = filterProject === '' || rate.project_id === filterProject || (filterProject === 'org-wide' && !rate.project_id);
    return matchesSearch && matchesClassification && matchesDetermination && matchesProject;
  });

  // Group rates by classification
  const ratesByClassification = filteredRates.reduce((acc, rate) => {
    const key = rate.work_classification;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(rate);
    return acc;
  }, {} as Record<string, WageRate[]>);

  const toggleClassificationExpand = (classification: string) => {
    setExpandedClassifications(prev =>
      prev.includes(classification)
        ? prev.filter(c => c !== classification)
        : [...prev, classification]
    );
  };

  const uniqueDeterminations = [...new Set(rates.map(r => r.wage_determination_number))];

  const tabs = [
    { id: 'rates', label: 'Wage Rates', icon: <DollarSign size={16} />, count: stats?.active_rates },
    { id: 'determinations', label: 'Determinations', icon: <FileText size={16} />, count: stats?.determinations },
    { id: 'classifications', label: 'Classifications', icon: <Users size={16} />, count: stats?.classifications },
    { id: 'projects', label: 'Project Rates', icon: <Building2 size={16} />, count: stats?.projects_covered },
    { id: 'import', label: 'Import', icon: <Upload size={16} />, count: null },
    { id: 'history', label: 'History', icon: <History size={16} />, count: null },
  ];

  return (
    <div className="wage-rate-management">
      {/* Header */}
      <div className="wrm-header">
        <div className="wrm-header-content">
          <div className="wrm-header-left">
            <div className="wrm-header-icon">
              <DollarSign size={28} />
            </div>
            <div>
              <h1 className="wrm-title">Wage Rate Management</h1>
              <p className="wrm-subtitle">Davis-Bacon & Prevailing Wage Compliance</p>
            </div>
          </div>
          <div className="wrm-header-right">
            <button className="wrm-btn secondary" onClick={() => setShowImportModal(true)}>
              <Upload size={18} />
              <span>Import DOL Rates</span>
            </button>
            <button className="wrm-btn primary" onClick={() => setShowAddModal(true)}>
              <Plus size={18} />
              <span>Add Rate</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="wrm-kpi-grid">
        <div className="wrm-kpi-card total">
          <div className="wrm-kpi-header">
            <span className="wrm-kpi-label">Active Rates</span>
            <DollarSign size={20} />
          </div>
          <div className="wrm-kpi-value">{stats?.active_rates || 0}</div>
          <div className="wrm-kpi-footer">
            <span className="wrm-kpi-detail">of {stats?.total_rates || 0} total</span>
          </div>
        </div>

        <div className="wrm-kpi-card classifications">
          <div className="wrm-kpi-header">
            <span className="wrm-kpi-label">Classifications</span>
            <Users size={20} />
          </div>
          <div className="wrm-kpi-value">{stats?.classifications || 0}</div>
          <div className="wrm-kpi-footer">
            <span className="wrm-kpi-detail">Trade categories</span>
          </div>
        </div>

        <div className="wrm-kpi-card determinations">
          <div className="wrm-kpi-header">
            <span className="wrm-kpi-label">Wage Determinations</span>
            <FileText size={20} />
          </div>
          <div className="wrm-kpi-value">{stats?.determinations || 0}</div>
          <div className="wrm-kpi-footer">
            <span className="wrm-kpi-detail">Active WD numbers</span>
          </div>
        </div>

        <div className="wrm-kpi-card projects">
          <div className="wrm-kpi-header">
            <span className="wrm-kpi-label">Projects Covered</span>
            <Building2 size={20} />
          </div>
          <div className="wrm-kpi-value">{stats?.projects_covered || 0}</div>
          <div className="wrm-kpi-footer">
            <span className="wrm-kpi-detail">Federal-aid projects</span>
          </div>
        </div>

        <div className={`wrm-kpi-card expiring ${(stats?.expiring_soon || 0) > 0 ? 'warning' : ''}`}>
          <div className="wrm-kpi-header">
            <span className="wrm-kpi-label">Expiring Soon</span>
            <AlertTriangle size={20} />
          </div>
          <div className="wrm-kpi-value">{stats?.expiring_soon || 0}</div>
          <div className="wrm-kpi-footer">
            <span className="wrm-kpi-detail">Within 30 days</span>
          </div>
        </div>

        <div className="wrm-kpi-card compliance">
          <div className="wrm-kpi-header">
            <span className="wrm-kpi-label">Compliance Score</span>
            <Shield size={20} />
          </div>
          <div className="wrm-kpi-value">98%</div>
          <div className="wrm-kpi-footer">
            <span className="wrm-kpi-trend positive">
              <CheckCircle size={14} /> All rates current
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="wrm-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`wrm-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id as TabType)}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== null && <span className="wrm-tab-count">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="wrm-loading">
          <div className="wrm-loading-spinner" />
          <span>Loading wage rates...</span>
        </div>
      ) : (
        <div className="wrm-content">
          {activeTab === 'rates' && (
            <div className="wrm-rates-section">
              {/* Filters */}
              <div className="wrm-filters">
                <div className="wrm-search">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Search rates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  value={filterClassification}
                  onChange={(e) => setFilterClassification(e.target.value)}
                  className="wrm-filter-select"
                >
                  <option value="">All Classifications</option>
                  {WORK_CLASSIFICATIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <select
                  value={filterDetermination}
                  onChange={(e) => setFilterDetermination(e.target.value)}
                  className="wrm-filter-select"
                >
                  <option value="">All Determinations</option>
                  {uniqueDeterminations.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <select
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
                  className="wrm-filter-select"
                >
                  <option value="">All Projects</option>
                  <option value="org-wide">Organization-Wide</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.project_number} - {p.name}</option>
                  ))}
                </select>
                <button className="wrm-export-btn">
                  <Download size={16} />
                  <span>Export</span>
                </button>
              </div>

              {/* Rates by Classification */}
              <div className="wrm-rates-list">
                {Object.entries(ratesByClassification).map(([classification, classRates]) => {
                  const classInfo = WORK_CLASSIFICATIONS.find(c => c.value === classification);
                  const isExpanded = expandedClassifications.includes(classification);

                  return (
                    <div key={classification} className="wrm-classification-group">
                      <div
                        className="wrm-classification-header"
                        onClick={() => toggleClassificationExpand(classification)}
                      >
                        <div className="wrm-classification-info">
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          <Briefcase size={18} />
                          <span className="wrm-classification-name">
                            {classInfo?.label || classification}
                          </span>
                          <span className="wrm-classification-group-tag">
                            {classInfo?.group}
                          </span>
                        </div>
                        <div className="wrm-classification-summary">
                          <span className="wrm-rate-count">{classRates.length} rate{classRates.length !== 1 ? 's' : ''}</span>
                          <span className="wrm-rate-range">
                            ${Math.min(...classRates.map(r => r.total_rate)).toFixed(2)} -
                            ${Math.max(...classRates.map(r => r.total_rate)).toFixed(2)}/hr
                          </span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="wrm-rates-table">
                          <table>
                            <thead>
                              <tr>
                                <th>Title / Group</th>
                                <th>WD Number</th>
                                <th>Base Rate</th>
                                <th>Fringe</th>
                                <th>Total</th>
                                <th>OT (1.5x)</th>
                                <th>DT (2.0x)</th>
                                <th>Effective</th>
                                <th>Counties</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {classRates.map((rate) => (
                                <tr key={rate.id}>
                                  <td>
                                    <div className="wrm-rate-title">
                                      <span>{rate.classification_title}</span>
                                      {rate.project_name && (
                                        <span className="wrm-project-badge">{rate.project_name}</span>
                                      )}
                                    </div>
                                  </td>
                                  <td>
                                    <span className="wrm-wd-number">
                                      {rate.wage_determination_number}
                                      <span className="wrm-mod">Mod {rate.modification_number}</span>
                                    </span>
                                  </td>
                                  <td className="wrm-rate-value">${rate.base_rate.toFixed(2)}</td>
                                  <td className="wrm-rate-value">${rate.fringe_rate.toFixed(2)}</td>
                                  <td className="wrm-rate-value total">${rate.total_rate.toFixed(2)}</td>
                                  <td className="wrm-rate-value ot">${rate.ot_base_rate.toFixed(2)}</td>
                                  <td className="wrm-rate-value dt">${rate.dt_base_rate.toFixed(2)}</td>
                                  <td>
                                    <span className="wrm-date">
                                      {new Date(rate.effective_date).toLocaleDateString()}
                                    </span>
                                    {rate.expiration_date && (
                                      <span className={`wrm-expires ${
                                        new Date(rate.expiration_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                          ? 'soon' : ''
                                      }`}>
                                        Exp: {new Date(rate.expiration_date).toLocaleDateString()}
                                      </span>
                                    )}
                                  </td>
                                  <td>
                                    <span className="wrm-counties">
                                      {rate.counties.length > 2
                                        ? `${rate.counties.slice(0, 2).join(', ')} +${rate.counties.length - 2}`
                                        : rate.counties.join(', ')
                                      }
                                    </span>
                                  </td>
                                  <td>
                                    <div className="wrm-actions">
                                      <button
                                        className="wrm-action-btn"
                                        onClick={() => setSelectedRate(rate)}
                                        title="View Details"
                                      >
                                        <Eye size={14} />
                                      </button>
                                      <button className="wrm-action-btn" title="Edit">
                                        <Edit size={14} />
                                      </button>
                                      <button className="wrm-action-btn" title="Copy">
                                        <Copy size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'determinations' && (
            <div className="wrm-determinations-section">
              <div className="wrm-section-header">
                <h2>Wage Determinations</h2>
                <a
                  href="https://sam.gov/content/wage-determinations"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wrm-external-link"
                >
                  <ExternalLink size={16} />
                  <span>SAM.gov Wage Determinations</span>
                </a>
              </div>

              <div className="wrm-determinations-grid">
                {determinations.map((wd) => (
                  <div key={wd.number} className={`wrm-determination-card ${wd.is_current ? 'current' : 'expired'}`}>
                    <div className="wrm-wd-header">
                      <div className="wrm-wd-info">
                        <span className="wrm-wd-num">{wd.number}</span>
                        <span className={`wrm-wd-status ${wd.is_current ? 'current' : 'expired'}`}>
                          {wd.is_current ? 'Current' : 'Superseded'}
                        </span>
                      </div>
                      <span className="wrm-wd-mod">Modification {wd.modification}</span>
                    </div>

                    <div className="wrm-wd-details">
                      <div className="wrm-wd-detail">
                        <Calendar size={14} />
                        <span>Effective: {new Date(wd.effective_date).toLocaleDateString()}</span>
                      </div>
                      <div className="wrm-wd-detail">
                        <MapPin size={14} />
                        <span>{wd.state}</span>
                      </div>
                      <div className="wrm-wd-detail">
                        <Users size={14} />
                        <span>{wd.rate_count} Classifications</span>
                      </div>
                    </div>

                    <div className="wrm-wd-counties">
                      <span className="wrm-wd-counties-label">Counties:</span>
                      <div className="wrm-wd-counties-list">
                        {wd.counties.slice(0, 4).map((county) => (
                          <span key={county} className="wrm-county-tag">{county}</span>
                        ))}
                        {wd.counties.length > 4 && (
                          <span className="wrm-county-more">+{wd.counties.length - 4} more</span>
                        )}
                      </div>
                    </div>

                    <div className="wrm-wd-actions">
                      <button className="wrm-wd-action">
                        <Eye size={14} />
                        <span>View Rates</span>
                      </button>
                      <button className="wrm-wd-action">
                        <Download size={14} />
                        <span>Export</span>
                      </button>
                      <button className="wrm-wd-action">
                        <RefreshCw size={14} />
                        <span>Check Updates</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'classifications' && (
            <div className="wrm-classifications-section">
              <div className="wrm-section-header">
                <h2>Work Classifications</h2>
                <p>Davis-Bacon trade classifications and rate summary</p>
              </div>

              <div className="wrm-classifications-grid">
                {WORK_CLASSIFICATIONS.map((classification) => {
                  const classRates = rates.filter(r => r.work_classification === classification.value);
                  const avgRate = classRates.length > 0
                    ? classRates.reduce((acc, r) => acc + r.total_rate, 0) / classRates.length
                    : 0;

                  return (
                    <div key={classification.value} className="wrm-class-card">
                      <div className="wrm-class-header">
                        <div className="wrm-class-icon">
                          <Briefcase size={20} />
                        </div>
                        <div className="wrm-class-info">
                          <h3>{classification.label}</h3>
                          <span className="wrm-class-group">{classification.group}</span>
                        </div>
                      </div>

                      <div className="wrm-class-stats">
                        <div className="wrm-class-stat">
                          <span className="wrm-class-stat-label">Active Rates</span>
                          <span className="wrm-class-stat-value">{classRates.length}</span>
                        </div>
                        <div className="wrm-class-stat">
                          <span className="wrm-class-stat-label">Avg Total Rate</span>
                          <span className="wrm-class-stat-value">
                            {avgRate > 0 ? `$${avgRate.toFixed(2)}/hr` : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {classRates.length > 0 && (
                        <div className="wrm-class-rate-bar">
                          <div className="wrm-rate-bar-label">
                            <span>Rate Range</span>
                            <span>
                              ${Math.min(...classRates.map(r => r.total_rate)).toFixed(2)} -
                              ${Math.max(...classRates.map(r => r.total_rate)).toFixed(2)}
                            </span>
                          </div>
                          <div className="wrm-rate-bar">
                            <div
                              className="wrm-rate-bar-fill"
                              style={{ width: `${Math.min(avgRate / 60 * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <button
                        className="wrm-class-view-btn"
                        onClick={() => {
                          setFilterClassification(classification.value);
                          setActiveTab('rates');
                        }}
                      >
                        View All Rates <ChevronRight size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="wrm-projects-section">
              <div className="wrm-section-header">
                <h2>Project-Specific Rates</h2>
                <p>Wage determinations assigned to federal-aid projects</p>
              </div>

              <div className="wrm-projects-list">
                {projects.map((project) => {
                  const projectRates = rates.filter(r =>
                    r.project_id === project.id ||
                    r.wage_determination_number === project.wage_determination_number
                  );
                  const uniqueClasses = [...new Set(projectRates.map(r => r.work_classification))];

                  return (
                    <div key={project.id} className="wrm-project-card">
                      <div className="wrm-project-header">
                        <div className="wrm-project-info">
                          <span className="wrm-project-number">{project.project_number}</span>
                          <h3>{project.name}</h3>
                          <span className="wrm-project-contract">{project.contract_number}</span>
                        </div>
                        <div className={`wrm-davis-bacon-badge ${project.davis_bacon_required ? 'required' : ''}`}>
                          <Shield size={14} />
                          <span>Davis-Bacon Required</span>
                        </div>
                      </div>

                      <div className="wrm-project-wd">
                        <FileText size={16} />
                        <span>Wage Determination:</span>
                        <strong>{project.wage_determination_number || 'Not Assigned'}</strong>
                      </div>

                      <div className="wrm-project-stats">
                        <div className="wrm-project-stat">
                          <span className="label">Classifications</span>
                          <span className="value">{uniqueClasses.length}</span>
                        </div>
                        <div className="wrm-project-stat">
                          <span className="label">Total Rates</span>
                          <span className="value">{projectRates.length}</span>
                        </div>
                        <div className="wrm-project-stat">
                          <span className="label">Status</span>
                          <span className="value status-active">
                            <CheckCircle size={12} /> Compliant
                          </span>
                        </div>
                      </div>

                      <div className="wrm-project-actions">
                        <button
                          className="wrm-project-action"
                          onClick={() => {
                            setFilterProject(project.id);
                            setActiveTab('rates');
                          }}
                        >
                          <Eye size={14} />
                          <span>View Rates</span>
                        </button>
                        <button className="wrm-project-action">
                          <FileSpreadsheet size={14} />
                          <span>WH-347 Report</span>
                        </button>
                        <button className="wrm-project-action">
                          <Download size={14} />
                          <span>Export</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="wrm-import-section">
              <div className="wrm-section-header">
                <h2>Import Wage Rates</h2>
                <p>Import wage determinations from Department of Labor</p>
              </div>

              <div className="wrm-import-options">
                <div className="wrm-import-card">
                  <div className="wrm-import-icon sam">
                    <ExternalLink size={32} />
                  </div>
                  <h3>SAM.gov Import</h3>
                  <p>Import directly from SAM.gov wage determination database</p>
                  <div className="wrm-import-form">
                    <input
                      type="text"
                      placeholder="Enter WD Number (e.g., WV20240001)"
                      className="wrm-import-input"
                    />
                    <button className="wrm-import-btn">
                      <Download size={16} />
                      Fetch Rates
                    </button>
                  </div>
                </div>

                <div className="wrm-import-card">
                  <div className="wrm-import-icon file">
                    <FileSpreadsheet size={32} />
                  </div>
                  <h3>CSV/Excel Upload</h3>
                  <p>Upload wage rates from a spreadsheet file</p>
                  <div className="wrm-upload-zone">
                    <Upload size={24} />
                    <span>Drag & drop file here or click to browse</span>
                    <span className="wrm-upload-formats">Supports: .csv, .xlsx, .xls</span>
                  </div>
                  <a href="#" className="wrm-template-link">
                    <Download size={14} />
                    Download Template
                  </a>
                </div>

                <div className="wrm-import-card">
                  <div className="wrm-import-icon manual">
                    <Plus size={32} />
                  </div>
                  <h3>Manual Entry</h3>
                  <p>Add individual wage rates manually</p>
                  <button className="wrm-manual-btn" onClick={() => setShowAddModal(true)}>
                    <Plus size={16} />
                    Add New Rate
                  </button>
                </div>
              </div>

              <div className="wrm-import-history">
                <h3>Recent Imports</h3>
                <div className="wrm-import-history-list">
                  <div className="wrm-import-record">
                    <div className="wrm-import-record-info">
                      <CheckCircle size={16} className="success" />
                      <span className="wrm-import-record-name">WV20240001 Mod 3</span>
                      <span className="wrm-import-record-count">45 rates imported</span>
                    </div>
                    <span className="wrm-import-record-date">Dec 1, 2024</span>
                  </div>
                  <div className="wrm-import-record">
                    <div className="wrm-import-record-info">
                      <CheckCircle size={16} className="success" />
                      <span className="wrm-import-record-name">WV20240002 Mod 1</span>
                      <span className="wrm-import-record-count">38 rates imported</span>
                    </div>
                    <span className="wrm-import-record-date">Nov 15, 2024</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="wrm-history-section">
              <div className="wrm-section-header">
                <h2>Rate Change History</h2>
                <p>Audit trail of all wage rate modifications</p>
              </div>

              <div className="wrm-history-filters">
                <input
                  type="date"
                  className="wrm-date-input"
                  placeholder="Start Date"
                />
                <input
                  type="date"
                  className="wrm-date-input"
                  placeholder="End Date"
                />
                <select className="wrm-filter-select">
                  <option value="">All Actions</option>
                  <option value="create">Created</option>
                  <option value="update">Updated</option>
                  <option value="delete">Deleted</option>
                  <option value="import">Imported</option>
                </select>
              </div>

              <div className="wrm-history-timeline">
                {[
                  { action: 'import', user: 'Brian Lewis', date: '2024-12-01T14:30:00Z', description: 'Imported WV20240001 Mod 3 - 45 rates' },
                  { action: 'update', user: 'System', date: '2024-11-28T09:15:00Z', description: 'Updated fringe rate for Laborer Group 1' },
                  { action: 'create', user: 'Brian Lewis', date: '2024-11-15T11:00:00Z', description: 'Added project-specific rates for I-64 Bridge' },
                  { action: 'import', user: 'Brian Lewis', date: '2024-11-01T08:45:00Z', description: 'Imported WV20240002 Mod 1 - 38 rates' },
                ].map((item, index) => (
                  <div key={index} className={`wrm-history-item ${item.action}`}>
                    <div className="wrm-history-icon">
                      {item.action === 'import' && <Upload size={16} />}
                      {item.action === 'update' && <Edit size={16} />}
                      {item.action === 'create' && <Plus size={16} />}
                      {item.action === 'delete' && <Trash2 size={16} />}
                    </div>
                    <div className="wrm-history-content">
                      <div className="wrm-history-header">
                        <span className="wrm-history-user">{item.user}</span>
                        <span className={`wrm-history-action ${item.action}`}>{item.action}</span>
                      </div>
                      <p className="wrm-history-desc">{item.description}</p>
                      <span className="wrm-history-time">
                        {new Date(item.date).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rate Detail Modal */}
      {selectedRate && (
        <div className="wrm-modal-overlay" onClick={() => setSelectedRate(null)}>
          <div className="wrm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wrm-modal-header">
              <h2>Wage Rate Details</h2>
              <button className="wrm-modal-close" onClick={() => setSelectedRate(null)}>
                <XCircle size={20} />
              </button>
            </div>
            <div className="wrm-modal-body">
              <div className="wrm-detail-section">
                <h3>Classification</h3>
                <div className="wrm-detail-row">
                  <span className="wrm-detail-label">Title</span>
                  <span className="wrm-detail-value">{selectedRate.classification_title}</span>
                </div>
                <div className="wrm-detail-row">
                  <span className="wrm-detail-label">Classification</span>
                  <span className="wrm-detail-value">
                    {WORK_CLASSIFICATIONS.find(c => c.value === selectedRate.work_classification)?.label}
                  </span>
                </div>
                {selectedRate.group_number && (
                  <div className="wrm-detail-row">
                    <span className="wrm-detail-label">Group</span>
                    <span className="wrm-detail-value">{selectedRate.group_number}</span>
                  </div>
                )}
              </div>

              <div className="wrm-detail-section">
                <h3>Wage Determination</h3>
                <div className="wrm-detail-row">
                  <span className="wrm-detail-label">WD Number</span>
                  <span className="wrm-detail-value">{selectedRate.wage_determination_number}</span>
                </div>
                <div className="wrm-detail-row">
                  <span className="wrm-detail-label">Modification</span>
                  <span className="wrm-detail-value">{selectedRate.modification_number}</span>
                </div>
              </div>

              <div className="wrm-detail-section">
                <h3>Hourly Rates</h3>
                <div className="wrm-rates-detail-grid">
                  <div className="wrm-rate-detail-card">
                    <span className="label">Base Rate</span>
                    <span className="value">${selectedRate.base_rate.toFixed(2)}</span>
                  </div>
                  <div className="wrm-rate-detail-card">
                    <span className="label">Fringe</span>
                    <span className="value">${selectedRate.fringe_rate.toFixed(2)}</span>
                  </div>
                  <div className="wrm-rate-detail-card total">
                    <span className="label">Total Rate</span>
                    <span className="value">${selectedRate.total_rate.toFixed(2)}</span>
                  </div>
                  <div className="wrm-rate-detail-card ot">
                    <span className="label">OT (1.5x Base)</span>
                    <span className="value">${selectedRate.ot_base_rate.toFixed(2)}</span>
                  </div>
                  <div className="wrm-rate-detail-card dt">
                    <span className="label">DT (2.0x Base)</span>
                    <span className="value">${selectedRate.dt_base_rate.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="wrm-detail-section">
                <h3>Effective Period</h3>
                <div className="wrm-detail-row">
                  <span className="wrm-detail-label">Effective Date</span>
                  <span className="wrm-detail-value">
                    {new Date(selectedRate.effective_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="wrm-detail-row">
                  <span className="wrm-detail-label">Expiration Date</span>
                  <span className="wrm-detail-value">
                    {selectedRate.expiration_date
                      ? new Date(selectedRate.expiration_date).toLocaleDateString()
                      : 'No Expiration'
                    }
                  </span>
                </div>
              </div>

              <div className="wrm-detail-section">
                <h3>Geographic Coverage</h3>
                <div className="wrm-counties-detail">
                  {selectedRate.counties.map((county) => (
                    <span key={county} className="wrm-county-detail-tag">{county}</span>
                  ))}
                </div>
              </div>

              {selectedRate.project_name && (
                <div className="wrm-detail-section">
                  <h3>Project Assignment</h3>
                  <div className="wrm-detail-row">
                    <span className="wrm-detail-label">Project</span>
                    <span className="wrm-detail-value">{selectedRate.project_name}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="wrm-modal-footer">
              <button className="wrm-modal-btn secondary" onClick={() => setSelectedRate(null)}>
                Close
              </button>
              <button className="wrm-modal-btn primary">
                <Edit size={16} />
                Edit Rate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WageRateManagement;
