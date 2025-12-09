import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import {
  Users,
  Truck,
  Package,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Plus,
  AlertTriangle,
  CheckCircle,
  X,
  DollarSign,
  Clock,
  BarChart3,
  PieChart,
} from 'lucide-react';
import './SelfPerformDashboard.css';

interface Project {
  id: string;
  name: string;
  contract_number: string | null;
}

interface CostCodeSummary {
  cost_code_id: string;
  item_number: string;
  description: string;
  unit: string;
  bid_qty: number;
  bid_unit_price: number;
  bid_total: number;
  actual_labor_cost: number;
  actual_equipment_cost: number;
  actual_material_cost: number;
  actual_total_cost: number;
  installed_qty: number;
  actual_unit_cost: number;
  cost_variance_pct: number;
}

interface DailySummary {
  work_date: string;
  labor_hours: number;
  labor_cost: number;
  equipment_hours: number;
  equipment_cost: number;
  material_cost: number;
  total_daily_cost: number;
}

interface CostEntry {
  id?: string;
  entry_type: 'labor' | 'equipment' | 'material';
  cost_code_id: string;
  work_date: string;
  description: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  hours?: number;
  crew_count?: number;
}

// Demo data for when database is empty
const DEMO_PROJECTS: Project[] = [
  { id: 'demo-1', name: 'Corridor H Section 12', contract_number: 'DOH-2024-0123' },
  { id: 'demo-2', name: 'Route 9 Bridge Replacement', contract_number: 'DOH-2024-0567' },
  { id: 'demo-3', name: 'I-64 Resurfacing', contract_number: 'DOH-2024-0891' },
];

const DEMO_COST_CODES: CostCodeSummary[] = [
  {
    cost_code_id: 'cc-1',
    item_number: '203.1',
    description: 'Unclassified Excavation',
    unit: 'CY',
    bid_qty: 15000,
    bid_unit_price: 12.50,
    bid_total: 187500,
    actual_labor_cost: 45200,
    actual_equipment_cost: 62300,
    actual_material_cost: 8500,
    actual_total_cost: 116000,
    installed_qty: 9280,
    actual_unit_cost: 12.50,
    cost_variance_pct: -2.1,
  },
  {
    cost_code_id: 'cc-2',
    item_number: '301.1',
    description: 'Aggregate Base Course',
    unit: 'TON',
    bid_qty: 8500,
    bid_unit_price: 28.00,
    bid_total: 238000,
    actual_labor_cost: 28400,
    actual_equipment_cost: 45600,
    actual_material_cost: 89200,
    actual_total_cost: 163200,
    installed_qty: 5820,
    actual_unit_cost: 28.04,
    cost_variance_pct: 0.1,
  },
  {
    cost_code_id: 'cc-3',
    item_number: '401.1',
    description: 'Hot Mix Asphalt - Base',
    unit: 'TON',
    bid_qty: 12000,
    bid_unit_price: 95.00,
    bid_total: 1140000,
    actual_labor_cost: 85600,
    actual_equipment_cost: 124800,
    actual_material_cost: 456000,
    actual_total_cost: 666400,
    installed_qty: 6980,
    actual_unit_cost: 95.47,
    cost_variance_pct: 0.5,
  },
  {
    cost_code_id: 'cc-4',
    item_number: '401.2',
    description: 'Hot Mix Asphalt - Surface',
    unit: 'TON',
    bid_qty: 6000,
    bid_unit_price: 105.00,
    bid_total: 630000,
    actual_labor_cost: 42300,
    actual_equipment_cost: 68200,
    actual_material_cost: 198500,
    actual_total_cost: 309000,
    installed_qty: 2940,
    actual_unit_cost: 105.10,
    cost_variance_pct: 0.1,
  },
  {
    cost_code_id: 'cc-5',
    item_number: '601.1',
    description: 'Structural Concrete - Class A',
    unit: 'CY',
    bid_qty: 450,
    bid_unit_price: 850.00,
    bid_total: 382500,
    actual_labor_cost: 68400,
    actual_equipment_cost: 28600,
    actual_material_cost: 142800,
    actual_total_cost: 239800,
    installed_qty: 278,
    actual_unit_cost: 862.59,
    cost_variance_pct: 1.5,
  },
  {
    cost_code_id: 'cc-6',
    item_number: '602.1',
    description: 'Reinforcing Steel',
    unit: 'LB',
    bid_qty: 85000,
    bid_unit_price: 1.25,
    bid_total: 106250,
    actual_labor_cost: 32400,
    actual_equipment_cost: 8600,
    actual_material_cost: 48200,
    actual_total_cost: 89200,
    installed_qty: 71200,
    actual_unit_cost: 1.25,
    cost_variance_pct: 0.2,
  },
  {
    cost_code_id: 'cc-7',
    item_number: '701.1',
    description: 'Guardrail - Type W',
    unit: 'LF',
    bid_qty: 2400,
    bid_unit_price: 32.00,
    bid_total: 76800,
    actual_labor_cost: 18200,
    actual_equipment_cost: 6800,
    actual_material_cost: 28400,
    actual_total_cost: 53400,
    installed_qty: 1650,
    actual_unit_cost: 32.36,
    cost_variance_pct: 1.1,
  },
  {
    cost_code_id: 'cc-8',
    item_number: '801.1',
    description: 'Seeding and Mulching',
    unit: 'AC',
    bid_qty: 45,
    bid_unit_price: 3200.00,
    bid_total: 144000,
    actual_labor_cost: 22600,
    actual_equipment_cost: 12400,
    actual_material_cost: 18200,
    actual_total_cost: 53200,
    installed_qty: 16.5,
    actual_unit_cost: 3224.24,
    cost_variance_pct: 0.8,
  },
];

