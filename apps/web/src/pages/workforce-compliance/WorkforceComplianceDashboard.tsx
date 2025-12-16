import { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Truck,
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  FileText,
  Building2,
  HardHat,
  ClipboardCheck,
  TrendingUp,
  AlertOctagon,
  Upload,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './WorkforceComplianceDashboard.css';


interface ComplianceStats {
  totalEmployees: number;
  compliantEmployees: number;
  pendingCertifications: number;
  expiringSoon: number;
  totalSubcontractors: number;
  compliantSubcontractors: number;
  activeOverrides: number;
  incidentsYTD: number;
}

interface ExpiringItem {
  id: string;
  type: 'certification' | 'insurance' | 'license' | 'medical_card';
  entityName: string;
  itemName: string;
  expirationDate: string;
  daysUntilExpiry: number;
  urgency: 'critical' | 'high' | 'medium';
}

interface RecentIncident {
  id: string;
  incidentNumber: string | null;
  classification: string;
  description: string;
  incidentDate: string;
  status: string | null;
}

interface ActiveOverride {
  id: string;
  overrideType: string;
  blockedAction: string | null;
  expiresAt: string | null;
  requesterName: string;
  projectName: string;
}

type TabType = 'overview' | 'expiring' | 'incidents' | 'overrides';

export function WorkforceComplianceDashboard() {
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [expiringItems, setExpiringItems] = useState<ExpiringItem[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<RecentIncident[]>([]);
  const [activeOverrides, setActiveOverrides] = useState<ActiveOverride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');


  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load stats in parallel
      const [employeeStats, subStats, overrideCount, incidentCount, expiring, incidents, overrides] = await Promise.all([
        // Employee compliance stats
        supabase
          .from('employees')
          .select('id, compliance_status')
          .is('deleted_at', null)
          .eq('employment_status', 'active'),

        // Subcontractor stats
        supabase
          .from('subcontractors')
          .select('id, compliance_status')
          .is('deleted_at', null),

        // Active overrides count
        supabase
          .from('compliance_overrides')
          .select('id', { count: 'exact' })
          .eq('status', 'active')
          .gt('override_expires', new Date().toISOString()),

        // YTD incidents
        supabase
          .from('incidents')
          .select('id', { count: 'exact' })
          .gte('incident_date', `${new Date().getFullYear()}-01-01`),

        // Expiring certifications
        loadExpiringItems(),

        // Recent incidents
        supabase
          .from('incidents')
          .select('id, incident_number, classification, description, incident_date, status')
          .order('incident_date', { ascending: false })
          .limit(10),

        // Active overrides
        supabase
          .from('compliance_overrides')
          .select(`
            id, override_type, blocked_action, override_expires,
            requested_by,
            projects(name)
          `)
          .eq('status', 'active')
          .gt('override_expires', new Date().toISOString())
          .order('override_expires', { ascending: true })
          .limit(10),
      ]);

      // Calculate stats
      const employees = employeeStats.data || [];
      const subs = subStats.data || [];

      setStats({
        totalEmployees: employees.length,
        compliantEmployees: employees.filter(e => e.compliance_status === 'compliant').length,
        pendingCertifications: employees.filter(e => e.compliance_status === 'incomplete' || e.compliance_status === 'pending_review').length,
        expiringSoon: expiring.length,
        totalSubcontractors: subs.length,
        compliantSubcontractors: subs.filter(s => s.compliance_status === 'compliant').length,
        activeOverrides: overrideCount.count || 0,
        incidentsYTD: incidentCount.count || 0,
      });

      setExpiringItems(expiring);

      setRecentIncidents(
        (incidents.data || []).map(i => ({
          id: i.id,
          incidentNumber: i.incident_number,
          classification: i.classification,
          description: i.description,
          incidentDate: i.incident_date,
          status: i.status,
        }))
      );

      setActiveOverrides(
        (overrides.data || []).map(o => ({
          id: o.id,
          overrideType: o.override_type,
          blockedAction: o.blocked_action,
          expiresAt: o.override_expires,
          requesterName: 'Loading...',
          projectName: (o.projects as { name: string })?.name || 'N/A',
        }))
      );

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadExpiringItems = async (): Promise<ExpiringItem[]> => {
    const items: ExpiringItem[] = [];
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const cutoffDate = thirtyDaysFromNow.toISOString().split('T')[0];

    // Expiring certifications
    const { data: certs } = await supabase
      .from('employee_certifications')
      .select(`
        id, certification_name, expiration_date,
        employees(first_name, last_name)
      `)
      .lte('expiration_date', cutoffDate)
      .eq('status', 'active');

    certs?.forEach(cert => {
      const emp = cert.employees as { first_name: string; last_name: string } | null;
      const daysUntil = Math.ceil((new Date(cert.expiration_date ?? '').getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      items.push({
        id: cert.id,
        type: 'certification',
        entityName: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
        itemName: cert.certification_name ?? 'Unknown Certification',
        expirationDate: cert.expiration_date ?? '',
        daysUntilExpiry: daysUntil,
        urgency: daysUntil <= 0 ? 'critical' : daysUntil <= 7 ? 'high' : 'medium',
      });
    });

    // Expiring licenses
    const { data: licenses } = await supabase
      .from('driver_licenses')
      .select(`
        id, expiration_date,
        employees(first_name, last_name)
      `)
      .lte('expiration_date', cutoffDate);

    licenses?.forEach(lic => {
      const emp = lic.employees as { first_name: string; last_name: string } | null;
      const daysUntil = Math.ceil((new Date(lic.expiration_date ?? '').getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      items.push({
        id: lic.id,
        type: 'license',
        entityName: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
        itemName: 'Driver License',
        expirationDate: lic.expiration_date ?? '',
        daysUntilExpiry: daysUntil,
        urgency: daysUntil <= 0 ? 'critical' : daysUntil <= 7 ? 'high' : 'medium',
      });
    });

    // Expiring subcontractor insurance
    const { data: subs } = await supabase
      .from('subcontractors')
      .select('id, company_name, general_liability_exp, workers_comp_exp, auto_liability_exp')
      .is('deleted_at', null);

    subs?.forEach(sub => {
      ['general_liability_exp', 'workers_comp_exp', 'auto_liability_exp'].forEach(field => {
        const expDate = sub[field as keyof typeof sub] as string | null;
        if (expDate && cutoffDate && expDate <= cutoffDate) {
          const daysUntil = Math.ceil((new Date(expDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          const insuranceType = field.replace('_exp', '').replace(/_/g, ' ');
          items.push({
            id: `${sub.id}-${field}`,
            type: 'insurance',
            entityName: sub.company_name,
            itemName: insuranceType.charAt(0).toUpperCase() + insuranceType.slice(1),
            expirationDate: expDate,
            daysUntilExpiry: daysUntil,
            urgency: daysUntil <= 0 ? 'critical' : daysUntil <= 7 ? 'high' : 'medium',
          });
        }
      });
    });

    // Sort by days until expiry
    return items.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  };

  const getCompliancePercentage = () => {
    if (!stats) return 0;
    if (stats.totalEmployees === 0) return 100;
    return Math.round((stats.compliantEmployees / stats.totalEmployees) * 100);
  };

  const getSubCompliancePercentage = () => {
    if (!stats) return 0;
    if (stats.totalSubcontractors === 0) return 100;
    return Math.round((stats.compliantSubcontractors / stats.totalSubcontractors) * 100);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTimeRemaining = (dateStr: string) => {
    const ms = new Date(dateStr).getTime() - Date.now();
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getClassificationBadge = (classification: string) => {
    const normalized = classification.toLowerCase().replace(/_/g, ' ');
    if (normalized.includes('recordable') || normalized.includes('lost time') || normalized.includes('fatality')) {
      return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' };
    }
    if (normalized.includes('first aid')) {
      return { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' };
    }
    if (normalized.includes('near miss')) {
      return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' };
    }
    return { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' };
  };

  const getTypeIcon = (type: ExpiringItem['type']) => {
    switch (type) {
      case 'certification': return <ClipboardCheck size={16} />;
      case 'insurance': return <Shield size={16} />;
      case 'license': return <FileText size={16} />;
      case 'medical_card': return <FileText size={16} />;
    }
  };

  if (isLoading) {
    return (
      <div className="wc-loading">
        <div className="wc-loading-spinner" />
        <p>Loading compliance data...</p>
      </div>
    );
  }

  return (
    <div className="wc-dashboard">
      {/* Header */}
      <header className="wc-header">
        <div className="wc-header-content">
          <div className="wc-header-left">
            <h1>Workforce Compliance</h1>
            <p>Monitor certifications, training, and documentation status</p>
          </div>
          <div className="wc-header-actions">
            <button className="wc-btn wc-btn-secondary">
              <FileText size={18} />
              Reports
            </button>
            <button className="wc-btn wc-btn-primary">
              <Upload size={18} />
              Upload Documents
            </button>
          </div>
        </div>
      </header>

      {/* Active Overrides Alert Banner */}
      {activeOverrides.length > 0 && (
        <div className="wc-alert-banner wc-alert-danger">
          <AlertOctagon size={20} />
          <div className="wc-alert-content">
            <strong>{activeOverrides.length} Active Override{activeOverrides.length > 1 ? 's' : ''}</strong>
            <span>Emergency overrides are in effect and require review</span>
          </div>
          <button className="wc-btn wc-btn-danger" onClick={() => setActiveTab('overrides')}>
            Review Now
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="wc-stats-grid">
        <div className="wc-stat-card">
          <div className="wc-stat-icon wc-icon-cyan">
            <Users size={24} />
          </div>
          <div className="wc-stat-info">
            <span className="wc-stat-label">Active Employees</span>
            <span className="wc-stat-value">{stats?.totalEmployees || 0}</span>
            <div className="wc-stat-meta">
              <span className={getCompliancePercentage() >= 90 ? 'wc-text-success' : 'wc-text-warning'}>
                {getCompliancePercentage()}% Compliant
              </span>
            </div>
          </div>
        </div>

        <div className="wc-stat-card">
          <div className="wc-stat-icon wc-icon-purple">
            <Building2 size={24} />
          </div>
          <div className="wc-stat-info">
            <span className="wc-stat-label">Subcontractors</span>
            <span className="wc-stat-value">{stats?.totalSubcontractors || 0}</span>
            <div className="wc-stat-meta">
              <span className={getSubCompliancePercentage() >= 90 ? 'wc-text-success' : 'wc-text-warning'}>
                {getSubCompliancePercentage()}% Valid COI
              </span>
            </div>
          </div>
        </div>

        <div className="wc-stat-card">
          <div className="wc-stat-icon wc-icon-orange">
            <Clock size={24} />
          </div>
          <div className="wc-stat-info">
            <span className="wc-stat-label">Expiring Soon</span>
            <span className="wc-stat-value">{stats?.expiringSoon || 0}</span>
            <div className="wc-stat-meta">
              <span className="wc-text-muted">Next 30 Days</span>
            </div>
          </div>
        </div>

        <div className="wc-stat-card">
          <div className="wc-stat-icon wc-icon-green">
            <TrendingUp size={24} />
          </div>
          <div className="wc-stat-info">
            <span className="wc-stat-label">Safety Incidents</span>
            <span className="wc-stat-value">{stats?.incidentsYTD || 0}</span>
            <div className="wc-stat-meta">
              <span className="wc-text-muted">Year to Date</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="wc-tabs">
        <button
          className={`wc-tab ${activeTab === 'overview' ? 'wc-tab-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`wc-tab ${activeTab === 'expiring' ? 'wc-tab-active' : ''}`}
          onClick={() => setActiveTab('expiring')}
        >
          Expiring Credentials
          {expiringItems.length > 0 && (
            <span className="wc-tab-badge">{expiringItems.length}</span>
          )}
        </button>
        <button
          className={`wc-tab ${activeTab === 'incidents' ? 'wc-tab-active' : ''}`}
          onClick={() => setActiveTab('incidents')}
        >
          Recent Incidents
          {recentIncidents.length > 0 && (
            <span className="wc-tab-badge wc-badge-neutral">{recentIncidents.length}</span>
          )}
        </button>
        {activeOverrides.length > 0 && (
          <button
            className={`wc-tab ${activeTab === 'overrides' ? 'wc-tab-active' : ''}`}
            onClick={() => setActiveTab('overrides')}
          >
            Active Overrides
            <span className="wc-tab-badge wc-badge-danger">{activeOverrides.length}</span>
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="wc-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="wc-overview-grid">
            {/* Quick Actions */}
            <div className="wc-card">
              <div className="wc-card-header">
                <h3>Quick Actions</h3>
              </div>
              <div className="wc-card-body">
                <div className="wc-quick-actions">
                  {[
                    { icon: Users, label: 'Add Employee', color: 'cyan' },
                    { icon: Building2, label: 'Add Subcontractor', color: 'purple' },
                    { icon: ClipboardCheck, label: 'Record Training', color: 'green' },
                    { icon: AlertOctagon, label: 'Report Incident', color: 'red' },
                    { icon: Truck, label: 'Fleet Status', color: 'orange' },
                    { icon: HardHat, label: 'Safety Meeting', color: 'blue' }
                  ].map((action, i) => (
                    <button key={i} className={`wc-quick-action wc-action-${action.color}`}>
                      <action.icon size={20} />
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Expiring Preview */}
            <div className="wc-card">
              <div className="wc-card-header">
                <h3>
                  <AlertTriangle size={18} className="wc-icon-warning" />
                  Expiring Credentials
                </h3>
                <button className="wc-link" onClick={() => setActiveTab('expiring')}>
                  View All <ChevronRight size={16} />
                </button>
              </div>
              <div className="wc-card-body wc-card-body-scroll">
                {expiringItems.length === 0 ? (
                  <div className="wc-empty-state">
                    <CheckCircle size={32} className="wc-icon-success" />
                    <p>No items expiring in the next 30 days</p>
                  </div>
                ) : (
                  <div className="wc-expiring-list">
                    {expiringItems.slice(0, 5).map(item => (
                      <div key={item.id} className={`wc-expiring-item wc-urgency-${item.urgency}`}>
                        <div className="wc-expiring-icon">{getTypeIcon(item.type)}</div>
                        <div className="wc-expiring-info">
                          <span className="wc-expiring-name">{item.entityName}</span>
                          <span className="wc-expiring-detail">{item.itemName}</span>
                        </div>
                        <div className="wc-expiring-status">
                          {item.daysUntilExpiry <= 0 ? (
                            <span className="wc-badge wc-badge-danger">Expired</span>
                          ) : (
                            <span className={`wc-badge wc-badge-${item.urgency}`}>
                              {item.daysUntilExpiry}d
                            </span>
                          )}
                          <span className="wc-expiring-date">{formatDate(item.expirationDate)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Incidents Preview */}
            <div className="wc-card">
              <div className="wc-card-header">
                <h3>
                  <AlertOctagon size={18} className="wc-icon-danger" />
                  Recent Incidents
                </h3>
                <button className="wc-link" onClick={() => setActiveTab('incidents')}>
                  View All <ChevronRight size={16} />
                </button>
              </div>
              <div className="wc-card-body wc-card-body-scroll">
                {recentIncidents.length === 0 ? (
                  <div className="wc-empty-state">
                    <CheckCircle size={32} className="wc-icon-success" />
                    <p>No recent incidents</p>
                  </div>
                ) : (
                  <div className="wc-incident-list">
                    {recentIncidents.slice(0, 5).map(incident => {
                      const badge = getClassificationBadge(incident.classification);
                      return (
                        <div key={incident.id} className="wc-incident-item">
                          <div className="wc-incident-header">
                            <span className={`wc-classification-badge ${badge.bg} ${badge.text} ${badge.border}`}>
                              {incident.classification.replace(/_/g, ' ')}
                            </span>
                            <span className="wc-incident-date">
                              <Calendar size={12} />
                              {formatDate(incident.incidentDate)}
                            </span>
                          </div>
                          <p className="wc-incident-desc">{incident.description}</p>
                          <div className="wc-incident-footer">
                            <span className="wc-incident-number">{incident.incidentNumber ?? 'N/A'}</span>
                            <span className={`wc-status-badge ${incident.status === 'closed' ? 'wc-status-closed' : 'wc-status-open'}`}>
                              {incident.status ?? 'unknown'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Expiring Credentials Tab */}
        {activeTab === 'expiring' && (
          <div className="wc-card">
            <div className="wc-card-header">
              <h3>
                <AlertTriangle size={18} className="wc-icon-warning" />
                Expiring Credentials ({expiringItems.length})
              </h3>
            </div>
            <div className="wc-card-body">
              {expiringItems.length === 0 ? (
                <div className="wc-empty-state wc-empty-large">
                  <CheckCircle size={48} className="wc-icon-success" />
                  <h4>All Clear</h4>
                  <p>No certifications, licenses, or insurance expiring in the next 30 days</p>
                </div>
              ) : (
                <table className="wc-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Name</th>
                      <th>Credential</th>
                      <th>Expiration</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiringItems.map(item => (
                      <tr key={item.id} className={`wc-row-${item.urgency}`}>
                        <td>
                          <span className="wc-type-badge">
                            {getTypeIcon(item.type)}
                            {item.type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="wc-cell-name">{item.entityName}</td>
                        <td>{item.itemName}</td>
                        <td className="wc-cell-date">{formatDate(item.expirationDate)}</td>
                        <td>
                          {item.daysUntilExpiry <= 0 ? (
                            <span className="wc-badge wc-badge-danger">Expired</span>
                          ) : (
                            <span className={`wc-badge wc-badge-${item.urgency}`}>
                              {item.daysUntilExpiry} days
                            </span>
                          )}
                        </td>
                        <td>
                          <button className="wc-btn-icon">
                            <ExternalLink size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Incidents Tab */}
        {activeTab === 'incidents' && (
          <div className="wc-card">
            <div className="wc-card-header">
              <h3>
                <AlertOctagon size={18} className="wc-icon-danger" />
                Recent Incidents ({recentIncidents.length})
              </h3>
            </div>
            <div className="wc-card-body">
              {recentIncidents.length === 0 ? (
                <div className="wc-empty-state wc-empty-large">
                  <CheckCircle size={48} className="wc-icon-success" />
                  <h4>No Incidents</h4>
                  <p>No safety incidents have been reported</p>
                </div>
              ) : (
                <table className="wc-table">
                  <thead>
                    <tr>
                      <th>Incident #</th>
                      <th>Classification</th>
                      <th>Description</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentIncidents.map(incident => {
                      const badge = getClassificationBadge(incident.classification);
                      return (
                        <tr key={incident.id}>
                          <td className="wc-cell-mono">{incident.incidentNumber ?? 'N/A'}</td>
                          <td>
                            <span className={`wc-classification-badge ${badge.bg} ${badge.text} ${badge.border}`}>
                              {incident.classification.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="wc-cell-desc">{incident.description}</td>
                          <td className="wc-cell-date">{formatDate(incident.incidentDate)}</td>
                          <td>
                            <span className={`wc-status-badge ${incident.status === 'closed' ? 'wc-status-closed' : 'wc-status-open'}`}>
                              {incident.status ?? 'unknown'}
                            </span>
                          </td>
                          <td>
                            <button className="wc-btn-icon">
                              <ExternalLink size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Overrides Tab */}
        {activeTab === 'overrides' && (
          <div className="wc-card">
            <div className="wc-card-header">
              <h3>
                <AlertOctagon size={18} className="wc-icon-warning" />
                Active Overrides ({activeOverrides.length})
              </h3>
            </div>
            <div className="wc-card-body">
              {activeOverrides.length === 0 ? (
                <div className="wc-empty-state wc-empty-large">
                  <CheckCircle size={48} className="wc-icon-success" />
                  <h4>No Active Overrides</h4>
                  <p>There are no emergency overrides currently in effect</p>
                </div>
              ) : (
                <div className="wc-override-list">
                  {activeOverrides.map(override => (
                    <div key={override.id} className="wc-override-card">
                      <div className="wc-override-header">
                        <span className="wc-override-type">{override.overrideType.replace(/_/g, ' ')}</span>
                        <span className="wc-override-expires">
                          Expires in {override.expiresAt ? formatTimeRemaining(override.expiresAt) : 'N/A'}
                        </span>
                      </div>
                      <div className="wc-override-body">
                        <div className="wc-override-detail">
                          <span className="wc-override-label">Blocked Action</span>
                          <span className="wc-override-value">{override.blockedAction ?? 'N/A'}</span>
                        </div>
                        <div className="wc-override-detail">
                          <span className="wc-override-label">Project</span>
                          <span className="wc-override-value">{override.projectName}</span>
                        </div>
                      </div>
                      <div className="wc-override-actions">
                        <button className="wc-btn wc-btn-secondary">View Details</button>
                        <button className="wc-btn wc-btn-danger">Revoke Override</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkforceComplianceDashboard;
