import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import {
  Layers,
  Link2,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  AlertTriangle,
  Zap,
  Package,
  DollarSign,
  Settings,
  RefreshCw,
  Download,
  Plus,
  Edit2,
} from 'lucide-react';
import './CostCodeManagement.css';

interface AssemblyTemplate {
  id: string;
  name: string;
  code: string;
  description: string;
  wvdoh_item_number: string | null;
  work_category: string;
  output_unit: string;
  total_labor_cost_per_unit: number;
  total_equipment_cost_per_unit: number;
  total_material_cost_per_unit: number;
  total_sub_cost_per_unit: number;
  total_cost_per_unit: number;
  times_used: number;
  is_active: boolean;
}

interface WVDOHItem {
  item_code: string;
  description: string;
  short_description: string;
  unit_of_measure: string;
  division: string;
  work_category: string;
  typical_unit_price_median: number;
  default_assembly_template_id: string | null;
}

interface WorkCategory {
  name: string;
  count: number;
  linkedCount: number;
}

// Demo data
const DEMO_TEMPLATES: AssemblyTemplate[] = [
  {
    id: 't1',
    name: 'Roadway Excavation - Self Perform',
    code: 'EXCV-RW-01',
    description: 'Standard roadway excavation with on-site haul',
    wvdoh_item_number: '203101',
    work_category: 'EARTHWORK',
    output_unit: 'CY',
    total_labor_cost_per_unit: 2.92,
    total_equipment_cost_per_unit: 6.36,
    total_material_cost_per_unit: 0,
    total_sub_cost_per_unit: 0,
    total_cost_per_unit: 9.43,
    times_used: 12,
    is_active: true,
  },
  {
    id: 't2',
    name: 'Aggregate Base Course',
    code: 'BASE-AGG-01',
    description: 'Crushed aggregate base placement and compaction',
    wvdoh_item_number: '301001',
    work_category: 'BASE',
    output_unit: 'TON',
    total_labor_cost_per_unit: 3.50,
    total_equipment_cost_per_unit: 5.20,
    total_material_cost_per_unit: 18.00,
    total_sub_cost_per_unit: 0,
    total_cost_per_unit: 26.70,
    times_used: 8,
    is_active: true,
  },
  {
    id: 't3',
    name: 'HMA Surface Course',
    code: 'PAV-HMA-01',
    description: 'Superpave hot mix asphalt surface course',
    wvdoh_item_number: '401001',
    work_category: 'PAVING',
    output_unit: 'TON',
    total_labor_cost_per_unit: 8.40,
    total_equipment_cost_per_unit: 12.60,
    total_material_cost_per_unit: 72.00,
    total_sub_cost_per_unit: 0,
    total_cost_per_unit: 93.00,
    times_used: 15,
    is_active: true,
  },
  {
    id: 't4',
    name: '18" RCP Pipe',
    code: 'DRN-RCP-18',
    description: 'Reinforced concrete pipe 18" diameter',
    wvdoh_item_number: '601018',
    work_category: 'DRAINAGE',
    output_unit: 'LF',
    total_labor_cost_per_unit: 12.00,
    total_equipment_cost_per_unit: 8.50,
    total_material_cost_per_unit: 32.00,
    total_sub_cost_per_unit: 0,
    total_cost_per_unit: 52.50,
    times_used: 6,
    is_active: true,
  },
  {
    id: 't5',
    name: 'Type 3 Inlet',
    code: 'DRN-INL-03',
    description: 'Standard type 3 drainage inlet',
    wvdoh_item_number: '602003',
    work_category: 'DRAINAGE',
    output_unit: 'EA',
    total_labor_cost_per_unit: 450.00,
    total_equipment_cost_per_unit: 180.00,
    total_material_cost_per_unit: 850.00,
    total_sub_cost_per_unit: 0,
    total_cost_per_unit: 1480.00,
    times_used: 4,
    is_active: true,
  },
];

