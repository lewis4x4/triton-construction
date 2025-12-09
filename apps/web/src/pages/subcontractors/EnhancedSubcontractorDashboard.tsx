import { useState, useEffect } from 'react';
import {
  Building2,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Download,
  Plus,
  ChevronRight,
  X,
  MapPin,
  Calendar,
  DollarSign,
  BarChart2,
  Star,
  Phone,
  Mail,
  Award,
  FileCheck,
  RefreshCw,
  Eye,
  Briefcase,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertCircle,
  Flag,
  Receipt,
  ClipboardList
} from 'lucide-react';
import './EnhancedSubcontractorDashboard.css';

// Interfaces
interface KPIData {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color: string;
}

interface Subcontractor {
  id: string;
  company_name: string;
  primary_trade: string;
  secondary_trades: string[];
  primary_contact_name: string;
  primary_contact_phone: string;
  primary_contact_email: string;
  office_phone: string;
  office_email: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  is_dbe_certified: boolean;
  dbe_certification_number: string;
  dbe_certification_expiration: string;
  dbe_categories: string[];
  is_mbe_certified: boolean;
  is_wbe_certified: boolean;
  is_vbe_certified: boolean;
  prequalification_expiration: string;
  prequalification_amount: number;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  performance_rating: number;
  total_contracts: number;
  total_contract_value: number;
  active_contracts: number;
  completed_contracts: number;
  on_time_rate: number;
  quality_score: number;
  safety_score: number;
  created_at: string;
}

interface SubcontractAgreement {
  id: string;
  agreement_number: string;
  subcontractor_id: string;
  subcontractor_name: string;
  project_id: string;
  project_name: string;
  project_number: string;
  title: string;
  scope_of_work: string;
  trade: string;
  original_value: number;
  current_value: number;
  change_order_value: number;
  invoiced_amount: number;
  paid_amount: number;
  retained_amount: number;
  percent_complete: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'executed' | 'in_progress' | 'complete' | 'suspended' | 'terminated';
  start_date: string;
  completion_date: string;
  actual_completion_date?: string;
  is_dbe_work: boolean;
  dbe_amount: number;
}

interface DBEGoal {
  project_id: string;
  project_name: string;
  project_number: string;
  dbe_goal_percentage: number;
  committed_percentage: number;
  achieved_percentage: number;
  total_contract_value: number;
  dbe_committed_value: number;
  dbe_paid_value: number;
  status: 'on_track' | 'at_risk' | 'below_goal';
}

interface InsuranceRecord {
  id: string;
  subcontractor_id: string;
  subcontractor_name: string;
  insurance_type: string;
  carrier: string;
  policy_number: string;
  coverage_amount: number;
  effective_date: string;
  expiration_date: string;
  status: 'active' | 'expiring' | 'expired';
  days_until_expiration: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  subcontractor_name: string;
  project_name: string;
  amount: number;
  submitted_date: string;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid';
  due_date: string;
  payment_date?: string;
}

interface TradeBreakdown {
  trade: string;
  count: number;
  total_value: number;
  percentage: number;
  color: string;
}

