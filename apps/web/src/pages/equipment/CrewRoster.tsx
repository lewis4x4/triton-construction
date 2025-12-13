import { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  Search,
  Filter,
  RefreshCw,
  Award,
  AlertTriangle,
  Clock,
  ChevronRight,
  Shield,
  Wrench,
  Phone,
  Mail,
  Building,
  BadgeCheck,
  AlertOctagon,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './CrewRoster.css';

interface CrewMember {
  id: string;
  employee_id: string | null;
  employee_number: string | null;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  trade_classification: string | null;
  employment_status: string | null;
  is_active: boolean;
  hire_date: string | null;
  current_project_id: string | null;
  project_number: string | null;
  project_name: string | null;
  union_local: string | null;
  union_member_number: string | null;
  total_certifications: number;
  valid_certifications: number;
  expiring_certifications: number;
  expired_certifications: number;
  compliance_status: string;
  has_osha_10: boolean;
  has_osha_30: boolean;
  has_cdl: boolean;
  has_first_aid: boolean;
  operator_qualified_count: number;
}

interface RosterStats {
  totalCrew: number;
  activeCrew: number;
  compliantCrew: number;
  expiringCerts: number;
  expiredCerts: number;
  oshaTrainedPercent: number;
}

interface CertificationAlert {
  id: string;
  display_name: string;
  certification_name: string;
  expiration_date: string;
  days_until_expiry: number;
  status: 'expired' | 'expiring';
}

export function CrewRoster() {
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [stats, setStats] = useState<RosterStats | null>(null);
  const [certAlerts, setCertAlerts] = useState<CertificationAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tradeFilter, setTradeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [complianceFilter, setComplianceFilter] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<CrewMember | null>(null);

  useEffect(() => {
    loadRosterData();
  }, []);

  const loadRosterData = async () => {
    setIsLoading(true);
    try {
      // Load crew roster view
      const { data: rosterData, error } = await supabase
        .from('v_crew_roster')
        .select('*')
        .order('display_name');

      if (error) throw error;

      // Map the view data to our interface
      const members: CrewMember[] = (rosterData || []).map((m: any) => ({
        id: m.id,
        employee_id: m.employee_id,
        employee_number: m.employee_number || m.employee_id,
        display_name: m.display_name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Unknown',
        first_name: m.first_name,
        last_name: m.last_name,
        email: m.email,
        phone: m.phone,
        trade_classification: m.trade_classification,
        employment_status: m.employment_status || m.employment_type,
        is_active: m.is_active ?? true,
        hire_date: m.hire_date,
        current_project_id: m.current_project_id,
        project_number: m.project_number,
        project_name: m.project_name,
        union_local: m.union_local,
        union_member_number: m.union_member_number,
        total_certifications: m.total_certifications || m.active_cert_count || 0,
        valid_certifications: m.valid_certifications || m.active_cert_count || 0,
        expiring_certifications: m.expiring_certifications || 0,
        expired_certifications: m.expired_certifications || 0,
        compliance_status: m.compliance_status || m.certification_status || 'UNKNOWN',
        has_osha_10: m.has_osha_10 ?? false,
        has_osha_30: m.has_osha_30 ?? false,
        has_cdl: m.has_cdl || !!m.cdl_expiry,
        has_first_aid: m.has_first_aid ?? false,
        operator_qualified_count: m.operator_qualified_count || 0,
      }));
      setCrewMembers(members);

      // Calculate stats
      const activeCount = members.filter(m => m.is_active).length;
      const compliantCount = members.filter(m => m.compliance_status === 'COMPLIANT').length;
      const expiringCount = members.reduce((sum, m) => sum + (m.expiring_certifications || 0), 0);
      const expiredCount = members.reduce((sum, m) => sum + (m.expired_certifications || 0), 0);
      const oshaTrainedCount = members.filter(m => m.has_osha_10 || m.has_osha_30).length;

      setStats({
        totalCrew: members.length,
        activeCrew: activeCount,
        compliantCrew: compliantCount,
        expiringCerts: expiringCount,
        expiredCerts: expiredCount,
        oshaTrainedPercent: members.length > 0
          ? Math.round((oshaTrainedCount / members.length) * 100)
          : 0,
      });

      // Build certification alerts - fetch separately for more detail
      const { data: expiringCertsData } = await supabase
        .from('employee_certifications')
        .select(`
          id,
          expiration_date,
          certification_types(name),
          employees(display_name)
        `)
        .not('expiration_date', 'is', null)
        .lte('expiration_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('expiration_date')
        .limit(10);

      if (expiringCertsData) {
        const alerts: CertificationAlert[] = expiringCertsData.map((cert: any) => {
          const expDate = new Date(cert.expiration_date);
          const now = new Date();
          const daysUntil = Math.floor((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          return {
            id: cert.id,
            display_name: cert.employees?.display_name || 'Unknown',
            certification_name: cert.certification_types?.name || 'Certificate',
            expiration_date: cert.expiration_date,
            days_until_expiry: daysUntil,
            status: daysUntil < 0 ? 'expired' : 'expiring',
          };
        });
        setCertAlerts(alerts);
      }
    } catch (error) {
      console.error('Error loading roster data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMembers = crewMembers.filter(member => {
    const matchesSearch = searchTerm === '' ||
      member.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.employee_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTrade = tradeFilter === 'all' ||
      member.trade_classification === tradeFilter;

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && member.is_active) ||
      (statusFilter === 'inactive' && !member.is_active);

    const matchesCompliance = complianceFilter === 'all' ||
      member.compliance_status === complianceFilter;

    return matchesSearch && matchesTrade && matchesStatus && matchesCompliance;
  });

  const trades = [...new Set(crewMembers.map(m => m.trade_classification).filter(Boolean))];

  const getComplianceIcon = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
        return <BadgeCheck className="compliance-icon compliant" />;
      case 'EXPIRING':
        return <AlertTriangle className="compliance-icon expiring" />;
      case 'NON_COMPLIANT':
        return <AlertOctagon className="compliance-icon non-compliant" />;
      default:
        return <Shield className="compliance-icon unknown" />;
    }
  };

  const getComplianceBadge = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
        return <span className="badge badge-success">Compliant</span>;
      case 'EXPIRING':
        return <span className="badge badge-warning">Expiring Soon</span>;
      case 'NON_COMPLIANT':
        return <span className="badge badge-danger">Non-Compliant</span>;
      default:
        return <span className="badge badge-gray">Unknown</span>;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatTrade = (trade: string | null) => {
    if (!trade) return '-';
    return trade.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <div className="crew-roster loading">
        <div className="loading-spinner">
          <RefreshCw className="spin" />
          <span>Loading crew roster...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="crew-roster">
      <header className="dashboard-header">
        <div className="header-title">
          <Users size={28} />
          <h1>Crew Roster</h1>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={loadRosterData}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="btn btn-primary">
            <UserCheck size={16} />
            Add Crew Member
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <Users />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.totalCrew || 0}</span>
            <span className="stat-label">Total Crew</span>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">
            <UserCheck />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.activeCrew || 0}</span>
            <span className="stat-label">Active</span>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">
            <BadgeCheck />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.compliantCrew || 0}</span>
            <span className="stat-label">Compliant</span>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">
            <AlertTriangle />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.expiringCerts || 0}</span>
            <span className="stat-label">Certs Expiring</span>
          </div>
        </div>

        <div className="stat-card danger">
          <div className="stat-icon">
            <AlertOctagon />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.expiredCerts || 0}</span>
            <span className="stat-label">Certs Expired</span>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">
            <Award />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.oshaTrainedPercent || 0}%</span>
            <span className="stat-label">OSHA Trained</span>
          </div>
        </div>
      </div>

      {/* Certification Alerts */}
      {certAlerts.length > 0 && (
        <div className="alerts-panel">
          <h3>
            <AlertTriangle size={18} />
            Certification Alerts
          </h3>
          <div className="alerts-list">
            {certAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`alert-item ${alert.status === 'expired' ? 'critical' : 'warning'}`}
              >
                <div className="alert-icon">
                  {alert.status === 'expired' ? (
                    <AlertOctagon size={16} />
                  ) : (
                    <AlertTriangle size={16} />
                  )}
                </div>
                <div className="alert-content">
                  <span className="alert-name">{alert.display_name}</span>
                  <span className="alert-message">
                    {alert.certification_name} -
                    {alert.status === 'expired'
                      ? ` Expired ${Math.abs(alert.days_until_expiry)} days ago`
                      : ` Expires in ${alert.days_until_expiry} days`
                    }
                  </span>
                </div>
                <ChevronRight size={16} className="alert-arrow" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search crew members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <Filter size={16} />
          <select
            value={tradeFilter}
            onChange={(e) => setTradeFilter(e.target.value)}
          >
            <option value="all">All Trades</option>
            {trades.map(trade => (
              <option key={trade} value={trade!}>{formatTrade(trade)}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="filter-group">
          <select
            value={complianceFilter}
            onChange={(e) => setComplianceFilter(e.target.value)}
          >
            <option value="all">All Compliance</option>
            <option value="COMPLIANT">Compliant</option>
            <option value="EXPIRING">Expiring Soon</option>
            <option value="NON_COMPLIANT">Non-Compliant</option>
          </select>
        </div>
      </div>

      {/* Crew Table */}
      <div className="crew-table-container">
        <table className="crew-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Employee #</th>
              <th>Trade</th>
              <th>Status</th>
              <th>Project</th>
              <th>Certifications</th>
              <th>Compliance</th>
              <th>Qualifications</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map(member => (
              <tr
                key={member.id}
                onClick={() => setSelectedMember(member)}
                className={selectedMember?.id === member.id ? 'selected' : ''}
              >
                <td className="member-name">
                  {getComplianceIcon(member.compliance_status)}
                  <div className="name-info">
                    <span className="name">{member.display_name}</span>
                    {member.email && (
                      <span className="email">{member.email}</span>
                    )}
                  </div>
                </td>
                <td className="employee-number">{member.employee_number || '-'}</td>
                <td>{formatTrade(member.trade_classification)}</td>
                <td>
                  <span className={`status-badge ${member.is_active ? 'active' : 'inactive'}`}>
                    {member.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="project-cell">
                  {member.project_name ? (
                    <span className="project-name">
                      <Building size={12} />
                      {member.project_number}: {member.project_name}
                    </span>
                  ) : (
                    <span className="no-project">Unassigned</span>
                  )}
                </td>
                <td className="cert-cell">
                  <div className="cert-counts">
                    <span className="cert-valid" title="Valid certifications">
                      <BadgeCheck size={12} />
                      {member.valid_certifications}
                    </span>
                    {member.expiring_certifications > 0 && (
                      <span className="cert-expiring" title="Expiring soon">
                        <Clock size={12} />
                        {member.expiring_certifications}
                      </span>
                    )}
                    {member.expired_certifications > 0 && (
                      <span className="cert-expired" title="Expired">
                        <AlertOctagon size={12} />
                        {member.expired_certifications}
                      </span>
                    )}
                  </div>
                </td>
                <td>{getComplianceBadge(member.compliance_status)}</td>
                <td className="quals-cell">
                  <div className="qual-badges">
                    {member.has_osha_10 && <span className="qual-badge osha">OSHA 10</span>}
                    {member.has_osha_30 && <span className="qual-badge osha">OSHA 30</span>}
                    {member.has_cdl && <span className="qual-badge cdl">CDL</span>}
                    {member.has_first_aid && <span className="qual-badge first-aid">First Aid</span>}
                    {member.operator_qualified_count > 0 && (
                      <span className="qual-badge operator">
                        <Wrench size={10} />
                        {member.operator_qualified_count}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredMembers.length === 0 && (
          <div className="empty-state">
            <Users size={48} />
            <p>No crew members found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Member Detail Panel */}
      {selectedMember && (
        <>
        <div className="detail-panel-overlay" onClick={() => setSelectedMember(null)} />
        <div className="member-detail-panel">
          <div className="detail-header">
            <h3>{selectedMember.display_name}</h3>
            <button onClick={() => setSelectedMember(null)}>×</button>
          </div>
          <div className="detail-content">
            <div className="detail-row">
              <span className="label">Employee Number</span>
              <span className="value">{selectedMember.employee_number || '-'}</span>
            </div>
            <div className="detail-row">
              <span className="label">Email</span>
              <span className="value">
                {selectedMember.email ? (
                  <a href={`mailto:${selectedMember.email}`}>
                    <Mail size={12} />
                    {selectedMember.email}
                  </a>
                ) : '-'}
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Phone</span>
              <span className="value">
                {selectedMember.phone ? (
                  <a href={`tel:${selectedMember.phone}`}>
                    <Phone size={12} />
                    {selectedMember.phone}
                  </a>
                ) : '-'}
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Trade Classification</span>
              <span className="value">{formatTrade(selectedMember.trade_classification)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Employment Status</span>
              <span className="value">{formatTrade(selectedMember.employment_status)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Hire Date</span>
              <span className="value">{formatDate(selectedMember.hire_date)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Current Project</span>
              <span className="value">
                {selectedMember.project_name
                  ? `${selectedMember.project_number}: ${selectedMember.project_name}`
                  : 'Unassigned'
                }
              </span>
            </div>
            {selectedMember.union_local && (
              <>
                <div className="detail-row">
                  <span className="label">Union Local</span>
                  <span className="value">{selectedMember.union_local}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Union Member #</span>
                  <span className="value">{selectedMember.union_member_number || '-'}</span>
                </div>
              </>
            )}
            <div className="detail-section">
              <h4>Certifications</h4>
              <div className="cert-summary">
                <div className="cert-stat">
                  <span className="cert-stat-value">{selectedMember.total_certifications}</span>
                  <span className="cert-stat-label">Total</span>
                </div>
                <div className="cert-stat valid">
                  <span className="cert-stat-value">{selectedMember.valid_certifications}</span>
                  <span className="cert-stat-label">Valid</span>
                </div>
                <div className="cert-stat expiring">
                  <span className="cert-stat-value">{selectedMember.expiring_certifications}</span>
                  <span className="cert-stat-label">Expiring</span>
                </div>
                <div className="cert-stat expired">
                  <span className="cert-stat-value">{selectedMember.expired_certifications}</span>
                  <span className="cert-stat-label">Expired</span>
                </div>
              </div>
            </div>
            <div className="detail-section">
              <h4>Compliance Status</h4>
              {getComplianceBadge(selectedMember.compliance_status)}
            </div>
            <div className="detail-section">
              <h4>Qualifications</h4>
              <div className="qual-list">
                {selectedMember.has_osha_10 && <div className="qual-item">OSHA 10-Hour</div>}
                {selectedMember.has_osha_30 && <div className="qual-item">OSHA 30-Hour</div>}
                {selectedMember.has_cdl && <div className="qual-item">Commercial Driver's License</div>}
                {selectedMember.has_first_aid && <div className="qual-item">First Aid/CPR</div>}
                {selectedMember.operator_qualified_count > 0 && (
                  <div className="qual-item">
                    Equipment Operator ({selectedMember.operator_qualified_count} types)
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <button className="btn btn-secondary">View Certifications</button>
            <button className="btn btn-primary">Edit Member</button>
          </div>
        </div>
        </>
      )}
    </div>
  );
}

export default CrewRoster;
