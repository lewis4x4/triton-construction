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
} from 'lucide-react';
import './SelfPerformDashboard.css';

interface Project {
  id: string;
  name: string;
  contract_number: string;
}

interface CostCodeSummary {
  cost_code_id: string;
  project_name: string;
  contract_number: string;
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
  labor_pct: number;
  equipment_pct: number;
  material_pct: number;
}

interface DailySummary {
  project_id: string;
  project_name: string;
  work_date: string;
  labor_entries: number;
  labor_hours: number;
  labor_cost: number;
  equipment_entries: number;
  equipment_hours: number;
  equipment_cost: number;
  material_entries: number;
  material_cost: number;
  total_daily_cost: number;
}

export function SelfPerformDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [costCodes, setCostCodes] = useState<CostCodeSummary[]>([]);
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  // Totals
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

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadCostData();
    }
  }, [selectedProject, dateRange]);

  async function loadProjects() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', userData.user.id)
      .single();

    if (!profile) return;

    const { data, error } = await supabase
      .from('projects')
      .select('id, name, contract_number')
      .eq('organization_id', profile.organization_id)
      .in('status', ['ACTIVE', 'MOBILIZATION', 'SUBSTANTIAL_COMPLETION'])
      .order('name');

    if (!error && data) {
      setProjects(data as any);
      if (data.length > 0 && !selectedProject && data[0]) {
        setSelectedProject(data[0].id);
      }
    }
    setLoading(false);
  }

  async function loadCostData() {
    setLoading(true);

    // Load cost code summaries
    const { data: ccData } = await supabase
      .from('v_self_perform_summary')
      .select('*')
      .eq('project_id', selectedProject);

    if (ccData) {
      setCostCodes(ccData as any);
    }

    // Load daily summaries
    const { data: dailyData } = await supabase
      .from('v_daily_cost_summary')
      .select('*')
      .eq('project_id', selectedProject)
      .gte('work_date', dateRange.start)
      .lte('work_date', dateRange.end)
      .order('work_date', { ascending: false });

    if (dailyData) {
      setDailySummaries(dailyData as any);
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

  return (
    <div className="self-perform-dashboard">
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
          <button className="btn-primary">
            <Plus size={18} />
            Add Entry
          </button>
        </div>
      </div>

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
                : '0%'}
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
                : '0%'}
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
                : '0%'}
            </span>
          </div>
        </div>

        <div className="summary-card">
          <div className={`card-icon ${overallVariance > 0 ? 'over' : 'under'}`}>
            {overallVariance > 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
          </div>
          <div className="card-content">
            <span className="card-label">Cost Variance</span>
            <span className={`card-value ${overallVariance > 0 ? 'negative' : 'positive'}`}>
              {overallVariance > 0 ? '+' : ''}{overallVariance.toFixed(1)}%
            </span>
            <span className="card-detail">
              {formatCurrency(totals.actualTotal)} of {formatCurrency(totals.bidTotal)}
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
                  <td colSpan={8} className="empty">No cost codes found</td>
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
          <span className="count">Last {dailySummaries.length} days</span>
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
                <th className="right">Total</th>
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
          </table>
        </div>
      </div>
    </div>
  );
}
