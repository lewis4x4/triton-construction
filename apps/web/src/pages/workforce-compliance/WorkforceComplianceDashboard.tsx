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

export function WorkforceComplianceDashboard() {
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [expiringItems, setExpiringItems] = useState<ExpiringItem[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<RecentIncident[]>([]);
  const [activeOverrides, setActiveOverrides] = useState<ActiveOverride[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
          .limit(5),

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
          .limit(5),
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

  if (isLoading) {
    return (
      <div className="wc-dashboard loading">
        <div className="loading-spinner" />
        <p>Loading compliance data...</p>
      </div>
    );
  }

  return (
    <div className="wc-dashboard">
      <header className="wc-header">
        <div className="header-title">
          <Shield size={32} />
          <div>
            <h1>Workforce Compliance</h1>
            <p>Real-time compliance monitoring and safety management</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary">
            <FileText size={18} />
            Export Report
          </button>
          <button className="btn btn-primary">
            <Users size={18} />
            Add Employee
          </button>
        </div>
      </header>

      {/* Active Overrides Alert */}
      {activeOverrides.length > 0 && (
        <div className="override-alert">
          <AlertOctagon size={24} />
          <div className="override-alert-content">
            <strong>{activeOverrides.length} Active Override{activeOverrides.length > 1 ? 's' : ''}</strong>
            <span>Emergency overrides are in effect and require review</span>
          </div>
          <button className="btn btn-warning">Review Overrides</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card employees">
          <div className="stat-icon">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats?.totalEmployees || 0}</div>
            <div className="stat-label">Active Employees</div>
            <div className="stat-detail">
              <span className={`compliance-rate ${getCompliancePercentage() >= 90 ? 'good' : getCompliancePercentage() >= 70 ? 'warning' : 'critical'}`}>
                {getCompliancePercentage()}% Compliant
              </span>
            </div>
          </div>
        </div>

        <div className="stat-card subcontractors">
          <div className="stat-icon">
            <Building2 size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats?.totalSubcontractors || 0}</div>
            <div className="stat-label">Subcontractors</div>
            <div className="stat-detail">
              <span className={`compliance-rate ${getSubCompliancePercentage() >= 90 ? 'good' : getSubCompliancePercentage() >= 70 ? 'warning' : 'critical'}`}>
                {getSubCompliancePercentage()}% COI Valid
              </span>
            </div>
          </div>
        </div>

        <div className="stat-card expiring">
          <div className="stat-icon">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats?.expiringSoon || 0}</div>
            <div className="stat-label">Expiring in 30 Days</div>
            <div className="stat-detail">
              <span className={expiringItems.filter(i => i.urgency === 'critical').length > 0 ? 'critical' : 'warning'}>
                {expiringItems.filter(i => i.urgency === 'critical').length} expired
              </span>
            </div>
          </div>
        </div>

        <div className="stat-card safety">
          <div className="stat-icon">
            <HardHat size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats?.incidentsYTD || 0}</div>
            <div className="stat-label">Incidents YTD</div>
            <div className="stat-detail">
              <TrendingUp size={14} />
              <span>Safety metrics</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="content-grid">
        {/* Expiring Items */}
        <div className="panel expiring-panel">
          <div className="panel-header">
            <h3>
              <AlertTriangle size={20} />
              Expiring Credentials & Insurance
            </h3>
            <span className="badge">{expiringItems.length}</span>
          </div>
          <div className="panel-content">
            {expiringItems.length === 0 ? (
              <div className="empty-state">
                <CheckCircle size={32} />
                <p>No items expiring in the next 30 days</p>
              </div>
            ) : (
              <div className="expiring-list">
                {expiringItems.slice(0, 10).map(item => (
                  <div key={item.id} className={`expiring-item ${item.urgency}`}>
                    <div className="expiring-icon">
                      {item.type === 'certification' && <ClipboardCheck size={18} />}
                      {item.type === 'insurance' && <Shield size={18} />}
                      {item.type === 'license' && <FileText size={18} />}
                      {item.type === 'medical_card' && <FileText size={18} />}
                    </div>
                    <div className="expiring-details">
                      <div className="expiring-name">{item.entityName}</div>
                      <div className="expiring-item-name">{item.itemName}</div>
                    </div>
                    <div className="expiring-date">
                      {item.daysUntilExpiry <= 0 ? (
                        <span className="expired-badge">EXPIRED</span>
                      ) : (
                        <span className={`days-badge ${item.urgency}`}>
                          {item.daysUntilExpiry}d
                        </span>
                      )}
                      <span className="date-text">{formatDate(item.expirationDate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Incidents */}
        <div className="panel incidents-panel">
          <div className="panel-header">
            <h3>
              <AlertOctagon size={20} />
              Recent Incidents
            </h3>
            <button className="btn btn-link">View All</button>
          </div>
          <div className="panel-content">
            {recentIncidents.length === 0 ? (
              <div className="empty-state">
                <CheckCircle size={32} />
                <p>No recent incidents</p>
              </div>
            ) : (
              <div className="incidents-list">
                {recentIncidents.map(incident => (
                  <div key={incident.id} className="incident-item">
                    <div className={`incident-classification ${incident.classification}`}>
                      {incident.classification.replace(/_/g, ' ')}
                    </div>
                    <div className="incident-details">
                      <div className="incident-number">{incident.incidentNumber ?? 'N/A'}</div>
                      <div className="incident-description">{incident.description}</div>
                      <div className="incident-meta">
                        <Calendar size={12} />
                        {formatDate(incident.incidentDate)}
                        <span className={`status-badge ${incident.status ?? 'unknown'}`}>{incident.status ?? 'unknown'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active Overrides */}
        {activeOverrides.length > 0 && (
          <div className="panel overrides-panel">
            <div className="panel-header">
              <h3>
                <AlertOctagon size={20} />
                Active Overrides
              </h3>
              <span className="badge warning">{activeOverrides.length}</span>
            </div>
            <div className="panel-content">
              <div className="overrides-list">
                {activeOverrides.map(override => (
                  <div key={override.id} className="override-item">
                    <div className="override-type">{override.overrideType.replace(/_/g, ' ')}</div>
                    <div className="override-details">
                      <div className="override-action">{override.blockedAction ?? 'N/A'}</div>
                      <div className="override-meta">
                        <span className="project">{override.projectName}</span>
                        <span className="expires">
                          Expires in {override.expiresAt ? formatTimeRemaining(override.expiresAt) : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <button className="btn btn-sm btn-warning">Review</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="panel actions-panel">
          <div className="panel-header">
            <h3>Quick Actions</h3>
          </div>
          <div className="panel-content">
            <div className="quick-actions">
              <button className="action-btn">
                <Users size={24} />
                <span>Add Employee</span>
              </button>
              <button className="action-btn">
                <Building2 size={24} />
                <span>Add Subcontractor</span>
              </button>
              <button className="action-btn">
                <ClipboardCheck size={24} />
                <span>Record Training</span>
              </button>
              <button className="action-btn">
                <AlertOctagon size={24} />
                <span>Report Incident</span>
              </button>
              <button className="action-btn">
                <Truck size={24} />
                <span>Fleet Status</span>
              </button>
              <button className="action-btn">
                <HardHat size={24} />
                <span>Safety Meeting</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkforceComplianceDashboard;