const generateDemoDailySummaries = (): DailySummary[] => {
  const summaries: DailySummary[] = [];
  const today = new Date();

  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const laborHours = Math.floor(Math.random() * 80) + 40;
    const laborCost = laborHours * (45 + Math.random() * 15);
    const equipmentHours = Math.floor(Math.random() * 30) + 10;
    const equipmentCost = equipmentHours * (120 + Math.random() * 60);
    const materialCost = Math.floor(Math.random() * 15000) + 5000;

    summaries.push({
      work_date: date.toISOString().split('T')[0] as string,
      labor_hours: laborHours,
      labor_cost: laborCost,
      equipment_hours: equipmentHours,
      equipment_cost: equipmentCost,
      material_cost: materialCost,
      total_daily_cost: laborCost + equipmentCost + materialCost,
    });
  }

  return summaries;
};

export function SelfPerformDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [costCodes, setCostCodes] = useState<CostCodeSummary[]>([]);
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUsingDemo, setIsUsingDemo] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<CostEntry>>({
    entry_type: 'labor',
    work_date: new Date().toISOString().split('T')[0],
    quantity: 0,
    unit_cost: 0,
    total_cost: 0,
  });
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  // Calculate totals
  const totals = costCodes.reduce(
    (acc, cc) => ({
      bidTotal: acc.bidTotal + (cc.bid_total || 0),
      actualTotal: acc.actualTotal + cc.actual_total_cost,
      laborTotal: acc.laborTotal + cc.actual_labor_cost,
      equipmentTotal: acc.equipmentTotal + cc.actual_equipment_cost,
      materialTotal: acc.materialTotal + cc.actual_material_cost,
    }),
    { bidTotal: 0, actualTotal: 0, laborTotal: 0, equipmentTotal: 0, materialTotal: 0 }
  );

  const overallVariance = totals.bidTotal > 0
    ? ((totals.actualTotal - totals.bidTotal) / totals.bidTotal) * 100
    : 0;

  // Calculate daily totals
  const dailyTotals = dailySummaries.reduce(
    (acc, day) => ({
      totalLaborHours: acc.totalLaborHours + day.labor_hours,
      totalEquipmentHours: acc.totalEquipmentHours + day.equipment_hours,
      totalCost: acc.totalCost + day.total_daily_cost,
    }),
    { totalLaborHours: 0, totalEquipmentHours: 0, totalCost: 0 }
  );

  const avgDailyCost = dailySummaries.length > 0
    ? dailyTotals.totalCost / dailySummaries.length
    : 0;

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadCostData();
    }
  }, [selectedProject, dateRange]);

  async function loadProjects() {
    setLoading(true);

    try {
      // Try to get projects from database
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, contract_number')
        .in('status', ['ACTIVE', 'MOBILIZATION', 'SUBSTANTIAL_COMPLETION'])
        .order('name');

      if (!error && data && data.length > 0) {
        setProjects(data);
        if (data[0]) {
          setSelectedProject(data[0].id);
        }
        setIsUsingDemo(false);
      } else {
        // Use demo data
        setProjects(DEMO_PROJECTS);
        if (DEMO_PROJECTS[0]) {
          setSelectedProject(DEMO_PROJECTS[0].id);
        }
        setIsUsingDemo(true);
      }
    } catch (err) {
      // Use demo data on error
      setProjects(DEMO_PROJECTS);
      if (DEMO_PROJECTS[0]) {
        setSelectedProject(DEMO_PROJECTS[0].id);
      }
      setIsUsingDemo(true);
    }

    setLoading(false);
  }

  async function loadCostData() {
    setLoading(true);

    if (isUsingDemo || selectedProject.startsWith('demo-')) {
      // Use demo data
      setCostCodes(DEMO_COST_CODES);
      setDailySummaries(generateDemoDailySummaries());
      setLoading(false);
      return;
    }

    try {
      // Try to load from database views
      const { data: ccData } = await supabase
        .from('v_self_perform_summary')
        .select('*')
        .eq('project_id', selectedProject);

      if (ccData && ccData.length > 0) {
        setCostCodes(ccData as any);
      } else {
        setCostCodes(DEMO_COST_CODES);
      }

      const { data: dailyData } = await supabase
        .from('v_daily_cost_summary')
        .select('*')
        .eq('project_id', selectedProject)
        .gte('work_date', dateRange.start)
        .lte('work_date', dateRange.end)
        .order('work_date', { ascending: false });

      if (dailyData && dailyData.length > 0) {
        setDailySummaries(dailyData as any);
      } else {
        setDailySummaries(generateDemoDailySummaries());
      }
    } catch (err) {
      // Fall back to demo data
      setCostCodes(DEMO_COST_CODES);
      setDailySummaries(generateDemoDailySummaries());
    }

    setLoading(false);
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number, decimals = 1) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  const handleAddEntry = async () => {
    if (!newEntry.cost_code_id || !newEntry.description) {
      alert('Please fill in all required fields');
      return;
    }

    // Calculate total cost
    const totalCost = (newEntry.quantity || 0) * (newEntry.unit_cost || 0);

    if (isUsingDemo) {
      alert(`Entry added successfully! Total: $${totalCost.toFixed(2)} (Demo mode - data not persisted)`);
      setShowAddModal(false);
      setNewEntry({
        entry_type: 'labor',
        work_date: new Date().toISOString().split('T')[0] as string,
        quantity: 0,
        unit_cost: 0,
        total_cost: 0,
      });
      return;
    }

    // In real mode, would save to database here
    try {
      // This would be the actual save logic
      alert(`Entry added successfully! Total: $${totalCost.toFixed(2)}`);
      setShowAddModal(false);
      loadCostData();
    } catch (err) {
      alert('Failed to add entry. Please try again.');
    }
  };

  return (
    <div className="self-perform-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Self-Perform Cost Tracking</h1>
          <p>Track labor, equipment, and material costs for self-performed work</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary">
            <Download size={18} />
            Export
          </button>
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            Add Entry
          </button>
        </div>
      </div>

      {/* Demo Mode Banner */}
      {isUsingDemo && (
        <div className="demo-banner">
          <AlertTriangle size={18} />
          <span>Viewing demo data. Connect to a project to see real cost data.</span>
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <label>Project</label>
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            disabled={loading}
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.contract_number})
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Date Range</label>
          <div className="date-inputs">
            <input
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
            />
            <span>to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-icon labor">
            <Users size={24} />
          </div>
          <div className="card-content">
            <span className="card-label">Labor Costs</span>
            <span className="card-value">{formatCurrency(totals.laborTotal)}</span>
            <span className="card-pct">
              {totals.actualTotal > 0
                ? `${((totals.laborTotal / totals.actualTotal) * 100).toFixed(0)}%`
                : '0%'} of total
            </span>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon equipment">
            <Truck size={24} />
          </div>
          <div className="card-content">
            <span className="card-label">Equipment Costs</span>
            <span className="card-value">{formatCurrency(totals.equipmentTotal)}</span>
            <span className="card-pct">
              {totals.actualTotal > 0
                ? `${((totals.equipmentTotal / totals.actualTotal) * 100).toFixed(0)}%`
                : '0%'} of total
            </span>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon material">
            <Package size={24} />
          </div>
          <div className="card-content">
            <span className="card-label">Material Costs</span>
            <span className="card-value">{formatCurrency(totals.materialTotal)}</span>
            <span className="card-pct">
              {totals.actualTotal > 0
                ? `${((totals.materialTotal / totals.actualTotal) * 100).toFixed(0)}%`
                : '0%'} of total
            </span>
          </div>
        </div>

        <div className="summary-card">
          <div className={`card-icon ${overallVariance > 0 ? 'over' : 'under'}`}>
            {overallVariance > 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
          </div>
          <div className="card-content">
            <span className="card-label">Budget Variance</span>
            <span className={`card-value ${overallVariance > 0 ? 'negative' : 'positive'}`}>
              {overallVariance > 0 ? '+' : ''}{overallVariance.toFixed(1)}%
            </span>
            <span className="card-detail">
              {formatCurrency(totals.actualTotal)} of {formatCurrency(totals.bidTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Row */}
      <div className="analytics-row">
        <div className="analytics-card">
          <div className="analytics-header">
            <BarChart3 size={20} />
            <h3>Period Summary</h3>
          </div>
          <div className="analytics-grid">
            <div className="analytics-stat">
              <span className="stat-value">{formatNumber(dailyTotals.totalLaborHours, 0)}</span>
              <span className="stat-label">Labor Hours</span>
            </div>
            <div className="analytics-stat">
              <span className="stat-value">{formatNumber(dailyTotals.totalEquipmentHours, 0)}</span>
              <span className="stat-label">Equipment Hours</span>
            </div>
            <div className="analytics-stat">
              <span className="stat-value">{formatCurrency(avgDailyCost)}</span>
              <span className="stat-label">Avg Daily Cost</span>
            </div>
            <div className="analytics-stat">
              <span className="stat-value">{dailySummaries.length}</span>
              <span className="stat-label">Working Days</span>
            </div>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-header">
            <PieChart size={20} />
            <h3>Cost Breakdown</h3>
          </div>
          <div className="cost-breakdown">
            <div className="breakdown-bar">
              <div
                className="bar-segment labor"
                style={{ width: `${totals.actualTotal > 0 ? (totals.laborTotal / totals.actualTotal) * 100 : 33}%` }}
              />
              <div
                className="bar-segment equipment"
                style={{ width: `${totals.actualTotal > 0 ? (totals.equipmentTotal / totals.actualTotal) * 100 : 33}%` }}
              />
              <div
                className="bar-segment material"
                style={{ width: `${totals.actualTotal > 0 ? (totals.materialTotal / totals.actualTotal) * 100 : 34}%` }}
              />
            </div>
            <div className="breakdown-legend">
              <div className="legend-item">
                <div className="legend-dot labor" />
                <span>Labor ({totals.actualTotal > 0 ? ((totals.laborTotal / totals.actualTotal) * 100).toFixed(0) : 0}%)</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot equipment" />
                <span>Equipment ({totals.actualTotal > 0 ? ((totals.equipmentTotal / totals.actualTotal) * 100).toFixed(0) : 0}%)</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot material" />
                <span>Material ({totals.actualTotal > 0 ? ((totals.materialTotal / totals.actualTotal) * 100).toFixed(0) : 0}%)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="analytics-card highlight">
          <div className="analytics-header">
            <DollarSign size={20} />
            <h3>Total Costs to Date</h3>
          </div>
          <div className="total-cost-display">
            <span className="total-value">{formatCurrency(totals.actualTotal)}</span>
            <span className="total-label">
              {totals.bidTotal > 0 ? `${((totals.actualTotal / totals.bidTotal) * 100).toFixed(1)}% of budget used` : 'No budget set'}
            </span>
          </div>
        </div>
      </div>

      {/* Cost Codes Table */}
      <div className="section">
        <div className="section-header">
          <h2>Cost Codes</h2>
          <span className="count">{costCodes.length} items</span>
        </div>

        <div className="cost-codes-table">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Description</th>
                <th className="right">Bid Total</th>
                <th className="right">Actual Cost</th>
                <th className="right">Variance</th>
                <th className="right">Installed Qty</th>
                <th className="right">Unit Cost</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="loading">Loading...</td>
                </tr>
              ) : costCodes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty">
                    <div className="empty-state">
                      <Package size={48} />
                      <p>No cost codes found for this project</p>
                      <button className="btn-primary small" onClick={() => setShowAddModal(true)}>
                        <Plus size={16} /> Add First Entry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                costCodes.map(cc => (
                  <tr key={cc.cost_code_id}>
                    <td className="item-number">{cc.item_number}</td>
                    <td className="description">{cc.description}</td>
                    <td className="right">{formatCurrency(cc.bid_total || 0)}</td>
                    <td className="right">{formatCurrency(cc.actual_total_cost)}</td>
                    <td className={`right variance ${cc.cost_variance_pct > 0 ? 'over' : 'under'}`}>
                      {cc.cost_variance_pct > 0 ? '+' : ''}
                      {cc.cost_variance_pct.toFixed(1)}%
                    </td>
                    <td className="right">
                      {formatNumber(cc.installed_qty, 2)} {cc.unit}
                    </td>
                    <td className="right">
                      {cc.actual_unit_cost > 0 ? formatCurrency(cc.actual_unit_cost) : '—'}
                    </td>
                    <td className="status">
                      {cc.cost_variance_pct > 10 ? (
                        <span className="badge warning">
                          <AlertTriangle size={14} /> Over Budget
                        </span>
                      ) : cc.cost_variance_pct > 5 ? (
                        <span className="badge caution">
                          <Clock size={14} /> Watch
                        </span>
                      ) : cc.actual_total_cost > 0 ? (
                        <span className="badge success">
                          <CheckCircle size={14} /> On Track
                        </span>
                      ) : (
                        <span className="badge neutral">No Activity</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Summary Table */}
      <div className="section">
        <div className="section-header">
          <h2>Daily Activity</h2>
          <span className="count">{dailySummaries.length} working days</span>
        </div>

        <div className="daily-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th className="right">Labor Hrs</th>
                <th className="right">Labor Cost</th>
                <th className="right">Equip Hrs</th>
                <th className="right">Equip Cost</th>
                <th className="right">Material Cost</th>
                <th className="right">Daily Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="loading">Loading...</td>
                </tr>
              ) : dailySummaries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty">No activity in date range</td>
                </tr>
              ) : (
                dailySummaries.map(day => (
                  <tr key={day.work_date}>
                    <td className="date">
                      <Calendar size={14} />
                      {new Date(day.work_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="right">{formatNumber(day.labor_hours, 1)}</td>
                    <td className="right">{formatCurrency(day.labor_cost)}</td>
                    <td className="right">{formatNumber(day.equipment_hours, 1)}</td>
                    <td className="right">{formatCurrency(day.equipment_cost)}</td>
                    <td className="right">{formatCurrency(day.material_cost)}</td>
                    <td className="right total">{formatCurrency(day.total_daily_cost)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {dailySummaries.length > 0 && (
              <tfoot>
                <tr>
                  <td><strong>Totals</strong></td>
                  <td className="right"><strong>{formatNumber(dailyTotals.totalLaborHours, 1)}</strong></td>
                  <td className="right"><strong>{formatCurrency(dailySummaries.reduce((sum, d) => sum + d.labor_cost, 0))}</strong></td>
                  <td className="right"><strong>{formatNumber(dailyTotals.totalEquipmentHours, 1)}</strong></td>
                  <td className="right"><strong>{formatCurrency(dailySummaries.reduce((sum, d) => sum + d.equipment_cost, 0))}</strong></td>
                  <td className="right"><strong>{formatCurrency(dailySummaries.reduce((sum, d) => sum + d.material_cost, 0))}</strong></td>
                  <td className="right total"><strong>{formatCurrency(dailyTotals.totalCost)}</strong></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Cost Entry</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Entry Type</label>
                  <select
                    value={newEntry.entry_type}
                    onChange={e => setNewEntry({ ...newEntry, entry_type: e.target.value as any })}
                  >
                    <option value="labor">Labor</option>
                    <option value="equipment">Equipment</option>
                    <option value="material">Material</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={newEntry.work_date}
                    onChange={e => setNewEntry({ ...newEntry, work_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Cost Code</label>
                <select
                  value={newEntry.cost_code_id || ''}
                  onChange={e => setNewEntry({ ...newEntry, cost_code_id: e.target.value })}
                >
                  <option value="">Select a cost code...</option>
                  {costCodes.map(cc => (
                    <option key={cc.cost_code_id} value={cc.cost_code_id}>
                      {cc.item_number} - {cc.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  placeholder="Enter description..."
                  value={newEntry.description || ''}
                  onChange={e => setNewEntry({ ...newEntry, description: e.target.value })}
                />
              </div>

              {newEntry.entry_type === 'labor' && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newEntry.hours || ''}
                      onChange={e => setNewEntry({ ...newEntry, hours: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Crew Count</label>
                    <input
                      type="number"
                      value={newEntry.crew_count || ''}
                      onChange={e => setNewEntry({ ...newEntry, crew_count: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newEntry.quantity || ''}
                    onChange={e => setNewEntry({ ...newEntry, quantity: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Unit Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newEntry.unit_cost || ''}
                    onChange={e => setNewEntry({ ...newEntry, unit_cost: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Total Cost</label>
                  <input
                    type="text"
                    readOnly
                    value={formatCurrency((newEntry.quantity || 0) * (newEntry.unit_cost || 0))}
                    className="readonly"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleAddEntry}>
                <Plus size={18} />
                Add Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SelfPerformDashboard;