const DEMO_WVDOH_ITEMS: WVDOHItem[] = [
  { item_code: '202004-000', description: 'Unclassified Excavation', short_description: 'Excavation', unit_of_measure: 'CY', division: '200', work_category: 'EARTHWORK', typical_unit_price_median: 15.00, default_assembly_template_id: null },
  { item_code: '203001-000', description: 'Borrow Excavation', short_description: 'Borrow', unit_of_measure: 'CY', division: '200', work_category: 'EARTHWORK', typical_unit_price_median: 22.00, default_assembly_template_id: 't1' },
  { item_code: '206001-000', description: 'Compacting Embankment', short_description: 'Compaction', unit_of_measure: 'CY', division: '200', work_category: 'EARTHWORK', typical_unit_price_median: 5.00, default_assembly_template_id: null },
  { item_code: '301001-000', description: 'Aggregate Base Course', short_description: 'Base', unit_of_measure: 'TON', division: '300', work_category: 'BASE', typical_unit_price_median: 28.00, default_assembly_template_id: 't2' },
  { item_code: '401001-000', description: 'Superpave Asphalt Surface', short_description: 'HMA Surface', unit_of_measure: 'TON', division: '400', work_category: 'PAVING', typical_unit_price_median: 95.00, default_assembly_template_id: 't3' },
  { item_code: '401002-000', description: 'Superpave Asphalt Base', short_description: 'HMA Base', unit_of_measure: 'TON', division: '400', work_category: 'PAVING', typical_unit_price_median: 85.00, default_assembly_template_id: null },
  { item_code: '501001-000', description: 'Class A Concrete', short_description: 'Concrete', unit_of_measure: 'CY', division: '500', work_category: 'STRUCTURES', typical_unit_price_median: 850.00, default_assembly_template_id: null },
  { item_code: '601018-000', description: '18" RCP Pipe', short_description: 'RCP 18"', unit_of_measure: 'LF', division: '600', work_category: 'DRAINAGE', typical_unit_price_median: 55.00, default_assembly_template_id: 't4' },
  { item_code: '601024-000', description: '24" RCP Pipe', short_description: 'RCP 24"', unit_of_measure: 'LF', division: '600', work_category: 'DRAINAGE', typical_unit_price_median: 72.00, default_assembly_template_id: null },
  { item_code: '602003-000', description: 'Type 3 Inlet', short_description: 'Inlet T3', unit_of_measure: 'EA', division: '600', work_category: 'DRAINAGE', typical_unit_price_median: 1500.00, default_assembly_template_id: 't5' },
  { item_code: '701001-000', description: 'W-Beam Guardrail', short_description: 'Guardrail', unit_of_measure: 'LF', division: '700', work_category: 'GUARDRAIL', typical_unit_price_median: 32.00, default_assembly_template_id: null },
  { item_code: '801001-000', description: 'Seeding and Mulching', short_description: 'Seeding', unit_of_measure: 'AC', division: '800', work_category: 'LANDSCAPING', typical_unit_price_median: 3200.00, default_assembly_template_id: null },
];

const WORK_CATEGORIES = [
  'EARTHWORK', 'BASE', 'PAVING', 'DRAINAGE', 'STRUCTURES',
  'GUARDRAIL', 'SIGNING', 'STRIPING', 'LANDSCAPING', 'TRAFFIC_CONTROL',
  'CLEARING', 'MOBILIZATION', 'BRIDGE', 'UTILITIES', 'ENVIRONMENTAL'
];

