import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Truck,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Settings,
  Edit3,
  Fuel,
  Wrench,
  Shield,
  Calendar,
  MapPin,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Activity,
  Gauge,
  Hash,
  User,
  Building2,
  TrendingUp,
  TrendingDown,
  Zap,
  Thermometer,
  Battery,
  Navigation,
  Camera,
  Download,
  Plus,
  Eye,
  MoreVertical,
  Info,
  History,
  Star,
  CreditCard,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './EnhancedVehicleDetails.css';

// ============================================================================
// INTERFACES
// ============================================================================

interface VehicleData {
  id: string;
  equipmentNumber: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  category: string;
  status: string;
  ownership: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  licensePlate: string;
  licenseState: string;
  registrationExpiry: string;
  dotNumber: string;
  dotStatus: string;
  dotInspectionDue: string;
  insurancePolicy: string;
  insuranceExpiry: string;
  engineHours: number;
  odometer: number;
  fuelType: string;
  tankCapacity: number;
  avgFuelEfficiency: number;
  hourlyRate: number;
  totalCostToDate: number;
  assignedDriver: string | null;
  assignedDriverId: string | null;
  currentProject: string | null;
  currentProjectId: string | null;
  lastLocation: { lat: number; lng: number } | null;
  lastLocationTime: string | null;
  nextServiceDate: string | null;
  nextServiceHours: number | null;
  description: string;
  notes: string;
  imageUrl: string | null;
  specs: VehicleSpecs;
  telematics: TelematicsData | null;
}

interface VehicleSpecs {
  engine: string;
  horsepower: number;
  transmission: string;
  driveType: string;
  gvwr: number;
  payload: number;
  towing: number;
  bedLength: string;
  cabType: string;
  color: string;
  interiorColor: string;
  tireSizeFront: string;
  tireSizeRear: string;
}

interface TelematicsData {
  connected: boolean;
  provider: string;
  lastUpdate: string;
  engineStatus: 'running' | 'idle' | 'off';
  fuelLevel: number;
  defLevel: number;
  batteryVoltage: number;
  coolantTemp: number;
  oilPressure: number;
  speed: number;
  rpm: number;
  idleTime: number;
  drivingTime: number;
  alerts: string[];
}

interface MaintenanceRecord {
  id: string;
  date: string;
  type: string;
  description: string;
  hours: number;
  odometer: number;
  cost: number;
  vendor: string;
  technician: string;
  status: string;
  workOrder: string;
  parts: string[];
}

interface FuelTransaction {
  id: string;
  date: string;
  gallons: number;
  pricePerGallon: number;
  totalCost: number;
  odometer: number;
  mpg: number;
  location: string;
  driver: string;
  cardNumber: string;
  isAnomaly: boolean;
}

interface InspectionRecord {
  id: string;
  date: string;
  type: string;
  inspector: string;
  result: 'pass' | 'fail' | 'conditional';
  nextDue: string;
  notes: string;
  items: { item: string; status: string; notes: string }[];
}

interface CostSummary {
  category: string;
  amount: number;
  percentage: number;
  trend: number;
}

interface AssignmentHistory {
  id: string;
  startDate: string;
  endDate: string | null;
  project: string;
  projectNumber: string;
  driver: string;
  hours: number;
  cost: number;
}

interface Document {
  id: string;
  name: string;
  type: string;
  uploadDate: string;
  size: string;
  url: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

type TabType = 'overview' | 'maintenance' | 'fuel' | 'inspections' | 'costs' | 'documents' | 'history';

export function EnhancedVehicleDetails() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [fuelTransactions, setFuelTransactions] = useState<FuelTransaction[]>([]);
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [costSummary, setCostSummary] = useState<CostSummary[]>([]);
  const [assignments, setAssignments] = useState<AssignmentHistory[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showQuickActions, setShowQuickActions] = useState(false);

  useEffect(() => {
    loadVehicleData();
  }, [vehicleId]);

  const loadVehicleData = async () => {
    setIsLoading(true);
    try {
      // Try to load real data
      if (vehicleId) {
        const { data } = await supabase
          .from('equipment')
          .select('*')
          .eq('id', vehicleId)
          .single();

        if (data) {
          // Transform real data
          // For now, load demo data
          loadDemoData();
          return;
        }
      }
      loadDemoData();
    } catch (error) {
      console.error('Error loading vehicle:', error);
      loadDemoData();
    } finally {
      setIsLoading(false);
    }
  };