export function EnhancedSubcontractorDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'directory' | 'agreements' | 'dbe' | 'compliance' | 'invoices'>('overview');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tradeFilter, setTradeFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Data states
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [agreements, setAgreements] = useState<SubcontractAgreement[]>([]);
  const [dbeGoals, setDbeGoals] = useState<DBEGoal[]>([]);
  const [insuranceRecords, setInsuranceRecords] = useState<InsuranceRecord[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tradeBreakdown, setTradeBreakdown] = useState<TradeBreakdown[]>([]);

  // Detail panel
  const [selectedSubcontractor, setSelectedSubcontractor] = useState<Subcontractor | null>(null);
  const [selectedAgreement, setSelectedAgreement] = useState<SubcontractAgreement | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [detailType, setDetailType] = useState<'subcontractor' | 'agreement'>('subcontractor');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    await loadDemoData();
    setLoading(false);
  }

  async function loadDemoData() {
    // Demo subcontractors
    const demoSubcontractors: Subcontractor[] = [
      {
        id: 'sub1',
        company_name: 'Valley Concrete Contractors',
        primary_trade: 'Concrete',
        secondary_trades: ['Masonry', 'Forming'],
        primary_contact_name: 'Robert Mason',
        primary_contact_phone: '304-555-0101',
        primary_contact_email: 'rmason@valleyconcrete.com',
        office_phone: '304-555-0100',
        office_email: 'info@valleyconcrete.com',
        address: '1234 Industrial Park Dr',
        city: 'Charleston',
        state: 'WV',
        zip_code: '25301',
        is_dbe_certified: true,
        dbe_certification_number: 'DBE-WV-2024-1234',
        dbe_certification_expiration: '2025-06-30',
        dbe_categories: ['DBE'],
        is_mbe_certified: false,
        is_wbe_certified: false,
        is_vbe_certified: false,
        prequalification_expiration: '2025-03-15',
        prequalification_amount: 5000000,
        status: 'active',
        performance_rating: 4.7,
        total_contracts: 24,
        total_contract_value: 8500000,
        active_contracts: 3,
        completed_contracts: 21,
        on_time_rate: 94.5,
        quality_score: 96.2,
        safety_score: 98.0,
        created_at: '2020-03-15'
      },
      {
        id: 'sub2',
        company_name: 'Mountain State Electric',
        primary_trade: 'Electrical',
        secondary_trades: ['Low Voltage', 'Fiber Optics'],
        primary_contact_name: 'Sarah Watts',
        primary_contact_phone: '304-555-0201',
        primary_contact_email: 'swatts@mtnelectric.com',
        office_phone: '304-555-0200',
        office_email: 'info@mtnelectric.com',
        address: '567 Power Ave',
        city: 'Huntington',
        state: 'WV',
        zip_code: '25701',
        is_dbe_certified: true,
        dbe_certification_number: 'DBE-WV-2024-5678',
        dbe_certification_expiration: '2025-08-15',
        dbe_categories: ['WBE', 'DBE'],
        is_mbe_certified: false,
        is_wbe_certified: true,
        is_vbe_certified: false,
        prequalification_expiration: '2025-05-20',
        prequalification_amount: 3000000,
        status: 'active',
        performance_rating: 4.9,
        total_contracts: 18,
        total_contract_value: 4200000,
        active_contracts: 2,
        completed_contracts: 16,
        on_time_rate: 97.8,
        quality_score: 98.5,
        safety_score: 99.2,
        created_at: '2019-06-20'
      },
      {
        id: 'sub3',
        company_name: 'Appalachian Earthworks',
        primary_trade: 'Earthwork',
        secondary_trades: ['Grading', 'Utilities'],
        primary_contact_name: 'Thomas Digger',
        primary_contact_phone: '304-555-0301',
        primary_contact_email: 'tdigger@appalachianearth.com',
        office_phone: '304-555-0300',
        office_email: 'info@appalachianearth.com',
        address: '890 Excavation Rd',
        city: 'Morgantown',
        state: 'WV',
        zip_code: '26501',
        is_dbe_certified: false,
        dbe_certification_number: '',
        dbe_certification_expiration: '',
        dbe_categories: [],
        is_mbe_certified: false,
        is_wbe_certified: false,
        is_vbe_certified: true,
        prequalification_expiration: '2025-01-31',
        prequalification_amount: 10000000,
        status: 'active',
        performance_rating: 4.5,
        total_contracts: 32,
        total_contract_value: 15200000,
        active_contracts: 4,
        completed_contracts: 28,
        on_time_rate: 91.2,
        quality_score: 94.8,
        safety_score: 97.5,
        created_at: '2018-02-10'
      },
      {
        id: 'sub4',
        company_name: 'Steel Bridge Solutions',
        primary_trade: 'Structural Steel',
        secondary_trades: ['Bridge Work', 'Welding'],
        primary_contact_name: 'Michael Steele',
        primary_contact_phone: '304-555-0401',
        primary_contact_email: 'msteele@steelbridge.com',
        office_phone: '304-555-0400',
        office_email: 'info@steelbridge.com',
        address: '234 Fabrication Way',
        city: 'Wheeling',
        state: 'WV',
        zip_code: '26003',
        is_dbe_certified: false,
        dbe_certification_number: '',
        dbe_certification_expiration: '',
        dbe_categories: [],
        is_mbe_certified: false,
        is_wbe_certified: false,
        is_vbe_certified: false,
        prequalification_expiration: '2025-07-15',
        prequalification_amount: 8000000,
        status: 'active',
        performance_rating: 4.8,
        total_contracts: 15,
        total_contract_value: 12500000,
        active_contracts: 2,
        completed_contracts: 13,
        on_time_rate: 93.3,
        quality_score: 97.5,
        safety_score: 98.8,
        created_at: '2017-09-01'
      },
      {
        id: 'sub5',
        company_name: 'Blue Ridge Paving',
        primary_trade: 'Asphalt',
        secondary_trades: ['Milling', 'Striping'],
        primary_contact_name: 'Jennifer Blacktop',
        primary_contact_phone: '304-555-0501',
        primary_contact_email: 'jblacktop@blueridgepaving.com',
        office_phone: '304-555-0500',
        office_email: 'info@blueridgepaving.com',
        address: '678 Pavement Dr',
        city: 'Beckley',
        state: 'WV',
        zip_code: '25801',
        is_dbe_certified: true,
        dbe_certification_number: 'DBE-WV-2023-9012',
        dbe_certification_expiration: '2024-12-15',
        dbe_categories: ['MBE', 'DBE'],
        is_mbe_certified: true,
        is_wbe_certified: false,
        is_vbe_certified: false,
        prequalification_expiration: '2025-04-30',
        prequalification_amount: 6000000,
        status: 'active',
        performance_rating: 4.6,
        total_contracts: 28,
        total_contract_value: 9800000,
        active_contracts: 3,
        completed_contracts: 25,
        on_time_rate: 92.8,
        quality_score: 95.3,
        safety_score: 96.5,
        created_at: '2019-11-15'
      },
      {
        id: 'sub6',
        company_name: 'Guardian Traffic Control',
        primary_trade: 'Traffic Control',
        secondary_trades: ['Signage', 'MOT'],
        primary_contact_name: 'David Flagman',
        primary_contact_phone: '304-555-0601',
        primary_contact_email: 'dflagman@guardiantraffic.com',
        office_phone: '304-555-0600',
        office_email: 'info@guardiantraffic.com',
        address: '345 Safety Blvd',
        city: 'Parkersburg',
        state: 'WV',
        zip_code: '26101',
        is_dbe_certified: true,
        dbe_certification_number: 'DBE-WV-2024-3456',
        dbe_certification_expiration: '2025-09-30',
        dbe_categories: ['DBE'],
        is_mbe_certified: false,
        is_wbe_certified: false,
        is_vbe_certified: false,
        prequalification_expiration: '2025-06-15',
        prequalification_amount: 2000000,
        status: 'active',
        performance_rating: 4.4,
        total_contracts: 45,
        total_contract_value: 3500000,
        active_contracts: 6,
        completed_contracts: 39,
        on_time_rate: 98.5,
        quality_score: 93.2,
        safety_score: 99.5,
        created_at: '2021-01-05'
      }
    ];

    // Demo agreements
    const demoAgreements: SubcontractAgreement[] = [
      {
        id: 'agr1',
        agreement_number: 'CH12-SUB-001',
        subcontractor_id: 'sub1',
        subcontractor_name: 'Valley Concrete Contractors',
        project_id: 'p1',
        project_name: 'Corridor H Section 12',
        project_number: 'DOH-2024-CH12',
        title: 'Bridge Deck Concrete',
        scope_of_work: 'Supply and place structural concrete for bridge deck, including forming, reinforcement, and finishing',
        trade: 'Concrete',
        original_value: 850000,
        current_value: 892500,
        change_order_value: 42500,
        invoiced_amount: 625000,
        paid_amount: 562500,
        retained_amount: 62500,
        percent_complete: 70,
        status: 'in_progress',
        start_date: '2024-06-01',
        completion_date: '2025-02-28',
        is_dbe_work: true,
        dbe_amount: 892500
      },
      {
        id: 'agr2',
        agreement_number: 'CH12-SUB-002',
        subcontractor_id: 'sub2',
        subcontractor_name: 'Mountain State Electric',
        project_id: 'p1',
        project_name: 'Corridor H Section 12',
        project_number: 'DOH-2024-CH12',
        title: 'Highway Lighting Installation',
        scope_of_work: 'Complete highway lighting system including poles, fixtures, conduit, and connections',
        trade: 'Electrical',
        original_value: 425000,
        current_value: 425000,
        change_order_value: 0,
        invoiced_amount: 212500,
        paid_amount: 191250,
        retained_amount: 21250,
        percent_complete: 50,
        status: 'in_progress',
        start_date: '2024-08-15',
        completion_date: '2025-04-30',
        is_dbe_work: true,
        dbe_amount: 425000
      },
      {
        id: 'agr3',
        agreement_number: 'CH12-SUB-003',
        subcontractor_id: 'sub3',
        subcontractor_name: 'Appalachian Earthworks',
        project_id: 'p1',
        project_name: 'Corridor H Section 12',
        project_number: 'DOH-2024-CH12',
        title: 'Mass Excavation & Grading',
        scope_of_work: 'Site clearing, mass excavation, grading, and embankment construction',
        trade: 'Earthwork',
        original_value: 2850000,
        current_value: 3125000,
        change_order_value: 275000,
        invoiced_amount: 2812500,
        paid_amount: 2531250,
        retained_amount: 281250,
        percent_complete: 90,
        status: 'in_progress',
        start_date: '2024-03-01',
        completion_date: '2024-12-31',
        is_dbe_work: false,
        dbe_amount: 0
      },
      {
        id: 'agr4',
        agreement_number: 'BR50-SUB-001',
        subcontractor_id: 'sub4',
        subcontractor_name: 'Steel Bridge Solutions',
        project_id: 'p2',
        project_name: 'Route 50 Bridge Replacement',
        project_number: 'DOH-2024-BR50',
        title: 'Structural Steel Erection',
        scope_of_work: 'Fabrication and erection of structural steel bridge components',
        trade: 'Structural Steel',
        original_value: 1650000,
        current_value: 1650000,
        change_order_value: 0,
        invoiced_amount: 990000,
        paid_amount: 891000,
        retained_amount: 99000,
        percent_complete: 60,
        status: 'in_progress',
        start_date: '2024-07-01',
        completion_date: '2025-03-31',
        is_dbe_work: false,
        dbe_amount: 0
      },
      {
        id: 'agr5',
        agreement_number: 'CH12-SUB-004',
        subcontractor_id: 'sub5',
        subcontractor_name: 'Blue Ridge Paving',
        project_id: 'p1',
        project_name: 'Corridor H Section 12',
        project_number: 'DOH-2024-CH12',
        title: 'Asphalt Paving - Full Depth',
        scope_of_work: 'Full depth asphalt paving including base, binder, and surface courses',
        trade: 'Asphalt',
        original_value: 1450000,
        current_value: 1523000,
        change_order_value: 73000,
        invoiced_amount: 380750,
        paid_amount: 342675,
        retained_amount: 38075,
        percent_complete: 25,
        status: 'in_progress',
        start_date: '2024-09-15',
        completion_date: '2025-06-30',
        is_dbe_work: true,
        dbe_amount: 1523000
      },
      {
        id: 'agr6',
        agreement_number: 'CH12-SUB-005',
        subcontractor_id: 'sub6',
        subcontractor_name: 'Guardian Traffic Control',
        project_id: 'p1',
        project_name: 'Corridor H Section 12',
        project_number: 'DOH-2024-CH12',
        title: 'Traffic Control Services',
        scope_of_work: 'Complete maintenance of traffic including signage, flagging, and detour setup',
        trade: 'Traffic Control',
        original_value: 285000,
        current_value: 312000,
        change_order_value: 27000,
        invoiced_amount: 218400,
        paid_amount: 196560,
        retained_amount: 21840,
        percent_complete: 70,
        status: 'in_progress',
        start_date: '2024-03-01',
        completion_date: '2025-06-30',
        is_dbe_work: true,
        dbe_amount: 312000
      }
    ];

    // Demo DBE goals
    const demoDbeGoals: DBEGoal[] = [
      {
        project_id: 'p1',
        project_name: 'Corridor H Section 12',
        project_number: 'DOH-2024-CH12',
        dbe_goal_percentage: 8.5,
        committed_percentage: 10.2,
        achieved_percentage: 8.8,
        total_contract_value: 15000000,
        dbe_committed_value: 1530000,
        dbe_paid_value: 1320000,
        status: 'on_track'
      },
      {
        project_id: 'p2',
        project_name: 'Route 50 Bridge Replacement',
        project_number: 'DOH-2024-BR50',
        dbe_goal_percentage: 7.0,
        committed_percentage: 6.2,
        achieved_percentage: 4.5,
        total_contract_value: 8500000,
        dbe_committed_value: 527000,
        dbe_paid_value: 382500,
        status: 'at_risk'
      },
      {
        project_id: 'p3',
        project_name: 'I-79 Safety Improvements',
        project_number: 'DOH-2024-I79',
        dbe_goal_percentage: 9.0,
        committed_percentage: 11.5,
        achieved_percentage: 10.2,
        total_contract_value: 4200000,
        dbe_committed_value: 483000,
        dbe_paid_value: 428400,
        status: 'on_track'
      }
    ];

    // Demo insurance records
    const demoInsurance: InsuranceRecord[] = [
      {
        id: 'ins1',
        subcontractor_id: 'sub1',
        subcontractor_name: 'Valley Concrete Contractors',
        insurance_type: 'General Liability',
        carrier: 'Hartford Insurance',
        policy_number: 'GL-2024-78901',
        coverage_amount: 2000000,
        effective_date: '2024-01-01',
        expiration_date: '2025-01-01',
        status: 'active',
        days_until_expiration: 24
      },
      {
        id: 'ins2',
        subcontractor_id: 'sub1',
        subcontractor_name: 'Valley Concrete Contractors',
        insurance_type: 'Workers Compensation',
        carrier: 'Liberty Mutual',
        policy_number: 'WC-2024-45678',
        coverage_amount: 1000000,
        effective_date: '2024-01-01',
        expiration_date: '2025-01-01',
        status: 'active',
        days_until_expiration: 24
      },
      {
        id: 'ins3',
        subcontractor_id: 'sub2',
        subcontractor_name: 'Mountain State Electric',
        insurance_type: 'General Liability',
        carrier: 'Travelers',
        policy_number: 'GL-2024-12345',
        coverage_amount: 2000000,
        effective_date: '2024-03-01',
        expiration_date: '2025-03-01',
        status: 'active',
        days_until_expiration: 83
      },
      {
        id: 'ins4',
        subcontractor_id: 'sub5',
        subcontractor_name: 'Blue Ridge Paving',
        insurance_type: 'Auto Liability',
        carrier: 'Progressive Commercial',
        policy_number: 'AL-2024-98765',
        coverage_amount: 1000000,
        effective_date: '2024-06-01',
        expiration_date: '2024-12-15',
        status: 'expiring',
        days_until_expiration: 7
      },
      {
        id: 'ins5',
        subcontractor_id: 'sub3',
        subcontractor_name: 'Appalachian Earthworks',
        insurance_type: 'Umbrella',
        carrier: 'Zurich',
        policy_number: 'UMB-2024-24680',
        coverage_amount: 5000000,
        effective_date: '2024-02-01',
        expiration_date: '2024-12-01',
        status: 'expired',
        days_until_expiration: -7
      }
    ];

    // Demo invoices
    const demoInvoices: Invoice[] = [
      {
        id: 'inv1',
        invoice_number: 'VCC-2024-089',
        subcontractor_name: 'Valley Concrete Contractors',
        project_name: 'Corridor H Section 12',
        amount: 125000,
        submitted_date: '2024-12-01',
        status: 'approved',
        due_date: '2024-12-31'
      },
      {
        id: 'inv2',
        invoice_number: 'MSE-2024-045',
        subcontractor_name: 'Mountain State Electric',
        project_name: 'Corridor H Section 12',
        amount: 42500,
        submitted_date: '2024-12-03',
        status: 'under_review',
        due_date: '2025-01-02'
      },
      {
        id: 'inv3',
        invoice_number: 'AE-2024-156',
        subcontractor_name: 'Appalachian Earthworks',
        project_name: 'Corridor H Section 12',
        amount: 312500,
        submitted_date: '2024-11-28',
        status: 'paid',
        due_date: '2024-12-28',
        payment_date: '2024-12-05'
      },
      {
        id: 'inv4',
        invoice_number: 'BRP-2024-078',
        subcontractor_name: 'Blue Ridge Paving',
        project_name: 'Corridor H Section 12',
        amount: 95250,
        submitted_date: '2024-12-05',
        status: 'submitted',
        due_date: '2025-01-04'
      },
      {
        id: 'inv5',
        invoice_number: 'SBS-2024-034',
        subcontractor_name: 'Steel Bridge Solutions',
        project_name: 'Route 50 Bridge Replacement',
        amount: 165000,
        submitted_date: '2024-12-02',
        status: 'approved',
        due_date: '2025-01-01'
      }
    ];

    // Demo trade breakdown
    const demoTradeBreakdown: TradeBreakdown[] = [
      { trade: 'Earthwork', count: 4, total_value: 15200000, percentage: 28, color: '#8b5cf6' },
      { trade: 'Structural Steel', count: 2, total_value: 12500000, percentage: 23, color: '#ef4444' },
      { trade: 'Asphalt', count: 3, total_value: 9800000, percentage: 18, color: '#1a1a2e' },
      { trade: 'Concrete', count: 3, total_value: 8500000, percentage: 16, color: '#6b7280' },
      { trade: 'Electrical', count: 2, total_value: 4200000, percentage: 8, color: '#f59e0b' },
      { trade: 'Traffic Control', count: 6, total_value: 3500000, percentage: 7, color: '#10b981' }
    ];

    setSubcontractors(demoSubcontractors);
    setAgreements(demoAgreements);
    setDbeGoals(demoDbeGoals);
    setInsuranceRecords(demoInsurance);
    setInvoices(demoInvoices);
    setTradeBreakdown(demoTradeBreakdown);
  }

  // Filter subcontractors
  const filteredSubcontractors = subcontractors.filter(sub => {
    const matchesSearch = !searchTerm ||
      sub.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.primary_trade.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    const matchesTrade = tradeFilter === 'all' || sub.primary_trade === tradeFilter;

    return matchesSearch && matchesStatus && matchesTrade;
  });

  // Filter agreements
  const filteredAgreements = agreements.filter(agr => {
    const matchesSearch = !searchTerm ||
      agr.agreement_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agr.subcontractor_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || agr.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate KPIs
  const totalContractValue = agreements.reduce((sum, a) => sum + a.current_value, 0);
  const totalInvoiced = agreements.reduce((sum, a) => sum + a.invoiced_amount, 0);
  const totalPaid = agreements.reduce((sum, a) => sum + a.paid_amount, 0);
  const dbeSubcontractors = subcontractors.filter(s => s.is_dbe_certified).length;
  const expiringInsurance = insuranceRecords.filter(i => i.status === 'expiring' || i.status === 'expired').length;

  const kpis: KPIData[] = [
    {
      label: 'Active Subcontractors',
      value: subcontractors.filter(s => s.status === 'active').length,
      icon: <Building2 size={24} />,
      trend: 'neutral',
      color: 'blue'
    },
    {
      label: 'Active Agreements',
      value: agreements.filter(a => a.status === 'in_progress').length,
      change: 8,
      changeLabel: 'vs last month',
      icon: <FileText size={24} />,
      trend: 'up',
      color: 'green'
    },
    {
      label: 'Total Contract Value',
      value: `$${(totalContractValue / 1000000).toFixed(1)}M`,
      icon: <DollarSign size={24} />,
      trend: 'up',
      color: 'cyan'
    },
    {
      label: 'DBE Certified',
      value: dbeSubcontractors,
      icon: <Award size={24} />,
      trend: 'neutral',
      color: 'purple'
    },
    {
      label: 'Pending Invoices',
      value: invoices.filter(i => i.status !== 'paid').length,
      icon: <Receipt size={24} />,
      trend: 'neutral',
      color: 'yellow'
    },
    {
      label: 'Compliance Alerts',
      value: expiringInsurance,
      icon: <AlertTriangle size={24} />,
      trend: expiringInsurance > 0 ? 'down' : 'neutral',
      color: 'red'
    }
  ];

  function getStatusBadge(status: string) {
    const statusConfig: Record<string, { class: string; label: string }> = {
      active: { class: 'status-active', label: 'Active' },
      inactive: { class: 'status-inactive', label: 'Inactive' },
      suspended: { class: 'status-suspended', label: 'Suspended' },
      pending: { class: 'status-pending', label: 'Pending' },
      draft: { class: 'status-draft', label: 'Draft' },
      pending_approval: { class: 'status-pending', label: 'Pending Approval' },
      approved: { class: 'status-approved', label: 'Approved' },
      executed: { class: 'status-executed', label: 'Executed' },
      in_progress: { class: 'status-in-progress', label: 'In Progress' },
      complete: { class: 'status-complete', label: 'Complete' },
      terminated: { class: 'status-terminated', label: 'Terminated' },
      submitted: { class: 'status-submitted', label: 'Submitted' },
      under_review: { class: 'status-review', label: 'Under Review' },
      paid: { class: 'status-paid', label: 'Paid' },
      rejected: { class: 'status-rejected', label: 'Rejected' },
      on_track: { class: 'status-on-track', label: 'On Track' },
      at_risk: { class: 'status-at-risk', label: 'At Risk' },
      below_goal: { class: 'status-below-goal', label: 'Below Goal' },
      expiring: { class: 'status-expiring', label: 'Expiring' },
      expired: { class: 'status-expired', label: 'Expired' }
    };

    const config = statusConfig[status] || { class: 'status-default', label: status };
    return <span className={`status-badge ${config.class}`}>{config.label}</span>;
  }

  function openSubcontractorDetail(sub: Subcontractor) {
    setSelectedSubcontractor(sub);
    setSelectedAgreement(null);
    setDetailType('subcontractor');
    setShowDetailPanel(true);
  }

  function openAgreementDetail(agreement: SubcontractAgreement) {
    setSelectedAgreement(agreement);
    setSelectedSubcontractor(null);
    setDetailType('agreement');
    setShowDetailPanel(true);
  }

  // Render trade donut chart
  function renderTradeDonut() {
    const total = tradeBreakdown.reduce((sum, t) => sum + t.percentage, 0);
    let currentAngle = -90;

    return (
      <div className="trade-donut-container">
        <svg viewBox="0 0 200 200" className="trade-donut">
          {tradeBreakdown.map((trade, index) => {
            const angle = (trade.percentage / total) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;

            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;

            const x1 = 100 + 70 * Math.cos(startRad);
            const y1 = 100 + 70 * Math.sin(startRad);
            const x2 = 100 + 70 * Math.cos(endRad);
            const y2 = 100 + 70 * Math.sin(endRad);

            const largeArc = angle > 180 ? 1 : 0;

            const pathD = `M 100 100 L ${x1} ${y1} A 70 70 0 ${largeArc} 1 ${x2} ${y2} Z`;

            return (
              <path
                key={index}
                d={pathD}
                fill={trade.color}
                className="donut-segment"
              />
            );
          })}
          <circle cx="100" cy="100" r="45" fill="var(--bg-primary)" />
          <text x="100" y="95" textAnchor="middle" className="donut-center-value">
            {subcontractors.length}
          </text>
          <text x="100" y="115" textAnchor="middle" className="donut-center-label">
            Subcontractors
          </text>
        </svg>
        <div className="trade-legend">
          {tradeBreakdown.map((trade, index) => (
            <div key={index} className="legend-item">
              <span className="legend-color" style={{ backgroundColor: trade.color }}></span>
              <span className="legend-label">{trade.trade}</span>
              <span className="legend-value">{trade.count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render DBE goal progress
  function renderDbeGoalProgress() {
    return (
      <div className="dbe-goals-list">
        {dbeGoals.map((goal, index) => (
          <div key={index} className="dbe-goal-item">
            <div className="goal-header">
              <div className="goal-project">
                <span className="project-number">{goal.project_number}</span>
                <span className="project-name">{goal.project_name}</span>
              </div>
              {getStatusBadge(goal.status)}
            </div>
            <div className="goal-progress">
              <div className="progress-bar-container">
                <div className="progress-bar">
                  <div
                    className="progress-fill achieved"
                    style={{ width: `${(goal.achieved_percentage / goal.dbe_goal_percentage) * 100}%` }}
                  />
                </div>
                <div
                  className="goal-marker"
                  style={{ left: `${100}%` }}
                  title={`Goal: ${goal.dbe_goal_percentage}%`}
                />
              </div>
              <div className="progress-labels">
                <span className="achieved">{goal.achieved_percentage.toFixed(1)}% Achieved</span>
                <span className="goal">Goal: {goal.dbe_goal_percentage}%</span>
              </div>
            </div>
            <div className="goal-amounts">
              <span>Committed: ${(goal.dbe_committed_value / 1000).toFixed(0)}K</span>
              <span>Paid: ${(goal.dbe_paid_value / 1000).toFixed(0)}K</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="enhanced-subcontractor-dashboard">
        <div className="loading-state">
          <RefreshCw className="loading-spinner" size={32} />
          <p>Loading subcontractor data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="enhanced-subcontractor-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-title">
            <Building2 className="header-icon" size={32} />
            <div>
              <h1>Subcontractor Management</h1>
              <p>Vendor performance, compliance, DBE tracking, and contract management</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn-secondary" onClick={() => setShowFilters(!showFilters)}>
              <Filter size={18} />
              Filters
            </button>
            <button className="btn-secondary">
              <Download size={18} />
              Export
            </button>
            <button className="btn-primary">
              <Plus size={18} />
              Add Subcontractor
            </button>
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <section className="kpi-section">
        <div className="kpi-grid">
          {kpis.map((kpi, index) => (
            <div key={index} className={`kpi-card kpi-${kpi.color}`}>
              <div className="kpi-icon">{kpi.icon}</div>
              <div className="kpi-content">
                <span className="kpi-label">{kpi.label}</span>
                <span className="kpi-value">{kpi.value}</span>
                {kpi.change !== undefined && (
                  <span className={`kpi-change ${kpi.trend}`}>
                    {kpi.trend === 'up' ? <ArrowUpRight size={14} /> :
                      kpi.trend === 'down' ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                    {Math.abs(kpi.change)}% {kpi.changeLabel}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tabs */}
      <nav className="dashboard-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart2 size={18} />
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'directory' ? 'active' : ''}`}
          onClick={() => setActiveTab('directory')}
        >
          <Building2 size={18} />
          Directory
          <span className="tab-badge">{subcontractors.length}</span>
        </button>
        <button
          className={`tab ${activeTab === 'agreements' ? 'active' : ''}`}
          onClick={() => setActiveTab('agreements')}
        >
          <FileText size={18} />
          Agreements
          <span className="tab-badge">{agreements.length}</span>
        </button>
        <button
          className={`tab ${activeTab === 'dbe' ? 'active' : ''}`}
          onClick={() => setActiveTab('dbe')}
        >
          <Award size={18} />
          DBE Tracking
        </button>
        <button
          className={`tab ${activeTab === 'compliance' ? 'active' : ''}`}
          onClick={() => setActiveTab('compliance')}
        >
          <ShieldCheck size={18} />
          Compliance
          {expiringInsurance > 0 && (
            <span className="tab-badge warning">{expiringInsurance}</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoices')}
        >
          <Receipt size={18} />
          Invoices
        </button>
      </nav>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-grid">
            {/* Trade Breakdown */}
            <div className="card trade-card">
              <div className="card-header">
                <h3>Subcontractors by Trade</h3>
                <span className="card-subtitle">Contract value distribution</span>
              </div>
              {renderTradeDonut()}
            </div>

            {/* DBE Goals Summary */}
            <div className="card dbe-summary-card">
              <div className="card-header">
                <h3>DBE Goal Progress</h3>
                <Award size={20} className="header-icon-small" />
              </div>
              {renderDbeGoalProgress()}
            </div>

            {/* Top Performers */}
            <div className="card top-performers-card">
              <div className="card-header">
                <h3>Top Performers</h3>
                <span className="card-subtitle">By overall rating</span>
              </div>
              <div className="performers-list">
                {subcontractors
                  .sort((a, b) => b.performance_rating - a.performance_rating)
                  .slice(0, 5)
                  .map((sub, index) => (
                    <div
                      key={index}
                      className="performer-item"
                      onClick={() => openSubcontractorDetail(sub)}
                    >
                      <div className="performer-rank">{index + 1}</div>
                      <div className="performer-info">
                        <span className="company-name">{sub.company_name}</span>
                        <span className="trade">{sub.primary_trade}</span>
                      </div>
                      <div className="performer-metrics">
                        <div className="metric">
                          <Star size={12} className="star-icon" />
                          <span>{sub.performance_rating.toFixed(1)}</span>
                        </div>
                        <div className="metric">
                          <Clock size={12} />
                          <span>{sub.on_time_rate.toFixed(0)}%</span>
                        </div>
                      </div>
                      {sub.is_dbe_certified && (
                        <span className="dbe-badge">DBE</span>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Contract Summary */}
            <div className="card contract-summary-card">
              <div className="card-header">
                <h3>Contract Summary</h3>
                <DollarSign size={20} className="header-icon-small" />
              </div>
              <div className="contract-summary">
                <div className="summary-item">
                  <span className="label">Total Contract Value</span>
                  <span className="value">${(totalContractValue / 1000000).toFixed(2)}M</span>
                </div>
                <div className="summary-item">
                  <span className="label">Total Invoiced</span>
                  <span className="value">${(totalInvoiced / 1000000).toFixed(2)}M</span>
                </div>
                <div className="summary-item">
                  <span className="label">Total Paid</span>
                  <span className="value paid">${(totalPaid / 1000000).toFixed(2)}M</span>
                </div>
                <div className="summary-item">
                  <span className="label">Retainage Held</span>
                  <span className="value retained">
                    ${((totalInvoiced - totalPaid) / 1000).toFixed(0)}K
                  </span>
                </div>
                <div className="summary-bar">
                  <div
                    className="bar-fill paid"
                    style={{ width: `${(totalPaid / totalContractValue) * 100}%` }}
                  />
                  <div
                    className="bar-fill invoiced"
                    style={{ width: `${((totalInvoiced - totalPaid) / totalContractValue) * 100}%` }}
                  />
                </div>
                <div className="summary-legend">
                  <span><span className="dot paid"></span> Paid</span>
                  <span><span className="dot invoiced"></span> Invoiced</span>
                  <span><span className="dot remaining"></span> Remaining</span>
                </div>
              </div>
            </div>

            {/* Compliance Alerts */}
            <div className="card compliance-alerts-card">
              <div className="card-header">
                <h3>Compliance Alerts</h3>
                <AlertTriangle size={20} className="warning" />
              </div>
              <div className="alerts-list">
                {insuranceRecords
                  .filter(i => i.status !== 'active')
                  .map((ins, index) => (
                    <div key={index} className={`alert-item ${ins.status}`}>
                      <div className="alert-icon">
                        {ins.status === 'expired' ? <XCircle size={16} /> : <AlertCircle size={16} />}
                      </div>
                      <div className="alert-content">
                        <span className="alert-title">{ins.insurance_type}</span>
                        <span className="alert-subtitle">{ins.subcontractor_name}</span>
                      </div>
                      <div className="alert-status">
                        {getStatusBadge(ins.status)}
                        <span className="alert-date">
                          {ins.days_until_expiration < 0
                            ? `${Math.abs(ins.days_until_expiration)} days ago`
                            : `${ins.days_until_expiration} days`}
                        </span>
                      </div>
                    </div>
                  ))}
                {insuranceRecords.filter(i => i.status !== 'active').length === 0 && (
                  <div className="empty-state-small">
                    <CheckCircle size={24} />
                    <p>All compliance items are current</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Invoices */}
            <div className="card recent-invoices-card">
              <div className="card-header">
                <h3>Recent Invoices</h3>
                <button className="btn-link" onClick={() => setActiveTab('invoices')}>
                  View All <ChevronRight size={16} />
                </button>
              </div>
              <div className="invoices-list">
                {invoices.slice(0, 5).map((inv, index) => (
                  <div key={index} className="invoice-item">
                    <div className="invoice-main">
                      <span className="invoice-number">{inv.invoice_number}</span>
                      <span className="invoice-sub">{inv.subcontractor_name}</span>
                    </div>
                    <div className="invoice-amount">
                      ${inv.amount.toLocaleString()}
                    </div>
                    {getStatusBadge(inv.status)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Directory Tab */}
        {activeTab === 'directory' && (
          <div className="directory-section">
            <div className="section-toolbar">
              <div className="search-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search subcontractors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="toolbar-filters">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
                <select
                  value={tradeFilter}
                  onChange={(e) => setTradeFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Trades</option>
                  <option value="Concrete">Concrete</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Earthwork">Earthwork</option>
                  <option value="Structural Steel">Structural Steel</option>
                  <option value="Asphalt">Asphalt</option>
                  <option value="Traffic Control">Traffic Control</option>
                </select>
              </div>
            </div>

            <div className="subcontractor-grid">
              {filteredSubcontractors.map((sub, index) => (
                <div
                  key={index}
                  className="subcontractor-card"
                  onClick={() => openSubcontractorDetail(sub)}
                >
                  <div className="sub-card-header">
                    <div className="sub-avatar">
                      {sub.company_name.charAt(0)}
                    </div>
                    <div className="sub-identity">
                      <h4>{sub.company_name}</h4>
                      <span className="trade">{sub.primary_trade}</span>
                    </div>
                    {getStatusBadge(sub.status)}
                  </div>

                  <div className="sub-certifications">
                    {sub.is_dbe_certified && <span className="cert-badge dbe">DBE</span>}
                    {sub.is_mbe_certified && <span className="cert-badge mbe">MBE</span>}
                    {sub.is_wbe_certified && <span className="cert-badge wbe">WBE</span>}
                    {sub.is_vbe_certified && <span className="cert-badge vbe">VBE</span>}
                  </div>

                  <div className="sub-performance">
                    <div className="perf-item">
                      <Star size={14} className="star" />
                      <span className="perf-value">{sub.performance_rating.toFixed(1)}</span>
                      <span className="perf-label">Rating</span>
                    </div>
                    <div className="perf-item">
                      <Clock size={14} />
                      <span className="perf-value">{sub.on_time_rate.toFixed(0)}%</span>
                      <span className="perf-label">On-Time</span>
                    </div>
                    <div className="perf-item">
                      <CheckCircle size={14} />
                      <span className="perf-value">{sub.quality_score.toFixed(0)}%</span>
                      <span className="perf-label">Quality</span>
                    </div>
                  </div>

                  <div className="sub-stats">
                    <div className="stat">
                      <span className="stat-value">{sub.active_contracts}</span>
                      <span className="stat-label">Active</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{sub.completed_contracts}</span>
                      <span className="stat-label">Completed</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">${(sub.total_contract_value / 1000000).toFixed(1)}M</span>
                      <span className="stat-label">Total Value</span>
                    </div>
                  </div>

                  <div className="sub-contact">
                    <span><Phone size={12} /> {sub.primary_contact_phone}</span>
                    <span><MapPin size={12} /> {sub.city}, {sub.state}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Agreements Tab */}
        {activeTab === 'agreements' && (
          <div className="agreements-section">
            <div className="section-toolbar">
              <div className="search-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search agreements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="toolbar-filters">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="in_progress">In Progress</option>
                  <option value="complete">Complete</option>
                </select>
                <button className="btn-primary">
                  <Plus size={18} />
                  New Agreement
                </button>
              </div>
            </div>

            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Agreement</th>
                    <th>Subcontractor</th>
                    <th>Project</th>
                    <th>Contract Value</th>
                    <th>Invoiced</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAgreements.map((agr, index) => (
                    <tr key={index} onClick={() => openAgreementDetail(agr)}>
                      <td>
                        <div className="agreement-cell">
                          <span className="agr-number">{agr.agreement_number}</span>
                          <span className="agr-title">{agr.title}</span>
                        </div>
                      </td>
                      <td>
                        <div className="sub-cell">
                          <span className="sub-name">{agr.subcontractor_name}</span>
                          <span className="sub-trade">{agr.trade}</span>
                        </div>
                      </td>
                      <td>
                        <div className="project-cell">
                          <span className="proj-number">{agr.project_number}</span>
                          <span className="proj-name">{agr.project_name}</span>
                        </div>
                      </td>
                      <td className="value-cell">
                        ${agr.current_value.toLocaleString()}
                        {agr.change_order_value > 0 && (
                          <span className="co-value">+${agr.change_order_value.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="invoiced-cell">
                        ${agr.invoiced_amount.toLocaleString()}
                      </td>
                      <td>
                        <div className="progress-cell">
                          <div className="mini-progress">
                            <div
                              className="mini-progress-fill"
                              style={{ width: `${agr.percent_complete}%` }}
                            />
                          </div>
                          <span>{agr.percent_complete}%</span>
                        </div>
                      </td>
                      <td>
                        <div className="status-dbe-cell">
                          {getStatusBadge(agr.status)}
                          {agr.is_dbe_work && <span className="dbe-flag">DBE</span>}
                        </div>
                      </td>
                      <td>
                        <button className="btn-icon-sm">
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DBE Tracking Tab */}
        {activeTab === 'dbe' && (
          <div className="dbe-section">
            {/* DBE KPIs */}
            <div className="dbe-kpis">
              <div className="dbe-kpi">
                <div className="kpi-value">{dbeSubcontractors}</div>
                <div className="kpi-label">DBE Subcontractors</div>
              </div>
              <div className="dbe-kpi">
                <div className="kpi-value">
                  ${(agreements.filter(a => a.is_dbe_work).reduce((s, a) => s + a.current_value, 0) / 1000000).toFixed(2)}M
                </div>
                <div className="kpi-label">DBE Contract Value</div>
              </div>
              <div className="dbe-kpi">
                <div className="kpi-value">
                  {dbeGoals.filter(g => g.status === 'on_track').length}/{dbeGoals.length}
                </div>
                <div className="kpi-label">Projects On Track</div>
              </div>
            </div>

            {/* DBE Goals by Project */}
            <div className="card dbe-goals-card">
              <div className="card-header">
                <h3>DBE Goals by Project</h3>
              </div>
              <div className="dbe-goals-table">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Goal %</th>
                      <th>Committed %</th>
                      <th>Achieved %</th>
                      <th>Committed Value</th>
                      <th>Paid Value</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbeGoals.map((goal, index) => (
                      <tr key={index}>
                        <td>
                          <div className="project-cell">
                            <span className="proj-number">{goal.project_number}</span>
                            <span className="proj-name">{goal.project_name}</span>
                          </div>
                        </td>
                        <td className="percent-cell">{goal.dbe_goal_percentage}%</td>
                        <td className="percent-cell">{goal.committed_percentage}%</td>
                        <td className="percent-cell achieved">
                          {goal.achieved_percentage}%
                          <div className="mini-bar">
                            <div
                              className="mini-bar-fill"
                              style={{ width: `${(goal.achieved_percentage / goal.dbe_goal_percentage) * 100}%` }}
                            />
                          </div>
                        </td>
                        <td>${goal.dbe_committed_value.toLocaleString()}</td>
                        <td>${goal.dbe_paid_value.toLocaleString()}</td>
                        <td>{getStatusBadge(goal.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DBE Subcontractors */}
            <div className="card dbe-subs-card">
              <div className="card-header">
                <h3>DBE Certified Subcontractors</h3>
              </div>
              <div className="dbe-subs-grid">
                {subcontractors
                  .filter(s => s.is_dbe_certified)
                  .map((sub, index) => (
                    <div key={index} className="dbe-sub-card">
                      <div className="dbe-sub-header">
                        <h4>{sub.company_name}</h4>
                        <div className="cert-badges">
                          {sub.dbe_categories.map((cat, i) => (
                            <span key={i} className={`cert-badge ${cat.toLowerCase()}`}>{cat}</span>
                          ))}
                        </div>
                      </div>
                      <div className="dbe-sub-details">
                        <span><Briefcase size={14} /> {sub.primary_trade}</span>
                        <span><FileCheck size={14} /> {sub.dbe_certification_number}</span>
                        <span>
                          <Calendar size={14} />
                          Expires: {new Date(sub.dbe_certification_expiration).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="dbe-sub-work">
                        <span>{sub.active_contracts} Active Contracts</span>
                        <span>${(sub.total_contract_value / 1000000).toFixed(2)}M Total</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Compliance Tab */}
        {activeTab === 'compliance' && (
          <div className="compliance-section">
            <div className="compliance-summary">
              <div className="compliance-stat good">
                <CheckCircle size={24} />
                <span className="value">{insuranceRecords.filter(i => i.status === 'active').length}</span>
                <span className="label">Current</span>
              </div>
              <div className="compliance-stat warning">
                <AlertCircle size={24} />
                <span className="value">{insuranceRecords.filter(i => i.status === 'expiring').length}</span>
                <span className="label">Expiring Soon</span>
              </div>
              <div className="compliance-stat danger">
                <XCircle size={24} />
                <span className="value">{insuranceRecords.filter(i => i.status === 'expired').length}</span>
                <span className="label">Expired</span>
              </div>
            </div>

            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Subcontractor</th>
                    <th>Insurance Type</th>
                    <th>Carrier</th>
                    <th>Policy #</th>
                    <th>Coverage</th>
                    <th>Expiration</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {insuranceRecords.map((ins, index) => (
                    <tr key={index} className={ins.status}>
                      <td>{ins.subcontractor_name}</td>
                      <td>{ins.insurance_type}</td>
                      <td>{ins.carrier}</td>
                      <td>{ins.policy_number}</td>
                      <td>${ins.coverage_amount.toLocaleString()}</td>
                      <td className={ins.status}>
                        {new Date(ins.expiration_date).toLocaleDateString()}
                        <span className="days-label">
                          ({ins.days_until_expiration < 0 ? `${Math.abs(ins.days_until_expiration)} days ago` : `${ins.days_until_expiration} days`})
                        </span>
                      </td>
                      <td>{getStatusBadge(ins.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="invoices-section">
            <div className="invoice-summary">
              <div className="inv-stat">
                <span className="value">${invoices.filter(i => i.status === 'submitted' || i.status === 'under_review').reduce((s, i) => s + i.amount, 0).toLocaleString()}</span>
                <span className="label">Pending Review</span>
              </div>
              <div className="inv-stat">
                <span className="value">${invoices.filter(i => i.status === 'approved').reduce((s, i) => s + i.amount, 0).toLocaleString()}</span>
                <span className="label">Approved</span>
              </div>
              <div className="inv-stat">
                <span className="value">${invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0).toLocaleString()}</span>
                <span className="label">Paid This Month</span>
              </div>
            </div>

            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Subcontractor</th>
                    <th>Project</th>
                    <th>Amount</th>
                    <th>Submitted</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, index) => (
                    <tr key={index}>
                      <td className="invoice-num">{inv.invoice_number}</td>
                      <td>{inv.subcontractor_name}</td>
                      <td>{inv.project_name}</td>
                      <td className="amount">${inv.amount.toLocaleString()}</td>
                      <td>{new Date(inv.submitted_date).toLocaleDateString()}</td>
                      <td>{new Date(inv.due_date).toLocaleDateString()}</td>
                      <td>{getStatusBadge(inv.status)}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn-icon-sm" title="View">
                            <Eye size={16} />
                          </button>
                          {inv.status === 'under_review' && (
                            <button className="btn-icon-sm approve" title="Approve">
                              <CheckCircle size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Detail Panel */}
      {showDetailPanel && (
        <div className={`detail-panel ${showDetailPanel ? 'open' : ''}`}>
          <div className="detail-panel-header">
            <h3>
              {detailType === 'subcontractor' && selectedSubcontractor?.company_name}
              {detailType === 'agreement' && selectedAgreement?.agreement_number}
            </h3>
            <button className="close-btn" onClick={() => setShowDetailPanel(false)}>
              <X size={20} />
            </button>
          </div>

          <div className="detail-panel-content">
            {detailType === 'subcontractor' && selectedSubcontractor && (
              <>
                <div className="detail-section">
                  <div className="detail-status-header">
                    {getStatusBadge(selectedSubcontractor.status)}
                    {selectedSubcontractor.is_dbe_certified && (
                      <span className="dbe-badge-large">
                        <Award size={14} />
                        DBE Certified
                      </span>
                    )}
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Performance Metrics</h4>
                  <div className="metrics-grid">
                    <div className="metric-card">
                      <Star size={20} className="metric-icon star" />
                      <span className="metric-value">{selectedSubcontractor.performance_rating.toFixed(1)}</span>
                      <span className="metric-label">Overall Rating</span>
                    </div>
                    <div className="metric-card">
                      <Clock size={20} className="metric-icon" />
                      <span className="metric-value">{selectedSubcontractor.on_time_rate.toFixed(0)}%</span>
                      <span className="metric-label">On-Time Rate</span>
                    </div>
                    <div className="metric-card">
                      <CheckCircle size={20} className="metric-icon" />
                      <span className="metric-value">{selectedSubcontractor.quality_score.toFixed(0)}%</span>
                      <span className="metric-label">Quality Score</span>
                    </div>
                    <div className="metric-card">
                      <ShieldCheck size={20} className="metric-icon" />
                      <span className="metric-value">{selectedSubcontractor.safety_score.toFixed(0)}%</span>
                      <span className="metric-label">Safety Score</span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Contact Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="label">Primary Contact</span>
                      <span className="value">{selectedSubcontractor.primary_contact_name}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Phone</span>
                      <span className="value">{selectedSubcontractor.primary_contact_phone}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Email</span>
                      <span className="value">{selectedSubcontractor.primary_contact_email}</span>
                    </div>
                    <div className="detail-item full-width">
                      <span className="label">Address</span>
                      <span className="value">
                        {selectedSubcontractor.address}, {selectedSubcontractor.city}, {selectedSubcontractor.state} {selectedSubcontractor.zip_code}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Contract History</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="label">Total Contracts</span>
                      <span className="value">{selectedSubcontractor.total_contracts}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Active</span>
                      <span className="value">{selectedSubcontractor.active_contracts}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Completed</span>
                      <span className="value">{selectedSubcontractor.completed_contracts}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Total Value</span>
                      <span className="value highlight">${selectedSubcontractor.total_contract_value.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {selectedSubcontractor.is_dbe_certified && (
                  <div className="detail-section">
                    <h4>DBE Certification</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="label">Certificate Number</span>
                        <span className="value">{selectedSubcontractor.dbe_certification_number}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Expiration</span>
                        <span className="value">{new Date(selectedSubcontractor.dbe_certification_expiration).toLocaleDateString()}</span>
                      </div>
                      <div className="detail-item full-width">
                        <span className="label">Categories</span>
                        <div className="cert-badges-row">
                          {selectedSubcontractor.dbe_categories.map((cat, i) => (
                            <span key={i} className={`cert-badge ${cat.toLowerCase()}`}>{cat}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="detail-actions">
                  <button className="btn-secondary">
                    <Mail size={16} />
                    Contact
                  </button>
                  <button className="btn-secondary">
                    <FileText size={16} />
                    View Agreements
                  </button>
                  <button className="btn-primary">
                    <Plus size={16} />
                    New Agreement
                  </button>
                </div>
              </>
            )}

            {detailType === 'agreement' && selectedAgreement && (
              <>
                <div className="detail-section">
                  <div className="detail-status-header">
                    {getStatusBadge(selectedAgreement.status)}
                    {selectedAgreement.is_dbe_work && (
                      <span className="dbe-badge-large">
                        <Flag size={14} />
                        DBE Work
                      </span>
                    )}
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Agreement Details</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="label">Title</span>
                      <span className="value">{selectedAgreement.title}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Trade</span>
                      <span className="value">{selectedAgreement.trade}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Subcontractor</span>
                      <span className="value link">{selectedAgreement.subcontractor_name}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Project</span>
                      <span className="value">{selectedAgreement.project_name}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Contract Value</h4>
                  <div className="contract-value-detail">
                    <div className="value-row">
                      <span>Original Value</span>
                      <span>${selectedAgreement.original_value.toLocaleString()}</span>
                    </div>
                    <div className="value-row">
                      <span>Change Orders</span>
                      <span className="co">+${selectedAgreement.change_order_value.toLocaleString()}</span>
                    </div>
                    <div className="value-row total">
                      <span>Current Value</span>
                      <span>${selectedAgreement.current_value.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Billing Summary</h4>
                  <div className="billing-summary">
                    <div className="billing-row">
                      <span>Invoiced</span>
                      <span>${selectedAgreement.invoiced_amount.toLocaleString()}</span>
                    </div>
                    <div className="billing-row">
                      <span>Paid</span>
                      <span className="paid">${selectedAgreement.paid_amount.toLocaleString()}</span>
                    </div>
                    <div className="billing-row">
                      <span>Retained</span>
                      <span className="retained">${selectedAgreement.retained_amount.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="progress-detail">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${selectedAgreement.percent_complete}%` }}
                      />
                    </div>
                    <span>{selectedAgreement.percent_complete}% Complete</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Schedule</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="label">Start Date</span>
                      <span className="value">{new Date(selectedAgreement.start_date).toLocaleDateString()}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Completion Date</span>
                      <span className="value">{new Date(selectedAgreement.completion_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-actions">
                  <button className="btn-secondary">
                    <Receipt size={16} />
                    View Invoices
                  </button>
                  <button className="btn-secondary">
                    <ClipboardList size={16} />
                    Change Orders
                  </button>
                  <button className="btn-primary">
                    <FileText size={16} />
                    Edit Agreement
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Panel Overlay */}
      {showDetailPanel && (
        <div className="detail-panel-overlay" onClick={() => setShowDetailPanel(false)} />
      )}
    </div>
  );
}