export function CostCodeManagement() {
  const [templates, setTemplates] = useState<AssemblyTemplate[]>([]);
  const [wvdohItems, setWvdohItems] = useState<WVDOHItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUsingDemo, setIsUsingDemo] = useState(false);
  const [activeTab, setActiveTab] = useState<'mapper' | 'templates' | 'analytics'>('mapper');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [showUnlinkedOnly, setShowUnlinkedOnly] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<WVDOHItem | null>(null);
  const [linkingMode, setLinkingMode] = useState(false);
  const [aiSuggestionsLoading, setAiSuggestionsLoading] = useState(false);

  // Calculate stats
  const totalItems = wvdohItems.length;
  const linkedItems = wvdohItems.filter(i => i.default_assembly_template_id).length;
  const linkagePercent = totalItems > 0 ? (linkedItems / totalItems * 100).toFixed(0) : 0;

  // Group items by category
  const categories: WorkCategory[] = WORK_CATEGORIES.map(cat => {
    const items = wvdohItems.filter(i => i.work_category === cat);
    return {
      name: cat,
      count: items.length,
      linkedCount: items.filter(i => i.default_assembly_template_id).length,
    };
  }).filter(c => c.count > 0);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    try {
      // Load assembly templates
      const { data: templateData, error: templateError } = await supabase
        .from('bid_assembly_templates')
        .select('*')
        .eq('is_active', true)
        .order('work_category');

      // Load WVDOH items
      const { data: itemData, error: itemError } = await supabase
        .from('master_wvdoh_items')
        .select('*')
        .order('item_code');

      if (!templateError && templateData && templateData.length > 0) {
        setTemplates(templateData as unknown as AssemblyTemplate[]);
        setIsUsingDemo(false);
      } else {
        setTemplates(DEMO_TEMPLATES);
        setIsUsingDemo(true);
      }

      if (!itemError && itemData && itemData.length > 0) {
        setWvdohItems(itemData as unknown as WVDOHItem[]);
      } else {
        setWvdohItems(DEMO_WVDOH_ITEMS);
        setIsUsingDemo(true);
      }
    } catch (err) {
      setTemplates(DEMO_TEMPLATES);
      setWvdohItems(DEMO_WVDOH_ITEMS);
      setIsUsingDemo(true);
    }

    setLoading(false);
  }

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getTemplateForItem = (item: WVDOHItem) => {
    return templates.find(t => t.id === item.default_assembly_template_id);
  };

  const getSuggestedTemplates = (item: WVDOHItem) => {
    return templates.filter(t => t.work_category === item.work_category);
  };

  const handleLinkTemplate = async (item: WVDOHItem, templateId: string | null) => {
    if (isUsingDemo) {
      // Update local state for demo
      setWvdohItems(prev => prev.map(i =>
        i.item_code === item.item_code
          ? { ...i, default_assembly_template_id: templateId }
          : i
      ));
      setSelectedItem(null);
      setLinkingMode(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('master_wvdoh_items')
        .update({ default_assembly_template_id: templateId } as any)
        .eq('item_code', item.item_code);

      if (!error) {
        setWvdohItems(prev => prev.map(i =>
          i.item_code === item.item_code
            ? { ...i, default_assembly_template_id: templateId }
            : i
        ));
        setSelectedItem(null);
        setLinkingMode(false);
      }
    } catch (err) {
      console.error('Failed to link template:', err);
    }
  };

  const handleAutoSuggest = async () => {
    setAiSuggestionsLoading(true);

    // Simulate AI suggestion processing
    setTimeout(() => {
      // Auto-link unlinked items to templates with matching work_category
      const updates: WVDOHItem[] = wvdohItems.map(item => {
        if (!item.default_assembly_template_id) {
          const matchingTemplate = templates.find(t =>
            t.work_category === item.work_category
          );
          if (matchingTemplate) {
            return { ...item, default_assembly_template_id: matchingTemplate.id };
          }
        }
        return item;
      });

      setWvdohItems(updates);
      setAiSuggestionsLoading(false);
    }, 1500);
  };

  const filteredItems = wvdohItems.filter(item => {
    if (searchTerm && !item.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !item.item_code.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (categoryFilter && item.work_category !== categoryFilter) {
      return false;
    }
    if (showUnlinkedOnly && item.default_assembly_template_id) {
      return false;
    }
    return true;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="cost-code-management">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <h1><Layers size={28} /> Cost Code Management</h1>
          <p>Map WVDOH bid items to assembly templates for accurate cost tracking</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={loadData} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
            Refresh
          </button>
          <button className="btn-secondary">
            <Download size={18} />
            Export
          </button>
          <button
            className="btn-primary"
            onClick={handleAutoSuggest}
            disabled={aiSuggestionsLoading}
          >
            <Zap size={18} />
            {aiSuggestionsLoading ? 'Processing...' : 'AI Auto-Map'}
          </button>
        </div>
      </div>

      {/* Demo Banner */}
      {isUsingDemo && (
        <div className="demo-banner">
          <AlertTriangle size={18} />
          <span>Demo Mode - Changes will not be persisted. Connect database for full functionality.</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon">
            <Package size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{totalItems}</span>
            <span className="stat-label">WVDOH Items</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon linked">
            <Link2 size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{linkedItems}</span>
            <span className="stat-label">Items Linked</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon templates">
            <Layers size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{templates.length}</span>
            <span className="stat-label">Templates</span>
          </div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-icon coverage">
            <Check size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{linkagePercent}%</span>
            <span className="stat-label">Coverage</span>
          </div>
          <div className="coverage-bar">
            <div
              className="coverage-fill"
              style={{ width: `${linkagePercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'mapper' ? 'active' : ''}`}
          onClick={() => setActiveTab('mapper')}
        >
          <Link2 size={18} />
          Assembly Mapper
        </button>
        <button
          className={`tab ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          <Layers size={18} />
          Templates ({templates.length})
        </button>
        <button
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <DollarSign size={18} />
          Cost Analytics
        </button>
      </div>

      {/* Mapper Tab */}
      {activeTab === 'mapper' && (
        <div className="mapper-content">
          {/* Filters */}
          <div className="filters-bar">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search items by code or description..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <Filter size={18} />
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.name} value={cat.name}>
                    {cat.name.replace(/_/g, ' ')} ({cat.count})
                  </option>
                ))}
              </select>
            </div>
            <label className="checkbox-filter">
              <input
                type="checkbox"
                checked={showUnlinkedOnly}
                onChange={e => setShowUnlinkedOnly(e.target.checked)}
              />
              Show unlinked only
            </label>
          </div>

          {/* Category Accordion */}
          <div className="category-list">
            {categories.map(category => {
              const categoryItems = filteredItems.filter(i => i.work_category === category.name);
              if (categoryItems.length === 0) return null;

              const isExpanded = expandedCategories.has(category.name);
              const categoryTemplates = templates.filter(t => t.work_category === category.name);

              return (
                <div key={category.name} className="category-group">
                  <div
                    className="category-header"
                    onClick={() => toggleCategory(category.name)}
                  >
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    <span className="category-name">{category.name.replace(/_/g, ' ')}</span>
                    <div className="category-stats">
                      <span className="item-count">{categoryItems.length} items</span>
                      <span className="template-count">{categoryTemplates.length} templates</span>
                      <div className="mini-progress">
                        <div
                          className="mini-fill"
                          style={{
                            width: `${category.count > 0 ? (category.linkedCount / category.count * 100) : 0}%`
                          }}
                        />
                      </div>
                      <span className="link-percent">
                        {category.count > 0 ? Math.round(category.linkedCount / category.count * 100) : 0}%
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="category-items">
                      <table>
                        <thead>
                          <tr>
                            <th>Item Code</th>
                            <th>Description</th>
                            <th>Unit</th>
                            <th>Typical Price</th>
                            <th>Linked Template</th>
                            <th>Template Cost</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoryItems.map(item => {
                            const template = getTemplateForItem(item);
                            const isSelected = selectedItem?.item_code === item.item_code;

                            return (
                              <tr
                                key={item.item_code}
                                className={`${!item.default_assembly_template_id ? 'unlinked' : ''} ${isSelected ? 'selected' : ''}`}
                              >
                                <td className="item-code">{item.item_code}</td>
                                <td className="description">{item.description}</td>
                                <td className="unit">{item.unit_of_measure}</td>
                                <td className="price">{formatCurrency(item.typical_unit_price_median)}</td>
                                <td className="template-cell">
                                  {template ? (
                                    <div className="linked-template">
                                      <Check size={14} className="link-icon" />
                                      <span>{template.name}</span>
                                    </div>
                                  ) : (
                                    <span className="no-link">Not linked</span>
                                  )}
                                </td>
                                <td className="template-cost">
                                  {template ? formatCurrency(template.total_cost_per_unit) : '—'}
                                </td>
                                <td className="actions">
                                  {isSelected && linkingMode ? (
                                    <div className="link-selector">
                                      <select
                                        onChange={e => handleLinkTemplate(item, e.target.value || null)}
                                        defaultValue={item.default_assembly_template_id || ''}
                                      >
                                        <option value="">— Remove Link —</option>
                                        {getSuggestedTemplates(item).map(t => (
                                          <option key={t.id} value={t.id}>
                                            {t.code} - {t.name}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        className="btn-icon cancel"
                                        onClick={() => {
                                          setSelectedItem(null);
                                          setLinkingMode(false);
                                        }}
                                      >
                                        <X size={16} />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      className="btn-icon"
                                      onClick={() => {
                                        setSelectedItem(item);
                                        setLinkingMode(true);
                                      }}
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
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

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="templates-content">
          <div className="templates-header">
            <h2>Assembly Templates</h2>
            <button className="btn-primary">
              <Plus size={18} />
              New Template
            </button>
          </div>

          <div className="templates-grid">
            {templates.map(template => (
              <div key={template.id} className="template-card">
                <div className="template-header">
                  <span className="template-code">{template.code}</span>
                  <span className={`template-category ${template.work_category.toLowerCase()}`}>
                    {template.work_category.replace(/_/g, ' ')}
                  </span>
                </div>
                <h3 className="template-name">{template.name}</h3>
                <p className="template-desc">{template.description}</p>

                <div className="template-costs">
                  <div className="cost-row">
                    <span>Labor</span>
                    <span>{formatCurrency(template.total_labor_cost_per_unit)}</span>
                  </div>
                  <div className="cost-row">
                    <span>Equipment</span>
                    <span>{formatCurrency(template.total_equipment_cost_per_unit)}</span>
                  </div>
                  <div className="cost-row">
                    <span>Material</span>
                    <span>{formatCurrency(template.total_material_cost_per_unit)}</span>
                  </div>
                  <div className="cost-row">
                    <span>Subcontractor</span>
                    <span>{formatCurrency(template.total_sub_cost_per_unit)}</span>
                  </div>
                  <div className="cost-row total">
                    <span>Total per {template.output_unit}</span>
                    <span>{formatCurrency(template.total_cost_per_unit)}</span>
                  </div>
                </div>

                <div className="template-footer">
                  <span className="usage">Used {template.times_used} times</span>
                  <button className="btn-icon">
                    <Settings size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="analytics-content">
          <div className="analytics-header">
            <h2>Cost Analytics</h2>
            <p>Analyze cost variances between bid estimates and actual assembly costs</p>
          </div>

          <div className="analytics-grid">
            <div className="analytics-card">
              <h3>Category Coverage</h3>
              <div className="category-bars">
                {categories.map(cat => (
                  <div key={cat.name} className="category-bar-row">
                    <span className="cat-name">{cat.name.replace(/_/g, ' ')}</span>
                    <div className="bar-container">
                      <div
                        className="bar-fill"
                        style={{ width: `${cat.count > 0 ? (cat.linkedCount / cat.count * 100) : 0}%` }}
                      />
                    </div>
                    <span className="cat-percent">
                      {cat.count > 0 ? Math.round(cat.linkedCount / cat.count * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="analytics-card">
              <h3>Cost Variance Summary</h3>
              <p className="card-note">Comparing WVDOH typical prices to assembly template costs</p>
              <div className="variance-summary">
                {templates.slice(0, 5).map(t => {
                  const item = wvdohItems.find(i => i.default_assembly_template_id === t.id);
                  if (!item) return null;
                  const variance = ((t.total_cost_per_unit - item.typical_unit_price_median) / item.typical_unit_price_median * 100);
                  return (
                    <div key={t.id} className="variance-row">
                      <span className="var-name">{t.name}</span>
                      <span className={`var-value ${variance > 0 ? 'over' : 'under'}`}>
                        {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="analytics-card full-width">
              <h3>Assembly Template Usage</h3>
              <div className="usage-chart">
                {templates.sort((a, b) => b.times_used - a.times_used).slice(0, 8).map(t => (
                  <div key={t.id} className="usage-bar-row">
                    <span className="usage-name">{t.code}</span>
                    <div className="usage-bar-container">
                      <div
                        className="usage-bar-fill"
                        style={{ width: `${Math.min(t.times_used * 5, 100)}%` }}
                      />
                    </div>
                    <span className="usage-count">{t.times_used} uses</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CostCodeManagement;