  const loadDemoData = () => {
    // Comprehensive demo vehicle data
    setVehicle({
      id: vehicleId || 'demo-1',
      equipmentNumber: 'EQ-0042',
      vin: '1GCGG25K071234567',
      year: 2023,
      make: 'Caterpillar',
      model: '336 Next Gen',
      category: 'Excavator',
      status: 'active',
      ownership: 'Owned',
      purchaseDate: '2023-03-15',
      purchasePrice: 425000,
      currentValue: 382500,
      licensePlate: 'WV-4521',
      licenseState: 'WV',
      registrationExpiry: '2025-03-15',
      dotNumber: 'DOT-789456',
      dotStatus: 'compliant',
      dotInspectionDue: '2025-06-15',
      insurancePolicy: 'POL-2024-78542',
      insuranceExpiry: '2025-01-15',
      engineHours: 2847,
      odometer: 0,
      fuelType: 'Diesel',
      tankCapacity: 145,
      avgFuelEfficiency: 4.2,
      hourlyRate: 185.50,
      totalCostToDate: 528450,
      assignedDriver: 'John Martinez',
      assignedDriverId: 'd1',
      currentProject: 'Corridor H - Section 12',
      currentProjectId: 'p1',
      lastLocation: { lat: 39.2904, lng: -79.4555 },
      lastLocationTime: '2025-01-06T14:32:00Z',
      nextServiceDate: '2025-01-20',
      nextServiceHours: 3000,
      description: 'Caterpillar 336 Next Gen Hydraulic Excavator with advanced technology',
      notes: 'Equipped with Cat Grade with 2D, Product Link Elite, E-Fence. Primary excavator for Corridor H earthwork.',
      imageUrl: null,
      specs: {
        engine: 'Cat C9.3B ACERT',
        horsepower: 302,
        transmission: 'Direct Drive',
        driveType: 'Track',
        gvwr: 87300,
        payload: 0,
        towing: 0,
        bedLength: 'N/A',
        cabType: 'Enclosed ROPS/FOPS',
        color: 'Cat Yellow',
        interiorColor: 'Black',
        tireSizeFront: '32" Track Shoes',
        tireSizeRear: '32" Track Shoes',
      },
      telematics: {
        connected: true,
        provider: 'Cat Product Link Elite',
        lastUpdate: '2025-01-06T14:32:00Z',
        engineStatus: 'running',
        fuelLevel: 68,
        defLevel: 85,
        batteryVoltage: 24.2,
        coolantTemp: 195,
        oilPressure: 42,
        speed: 0,
        rpm: 1400,
        idleTime: 45,
        drivingTime: 342,
        alerts: [],
      },
    });

    // Maintenance records
    setMaintenanceRecords([
      {
        id: 'm1',
        date: '2024-12-15',
        type: 'Preventive Maintenance',
        description: '500-Hour Service - Oil & Filter Change',
        hours: 2500,
        odometer: 0,
        cost: 2450,
        vendor: 'Caterpillar Dealer - Charleston',
        technician: 'Mike Thompson',
        status: 'completed',
        workOrder: 'WO-2024-1542',
        parts: ['Engine Oil Filter', 'Hydraulic Filter', 'Engine Oil 15W-40 (12gal)'],
      },
      {
        id: 'm2',
        date: '2024-10-20',
        type: 'Repair',
        description: 'Hydraulic Hose Replacement - Boom Cylinder',
        hours: 2150,
        odometer: 0,
        cost: 1875,
        vendor: 'Caterpillar Dealer - Charleston',
        technician: 'Dave Wilson',
        status: 'completed',
        workOrder: 'WO-2024-1287',
        parts: ['Hydraulic Hose Assembly', 'O-Ring Kit', 'Hydraulic Fluid (5gal)'],
      },
      {
        id: 'm3',
        date: '2024-08-10',
        type: 'Preventive Maintenance',
        description: '2000-Hour Major Service',
        hours: 2000,
        odometer: 0,
        cost: 8750,
        vendor: 'Caterpillar Dealer - Charleston',
        technician: 'Mike Thompson',
        status: 'completed',
        workOrder: 'WO-2024-0956',
        parts: ['Complete Filter Kit', 'Hydraulic Oil (45gal)', 'Engine Oil (12gal)', 'Coolant (5gal)', 'Fuel Filter Kit'],
      },
      {
        id: 'm4',
        date: '2025-01-20',
        type: 'Scheduled',
        description: '3000-Hour Service Due',
        hours: 3000,
        odometer: 0,
        cost: 3200,
        vendor: 'Caterpillar Dealer - Charleston',
        technician: 'TBD',
        status: 'scheduled',
        workOrder: 'WO-2025-0042',
        parts: ['To be determined'],
      },
    ]);

    // Fuel transactions
    setFuelTransactions([
      { id: 'f1', date: '2025-01-05', gallons: 85.4, pricePerGallon: 3.42, totalCost: 292.07, odometer: 0, mpg: 4.1, location: 'Fuel Depot - Job Site', driver: 'John Martinez', cardNumber: '****4521', isAnomaly: false },
      { id: 'f2', date: '2025-01-02', gallons: 92.1, pricePerGallon: 3.45, totalCost: 317.75, odometer: 0, mpg: 4.3, location: 'Flying J - Elkins', driver: 'John Martinez', cardNumber: '****4521', isAnomaly: false },
      { id: 'f3', date: '2024-12-28', gallons: 78.6, pricePerGallon: 3.48, totalCost: 273.53, odometer: 0, mpg: 4.0, location: 'Fuel Depot - Job Site', driver: 'John Martinez', cardNumber: '****4521', isAnomaly: false },
      { id: 'f4', date: '2024-12-24', gallons: 145.0, pricePerGallon: 3.52, totalCost: 510.40, odometer: 0, mpg: 3.8, location: 'Pilot - Buckhannon', driver: 'Mike Thompson', cardNumber: '****7845', isAnomaly: true },
      { id: 'f5', date: '2024-12-20', gallons: 88.2, pricePerGallon: 3.51, totalCost: 309.58, odometer: 0, mpg: 4.2, location: 'Fuel Depot - Job Site', driver: 'John Martinez', cardNumber: '****4521', isAnomaly: false },
    ]);

    // Inspections
    setInspections([
      {
        id: 'i1',
        date: '2024-06-15',
        type: 'Annual Safety Inspection',
        inspector: 'WV DOT Inspector',
        result: 'pass',
        nextDue: '2025-06-15',
        notes: 'All systems pass. No defects noted.',
        items: [
          { item: 'Hydraulic System', status: 'pass', notes: 'No leaks, proper operation' },
          { item: 'Boom/Stick/Bucket', status: 'pass', notes: 'Normal wear, pins in spec' },
          { item: 'Undercarriage', status: 'pass', notes: '75% remaining' },
          { item: 'Cab/ROPS/FOPS', status: 'pass', notes: 'Certified, no damage' },
          { item: 'Electrical System', status: 'pass', notes: 'All lights functional' },
          { item: 'Fire Suppression', status: 'pass', notes: 'Charged and inspected' },
        ],
      },
      {
        id: 'i2',
        date: '2024-12-01',
        type: 'Daily Pre-Trip',
        inspector: 'John Martinez',
        result: 'pass',
        nextDue: 'Daily',
        notes: 'All systems operational',
        items: [
          { item: 'Walk Around', status: 'pass', notes: '' },
          { item: 'Fluid Levels', status: 'pass', notes: '' },
          { item: 'Safety Devices', status: 'pass', notes: '' },
          { item: 'Controls', status: 'pass', notes: '' },
        ],
      },
    ]);

    // Cost summary
    setCostSummary([
      { category: 'Fuel', amount: 48250, percentage: 38.2, trend: -2.5 },
      { category: 'Maintenance', amount: 32450, percentage: 25.7, trend: -8.3 },
      { category: 'Depreciation', amount: 42500, percentage: 33.6, trend: 0 },
      { category: 'Insurance', amount: 3150, percentage: 2.5, trend: 4.2 },
    ]);

    // Assignment history
    setAssignments([
      { id: 'a1', startDate: '2024-09-01', endDate: null, project: 'Corridor H - Section 12', projectNumber: '2024-001', driver: 'John Martinez', hours: 847, cost: 157118.50 },
      { id: 'a2', startDate: '2024-05-15', endDate: '2024-08-31', project: 'Route 50 Bridge Repair', projectNumber: '2024-002', driver: 'Mike Thompson', hours: 624, cost: 115752.00 },
      { id: 'a3', startDate: '2024-03-15', endDate: '2024-05-14', project: 'US-19 Widening', projectNumber: '2024-004', driver: 'John Martinez', hours: 445, cost: 82547.50 },
    ]);

    // Documents
    setDocuments([
      { id: 'd1', name: 'Purchase Agreement', type: 'PDF', uploadDate: '2023-03-15', size: '2.4 MB', url: '#' },
      { id: 'd2', name: 'DOT Inspection Certificate', type: 'PDF', uploadDate: '2024-06-15', size: '1.1 MB', url: '#' },
      { id: 'd3', name: 'Insurance Certificate', type: 'PDF', uploadDate: '2024-01-15', size: '845 KB', url: '#' },
      { id: 'd4', name: 'Operator Manual', type: 'PDF', uploadDate: '2023-03-15', size: '18.5 MB', url: '#' },
      { id: 'd5', name: 'Warranty Information', type: 'PDF', uploadDate: '2023-03-15', size: '567 KB', url: '#' },
    ]);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      active: { color: '#10b981', label: 'Active' },
      idle: { color: '#6b7280', label: 'Idle' },
      in_maintenance: { color: '#f59e0b', label: 'In Maintenance' },
      down: { color: '#ef4444', label: 'Down' },
      scheduled: { color: '#3b82f6', label: 'Scheduled' },
      completed: { color: '#10b981', label: 'Completed' },
      pass: { color: '#10b981', label: 'Pass' },
      fail: { color: '#ef4444', label: 'Fail' },
      conditional: { color: '#f59e0b', label: 'Conditional' },
      compliant: { color: '#10b981', label: 'Compliant' },
      expiring_soon: { color: '#f59e0b', label: 'Expiring Soon' },
      expired: { color: '#ef4444', label: 'Expired' },
    };

