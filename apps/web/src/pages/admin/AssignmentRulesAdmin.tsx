// =============================================================================
// AssignmentRulesAdmin.tsx
// Safety Admin interface for managing assignment validation rules
// Part of Safety Compliance Enforcement System - "The Gatekeeper"
// =============================================================================

import { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Save,
  X,
  BookOpen,
  Clock,
  Lock,
  Copy,
  Eye,
  EyeOff,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './AssignmentRulesAdmin.css';

// =============================================================================
// Types
// =============================================================================

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
type BlockingBehavior = 'block' | 'warn' | 'log';

interface ValidationRule {
  id: string;
  organization_id: string | null;
  rule_code: string;
  rule_name: string;
  description: string | null;
  work_type: string;
  conditions: Record<string, unknown>;
  required_certification_codes: string[];
  required_competent_person_types: string[];
  required_equipment_operator_certs: string[];
  min_crew_with_cert: number;
  require_site_orientation: boolean;
  require_daily_brief: boolean;
  risk_level: RiskLevel;
  blocking_behavior: BlockingBehavior;
  override_allowed: boolean;
  override_max_hours: number | null;
  override_approver_roles: string[];
  override_requires_documentation: boolean;
  override_requires_photo: boolean;
  jurisdiction: string;
  regulatory_reference: string | null;
  penalty_info: string | null;
  effective_date: string;
  expiration_date: string | null;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface RuleFormData {
  rule_code: string;
  rule_name: string;
  description: string;
  work_type: string;
  conditions: string; // JSON string for editing
  required_certification_codes: string[];
  required_competent_person_types: string[];
  required_equipment_operator_certs: string[];
  min_crew_with_cert: number;
  require_site_orientation: boolean;
  require_daily_brief: boolean;
  risk_level: RiskLevel;
  blocking_behavior: BlockingBehavior;
  override_allowed: boolean;
  override_max_hours: number | null;
  override_approver_roles: string[];
  override_requires_documentation: boolean;
  override_requires_photo: boolean;
  jurisdiction: string;
  regulatory_reference: string;
  penalty_info: string;
  effective_date: string;
  expiration_date: string;
  is_active: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const WORK_TYPES = [
  { value: 'excavation', label: 'Excavation' },
  { value: 'trenching', label: 'Trenching' },
  { value: 'scaffolding', label: 'Scaffolding' },
  { value: 'elevated_work', label: 'Elevated Work / Fall Protection' },
  { value: 'confined_space', label: 'Confined Space Entry' },
  { value: 'crane_operation', label: 'Crane Operation' },
  { value: 'rigging', label: 'Rigging' },
  { value: 'steel_erection', label: 'Steel Erection' },
  { value: 'demolition', label: 'Demolition' },
  { value: 'electrical', label: 'Electrical Work' },
  { value: 'hot_work', label: 'Hot Work (Welding/Cutting)' },
  { value: 'concrete', label: 'Concrete Work' },
  { value: 'paving', label: 'Paving / Asphalt' },
  { value: 'traffic_control', label: 'Traffic Control' },
  { value: 'general', label: 'General Construction' },
];

const RISK_LEVELS: { value: RiskLevel; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#22c55e' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'high', label: 'High', color: '#f97316' },
  { value: 'critical', label: 'Critical', color: '#dc2626' },
];

const BLOCKING_BEHAVIORS: { value: BlockingBehavior; label: string; description: string }[] = [
  { value: 'block', label: 'Block', description: 'Prevent assignment until resolved' },
  { value: 'warn', label: 'Warn', description: 'Allow with warning, log for review' },
  { value: 'log', label: 'Log Only', description: 'Allow silently, record for audit' },
];

const JURISDICTIONS = [
  { value: 'federal', label: 'Federal (OSHA)' },
  { value: 'state', label: 'State Regulation' },
  { value: 'company', label: 'Company Policy' },
  { value: 'project', label: 'Project-Specific' },
];

const APPROVER_ROLES = [
  'FOREMAN',
  'SUPERINTENDENT',
  'PROJECT_MANAGER',
  'SAFETY_MANAGER',
  'SAFETY_DIRECTOR',
  'VP_OPERATIONS',
];

const COMPETENT_PERSON_TYPES = [
  'excavation',
  'scaffolding',
  'fall_protection',
  'confined_space',
  'crane',
  'rigging',
  'electrical',
  'steel_erection',
  'demolition',
  'concrete',
];

const EMPTY_FORM: RuleFormData = {
  rule_code: '',
  rule_name: '',
  description: '',
  work_type: 'general',
  conditions: '{}',
  required_certification_codes: [],
  required_competent_person_types: [],
  required_equipment_operator_certs: [],
  min_crew_with_cert: 1,
  require_site_orientation: true,
  require_daily_brief: true,
  risk_level: 'medium',
  blocking_behavior: 'block',
  override_allowed: true,
  override_max_hours: 4,
  override_approver_roles: ['SUPERINTENDENT'],
  override_requires_documentation: false,
  override_requires_photo: false,
  jurisdiction: 'company',
  regulatory_reference: '',
  penalty_info: '',
  effective_date: new Date().toISOString().split('T')[0] ?? '',
  expiration_date: '',
  is_active: true,
};

// =============================================================================
// Component
// =============================================================================

export function AssignmentRulesAdmin() {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [rules, setRules] = useState<ValidationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWorkType, setFilterWorkType] = useState<string>('');
  const [filterRiskLevel, setFilterRiskLevel] = useState<string>('');
  const [filterActive, setFilterActive] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<ValidationRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Expanded rows for detail view
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Confirm delete
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Load Rules
  // ---------------------------------------------------------------------------
  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('assignment_validation_rules')
        .select('*')
        .order('work_type')
        .order('risk_level', { ascending: false })
        .order('rule_name');

      if (fetchError) throw fetchError;
      setRules((data || []) as any);
    } catch (err) {
      console.error('Failed to load rules:', err);
      setError('Failed to load validation rules');
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Filter Rules
  // ---------------------------------------------------------------------------
  const filteredRules = useMemo(() => {
    return rules.filter(rule => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          rule.rule_code.toLowerCase().includes(search) ||
          rule.rule_name.toLowerCase().includes(search) ||
          (rule.description?.toLowerCase().includes(search)) ||
          (rule.regulatory_reference?.toLowerCase().includes(search));
        if (!matchesSearch) return false;
      }

      // Work type filter
      if (filterWorkType && rule.work_type !== filterWorkType) return false;

      // Risk level filter
      if (filterRiskLevel && rule.risk_level !== filterRiskLevel) return false;

      // Active filter
      if (filterActive === 'active' && !rule.is_active) return false;
      if (filterActive === 'inactive' && rule.is_active) return false;

      return true;
    });
  }, [rules, searchTerm, filterWorkType, filterRiskLevel, filterActive]);

  // Group by work type
  const groupedRules = useMemo(() => {
    const groups: Record<string, ValidationRule[]> = {};
    for (const rule of filteredRules) {
      if (!groups[rule.work_type]) groups[rule.work_type] = [];
      groups[rule.work_type]?.push(rule);
    }
    return groups;
  }, [filteredRules]);

  // ---------------------------------------------------------------------------
  // Form Handlers
  // ---------------------------------------------------------------------------
  function openCreateForm() {
    setEditingRule(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
    setError(null);
  }

  function openEditForm(rule: ValidationRule) {
    setEditingRule(rule);
    setFormData({
      rule_code: rule.rule_code,
      rule_name: rule.rule_name,
      description: rule.description || '',
      work_type: rule.work_type,
      conditions: JSON.stringify(rule.conditions, null, 2),
      required_certification_codes: rule.required_certification_codes || [],
      required_competent_person_types: rule.required_competent_person_types || [],
      required_equipment_operator_certs: rule.required_equipment_operator_certs || [],
      min_crew_with_cert: rule.min_crew_with_cert,
      require_site_orientation: rule.require_site_orientation,
      require_daily_brief: rule.require_daily_brief,
      risk_level: rule.risk_level,
      blocking_behavior: rule.blocking_behavior,
      override_allowed: rule.override_allowed,
      override_max_hours: rule.override_max_hours,
      override_approver_roles: rule.override_approver_roles || [],
      override_requires_documentation: rule.override_requires_documentation,
      override_requires_photo: rule.override_requires_photo,
      jurisdiction: rule.jurisdiction,
      regulatory_reference: rule.regulatory_reference || '',
      penalty_info: rule.penalty_info || '',
      effective_date: rule.effective_date,
      expiration_date: rule.expiration_date || '',
      is_active: rule.is_active,
    });
    setShowForm(true);
    setError(null);
  }

  function closeForm() {
    setShowForm(false);
    setEditingRule(null);
    setFormData(EMPTY_FORM);
    setError(null);
  }

  async function handleSave() {
    // Validate
    if (!formData.rule_code.trim()) {
      setError('Rule code is required');
      return;
    }
    if (!formData.rule_name.trim()) {
      setError('Rule name is required');
      return;
    }

    // Parse conditions JSON
    let conditions: Record<string, unknown> = {};
    try {
      conditions = JSON.parse(formData.conditions || '{}');
    } catch {
      setError('Invalid JSON in conditions field');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        rule_code: formData.rule_code.toUpperCase().replace(/\s+/g, '_'),
        rule_name: formData.rule_name,
        description: formData.description || null,
        work_type: formData.work_type,
        conditions,
        required_certification_codes: formData.required_certification_codes,
        required_competent_person_types: formData.required_competent_person_types,
        required_equipment_operator_certs: formData.required_equipment_operator_certs,
        min_crew_with_cert: formData.min_crew_with_cert,
        require_site_orientation: formData.require_site_orientation,
        require_daily_brief: formData.require_daily_brief,
        risk_level: formData.risk_level,
        blocking_behavior: formData.blocking_behavior,
        override_allowed: formData.override_allowed,
        override_max_hours: formData.override_max_hours,
        override_approver_roles: formData.override_approver_roles,
        override_requires_documentation: formData.override_requires_documentation,
        override_requires_photo: formData.override_requires_photo,
        jurisdiction: formData.jurisdiction,
        regulatory_reference: formData.regulatory_reference || null,
        penalty_info: formData.penalty_info || null,
        effective_date: formData.effective_date,
        expiration_date: formData.expiration_date || null,
        is_active: formData.is_active,
      };

      if (editingRule) {
        // Update
        const { error: updateError } = await supabase
          .from('assignment_validation_rules')
          .update(payload as any)
          .eq('id', editingRule.id);

        if (updateError) throw updateError;
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from('assignment_validation_rules')
          .insert([payload as any]);

        if (insertError) throw insertError;
      }

      await loadRules();
      closeForm();
    } catch (err: unknown) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Toggle & Delete
  // ---------------------------------------------------------------------------
  async function toggleRuleActive(rule: ValidationRule) {
    try {
      const { error: updateError } = await supabase
        .from('assignment_validation_rules')
        .update({ is_active: !rule.is_active })
        .eq('id', rule.id);

      if (updateError) throw updateError;

      setRules(prev =>
        prev.map(r => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
      );
    } catch (err) {
      console.error('Toggle error:', err);
    }
  }

  async function deleteRule(ruleId: string) {
    try {
      const { error: deleteError } = await supabase
        .from('assignment_validation_rules')
        .delete()
        .eq('id', ruleId);

      if (deleteError) throw deleteError;

      setRules(prev => prev.filter(r => r.id !== ruleId));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Delete error:', err);
    }
  }

  function duplicateRule(rule: ValidationRule) {
    setEditingRule(null);
    setFormData({
      rule_code: rule.rule_code + '_COPY',
      rule_name: rule.rule_name + ' (Copy)',
      description: rule.description || '',
      work_type: rule.work_type,
      conditions: JSON.stringify(rule.conditions, null, 2),
      required_certification_codes: rule.required_certification_codes || [],
      required_competent_person_types: rule.required_competent_person_types || [],
      required_equipment_operator_certs: rule.required_equipment_operator_certs || [],
      min_crew_with_cert: rule.min_crew_with_cert,
      require_site_orientation: rule.require_site_orientation,
      require_daily_brief: rule.require_daily_brief,
      risk_level: rule.risk_level,
      blocking_behavior: rule.blocking_behavior,
      override_allowed: rule.override_allowed,
      override_max_hours: rule.override_max_hours,
      override_approver_roles: rule.override_approver_roles || [],
      override_requires_documentation: rule.override_requires_documentation,
      override_requires_photo: rule.override_requires_photo,
      jurisdiction: 'company',
      regulatory_reference: '',
      penalty_info: '',
      effective_date: new Date().toISOString().split('T')[0] ?? '',
      expiration_date: '',
      is_active: true,
    });
    setShowForm(true);
    setError(null);
  }

  // ---------------------------------------------------------------------------
  // Render Helpers
  // ---------------------------------------------------------------------------
  function getRiskBadgeColor(level: RiskLevel): string {
    const config = RISK_LEVELS.find(r => r.value === level);
    return config?.color || '#64748b';
  }

  function getWorkTypeLabel(workType: string): string {
    const config = WORK_TYPES.find(w => w.value === workType);
    return config?.label || workType;
  }

  function toggleRow(ruleId: string) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  }

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="rules-admin loading">
        <Shield className="spinner" size={32} />
        <p>Loading validation rules...</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="rules-admin">
      {/* Header */}
      <div className="rules-header">
        <div className="header-content">
          <div className="header-icon">
            <Shield size={28} />
          </div>
          <div className="header-text">
            <h1>Assignment Validation Rules</h1>
            <p>Configure safety requirements for crew assignments</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={openCreateForm}>
          <Plus size={18} />
          New Rule
        </button>
      </div>

      {/* Stats */}
      <div className="rules-stats">
        <div className="stat-card">
          <div className="stat-icon green">
            <CheckCircle size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{rules.filter(r => r.is_active).length}</span>
            <span className="stat-label">Active Rules</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">
            <AlertTriangle size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{rules.filter(r => r.risk_level === 'critical').length}</span>
            <span className="stat-label">Critical</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">
            <BookOpen size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{rules.filter(r => r.jurisdiction === 'federal').length}</span>
            <span className="stat-label">Federal (OSHA)</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon gray">
            <XCircle size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{rules.filter(r => !r.is_active).length}</span>
            <span className="stat-label">Inactive</span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="rules-toolbar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search rules by code, name, or reference..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          className={`btn btn-secondary filter-btn ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} />
          Filters
          {(filterWorkType || filterRiskLevel || filterActive) && (
            <span className="filter-count">
              {[filterWorkType, filterRiskLevel, filterActive].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <label>Work Type</label>
            <select
              value={filterWorkType}
              onChange={e => setFilterWorkType(e.target.value)}
            >
              <option value="">All Types</option>
              {WORK_TYPES.map(wt => (
                <option key={wt.value} value={wt.value}>{wt.label}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Risk Level</label>
            <select
              value={filterRiskLevel}
              onChange={e => setFilterRiskLevel(e.target.value)}
            >
              <option value="">All Levels</option>
              {RISK_LEVELS.map(rl => (
                <option key={rl.value} value={rl.value}>{rl.label}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Status</label>
            <select
              value={filterActive}
              onChange={e => setFilterActive(e.target.value)}
            >
              <option value="">All</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
          <button
            className="btn btn-text"
            onClick={() => {
              setFilterWorkType('');
              setFilterRiskLevel('');
              setFilterActive('');
            }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Rules List */}
      <div className="rules-list">
        {Object.keys(groupedRules).length === 0 ? (
          <div className="empty-state">
            <Shield size={48} />
            <h3>No rules found</h3>
            <p>
              {searchTerm || filterWorkType || filterRiskLevel || filterActive
                ? 'Try adjusting your search or filters'
                : 'Create your first validation rule to get started'}
            </p>
          </div>
        ) : (
          Object.entries(groupedRules).map(([workType, workTypeRules]) => (
            <div key={workType} className="work-type-group">
              <h3 className="group-header">
                {getWorkTypeLabel(workType)}
                <span className="rule-count">{workTypeRules.length} rules</span>
              </h3>
              {workTypeRules.map(rule => (
                <div key={rule.id} className={`rule-card ${!rule.is_active ? 'inactive' : ''}`}>
                  <div className="rule-main" onClick={() => toggleRow(rule.id)}>
                    <div className="rule-expand">
                      {expandedRows.has(rule.id) ? (
                        <ChevronDown size={18} />
                      ) : (
                        <ChevronRight size={18} />
                      )}
                    </div>
                    <div className="rule-info">
                      <div className="rule-header-row">
                        <span className="rule-code">{rule.rule_code}</span>
                        <div className="rule-badges">
                          <span
                            className="badge risk-badge"
                            style={{ backgroundColor: getRiskBadgeColor(rule.risk_level) }}
                          >
                            {rule.risk_level.toUpperCase()}
                          </span>
                          <span className={`badge behavior-badge ${rule.blocking_behavior}`}>
                            {rule.blocking_behavior === 'block' && <Lock size={12} />}
                            {rule.blocking_behavior}
                          </span>
                          {rule.jurisdiction === 'federal' && (
                            <span className="badge federal-badge">
                              OSHA
                            </span>
                          )}
                          {!rule.is_active && (
                            <span className="badge inactive-badge">
                              INACTIVE
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="rule-name">{rule.rule_name}</div>
                      {rule.description && (
                        <div className="rule-description">{rule.description}</div>
                      )}
                    </div>
                    <div className="rule-actions" onClick={e => e.stopPropagation()}>
                      <button
                        className="action-btn"
                        title={rule.is_active ? 'Disable rule' : 'Enable rule'}
                        onClick={() => toggleRuleActive(rule)}
                      >
                        {rule.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button
                        className="action-btn"
                        title="Duplicate rule"
                        onClick={() => duplicateRule(rule)}
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        className="action-btn"
                        title="Edit rule"
                        onClick={() => openEditForm(rule)}
                      >
                        <Edit2 size={16} />
                      </button>
                      {rule.organization_id && (
                        <button
                          className="action-btn danger"
                          title="Delete rule"
                          onClick={() => setDeleteConfirm(rule.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedRows.has(rule.id) && (
                    <div className="rule-details">
                      <div className="details-grid">
                        {/* Requirements */}
                        <div className="details-section">
                          <h4>Requirements</h4>
                          <div className="detail-items">
                            {rule.required_competent_person_types.length > 0 && (
                              <div className="detail-item">
                                <span className="detail-label">Competent Person:</span>
                                <span className="detail-value">
                                  {rule.required_competent_person_types.join(', ')}
                                </span>
                              </div>
                            )}
                            {rule.required_certification_codes.length > 0 && (
                              <div className="detail-item">
                                <span className="detail-label">Certifications:</span>
                                <span className="detail-value">
                                  {rule.required_certification_codes.join(', ')}
                                </span>
                              </div>
                            )}
                            <div className="detail-item">
                              <span className="detail-label">Site Orientation:</span>
                              <span className="detail-value">
                                {rule.require_site_orientation ? 'Required' : 'Not required'}
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Daily Brief:</span>
                              <span className="detail-value">
                                {rule.require_daily_brief ? 'Required' : 'Not required'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Override Settings */}
                        <div className="details-section">
                          <h4>Override Settings</h4>
                          <div className="detail-items">
                            <div className="detail-item">
                              <span className="detail-label">Override Allowed:</span>
                              <span className="detail-value">
                                {rule.override_allowed ? 'Yes' : 'No'}
                              </span>
                            </div>
                            {rule.override_allowed && (
                              <>
                                <div className="detail-item">
                                  <span className="detail-label">Max Duration:</span>
                                  <span className="detail-value">
                                    {rule.override_max_hours ? `${rule.override_max_hours} hours` : 'No limit'}
                                  </span>
                                </div>
                                <div className="detail-item">
                                  <span className="detail-label">Approvers:</span>
                                  <span className="detail-value">
                                    {rule.override_approver_roles?.join(', ') || 'Not specified'}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Regulatory Info */}
                        <div className="details-section">
                          <h4>Regulatory Reference</h4>
                          <div className="detail-items">
                            <div className="detail-item">
                              <span className="detail-label">Jurisdiction:</span>
                              <span className="detail-value">{rule.jurisdiction}</span>
                            </div>
                            {rule.regulatory_reference && (
                              <div className="detail-item">
                                <span className="detail-label">Reference:</span>
                                <span className="detail-value">{rule.regulatory_reference}</span>
                              </div>
                            )}
                            {rule.penalty_info && (
                              <div className="detail-item">
                                <span className="detail-label">Penalty:</span>
                                <span className="detail-value">{rule.penalty_info}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Conditions */}
                        {Object.keys(rule.conditions).length > 0 && (
                          <div className="details-section">
                            <h4>Trigger Conditions</h4>
                            <pre className="conditions-json">
                              {JSON.stringify(rule.conditions, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Delete Confirmation */}
                  {deleteConfirm === rule.id && (
                    <div className="delete-confirm">
                      <AlertTriangle size={18} />
                      <span>Delete this rule? This cannot be undone.</span>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteRule(rule.id)}
                      >
                        Delete
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setDeleteConfirm(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingRule ? 'Edit Rule' : 'Create New Rule'}</h2>
              <button className="close-btn" onClick={closeForm}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {error && (
                <div className="error-banner">
                  <AlertTriangle size={18} />
                  {error}
                </div>
              )}

              <div className="form-grid">
                {/* Basic Info */}
                <div className="form-section">
                  <h3>Basic Information</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Rule Code *</label>
                      <input
                        type="text"
                        value={formData.rule_code}
                        onChange={e => setFormData(prev => ({ ...prev, rule_code: e.target.value }))}
                        placeholder="e.g., FALL_PROTECTION_6FT"
                        disabled={!!editingRule}
                      />
                    </div>
                    <div className="form-group">
                      <label>Work Type *</label>
                      <select
                        value={formData.work_type}
                        onChange={e => setFormData(prev => ({ ...prev, work_type: e.target.value }))}
                      >
                        {WORK_TYPES.map(wt => (
                          <option key={wt.value} value={wt.value}>{wt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Rule Name *</label>
                    <input
                      type="text"
                      value={formData.rule_name}
                      onChange={e => setFormData(prev => ({ ...prev, rule_name: e.target.value }))}
                      placeholder="e.g., Fall Protection Required Above 6 Feet"
                    />
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Detailed description of the rule..."
                      rows={3}
                    />
                  </div>
                </div>

                {/* Enforcement */}
                <div className="form-section">
                  <h3>Enforcement</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Risk Level</label>
                      <select
                        value={formData.risk_level}
                        onChange={e => setFormData(prev => ({ ...prev, risk_level: e.target.value as RiskLevel }))}
                      >
                        {RISK_LEVELS.map(rl => (
                          <option key={rl.value} value={rl.value}>{rl.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Blocking Behavior</label>
                      <select
                        value={formData.blocking_behavior}
                        onChange={e => setFormData(prev => ({ ...prev, blocking_behavior: e.target.value as BlockingBehavior }))}
                      >
                        {BLOCKING_BEHAVIORS.map(bb => (
                          <option key={bb.value} value={bb.value}>{bb.label} - {bb.description}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-row checkboxes">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.require_site_orientation}
                        onChange={e => setFormData(prev => ({ ...prev, require_site_orientation: e.target.checked }))}
                      />
                      Require Site Orientation
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.require_daily_brief}
                        onChange={e => setFormData(prev => ({ ...prev, require_daily_brief: e.target.checked }))}
                      />
                      Require Daily Brief
                    </label>
                  </div>
                </div>

                {/* Requirements */}
                <div className="form-section">
                  <h3>Requirements</h3>
                  <div className="form-group">
                    <label>Required Competent Person Types</label>
                    <div className="checkbox-grid">
                      {COMPETENT_PERSON_TYPES.map(cp => (
                        <label key={cp} className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={formData.required_competent_person_types.includes(cp)}
                            onChange={e => {
                              setFormData(prev => ({
                                ...prev,
                                required_competent_person_types: e.target.checked
                                  ? [...prev.required_competent_person_types, cp]
                                  : prev.required_competent_person_types.filter(c => c !== cp)
                              }));
                            }}
                          />
                          {cp.replace(/_/g, ' ')}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Required Certification Codes (comma-separated)</label>
                    <input
                      type="text"
                      value={formData.required_certification_codes.join(', ')}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        required_certification_codes: e.target.value
                          .split(',')
                          .map(s => s.trim().toUpperCase())
                          .filter(Boolean)
                      }))}
                      placeholder="e.g., OSHA_10, FALL_PROTECTION"
                    />
                  </div>

                  <div className="form-group">
                    <label>Min Crew with Certification</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.min_crew_with_cert}
                      onChange={e => setFormData(prev => ({ ...prev, min_crew_with_cert: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                </div>

                {/* Override Settings */}
                <div className="form-section">
                  <h3>Override Settings</h3>
                  <div className="form-row checkboxes">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.override_allowed}
                        onChange={e => setFormData(prev => ({ ...prev, override_allowed: e.target.checked }))}
                      />
                      Allow Override
                    </label>
                  </div>

                  {formData.override_allowed && (
                    <>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Max Override Hours</label>
                          <input
                            type="number"
                            min="1"
                            max="24"
                            value={formData.override_max_hours || ''}
                            onChange={e => setFormData(prev => ({
                              ...prev,
                              override_max_hours: e.target.value ? parseInt(e.target.value) : null
                            }))}
                            placeholder="Leave blank for no limit"
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Approver Roles</label>
                        <div className="checkbox-grid">
                          {APPROVER_ROLES.map(role => (
                            <label key={role} className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={formData.override_approver_roles.includes(role)}
                                onChange={e => {
                                  setFormData(prev => ({
                                    ...prev,
                                    override_approver_roles: e.target.checked
                                      ? [...prev.override_approver_roles, role]
                                      : prev.override_approver_roles.filter(r => r !== role)
                                  }));
                                }}
                              />
                              {role.replace(/_/g, ' ')}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="form-row checkboxes">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={formData.override_requires_documentation}
                            onChange={e => setFormData(prev => ({ ...prev, override_requires_documentation: e.target.checked }))}
                          />
                          Require Documentation
                        </label>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={formData.override_requires_photo}
                            onChange={e => setFormData(prev => ({ ...prev, override_requires_photo: e.target.checked }))}
                          />
                          Require Photo Evidence
                        </label>
                      </div>
                    </>
                  )}
                </div>

                {/* Regulatory */}
                <div className="form-section">
                  <h3>Regulatory Reference</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Jurisdiction</label>
                      <select
                        value={formData.jurisdiction}
                        onChange={e => setFormData(prev => ({ ...prev, jurisdiction: e.target.value }))}
                      >
                        {JURISDICTIONS.map(j => (
                          <option key={j.value} value={j.value}>{j.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Regulatory Reference</label>
                      <input
                        type="text"
                        value={formData.regulatory_reference}
                        onChange={e => setFormData(prev => ({ ...prev, regulatory_reference: e.target.value }))}
                        placeholder="e.g., 29 CFR 1926.501(b)(1)"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Penalty Information</label>
                    <input
                      type="text"
                      value={formData.penalty_info}
                      onChange={e => setFormData(prev => ({ ...prev, penalty_info: e.target.value }))}
                      placeholder="e.g., OSHA serious violation, up to $15,625 per instance"
                    />
                  </div>
                </div>

                {/* Lifecycle */}
                <div className="form-section">
                  <h3>Lifecycle</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Effective Date</label>
                      <input
                        type="date"
                        value={formData.effective_date}
                        onChange={e => setFormData(prev => ({ ...prev, effective_date: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label>Expiration Date (optional)</label>
                      <input
                        type="date"
                        value={formData.expiration_date}
                        onChange={e => setFormData(prev => ({ ...prev, expiration_date: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="form-row checkboxes">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      />
                      Rule is Active
                    </label>
                  </div>
                </div>

                {/* Advanced: Conditions */}
                <div className="form-section">
                  <h3>Advanced: Trigger Conditions (JSON)</h3>
                  <div className="form-group">
                    <label>
                      <Info size={14} /> Only trigger rule when conditions are met
                    </label>
                    <textarea
                      value={formData.conditions}
                      onChange={e => setFormData(prev => ({ ...prev, conditions: e.target.value }))}
                      placeholder='{"depth_ft_gte": 5}'
                      rows={3}
                      className="code-input"
                    />
                    <div className="field-hint">
                      Examples: {`{"depth_ft_gte": 5}`}, {`{"height_ft_gte": 6}`}, {`{"equipment_type": "crane"}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeForm} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Clock className="spinner" size={16} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    {editingRule ? 'Update Rule' : 'Create Rule'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AssignmentRulesAdmin;
