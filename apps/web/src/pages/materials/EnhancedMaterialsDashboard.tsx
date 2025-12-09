import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import {
  Package,
  Truck,
  FileCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
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
  ShieldCheck,
  Flag,
  RefreshCw,
  Eye,
  Camera,
  FileText,
  Box,
  Layers,
  Star,
  Building2,
  ClipboardCheck,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import './EnhancedMaterialsDashboard.css';

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

interface MaterialTicket {
  id: string;
  ticket_number: string;
  delivery_date: string;
  material_description: string;
  material_type: string;
  quantity: number;
  unit_of_measure: string;
  unit_price: number;
  total_value: number;
  delivery_location: string;
  status: 'pending' | 'verified' | 'rejected' | 'ocr_pending';
  supplier_name: string;
  supplier_id: string;
  driver_name: string;
  vehicle_info: string;
  po_number: string;
  po_id: string;
  photo_url?: string;
  ocr_confidence?: number;
  verified_by?: string;
  verified_at?: string;
  notes?: string;
  buy_america_compliant: boolean;
  project_name: string;
  project_id: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_name: string;
  supplier_id: string;
  issue_date: string;
  expected_delivery: string;
  status: 'draft' | 'issued' | 'partial' | 'complete' | 'closed' | 'cancelled';
  total_amount: number;
  delivered_amount: number;
  remaining_amount: number;
  line_items_count: number;
  deliveries_count: number;
  project_name: string;
  project_id: string;
  buy_america_required: boolean;
  created_by: string;
  notes?: string;
}

interface InventoryItem {
  id: string;
  material_name: string;
  material_type: string;
  unit: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  minimum_stock_level: number;
  reorder_point: number;
  storage_location: string;
  last_updated: string;
  avg_daily_usage: number;
  days_of_supply: number;
  unit_cost: number;
  total_value: number;
  supplier_name: string;
}

interface MaterialCategory {
  name: string;
  count: number;
  value: number;
  percentage: number;
  color: string;
}

interface DeliveryMetrics {
  totalDeliveries: number;
  onTimeDeliveries: number;
  lateDeliveries: number;
  onTimeRate: number;
  avgDeliveryVariance: number;
  totalValue: number;
}

interface SupplierPerformance {
  id: string;
  name: string;
  total_deliveries: number;
  on_time_rate: number;
  quality_score: number;
  documentation_score: number;
  overall_score: number;
  total_value: number;
  avg_delivery_time: number;
  issues_count: number;
}

interface BuyAmericaStats {
  compliant: number;
  non_compliant: number;
  pending_verification: number;
  total: number;
  compliance_rate: number;
}

export function EnhancedMaterialsDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'deliveries' | 'inventory' | 'purchase-orders' | 'suppliers'>('overview');
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [projects, setProjects] = useState<{ id: string; name: string; project_number: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'ytd' | 'all'>('30d');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Data states
  const [tickets, setTickets] = useState<MaterialTicket[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [deliveryMetrics, setDeliveryMetrics] = useState<DeliveryMetrics | null>(null);
  const [supplierPerformance, setSupplierPerformance] = useState<SupplierPerformance[]>([]);
  const [buyAmericaStats, setBuyAmericaStats] = useState<BuyAmericaStats | null>(null);

  // Detail panel
  const [selectedTicket, setSelectedTicket] = useState<MaterialTicket | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [detailType, setDetailType] = useState<'ticket' | 'po' | 'inventory'>('ticket');

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedProject, dateRange]);

  async function loadProjects() {
    try {
      const { data } = await (supabase as any)
        .from('projects')
        .select('id, name, project_number')
        .eq('status', 'ACTIVE')
        .order('name');

      if (data) {
        setProjects(data);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }

  async function loadData() {
    setLoading(true);

    // In production, fetch from Supabase
    // For demo, use sample data
    await loadDemoData();

    setLoading(false);
  }

  async function loadDemoData() {
    // Demo material tickets
    const demoTickets: MaterialTicket[] = [
      {
        id: '1',
        ticket_number: 'MT-2024-001247',
        delivery_date: '2024-12-08',
        material_description: 'Class A Crushed Stone - 57',
        material_type: 'aggregate',
        quantity: 285.5,
        unit_of_measure: 'TON',
        unit_price: 28.50,
        total_value: 8136.75,
        delivery_location: 'Station 142+50',
        status: 'verified',
        supplier_name: 'Mountain State Aggregates',
        supplier_id: 's1',
        driver_name: 'Michael Thompson',
        vehicle_info: 'Truck #847 - Mack Granite',
        po_number: 'PO-2024-0089',
        po_id: 'po1',
        ocr_confidence: 98.5,
        verified_by: 'John Smith',
        verified_at: '2024-12-08T14:30:00',
        buy_america_compliant: true,
        project_name: 'Corridor H Section 12',
        project_id: 'p1'
      },
      {
        id: '2',
        ticket_number: 'MT-2024-001248',
        delivery_date: '2024-12-08',
        material_description: 'Hot Mix Asphalt - 9.5mm Base',
        material_type: 'asphalt',
        quantity: 142.8,
        unit_of_measure: 'TON',
        unit_price: 85.00,
        total_value: 12138.00,
        delivery_location: 'Station 156+00 to 162+50',
        status: 'verified',
        supplier_name: 'Tri-State Paving Materials',
        supplier_id: 's2',
        driver_name: 'Robert Wilson',
        vehicle_info: 'Truck #312 - Peterbilt 567',
        po_number: 'PO-2024-0092',
        po_id: 'po2',
        ocr_confidence: 96.2,
        verified_by: 'Mike Davis',
        verified_at: '2024-12-08T15:45:00',
        buy_america_compliant: true,
        project_name: 'Corridor H Section 12',
        project_id: 'p1'
      },
      {
        id: '3',
        ticket_number: 'MT-2024-001249',
        delivery_date: '2024-12-08',
        material_description: 'Ready Mix Concrete - 4000 PSI',
        material_type: 'concrete',
        quantity: 12.5,
        unit_of_measure: 'CY',
        unit_price: 165.00,
        total_value: 2062.50,
        delivery_location: 'Bridge Pier #4',
        status: 'pending',
        supplier_name: 'Valley Ready Mix',
        supplier_id: 's3',
        driver_name: 'James Anderson',
        vehicle_info: 'Mixer #215',
        po_number: 'PO-2024-0095',
        po_id: 'po3',
        buy_america_compliant: true,
        project_name: 'Route 50 Bridge Replacement',
        project_id: 'p2'
      },
      {
        id: '4',
        ticket_number: 'MT-2024-001250',
        delivery_date: '2024-12-07',
        material_description: 'Steel Reinforcement - #8 Rebar',
        material_type: 'steel',
        quantity: 8500,
        unit_of_measure: 'LB',
        unit_price: 0.92,
        total_value: 7820.00,
        delivery_location: 'Staging Area B',
        status: 'verified',
        supplier_name: 'Eastern Steel Supply',
        supplier_id: 's4',
        driver_name: 'David Brown',
        vehicle_info: 'Flatbed #089',
        po_number: 'PO-2024-0087',
        po_id: 'po4',
        ocr_confidence: 99.1,
        verified_by: 'Sarah Johnson',
        verified_at: '2024-12-07T11:20:00',
        buy_america_compliant: true,
        project_name: 'Route 50 Bridge Replacement',
        project_id: 'p2',
        notes: 'Mill test reports included'
      },
      {
        id: '5',
        ticket_number: 'MT-2024-001251',
        delivery_date: '2024-12-07',
        material_description: 'Pipe - 36" RCP Class III',
        material_type: 'pipe',
        quantity: 120,
        unit_of_measure: 'LF',
        unit_price: 145.00,
        total_value: 17400.00,
        delivery_location: 'Station 118+00',
        status: 'ocr_pending',
        supplier_name: 'Appalachian Pipe & Supply',
        supplier_id: 's5',
        driver_name: 'Kevin Miller',
        vehicle_info: 'Flatbed #156',
        po_number: 'PO-2024-0091',
        po_id: 'po5',
        buy_america_compliant: true,
        project_name: 'Corridor H Section 12',
        project_id: 'p1'
      },
      {
        id: '6',
        ticket_number: 'MT-2024-001252',
        delivery_date: '2024-12-06',
        material_description: 'Guardrail - W-Beam Galvanized',
        material_type: 'safety',
        quantity: 500,
        unit_of_measure: 'LF',
        unit_price: 18.50,
        total_value: 9250.00,
        delivery_location: 'Mile Marker 45-46',
        status: 'rejected',
        supplier_name: 'Highway Safety Products',
        supplier_id: 's6',
        driver_name: 'Chris Taylor',
        vehicle_info: 'Truck #422',
        po_number: 'PO-2024-0088',
        po_id: 'po6',
        buy_america_compliant: false,
        project_name: 'I-79 Safety Improvements',
        project_id: 'p3',
        notes: 'Rejected - Non-compliant with Buy America requirements'
      }
    ];

    // Demo purchase orders
    const demoPOs: PurchaseOrder[] = [
      {
        id: 'po1',
        po_number: 'PO-2024-0089',
        supplier_name: 'Mountain State Aggregates',
        supplier_id: 's1',
        issue_date: '2024-11-15',
        expected_delivery: '2024-12-31',
        status: 'partial',
        total_amount: 125000.00,
        delivered_amount: 87500.00,
        remaining_amount: 37500.00,
        line_items_count: 4,
        deliveries_count: 12,
        project_name: 'Corridor H Section 12',
        project_id: 'p1',
        buy_america_required: true,
        created_by: 'John Smith'
      },
      {
        id: 'po2',
        po_number: 'PO-2024-0092',
        supplier_name: 'Tri-State Paving Materials',
        supplier_id: 's2',
        issue_date: '2024-11-20',
        expected_delivery: '2024-12-20',
        status: 'partial',
        total_amount: 285000.00,
        delivered_amount: 198450.00,
        remaining_amount: 86550.00,
        line_items_count: 3,
        deliveries_count: 18,
        project_name: 'Corridor H Section 12',
        project_id: 'p1',
        buy_america_required: true,
        created_by: 'Mike Davis'
      },
      {
        id: 'po3',
        po_number: 'PO-2024-0095',
        supplier_name: 'Valley Ready Mix',
        supplier_id: 's3',
        issue_date: '2024-12-01',
        expected_delivery: '2024-12-15',
        status: 'issued',
        total_amount: 45000.00,
        delivered_amount: 12375.00,
        remaining_amount: 32625.00,
        line_items_count: 2,
        deliveries_count: 6,
        project_name: 'Route 50 Bridge Replacement',
        project_id: 'p2',
        buy_america_required: true,
        created_by: 'Sarah Johnson'
      },
      {
        id: 'po4',
        po_number: 'PO-2024-0087',
        supplier_name: 'Eastern Steel Supply',
        supplier_id: 's4',
        issue_date: '2024-11-10',
        expected_delivery: '2024-12-10',
        status: 'complete',
        total_amount: 92500.00,
        delivered_amount: 92500.00,
        remaining_amount: 0,
        line_items_count: 5,
        deliveries_count: 8,
        project_name: 'Route 50 Bridge Replacement',
        project_id: 'p2',
        buy_america_required: true,
        created_by: 'John Smith'
      },
      {
        id: 'po5',
        po_number: 'PO-2024-0091',
        supplier_name: 'Appalachian Pipe & Supply',
        supplier_id: 's5',
        issue_date: '2024-11-18',
        expected_delivery: '2024-12-18',
        status: 'partial',
        total_amount: 78000.00,
        delivered_amount: 34800.00,
        remaining_amount: 43200.00,
        line_items_count: 3,
        deliveries_count: 4,
        project_name: 'Corridor H Section 12',
        project_id: 'p1',
        buy_america_required: true,
        created_by: 'Mike Davis'
      }
    ];

    // Demo inventory
    const demoInventory: InventoryItem[] = [
      {
        id: 'inv1',
        material_name: 'Class A Crushed Stone - 57',
        material_type: 'aggregate',
        unit: 'TON',
        quantity_on_hand: 2450,
        quantity_reserved: 850,
        quantity_available: 1600,
        minimum_stock_level: 500,
        reorder_point: 1000,
        storage_location: 'Stockpile Area A',
        last_updated: '2024-12-08',
        avg_daily_usage: 125,
        days_of_supply: 12.8,
        unit_cost: 28.50,
        total_value: 69825.00,
        supplier_name: 'Mountain State Aggregates'
      },
      {
        id: 'inv2',
        material_name: 'Hot Mix Asphalt - 9.5mm Base',
        material_type: 'asphalt',
        unit: 'TON',
        quantity_on_hand: 0,
        quantity_reserved: 0,
        quantity_available: 0,
        minimum_stock_level: 0,
        reorder_point: 0,
        storage_location: 'Just-In-Time Delivery',
        last_updated: '2024-12-08',
        avg_daily_usage: 185,
        days_of_supply: 0,
        unit_cost: 85.00,
        total_value: 0,
        supplier_name: 'Tri-State Paving Materials'
      },
      {
        id: 'inv3',
        material_name: 'Steel Reinforcement - #8 Rebar',
        material_type: 'steel',
        unit: 'LB',
        quantity_on_hand: 45000,
        quantity_reserved: 22000,
        quantity_available: 23000,
        minimum_stock_level: 10000,
        reorder_point: 20000,
        storage_location: 'Staging Area B',
        last_updated: '2024-12-07',
        avg_daily_usage: 2500,
        days_of_supply: 9.2,
        unit_cost: 0.92,
        total_value: 41400.00,
        supplier_name: 'Eastern Steel Supply'
      },
      {
        id: 'inv4',
        material_name: 'Pipe - 36" RCP Class III',
        material_type: 'pipe',
        unit: 'LF',
        quantity_on_hand: 240,
        quantity_reserved: 120,
        quantity_available: 120,
        minimum_stock_level: 60,
        reorder_point: 100,
        storage_location: 'Pipe Yard',
        last_updated: '2024-12-07',
        avg_daily_usage: 40,
        days_of_supply: 3.0,
        unit_cost: 145.00,
        total_value: 34800.00,
        supplier_name: 'Appalachian Pipe & Supply'
      },
      {
        id: 'inv5',
        material_name: 'Topsoil - Screened',
        material_type: 'earthwork',
        unit: 'CY',
        quantity_on_hand: 850,
        quantity_reserved: 200,
        quantity_available: 650,
        minimum_stock_level: 100,
        reorder_point: 300,
        storage_location: 'Stockpile Area C',
        last_updated: '2024-12-06',
        avg_daily_usage: 45,
        days_of_supply: 14.4,
        unit_cost: 32.00,
        total_value: 27200.00,
        supplier_name: 'Valley Excavation'
      },
      {
        id: 'inv6',
        material_name: 'Erosion Control Blanket',
        material_type: 'erosion',
        unit: 'SY',
        quantity_on_hand: 3200,
        quantity_reserved: 1500,
        quantity_available: 1700,
        minimum_stock_level: 500,
        reorder_point: 1000,
        storage_location: 'Storage Trailer #3',
        last_updated: '2024-12-05',
        avg_daily_usage: 200,
        days_of_supply: 8.5,
        unit_cost: 2.85,
        total_value: 9120.00,
        supplier_name: 'Environmental Solutions Inc.'
      }
    ];

    // Demo material categories
    const demoCategories: MaterialCategory[] = [
      { name: 'Aggregates', count: 45, value: 245000, percentage: 32, color: '#3b82f6' },
      { name: 'Asphalt', count: 28, value: 385000, percentage: 28, color: '#1a1a2e' },
      { name: 'Concrete', count: 18, value: 125000, percentage: 15, color: '#6b7280' },
      { name: 'Steel', count: 12, value: 92500, percentage: 12, color: '#ef4444' },
      { name: 'Pipe', count: 8, value: 78000, percentage: 8, color: '#10b981' },
      { name: 'Other', count: 15, value: 38500, percentage: 5, color: '#8b5cf6' }
    ];

    // Demo delivery metrics
    const demoDeliveryMetrics: DeliveryMetrics = {
      totalDeliveries: 126,
      onTimeDeliveries: 118,
      lateDeliveries: 8,
      onTimeRate: 93.7,
      avgDeliveryVariance: 0.3,
      totalValue: 964000
    };

    // Demo supplier performance
    const demoSupplierPerformance: SupplierPerformance[] = [
      {
        id: 's1',
        name: 'Mountain State Aggregates',
        total_deliveries: 42,
        on_time_rate: 97.6,
        quality_score: 98.2,
        documentation_score: 96.5,
        overall_score: 97.4,
        total_value: 245000,
        avg_delivery_time: 1.2,
        issues_count: 1
      },
      {
        id: 's2',
        name: 'Tri-State Paving Materials',
        total_deliveries: 35,
        on_time_rate: 94.3,
        quality_score: 99.1,
        documentation_score: 97.8,
        overall_score: 97.1,
        total_value: 385000,
        avg_delivery_time: 0.8,
        issues_count: 2
      },
      {
        id: 's3',
        name: 'Valley Ready Mix',
        total_deliveries: 28,
        on_time_rate: 92.9,
        quality_score: 97.5,
        documentation_score: 94.2,
        overall_score: 94.9,
        total_value: 125000,
        avg_delivery_time: 2.1,
        issues_count: 3
      },
      {
        id: 's4',
        name: 'Eastern Steel Supply',
        total_deliveries: 12,
        on_time_rate: 100.0,
        quality_score: 99.5,
        documentation_score: 98.9,
        overall_score: 99.5,
        total_value: 92500,
        avg_delivery_time: 3.5,
        issues_count: 0
      },
      {
        id: 's5',
        name: 'Appalachian Pipe & Supply',
        total_deliveries: 9,
        on_time_rate: 88.9,
        quality_score: 96.0,
        documentation_score: 92.5,
        overall_score: 92.5,
        total_value: 78000,
        avg_delivery_time: 4.2,
        issues_count: 2
      }
    ];

    // Demo Buy America stats
    const demoBuyAmericaStats: BuyAmericaStats = {
      compliant: 118,
      non_compliant: 3,
      pending_verification: 5,
      total: 126,
      compliance_rate: 97.5
    };

    setTickets(demoTickets);
    setPurchaseOrders(demoPOs);
    setInventory(demoInventory);
    setCategories(demoCategories);
    setDeliveryMetrics(demoDeliveryMetrics);
    setSupplierPerformance(demoSupplierPerformance);
    setBuyAmericaStats(demoBuyAmericaStats);
  }

  // Filter tickets based on search and filters
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = !searchTerm ||
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.material_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.supplier_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesProject = selectedProject === 'all' || ticket.project_id === selectedProject;

    return matchesSearch && matchesStatus && matchesProject;
  });

  // Filter POs
  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = !searchTerm ||
      po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplier_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    const matchesProject = selectedProject === 'all' || po.project_id === selectedProject;

    return matchesSearch && matchesStatus && matchesProject;
  });

  // Filter inventory
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = !searchTerm ||
      item.material_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.material_type.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Calculate KPIs
  const kpis: KPIData[] = [
    {
      label: 'Total Deliveries',
      value: deliveryMetrics?.totalDeliveries || 0,
      change: 12.5,
      changeLabel: 'vs last month',
      icon: <Truck size={24} />,
      trend: 'up',
      color: 'blue'
    },
    {
      label: 'On-Time Rate',
      value: `${deliveryMetrics?.onTimeRate.toFixed(1) || 0}%`,
      change: 2.3,
      changeLabel: 'vs last month',
      icon: <Clock size={24} />,
      trend: 'up',
      color: 'green'
    },
    {
      label: 'Pending Verification',
      value: tickets.filter(t => t.status === 'pending' || t.status === 'ocr_pending').length,
      icon: <FileCheck size={24} />,
      trend: 'neutral',
      color: 'yellow'
    },
    {
      label: 'Buy America Compliance',
      value: `${buyAmericaStats?.compliance_rate.toFixed(1) || 0}%`,
      icon: <ShieldCheck size={24} />,
      trend: 'up',
      color: 'purple'
    },
    {
      label: 'Low Stock Items',
      value: inventory.filter(i => i.quantity_available <= i.reorder_point).length,
      icon: <AlertTriangle size={24} />,
      trend: 'neutral',
      color: 'red'
    },
    {
      label: 'Active POs',
      value: purchaseOrders.filter(po => ['issued', 'partial'].includes(po.status)).length,
      change: -5,
      changeLabel: 'vs last month',
      icon: <FileText size={24} />,
      trend: 'down',
      color: 'cyan'
    }
  ];

  function getStatusBadge(status: string) {
    const statusConfig: Record<string, { class: string; label: string }> = {
      pending: { class: 'status-pending', label: 'Pending' },
      verified: { class: 'status-verified', label: 'Verified' },
      rejected: { class: 'status-rejected', label: 'Rejected' },
      ocr_pending: { class: 'status-ocr', label: 'OCR Pending' },
      draft: { class: 'status-draft', label: 'Draft' },
      issued: { class: 'status-issued', label: 'Issued' },
      partial: { class: 'status-partial', label: 'Partial' },
      complete: { class: 'status-complete', label: 'Complete' },
      closed: { class: 'status-closed', label: 'Closed' },
      cancelled: { class: 'status-cancelled', label: 'Cancelled' }
    };

    const config = statusConfig[status] || { class: 'status-default', label: status };
    return <span className={`status-badge ${config.class}`}>{config.label}</span>;
  }

  function getInventoryStatus(item: InventoryItem) {
    if (item.quantity_available <= item.minimum_stock_level) {
      return { class: 'critical', label: 'Critical', icon: <XCircle size={14} /> };
    }
    if (item.quantity_available <= item.reorder_point) {
      return { class: 'low', label: 'Low', icon: <AlertTriangle size={14} /> };
    }
    return { class: 'ok', label: 'OK', icon: <CheckCircle size={14} /> };
  }

  function openTicketDetail(ticket: MaterialTicket) {
    setSelectedTicket(ticket);
    setSelectedPO(null);
    setDetailType('ticket');
    setShowDetailPanel(true);
  }

  function openPODetail(po: PurchaseOrder) {
    setSelectedPO(po);
    setSelectedTicket(null);
    setDetailType('po');
    setShowDetailPanel(true);
  }

  // Render donut chart for material categories
  function renderCategoryDonut() {
    const total = categories.reduce((sum, cat) => sum + cat.percentage, 0);
    let currentAngle = -90;

    return (
      <div className="category-donut-container">
        <svg viewBox="0 0 200 200" className="category-donut">
          {categories.map((category, index) => {
            const angle = (category.percentage / total) * 360;
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
                fill={category.color}
                className="donut-segment"
              />
            );
          })}
          <circle cx="100" cy="100" r="45" fill="var(--bg-primary)" />
          <text x="100" y="95" textAnchor="middle" className="donut-center-value">
            {categories.reduce((sum, c) => sum + c.count, 0)}
          </text>
          <text x="100" y="115" textAnchor="middle" className="donut-center-label">
            Deliveries
          </text>
        </svg>
        <div className="category-legend">
          {categories.map((category, index) => (
            <div key={index} className="legend-item">
              <span className="legend-color" style={{ backgroundColor: category.color }}></span>
              <span className="legend-label">{category.name}</span>
              <span className="legend-value">{category.count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render delivery trend bars
  function renderDeliveryTrend() {
    const weeklyData = [
      { week: 'W1', deliveries: 28, onTime: 27 },
      { week: 'W2', deliveries: 32, onTime: 30 },
      { week: 'W3', deliveries: 35, onTime: 33 },
      { week: 'W4', deliveries: 31, onTime: 28 }
    ];

    const maxValue = Math.max(...weeklyData.map(d => d.deliveries));

    return (
      <div className="delivery-trend">
        <div className="trend-bars">
          {weeklyData.map((data, index) => (
            <div key={index} className="trend-bar-group">
              <div className="bar-container">
                <div
                  className="bar total"
                  style={{ height: `${(data.deliveries / maxValue) * 100}%` }}
                >
                  <span className="bar-value">{data.deliveries}</span>
                </div>
                <div
                  className="bar on-time"
                  style={{ height: `${(data.onTime / maxValue) * 100}%` }}
                />
              </div>
              <span className="bar-label">{data.week}</span>
            </div>
          ))}
        </div>
        <div className="trend-legend">
          <span className="trend-legend-item">
            <span className="legend-dot total"></span>
            Total
          </span>
          <span className="trend-legend-item">
            <span className="legend-dot on-time"></span>
            On-Time
          </span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="enhanced-materials-dashboard">
        <div className="loading-state">
          <RefreshCw className="loading-spinner" size={32} />
          <p>Loading materials data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="enhanced-materials-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-title">
            <Package className="header-icon" size={32} />
            <div>
              <h1>Materials Management</h1>
              <p>Track deliveries, inventory, purchase orders, and supplier performance</p>
            </div>
          </div>
          <div className="header-actions">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="project-selector"
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.project_number} - {project.name}
                </option>
              ))}
            </select>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="date-selector"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="ytd">Year to Date</option>
              <option value="all">All Time</option>
            </select>
            <button className="btn-secondary" onClick={() => setShowFilters(!showFilters)}>
              <Filter size={18} />
              Filters
            </button>
            <button className="btn-primary">
              <Plus size={18} />
              New Ticket
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
          className={`tab ${activeTab === 'deliveries' ? 'active' : ''}`}
          onClick={() => setActiveTab('deliveries')}
        >
          <Truck size={18} />
          Deliveries
          <span className="tab-badge">{tickets.length}</span>
        </button>
        <button
          className={`tab ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <Box size={18} />
          Inventory
          <span className="tab-badge warning">
            {inventory.filter(i => i.quantity_available <= i.reorder_point).length}
          </span>
        </button>
        <button
          className={`tab ${activeTab === 'purchase-orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('purchase-orders')}
        >
          <FileText size={18} />
          Purchase Orders
          <span className="tab-badge">{purchaseOrders.length}</span>
        </button>
        <button
          className={`tab ${activeTab === 'suppliers' ? 'active' : ''}`}
          onClick={() => setActiveTab('suppliers')}
        >
          <Building2 size={18} />
          Suppliers
        </button>
      </nav>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-grid">
            {/* Material Categories */}
            <div className="card categories-card">
              <div className="card-header">
                <h3>Material Categories</h3>
                <span className="card-subtitle">By delivery count</span>
              </div>
              {renderCategoryDonut()}
            </div>

            {/* Delivery Trend */}
            <div className="card trend-card">
              <div className="card-header">
                <h3>Delivery Trend</h3>
                <span className="card-subtitle">Last 4 weeks</span>
              </div>
              {renderDeliveryTrend()}
            </div>

            {/* Buy America Compliance */}
            <div className="card compliance-card">
              <div className="card-header">
                <h3>Buy America Compliance</h3>
                <ShieldCheck size={20} className="header-icon-small" />
              </div>
              <div className="compliance-content">
                <div className="compliance-gauge">
                  <svg viewBox="0 0 120 120" className="gauge-svg">
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="var(--bg-tertiary)"
                      strokeWidth="12"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="var(--success)"
                      strokeWidth="12"
                      strokeDasharray={`${(buyAmericaStats?.compliance_rate || 0) * 3.14} 314`}
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                    />
                    <text x="60" y="55" textAnchor="middle" className="gauge-value">
                      {buyAmericaStats?.compliance_rate.toFixed(1)}%
                    </text>
                    <text x="60" y="72" textAnchor="middle" className="gauge-label">
                      Compliant
                    </text>
                  </svg>
                </div>
                <div className="compliance-breakdown">
                  <div className="breakdown-item">
                    <CheckCircle size={16} className="success" />
                    <span>Compliant</span>
                    <strong>{buyAmericaStats?.compliant}</strong>
                  </div>
                  <div className="breakdown-item">
                    <XCircle size={16} className="error" />
                    <span>Non-Compliant</span>
                    <strong>{buyAmericaStats?.non_compliant}</strong>
                  </div>
                  <div className="breakdown-item">
                    <Clock size={16} className="warning" />
                    <span>Pending</span>
                    <strong>{buyAmericaStats?.pending_verification}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Low Stock Alert */}
            <div className="card alert-card">
              <div className="card-header">
                <h3>Low Stock Alerts</h3>
                <AlertTriangle size={20} className="warning" />
              </div>
              <div className="alert-list">
                {inventory
                  .filter(item => item.quantity_available <= item.reorder_point)
                  .slice(0, 5)
                  .map((item, index) => {
                    const status = getInventoryStatus(item);
                    return (
                      <div key={index} className={`alert-item ${status.class}`}>
                        <div className="alert-item-main">
                          {status.icon}
                          <div className="alert-item-info">
                            <span className="item-name">{item.material_name}</span>
                            <span className="item-location">{item.storage_location}</span>
                          </div>
                        </div>
                        <div className="alert-item-stats">
                          <span className="available">{item.quantity_available.toLocaleString()} {item.unit}</span>
                          <span className="days-supply">{item.days_of_supply.toFixed(1)} days</span>
                        </div>
                      </div>
                    );
                  })}
                {inventory.filter(item => item.quantity_available <= item.reorder_point).length === 0 && (
                  <div className="empty-state-small">
                    <CheckCircle size={24} />
                    <p>All inventory levels are healthy</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Deliveries */}
            <div className="card recent-deliveries-card">
              <div className="card-header">
                <h3>Recent Deliveries</h3>
                <button className="btn-link" onClick={() => setActiveTab('deliveries')}>
                  View All <ChevronRight size={16} />
                </button>
              </div>
              <div className="recent-deliveries-list">
                {tickets.slice(0, 5).map((ticket, index) => (
                  <div
                    key={index}
                    className="delivery-item"
                    onClick={() => openTicketDetail(ticket)}
                  >
                    <div className="delivery-item-main">
                      <span className="ticket-number">{ticket.ticket_number}</span>
                      <span className="material-desc">{ticket.material_description}</span>
                    </div>
                    <div className="delivery-item-meta">
                      <span className="supplier">{ticket.supplier_name}</span>
                      <span className="quantity">{ticket.quantity.toLocaleString()} {ticket.unit_of_measure}</span>
                    </div>
                    <div className="delivery-item-status">
                      {getStatusBadge(ticket.status)}
                      {ticket.buy_america_compliant && (
                        <Flag size={14} className="buy-america-flag" title="Buy America Compliant" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Suppliers */}
            <div className="card suppliers-card">
              <div className="card-header">
                <h3>Top Suppliers</h3>
                <span className="card-subtitle">By overall score</span>
              </div>
              <div className="suppliers-list">
                {supplierPerformance
                  .sort((a, b) => b.overall_score - a.overall_score)
                  .slice(0, 5)
                  .map((supplier, index) => (
                    <div key={index} className="supplier-item">
                      <div className="supplier-rank">{index + 1}</div>
                      <div className="supplier-info">
                        <span className="supplier-name">{supplier.name}</span>
                        <div className="supplier-metrics">
                          <span>{supplier.total_deliveries} deliveries</span>
                          <span>${(supplier.total_value / 1000).toFixed(0)}K</span>
                        </div>
                      </div>
                      <div className="supplier-score">
                        <div
                          className={`score-circle ${
                            supplier.overall_score >= 95 ? 'excellent' :
                            supplier.overall_score >= 90 ? 'good' :
                            supplier.overall_score >= 80 ? 'fair' : 'poor'
                          }`}
                        >
                          {supplier.overall_score.toFixed(0)}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Deliveries Tab */}
        {activeTab === 'deliveries' && (
          <div className="deliveries-section">
            {/* Search and Filters */}
            <div className="section-toolbar">
              <div className="search-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search tickets, materials, suppliers..."
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
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                  <option value="ocr_pending">OCR Pending</option>
                </select>
                <button className="btn-icon">
                  <Download size={18} />
                </button>
              </div>
            </div>

            {/* Deliveries Table */}
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ticket #</th>
                    <th>Date</th>
                    <th>Material</th>
                    <th>Supplier</th>
                    <th>Quantity</th>
                    <th>Value</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket, index) => (
                    <tr key={index} onClick={() => openTicketDetail(ticket)}>
                      <td className="ticket-cell">
                        <span className="ticket-number">{ticket.ticket_number}</span>
                        <span className="po-ref">{ticket.po_number}</span>
                      </td>
                      <td>{new Date(ticket.delivery_date).toLocaleDateString()}</td>
                      <td>
                        <div className="material-cell">
                          <span className="material-name">{ticket.material_description}</span>
                          <span className="material-type">{ticket.material_type}</span>
                        </div>
                      </td>
                      <td>{ticket.supplier_name}</td>
                      <td className="quantity-cell">
                        {ticket.quantity.toLocaleString()} {ticket.unit_of_measure}
                      </td>
                      <td className="value-cell">
                        ${ticket.total_value.toLocaleString()}
                      </td>
                      <td className="location-cell">{ticket.delivery_location}</td>
                      <td>
                        <div className="status-cell">
                          {getStatusBadge(ticket.status)}
                          {ticket.buy_america_compliant && (
                            <Flag size={14} className="buy-america-flag" title="Buy America" />
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn-icon-sm" title="View Details">
                            <Eye size={16} />
                          </button>
                          {ticket.photo_url && (
                            <button className="btn-icon-sm" title="View Photo">
                              <Camera size={16} />
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

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="inventory-section">
            <div className="section-toolbar">
              <div className="search-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search materials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="toolbar-filters">
                <button className="btn-secondary">
                  <Download size={18} />
                  Export
                </button>
                <button className="btn-primary">
                  <Plus size={18} />
                  Add Item
                </button>
              </div>
            </div>

            <div className="inventory-grid">
              {filteredInventory.map((item, index) => {
                const status = getInventoryStatus(item);
                const usagePercentage = Math.min(100, (item.quantity_available / item.reorder_point) * 100);

                return (
                  <div key={index} className={`inventory-card ${status.class}`}>
                    <div className="inventory-card-header">
                      <div className="material-info">
                        <h4>{item.material_name}</h4>
                        <span className="material-type">{item.material_type}</span>
                      </div>
                      <div className={`inventory-status ${status.class}`}>
                        {status.icon}
                        {status.label}
                      </div>
                    </div>

                    <div className="inventory-quantities">
                      <div className="quantity-row">
                        <span className="label">On Hand</span>
                        <span className="value">{item.quantity_on_hand.toLocaleString()} {item.unit}</span>
                      </div>
                      <div className="quantity-row">
                        <span className="label">Reserved</span>
                        <span className="value reserved">-{item.quantity_reserved.toLocaleString()}</span>
                      </div>
                      <div className="quantity-row available">
                        <span className="label">Available</span>
                        <span className="value">{item.quantity_available.toLocaleString()} {item.unit}</span>
                      </div>
                    </div>

                    <div className="inventory-gauge">
                      <div className="gauge-bar">
                        <div
                          className={`gauge-fill ${status.class}`}
                          style={{ width: `${Math.min(100, usagePercentage)}%` }}
                        />
                        <div
                          className="gauge-marker"
                          style={{ left: `${(item.minimum_stock_level / item.reorder_point) * 100}%` }}
                          title="Minimum Level"
                        />
                      </div>
                      <div className="gauge-labels">
                        <span>Min: {item.minimum_stock_level.toLocaleString()}</span>
                        <span>Reorder: {item.reorder_point.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="inventory-footer">
                      <div className="footer-stat">
                        <Clock size={14} />
                        <span>{item.days_of_supply.toFixed(1)} days supply</span>
                      </div>
                      <div className="footer-stat">
                        <DollarSign size={14} />
                        <span>${item.total_value.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="inventory-meta">
                      <span><MapPin size={12} /> {item.storage_location}</span>
                      <span><Building2 size={12} /> {item.supplier_name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Purchase Orders Tab */}
        {activeTab === 'purchase-orders' && (
          <div className="po-section">
            <div className="section-toolbar">
              <div className="search-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search POs, suppliers..."
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
                  <option value="issued">Issued</option>
                  <option value="partial">Partial</option>
                  <option value="complete">Complete</option>
                  <option value="closed">Closed</option>
                </select>
                <button className="btn-primary">
                  <Plus size={18} />
                  New PO
                </button>
              </div>
            </div>

            <div className="po-grid">
              {filteredPOs.map((po, index) => {
                const deliveryProgress = (po.delivered_amount / po.total_amount) * 100;

                return (
                  <div
                    key={index}
                    className="po-card"
                    onClick={() => openPODetail(po)}
                  >
                    <div className="po-card-header">
                      <div className="po-info">
                        <span className="po-number">{po.po_number}</span>
                        {getStatusBadge(po.status)}
                      </div>
                      {po.buy_america_required && (
                        <div className="buy-america-badge">
                          <Flag size={14} />
                          Buy America
                        </div>
                      )}
                    </div>

                    <div className="po-supplier">
                      <Building2 size={16} />
                      <span>{po.supplier_name}</span>
                    </div>

                    <div className="po-project">
                      <Layers size={16} />
                      <span>{po.project_name}</span>
                    </div>

                    <div className="po-amounts">
                      <div className="amount-row">
                        <span>Total Amount</span>
                        <span className="total">${po.total_amount.toLocaleString()}</span>
                      </div>
                      <div className="amount-row">
                        <span>Delivered</span>
                        <span className="delivered">${po.delivered_amount.toLocaleString()}</span>
                      </div>
                      <div className="amount-row">
                        <span>Remaining</span>
                        <span className="remaining">${po.remaining_amount.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="po-progress">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${deliveryProgress}%` }}
                        />
                      </div>
                      <span className="progress-text">{deliveryProgress.toFixed(0)}% delivered</span>
                    </div>

                    <div className="po-footer">
                      <div className="footer-item">
                        <Calendar size={14} />
                        <span>Due: {new Date(po.expected_delivery).toLocaleDateString()}</span>
                      </div>
                      <div className="footer-item">
                        <Truck size={14} />
                        <span>{po.deliveries_count} deliveries</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Suppliers Tab */}
        {activeTab === 'suppliers' && (
          <div className="suppliers-section">
            <div className="section-toolbar">
              <div className="search-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="toolbar-filters">
                <button className="btn-secondary">
                  <Download size={18} />
                  Export Report
                </button>
              </div>
            </div>

            <div className="suppliers-performance-grid">
              {supplierPerformance.map((supplier, index) => (
                <div key={index} className="supplier-performance-card">
                  <div className="supplier-card-header">
                    <div className="supplier-identity">
                      <div className="supplier-avatar">
                        {supplier.name.charAt(0)}
                      </div>
                      <div className="supplier-details">
                        <h4>{supplier.name}</h4>
                        <span>{supplier.total_deliveries} deliveries</span>
                      </div>
                    </div>
                    <div className={`overall-score ${
                      supplier.overall_score >= 95 ? 'excellent' :
                      supplier.overall_score >= 90 ? 'good' :
                      supplier.overall_score >= 80 ? 'fair' : 'poor'
                    }`}>
                      <span className="score-value">{supplier.overall_score.toFixed(0)}</span>
                      <span className="score-label">Overall</span>
                    </div>
                  </div>

                  <div className="supplier-metrics-grid">
                    <div className="metric">
                      <div className="metric-header">
                        <Clock size={14} />
                        <span>On-Time Rate</span>
                      </div>
                      <div className="metric-value">{supplier.on_time_rate.toFixed(1)}%</div>
                      <div className="metric-bar">
                        <div
                          className="metric-fill on-time"
                          style={{ width: `${supplier.on_time_rate}%` }}
                        />
                      </div>
                    </div>
                    <div className="metric">
                      <div className="metric-header">
                        <Star size={14} />
                        <span>Quality Score</span>
                      </div>
                      <div className="metric-value">{supplier.quality_score.toFixed(1)}%</div>
                      <div className="metric-bar">
                        <div
                          className="metric-fill quality"
                          style={{ width: `${supplier.quality_score}%` }}
                        />
                      </div>
                    </div>
                    <div className="metric">
                      <div className="metric-header">
                        <FileText size={14} />
                        <span>Documentation</span>
                      </div>
                      <div className="metric-value">{supplier.documentation_score.toFixed(1)}%</div>
                      <div className="metric-bar">
                        <div
                          className="metric-fill docs"
                          style={{ width: `${supplier.documentation_score}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="supplier-card-footer">
                    <div className="footer-stat">
                      <DollarSign size={14} />
                      <span>${(supplier.total_value / 1000).toFixed(0)}K Total</span>
                    </div>
                    <div className="footer-stat">
                      <AlertTriangle size={14} />
                      <span>{supplier.issues_count} Issues</span>
                    </div>
                    <div className="footer-stat">
                      <Truck size={14} />
                      <span>{supplier.avg_delivery_time.toFixed(1)} day avg</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Detail Panel */}
      {showDetailPanel && (
        <div className={`detail-panel ${showDetailPanel ? 'open' : ''}`}>
          <div className="detail-panel-header">
            <h3>
              {detailType === 'ticket' && selectedTicket?.ticket_number}
              {detailType === 'po' && selectedPO?.po_number}
            </h3>
            <button className="close-btn" onClick={() => setShowDetailPanel(false)}>
              <X size={20} />
            </button>
          </div>

          <div className="detail-panel-content">
            {detailType === 'ticket' && selectedTicket && (
              <>
                <div className="detail-section">
                  <div className="detail-status-header">
                    {getStatusBadge(selectedTicket.status)}
                    {selectedTicket.buy_america_compliant && (
                      <span className="compliance-badge compliant">
                        <ShieldCheck size={14} />
                        Buy America Compliant
                      </span>
                    )}
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Material Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="label">Description</span>
                      <span className="value">{selectedTicket.material_description}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Type</span>
                      <span className="value capitalize">{selectedTicket.material_type}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Quantity</span>
                      <span className="value">{selectedTicket.quantity.toLocaleString()} {selectedTicket.unit_of_measure}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Unit Price</span>
                      <span className="value">${selectedTicket.unit_price.toFixed(2)}</span>
                    </div>
                    <div className="detail-item full-width">
                      <span className="label">Total Value</span>
                      <span className="value highlight">${selectedTicket.total_value.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Delivery Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="label">Delivery Date</span>
                      <span className="value">{new Date(selectedTicket.delivery_date).toLocaleDateString()}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Location</span>
                      <span className="value">{selectedTicket.delivery_location}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Driver</span>
                      <span className="value">{selectedTicket.driver_name}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Vehicle</span>
                      <span className="value">{selectedTicket.vehicle_info}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Supplier & PO</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="label">Supplier</span>
                      <span className="value">{selectedTicket.supplier_name}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">PO Number</span>
                      <span className="value link">{selectedTicket.po_number}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Project</span>
                      <span className="value">{selectedTicket.project_name}</span>
                    </div>
                  </div>
                </div>

                {selectedTicket.ocr_confidence && (
                  <div className="detail-section">
                    <h4>Verification</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="label">OCR Confidence</span>
                        <span className="value">{selectedTicket.ocr_confidence.toFixed(1)}%</span>
                      </div>
                      {selectedTicket.verified_by && (
                        <>
                          <div className="detail-item">
                            <span className="label">Verified By</span>
                            <span className="value">{selectedTicket.verified_by}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Verified At</span>
                            <span className="value">
                              {selectedTicket.verified_at && new Date(selectedTicket.verified_at).toLocaleString()}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {selectedTicket.notes && (
                  <div className="detail-section">
                    <h4>Notes</h4>
                    <p className="detail-notes">{selectedTicket.notes}</p>
                  </div>
                )}

                <div className="detail-actions">
                  <button className="btn-secondary">
                    <Camera size={16} />
                    View Photo
                  </button>
                  <button className="btn-secondary">
                    <FileText size={16} />
                    View PO
                  </button>
                  <button className="btn-primary">
                    <CheckCircle size={16} />
                    {selectedTicket.status === 'pending' ? 'Verify Ticket' : 'Edit Ticket'}
                  </button>
                </div>
              </>
            )}

            {detailType === 'po' && selectedPO && (
              <>
                <div className="detail-section">
                  <div className="detail-status-header">
                    {getStatusBadge(selectedPO.status)}
                    {selectedPO.buy_america_required && (
                      <span className="compliance-badge required">
                        <Flag size={14} />
                        Buy America Required
                      </span>
                    )}
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Order Summary</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="label">Supplier</span>
                      <span className="value">{selectedPO.supplier_name}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Project</span>
                      <span className="value">{selectedPO.project_name}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Issue Date</span>
                      <span className="value">{new Date(selectedPO.issue_date).toLocaleDateString()}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Expected Delivery</span>
                      <span className="value">{new Date(selectedPO.expected_delivery).toLocaleDateString()}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Line Items</span>
                      <span className="value">{selectedPO.line_items_count}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Deliveries</span>
                      <span className="value">{selectedPO.deliveries_count}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Amounts</h4>
                  <div className="po-amounts-detail">
                    <div className="amount-row">
                      <span>Total Amount</span>
                      <span className="total">${selectedPO.total_amount.toLocaleString()}</span>
                    </div>
                    <div className="amount-row">
                      <span>Delivered</span>
                      <span className="delivered">${selectedPO.delivered_amount.toLocaleString()}</span>
                    </div>
                    <div className="amount-row highlight">
                      <span>Remaining</span>
                      <span className="remaining">${selectedPO.remaining_amount.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="po-progress-detail">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${(selectedPO.delivered_amount / selectedPO.total_amount) * 100}%` }}
                      />
                    </div>
                    <span>{((selectedPO.delivered_amount / selectedPO.total_amount) * 100).toFixed(0)}% Complete</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Created By</h4>
                  <p className="detail-notes">{selectedPO.created_by}</p>
                </div>

                <div className="detail-actions">
                  <button className="btn-secondary">
                    <Truck size={16} />
                    View Deliveries
                  </button>
                  <button className="btn-secondary">
                    <FileText size={16} />
                    Print PO
                  </button>
                  <button className="btn-primary">
                    <ClipboardCheck size={16} />
                    Edit PO
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Panel Overlay */}
      {showDetailPanel && (
        <div className="panel-overlay" onClick={() => setShowDetailPanel(false)} />
      )}
    </div>
  );
}