    const config = statusMap[status.toLowerCase()] || { color: '#6b7280', label: status };
    return (
      <span className="status-badge" style={{ backgroundColor: `${config.color}20`, color: config.color }}>
        {config.label}
      </span>
    );
  };

  const getDaysUntil = (dateStr: string): number => {
    const date = new Date(dateStr);
    const now = new Date();
    return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <div className="enhanced-vehicle-details loading-state">
        <div className="loading-spinner">
          <RefreshCw size={48} className="spinning" />
          <h2>Loading Vehicle Details</h2>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="enhanced-vehicle-details error-state">
        <AlertTriangle size={48} />
        <h2>Vehicle Not Found</h2>
        <Link to="/equipment" className="btn btn-primary">Back to Fleet</Link>
      </div>
    );
  }

  return (
    <div className="enhanced-vehicle-details">
      {/* ================================================================== */}
      {/* HEADER */}
      {/* ================================================================== */}
      <header className="vehicle-header">
        <div className="header-nav">
          <Link to="/equipment/analytics" className="back-link">
            <ChevronLeft size={20} />
            Fleet Analytics
          </Link>
          <div className="breadcrumb">
            <Link to="/equipment">Fleet</Link>
            <ChevronRight size={14} />
            <span>{vehicle.equipmentNumber}</span>
          </div>
        </div>

        <div className="header-main">
          <div className="vehicle-identity">
            <div className="vehicle-image">
              {vehicle.imageUrl ? (
                <img src={vehicle.imageUrl} alt={`${vehicle.make} ${vehicle.model}`} />
              ) : (
                <div className="image-placeholder">
                  <Truck size={64} />
                </div>
              )}
              <button className="image-edit">
                <Camera size={16} />
              </button>
            </div>
            <div className="vehicle-info">
              <div className="vehicle-number-row">
                <h1>{vehicle.equipmentNumber}</h1>
                {getStatusBadge(vehicle.status)}
                {vehicle.telematics?.connected && (
                  <span className="telematics-badge">
                    <Zap size={12} />
                    Live
                  </span>
                )}
              </div>
              <h2>{vehicle.year} {vehicle.make} {vehicle.model}</h2>
              <div className="vehicle-meta">
                <span><Hash size={14} /> {vehicle.vin}</span>
                <span><Fuel size={14} /> {vehicle.fuelType}</span>
                <span><Gauge size={14} /> {formatNumber(vehicle.engineHours)} hrs</span>
              </div>
            </div>
          </div>

          <div className="header-actions">
            <button className="btn btn-secondary" onClick={() => setShowQuickActions(!showQuickActions)}>
              <MoreVertical size={18} />
            </button>
            <button className="btn btn-secondary">
              <RefreshCw size={18} />
              Sync
            </button>
            <button className="btn btn-primary">
              <Edit3 size={18} />
              Edit Vehicle
            </button>
            {showQuickActions && (
              <div className="quick-actions-dropdown">
                <button><Wrench size={16} /> Schedule Maintenance</button>
                <button><Shield size={16} /> Request Inspection</button>
                <button><MapPin size={16} /> Update Location</button>
                <button><User size={16} /> Assign Driver</button>
                <button><FileText size={16} /> Generate Report</button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Banner */}
        <div className="quick-stats-banner">
          <div className="quick-stat">
            <span className="stat-label">Current Project</span>
            <span className="stat-value">
              <Building2 size={16} />
              {vehicle.currentProject || 'Unassigned'}
            </span>
          </div>
          <div className="quick-stat">
            <span className="stat-label">Assigned Operator</span>
            <span className="stat-value">
              <User size={16} />
              {vehicle.assignedDriver || 'Unassigned'}
            </span>
          </div>
          <div className="quick-stat">
            <span className="stat-label">Hourly Rate</span>
            <span className="stat-value">
              <DollarSign size={16} />
              {formatCurrency(vehicle.hourlyRate)}/hr
            </span>
          </div>
          <div className="quick-stat">
            <span className="stat-label">Next Service</span>
            <span className={`stat-value ${getDaysUntil(vehicle.nextServiceDate || '') < 14 ? 'warning' : ''}`}>
              <Wrench size={16} />
              {vehicle.nextServiceDate ? formatDate(vehicle.nextServiceDate) : 'N/A'}
            </span>
          </div>
          <div className="quick-stat">
            <span className="stat-label">DOT Inspection</span>
            <span className={`stat-value ${getDaysUntil(vehicle.dotInspectionDue) < 30 ? 'warning' : ''}`}>
              <Shield size={16} />
              {formatDate(vehicle.dotInspectionDue)}
            </span>
          </div>
        </div>
      </header>

      {/* ================================================================== */}
      {/* TAB NAVIGATION */}
      {/* ================================================================== */}
      <nav className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Info size={18} />
          Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'maintenance' ? 'active' : ''}`}
          onClick={() => setActiveTab('maintenance')}
        >
          <Wrench size={18} />
          Maintenance
          <span className="badge">{maintenanceRecords.length}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'fuel' ? 'active' : ''}`}
          onClick={() => setActiveTab('fuel')}
        >
          <Fuel size={18} />
          Fuel
        </button>
        <button
          className={`tab-btn ${activeTab === 'inspections' ? 'active' : ''}`}
          onClick={() => setActiveTab('inspections')}
        >
          <Shield size={18} />
          Inspections
        </button>
        <button
          className={`tab-btn ${activeTab === 'costs' ? 'active' : ''}`}
          onClick={() => setActiveTab('costs')}
        >
          <DollarSign size={18} />
          Costs
        </button>
        <button
          className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          <FileText size={18} />
          Documents
          <span className="badge">{documents.length}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={18} />
          History
        </button>
      </nav>

      {/* ================================================================== */}
      {/* TAB CONTENT */}
      {/* ================================================================== */}
      <main className="tab-content">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="overview-grid">
              {/* Telematics Panel */}
              {vehicle.telematics && (
                <section className="detail-card telematics-panel">
                  <div className="card-header">
                    <h3><Zap size={20} /> Live Telematics</h3>
                    <span className="last-update">
                      Updated {new Date(vehicle.telematics.lastUpdate).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="card-content">
                    <div className="telematics-grid">
                      <div className="telemetry-item">
                        <div className="telemetry-icon">
                          <Activity size={20} />
                        </div>
                        <div className="telemetry-content">
                          <span className="telemetry-label">Engine Status</span>
                          <span className={`telemetry-value ${vehicle.telematics.engineStatus}`}>
                            {vehicle.telematics.engineStatus.charAt(0).toUpperCase() + vehicle.telematics.engineStatus.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div className="telemetry-item">
                        <div className="telemetry-icon">
                          <Fuel size={20} />
                        </div>
                        <div className="telemetry-content">
                          <span className="telemetry-label">Fuel Level</span>
                          <span className="telemetry-value">{vehicle.telematics.fuelLevel}%</span>
                          <div className="telemetry-bar">
                            <div className="bar-fill" style={{ width: `${vehicle.telematics.fuelLevel}%`, backgroundColor: vehicle.telematics.fuelLevel < 25 ? '#ef4444' : '#10b981' }} />
                          </div>
                        </div>
                      </div>
                      <div className="telemetry-item">
                        <div className="telemetry-icon">
                          <Battery size={20} />
                        </div>
                        <div className="telemetry-content">
                          <span className="telemetry-label">Battery</span>
                          <span className="telemetry-value">{vehicle.telematics.batteryVoltage}V</span>
                        </div>
                      </div>
                      <div className="telemetry-item">
                        <div className="telemetry-icon">
                          <Thermometer size={20} />
                        </div>
                        <div className="telemetry-content">
                          <span className="telemetry-label">Coolant Temp</span>
                          <span className="telemetry-value">{vehicle.telematics.coolantTemp}°F</span>
                        </div>
                      </div>
                      <div className="telemetry-item">
                        <div className="telemetry-icon">
                          <Gauge size={20} />
                        </div>
                        <div className="telemetry-content">
                          <span className="telemetry-label">RPM</span>
                          <span className="telemetry-value">{formatNumber(vehicle.telematics.rpm)}</span>
                        </div>
                      </div>
                      <div className="telemetry-item">
                        <div className="telemetry-icon">
                          <Clock size={20} />
                        </div>
                        <div className="telemetry-content">
                          <span className="telemetry-label">Today's Runtime</span>
                          <span className="telemetry-value">{Math.floor(vehicle.telematics.drivingTime / 60)}h {vehicle.telematics.drivingTime % 60}m</span>
                        </div>
                      </div>
                    </div>
                    {vehicle.lastLocation && (
                      <div className="location-preview">
                        <Navigation size={16} />
                        <span>Last known: {vehicle.lastLocation.lat.toFixed(4)}, {vehicle.lastLocation.lng.toFixed(4)}</span>
                        <button className="view-map-btn">View on Map</button>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Specifications */}
              <section className="detail-card specs-panel">
                <div className="card-header">
                  <h3><Settings size={20} /> Specifications</h3>
                </div>
                <div className="card-content">
                  <div className="specs-grid">
                    <div className="spec-item">
                      <span className="spec-label">Engine</span>
                      <span className="spec-value">{vehicle.specs.engine}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Horsepower</span>
                      <span className="spec-value">{vehicle.specs.horsepower} HP</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Transmission</span>
                      <span className="spec-value">{vehicle.specs.transmission}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Drive Type</span>
                      <span className="spec-value">{vehicle.specs.driveType}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">GVWR</span>
                      <span className="spec-value">{formatNumber(vehicle.specs.gvwr)} lbs</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Cab Type</span>
                      <span className="spec-value">{vehicle.specs.cabType}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Fuel Type</span>
                      <span className="spec-value">{vehicle.fuelType}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Tank Capacity</span>
                      <span className="spec-value">{vehicle.tankCapacity} gal</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Undercarriage</span>
                      <span className="spec-value">{vehicle.specs.tireSizeFront}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Color</span>
                      <span className="spec-value">{vehicle.specs.color}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Registration & Compliance */}
              <section className="detail-card compliance-panel">
                <div className="card-header">
                  <h3><Shield size={20} /> Registration & Compliance</h3>
                </div>
                <div className="card-content">
                  <div className="compliance-grid">
                    <div className="compliance-item">
                      <div className="compliance-header">
                        <span className="compliance-label">Registration</span>
                        {getDaysUntil(vehicle.registrationExpiry) < 30 ? (
                          <AlertTriangle size={16} className="warning" />
                        ) : (
                          <CheckCircle size={16} className="success" />
                        )}
                      </div>
                      <div className="compliance-details">
                        <span>{vehicle.licensePlate} ({vehicle.licenseState})</span>
                        <span className={getDaysUntil(vehicle.registrationExpiry) < 30 ? 'expiring' : ''}>
                          Expires: {formatDate(vehicle.registrationExpiry)}
                        </span>
                      </div>
                    </div>
                    <div className="compliance-item">
                      <div className="compliance-header">
                        <span className="compliance-label">DOT Status</span>
                        {getStatusBadge(vehicle.dotStatus)}
                      </div>
                      <div className="compliance-details">
                        <span>DOT #{vehicle.dotNumber}</span>
                        <span>Next Inspection: {formatDate(vehicle.dotInspectionDue)}</span>
                      </div>
                    </div>
                    <div className="compliance-item">
                      <div className="compliance-header">
                        <span className="compliance-label">Insurance</span>
                        {getDaysUntil(vehicle.insuranceExpiry) < 30 ? (
                          <AlertTriangle size={16} className="warning" />
                        ) : (
                          <CheckCircle size={16} className="success" />
                        )}
                      </div>
                      <div className="compliance-details">
                        <span>Policy: {vehicle.insurancePolicy}</span>
                        <span className={getDaysUntil(vehicle.insuranceExpiry) < 30 ? 'expiring' : ''}>
                          Expires: {formatDate(vehicle.insuranceExpiry)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Financial Summary */}
              <section className="detail-card financial-panel">
                <div className="card-header">
                  <h3><DollarSign size={20} /> Financial Summary</h3>
                </div>
                <div className="card-content">
                  <div className="financial-grid">
                    <div className="financial-item">
                      <span className="financial-label">Purchase Price</span>
                      <span className="financial-value">{formatCurrency(vehicle.purchasePrice)}</span>
                      <span className="financial-date">{formatDate(vehicle.purchaseDate)}</span>
                    </div>
                    <div className="financial-item">
                      <span className="financial-label">Current Value</span>
                      <span className="financial-value">{formatCurrency(vehicle.currentValue)}</span>
                      <span className="financial-change negative">
                        <TrendingDown size={14} />
                        {((1 - vehicle.currentValue / vehicle.purchasePrice) * 100).toFixed(1)}% depreciation
                      </span>
                    </div>
                    <div className="financial-item highlight">
                      <span className="financial-label">Total Cost to Date</span>
                      <span className="financial-value">{formatCurrency(vehicle.totalCostToDate)}</span>
                      <span className="financial-detail">Operating + Maintenance</span>
                    </div>
                    <div className="financial-item">
                      <span className="financial-label">Cost per Hour</span>
                      <span className="financial-value">{formatCurrency(vehicle.totalCostToDate / vehicle.engineHours)}</span>
                      <span className="financial-detail">{formatNumber(vehicle.engineHours)} total hours</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Notes */}
              {vehicle.notes && (
                <section className="detail-card notes-panel">
                  <div className="card-header">
                    <h3><FileText size={20} /> Notes</h3>
                    <button className="btn btn-sm btn-secondary">
                      <Edit3 size={14} />
                      Edit
                    </button>
                  </div>
                  <div className="card-content">
                    <p>{vehicle.notes}</p>
                  </div>
                </section>
              )}
            </div>
          </div>
        )}

        {/* MAINTENANCE TAB */}
        {activeTab === 'maintenance' && (
          <div className="maintenance-tab">
            <div className="tab-header">
              <div className="tab-title">
                <h2>Maintenance History</h2>
                <p>{maintenanceRecords.length} records</p>
              </div>
              <div className="tab-actions">
                <button className="btn btn-secondary">
                  <Download size={18} />
                  Export
                </button>
                <button className="btn btn-primary">
                  <Plus size={18} />
                  Schedule Service
                </button>
              </div>
            </div>

            <div className="maintenance-timeline">
              {maintenanceRecords.map((record, index) => (
                <div key={record.id} className={`timeline-item ${record.status}`}>
                  <div className="timeline-marker">
                    {record.status === 'completed' ? (
                      <CheckCircle size={20} />
                    ) : record.status === 'scheduled' ? (
                      <Calendar size={20} />
                    ) : (
                      <Clock size={20} />
                    )}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <div className="timeline-title">
                        <h4>{record.type}</h4>
                        {getStatusBadge(record.status)}
                      </div>
                      <span className="timeline-date">{formatDate(record.date)}</span>
                    </div>
                    <p className="timeline-description">{record.description}</p>
                    <div className="timeline-details">
                      <span><Gauge size={14} /> {formatNumber(record.hours)} hrs</span>
                      <span><DollarSign size={14} /> {formatCurrency(record.cost)}</span>
                      <span><Building2 size={14} /> {record.vendor}</span>
                      <span><User size={14} /> {record.technician}</span>
                      <span><Hash size={14} /> {record.workOrder}</span>
                    </div>
                    {record.parts.length > 0 && (
                      <div className="timeline-parts">
                        <span className="parts-label">Parts:</span>
                        {record.parts.map((part, i) => (
                          <span key={i} className="part-tag">{part}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {index < maintenanceRecords.length - 1 && <div className="timeline-connector" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FUEL TAB */}
        {activeTab === 'fuel' && (
          <div className="fuel-tab">
            <div className="tab-header">
              <div className="tab-title">
                <h2>Fuel Transactions</h2>
                <p>Avg efficiency: {vehicle.avgFuelEfficiency} gal/hr</p>
              </div>
              <div className="tab-actions">
                <button className="btn btn-secondary">
                  <Download size={18} />
                  Export
                </button>
              </div>
            </div>

            <div className="fuel-summary-cards">
              <div className="summary-card">
                <Fuel size={24} />
                <div className="summary-content">
                  <span className="summary-value">{formatNumber(fuelTransactions.reduce((sum, t) => sum + t.gallons, 0))}</span>
                  <span className="summary-label">Total Gallons (30 days)</span>
                </div>
              </div>
              <div className="summary-card">
                <DollarSign size={24} />
                <div className="summary-content">
                  <span className="summary-value">{formatCurrency(fuelTransactions.reduce((sum, t) => sum + t.totalCost, 0))}</span>
                  <span className="summary-label">Total Cost (30 days)</span>
                </div>
              </div>
              <div className="summary-card">
                <TrendingUp size={24} />
                <div className="summary-content">
                  <span className="summary-value">{(fuelTransactions.reduce((sum, t) => sum + t.mpg, 0) / fuelTransactions.length).toFixed(1)}</span>
                  <span className="summary-label">Avg gal/hr</span>
                </div>
              </div>
              <div className="summary-card warning">
                <AlertTriangle size={24} />
                <div className="summary-content">
                  <span className="summary-value">{fuelTransactions.filter(t => t.isAnomaly).length}</span>
                  <span className="summary-label">Anomalies</span>
                </div>
              </div>
            </div>

            <div className="fuel-transactions-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Gallons</th>
                    <th>Price/Gal</th>
                    <th>Total</th>
                    <th>gal/hr</th>
                    <th>Location</th>
                    <th>Driver</th>
                    <th>Card</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {fuelTransactions.map(txn => (
                    <tr key={txn.id} className={txn.isAnomaly ? 'anomaly' : ''}>
                      <td>{formatDate(txn.date)}</td>
                      <td>{txn.gallons.toFixed(1)}</td>
                      <td>${txn.pricePerGallon.toFixed(2)}</td>
                      <td className="amount">{formatCurrency(txn.totalCost)}</td>
                      <td>{txn.mpg.toFixed(1)}</td>
                      <td className="location">{txn.location}</td>
                      <td>{txn.driver}</td>
                      <td><CreditCard size={14} /> {txn.cardNumber}</td>
                      <td>
                        {txn.isAnomaly && (
                          <span className="anomaly-indicator" title="Anomaly Detected">
                            <AlertTriangle size={16} />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* INSPECTIONS TAB */}
        {activeTab === 'inspections' && (
          <div className="inspections-tab">
            <div className="tab-header">
              <div className="tab-title">
                <h2>Inspection Records</h2>
                <p>{inspections.length} inspections on file</p>
              </div>
              <div className="tab-actions">
                <button className="btn btn-primary">
                  <Plus size={18} />
                  Record Inspection
                </button>
              </div>
            </div>

            <div className="inspections-list">
              {inspections.map(inspection => (
                <div key={inspection.id} className="inspection-card">
                  <div className="inspection-header">
                    <div className="inspection-title">
                      <h4>{inspection.type}</h4>
                      {getStatusBadge(inspection.result)}
                    </div>
                    <div className="inspection-meta">
                      <span className="inspection-date">{formatDate(inspection.date)}</span>
                      <span className="inspector"><User size={14} /> {inspection.inspector}</span>
                    </div>
                  </div>
                  <div className="inspection-items">
                    {inspection.items.map((item, i) => (
                      <div key={i} className={`inspection-item ${item.status}`}>
                        {item.status === 'pass' ? (
                          <CheckCircle size={16} />
                        ) : item.status === 'fail' ? (
                          <XCircle size={16} />
                        ) : (
                          <AlertTriangle size={16} />
                        )}
                        <span className="item-name">{item.item}</span>
                        {item.notes && <span className="item-notes">{item.notes}</span>}
                      </div>
                    ))}
                  </div>
                  {inspection.notes && (
                    <div className="inspection-notes">
                      <strong>Notes:</strong> {inspection.notes}
                    </div>
                  )}
                  <div className="inspection-footer">
                    <span className="next-due">
                      <Calendar size={14} />
                      Next Due: {inspection.nextDue}
                    </span>
                    <button className="btn btn-sm btn-secondary">
                      <Eye size={14} />
                      View Full Report
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* COSTS TAB */}
        {activeTab === 'costs' && (
          <div className="costs-tab">
            <div className="tab-header">
              <div className="tab-title">
                <h2>Cost Analysis</h2>
                <p>Total lifetime cost: {formatCurrency(vehicle.totalCostToDate)}</p>
              </div>
              <div className="tab-actions">
                <button className="btn btn-secondary">
                  <Download size={18} />
                  Export Report
                </button>
              </div>
            </div>

            <div className="cost-breakdown-chart">
              {costSummary.map(cost => (
                <div key={cost.category} className="cost-bar-item">
                  <div className="cost-bar-header">
                    <span className="cost-category">{cost.category}</span>
                    <span className="cost-amount">{formatCurrency(cost.amount)}</span>
                  </div>
                  <div className="cost-bar">
                    <div
                      className="cost-bar-fill"
                      style={{ width: `${cost.percentage}%` }}
                    />
                  </div>
                  <div className="cost-bar-footer">
                    <span className="cost-percentage">{cost.percentage.toFixed(1)}%</span>
                    <span className={`cost-trend ${cost.trend < 0 ? 'positive' : cost.trend > 0 ? 'negative' : ''}`}>
                      {cost.trend < 0 ? <TrendingDown size={14} /> : cost.trend > 0 ? <TrendingUp size={14} /> : null}
                      {cost.trend !== 0 && `${Math.abs(cost.trend).toFixed(1)}%`}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="cost-metrics-grid">
              <div className="cost-metric">
                <span className="metric-label">Cost per Hour</span>
                <span className="metric-value">{formatCurrency(vehicle.totalCostToDate / vehicle.engineHours)}</span>
              </div>
              <div className="cost-metric">
                <span className="metric-label">Monthly Average</span>
                <span className="metric-value">{formatCurrency(vehicle.totalCostToDate / 22)}</span>
              </div>
              <div className="cost-metric">
                <span className="metric-label">Maintenance Ratio</span>
                <span className="metric-value">{((costSummary.find(c => c.category === 'Maintenance')?.amount || 0) / vehicle.totalCostToDate * 100).toFixed(1)}%</span>
              </div>
              <div className="cost-metric">
                <span className="metric-label">Fuel Ratio</span>
                <span className="metric-value">{((costSummary.find(c => c.category === 'Fuel')?.amount || 0) / vehicle.totalCostToDate * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* DOCUMENTS TAB */}
        {activeTab === 'documents' && (
          <div className="documents-tab">
            <div className="tab-header">
              <div className="tab-title">
                <h2>Documents</h2>
                <p>{documents.length} files</p>
              </div>
              <div className="tab-actions">
                <button className="btn btn-primary">
                  <Plus size={18} />
                  Upload Document
                </button>
              </div>
            </div>

            <div className="documents-grid">
              {documents.map(doc => (
                <div key={doc.id} className="document-card">
                  <div className="document-icon">
                    <FileText size={32} />
                  </div>
                  <div className="document-info">
                    <span className="document-name">{doc.name}</span>
                    <span className="document-meta">
                      {doc.type} • {doc.size} • {formatDate(doc.uploadDate)}
                    </span>
                  </div>
                  <div className="document-actions">
                    <button className="btn btn-icon" title="View">
                      <Eye size={16} />
                    </button>
                    <button className="btn btn-icon" title="Download">
                      <Download size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="history-tab">
            <div className="tab-header">
              <div className="tab-title">
                <h2>Assignment History</h2>
                <p>{assignments.length} assignments</p>
              </div>
            </div>

            <div className="assignment-timeline">
              {assignments.map((assignment, index) => (
                <div key={assignment.id} className={`assignment-item ${!assignment.endDate ? 'current' : ''}`}>
                  <div className="assignment-marker">
                    {!assignment.endDate ? (
                      <Star size={20} />
                    ) : (
                      <Building2 size={20} />
                    )}
                  </div>
                  <div className="assignment-content">
                    <div className="assignment-header">
                      <div className="assignment-project">
                        <span className="project-number">{assignment.projectNumber}</span>
                        <span className="project-name">{assignment.project}</span>
                      </div>
                      {!assignment.endDate && <span className="current-badge">Current</span>}
                    </div>
                    <div className="assignment-dates">
                      {formatDate(assignment.startDate)} - {assignment.endDate ? formatDate(assignment.endDate) : 'Present'}
                    </div>
                    <div className="assignment-details">
                      <span><User size={14} /> {assignment.driver}</span>
                      <span><Clock size={14} /> {formatNumber(assignment.hours)} hours</span>
                      <span><DollarSign size={14} /> {formatCurrency(assignment.cost)}</span>
                    </div>
                  </div>
                  {index < assignments.length - 1 && <div className="assignment-connector" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default EnhancedVehicleDetails;
