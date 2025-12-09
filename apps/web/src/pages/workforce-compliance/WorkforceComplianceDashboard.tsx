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
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';


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
  const [showUploadModal, setShowUploadModal] = useState(false);

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
      <div className="flex items-center justify-center min-h-[400px] text-cyan-400">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-current" />
        <p className="mt-4 font-mono text-sm tracking-widest uppercase">Loading compliance data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="page-header">
        <div className="header-left">
          <div className="header-title">
            <h1>Workforce Compliance</h1>
            <p className="header-subtitle">Monitor and manage workforce certifications, training, and documentation</p>
          </div>
        </div>
        <div className="header-actions">
          <div className="flex items-center space-x-3">
            <button className="btn-secondary">
              <FileText size={18} />
              Reports
            </button>
            <button className="btn-primary" onClick={() => setShowUploadModal(true)}>
              <Upload size={18} />
              Upload Documents
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Active Overrides Alert */}
        {activeOverrides.length > 0 && (
          <div className="flex items-center gap-4 p-4 mb-6 bg-red-500/10 border border-red-500/30 rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.1)]">
            <AlertOctagon className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <strong className="block text-red-400 font-bold uppercase tracking-wider text-sm">
                {activeOverrides.length} Active Override{activeOverrides.length > 1 ? 's' : ''}
              </strong>
              <span className="text-red-400/80 text-xs font-mono">Emergency overrides are in effect and require review</span>
            </div>
            <button className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-bold shadow-lg">
              Review Overrides
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <div className="gravity-card p-6 border-cyan-500/30 bg-cyan-500/5">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                <Users className="w-6 h-6 text-cyan-400" />
              </div>
              <span className={`px-2 py-1 rounded text-xs font-mono font-bold ${getCompliancePercentage() >= 90 ? 'text-green-400 bg-green-500/10 border border-green-500/20' :
                getCompliancePercentage() >= 70 ? 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20' :
                  'text-red-400 bg-red-500/10 border border-red-500/20'
                }`}>
                {getCompliancePercentage()}% Compliant
              </span>
            </div>
            <div className="text-4xl font-bold text-white font-mono tracking-tighter drop-shadow-md">{stats?.totalEmployees || 0}</div>
            <div className="text-sm text-gray-400 mt-1 uppercase tracking-widest font-bold">Active Employees</div>
          </div>

          <div className="gravity-card p-6 border-purple-500/30 bg-purple-500/5">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <Building2 className="w-6 h-6 text-purple-400" />
              </div>
              <span className={`px-2 py-1 rounded text-xs font-mono font-bold ${getSubCompliancePercentage() >= 90 ? 'text-green-400 bg-green-500/10 border border-green-500/20' :
                getSubCompliancePercentage() >= 70 ? 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20' :
                  'text-red-400 bg-red-500/10 border border-red-500/20'
                }`}>
                {getSubCompliancePercentage()}% COI Valid
              </span>
            </div>
            <div className="text-4xl font-bold text-white font-mono tracking-tighter drop-shadow-md">{stats?.totalSubcontractors || 0}</div>
            <div className="text-sm text-gray-400 mt-1 uppercase tracking-widest font-bold">Subcontractors</div>
          </div>

          <div className="gravity-card p-6 border-orange-500/30 bg-orange-500/5">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <Clock className="w-6 h-6 text-orange-400" />
              </div>
              <span className={`px-2 py-1 rounded text-xs font-mono font-bold ${expiringItems.filter(i => i.urgency === 'critical').length > 0
                ? 'text-red-400 bg-red-500/10 border border-red-500/20'
                : 'text-orange-400 bg-orange-500/10 border border-orange-500/20'
                }`}>
                {expiringItems.filter(i => i.urgency === 'critical').length} expired
              </span>
            </div>
            <div className="text-4xl font-bold text-white font-mono tracking-tighter drop-shadow-md">{stats?.expiringSoon || 0}</div>
            <div className="text-sm text-gray-400 mt-1 uppercase tracking-widest font-bold">Expiring in 30 Days</div>
          </div>

          <div className="gravity-card p-6 border-green-500/30 bg-green-500/5">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <HardHat className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex items-center gap-1 text-xs text-green-400">
                <TrendingUp size={12} />
                <span className="font-mono">Metrics</span>
              </div>
            </div>
            <div className="text-4xl font-bold text-white font-mono tracking-tighter drop-shadow-md">{stats?.incidentsYTD || 0}</div>
            <div className="text-sm text-gray-400 mt-1 uppercase tracking-widest font-bold">Incidents YTD</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expiring Items */}
          <div className="gravity-card flex flex-col h-[500px]">
            <div className="p-5 border-b border-white/10 bg-white/5 flex justify-between items-center">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-widest">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                Expiring Credentials
              </h3>
              <span className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded-full shadow-lg">
                {expiringItems.length}
              </span>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
              {expiringItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
                  <CheckCircle size={32} className="text-green-500/50" />
                  <p className="font-mono text-sm">No items expiring in the next 30 days</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {expiringItems.slice(0, 10).map(item => (
                    <div key={item.id} className={`flex items-center gap-4 p-3 rounded-lg border bg-void-deep transition-all hover:bg-white/5 ${item.urgency === 'critical' ? 'border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.1)]' :
                      item.urgency === 'high' ? 'border-orange-500/40 shadow-[0_0_10px_rgba(249,115,22,0.1)]' :
                        'border-white/10'
                      }`}>
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 text-gray-400">
                        {item.type === 'certification' && <ClipboardCheck size={20} />}
                        {item.type === 'insurance' && <Shield size={20} />}
                        {item.type === 'license' && <FileText size={20} />}
                        {item.type === 'medical_card' && <FileText size={20} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">{item.entityName}</div>
                        <div className="text-xs text-gray-400 truncate mt-0.5">{item.itemName}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {item.daysUntilExpiry <= 0 ? (
                          <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded uppercase tracking-wider">Expired</span>
                        ) : (
                          <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider border ${item.urgency === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                            item.urgency === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                              'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            }`}>
                            {item.daysUntilExpiry}d
                          </span>
                        )}
                        <span className="text-[10px] text-gray-500 font-mono">{formatDate(item.expirationDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Incidents */}
          <div className="gravity-card flex flex-col h-[500px]">
            <div className="p-5 border-b border-white/10 bg-white/5 flex justify-between items-center">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-widest">
                <AlertOctagon className="w-5 h-5 text-red-400" />
                Recent Incidents
              </h3>
              <button className="text-cyan-400 text-xs hover:text-white transition-colors uppercase tracking-wider font-bold">View All</button>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
              {recentIncidents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
                  <CheckCircle size={32} className="text-green-500/50" />
                  <p className="font-mono text-sm">No recent incidents</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentIncidents.map(incident => (
                    <div key={incident.id} className="flex gap-4 p-3 rounded-lg border border-white/5 bg-white/5 hover:border-white/20 transition-all">
                      <div className={`writing-mode-vertical rotate-180 text-[10px] font-bold uppercase tracking-wider px-1 py-2 rounded flex items-center justify-center whitespace-nowrap min-h-[80px] ${incident.classification.includes('recordable') ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        incident.classification.includes('first_aid') ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                          incident.classification.includes('near_miss') ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                            'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                        }`}>
                        {incident.classification.replace(/_/g, ' ')}
                      </div>
                      <div className="flex-1 py-1">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-mono text-cyan-400">{incident.incidentNumber ?? 'N/A'}</span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${incident.status === 'closed' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            }`}>
                            {incident.status ?? 'unknown'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-300 line-clamp-2 leading-relaxed mb-3">{incident.description}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar size={12} />
                          <span className="font-mono">{formatDate(incident.incidentDate)}</span>
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
            <div className="gravity-card flex flex-col">
              <div className="p-5 border-b border-white/10 bg-white/5 flex justify-between items-center">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-widest">
                  <AlertOctagon className="w-5 h-5 text-yellow-400" />
                  Active Overrides
                </h3>
                <span className="px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded-full">
                  {activeOverrides.length}
                </span>
              </div>
              <div className="p-4 space-y-3">
                {activeOverrides.map(override => (
                  <div key={override.id} className="flex items-center gap-4 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 hover:bg-yellow-500/10 transition-colors">
                    <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-yellow-500 text-black whitespace-nowrap">
                      {override.overrideType.replace(/_/g, ' ')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-yellow-100 truncate">{override.blockedAction ?? 'N/A'}</div>
                      <div className="flex gap-3 mt-1 text-xs text-yellow-500/70 font-mono">
                        <span>{override.projectName}</span>
                        <span className="text-yellow-500">Expires in {override.expiresAt ? formatTimeRemaining(override.expiresAt) : 'N/A'}</span>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-400 text-xs font-bold uppercase rounded transition-colors border border-yellow-500/30">
                      Review
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="gravity-card flex flex-col">
            <div className="p-5 border-b border-white/10 bg-white/5">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Quick Actions</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { icon: Users, label: 'Add Employee' },
                  { icon: Building2, label: 'Add Subcontractor' },
                  { icon: ClipboardCheck, label: 'Record Training' },
                  { icon: AlertOctagon, label: 'Report Incident' },
                  { icon: Truck, label: 'Fleet Status' },
                  { icon: HardHat, label: 'Safety Meeting' }
                ].map((action, i) => (
                  <button key={i} className="flex flex-col items-center justify-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:text-cyan-400 transition-all group">
                    <action.icon size={24} className="text-gray-400 group-hover:text-cyan-400 transition-colors" />
                    <span className="text-xs font-medium text-gray-400 group-hover:text-white transition-colors">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkforceComplianceDashboard;
