import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import './SafetyDashboard.css';

// Interfaces matching ACTUAL database schema
interface SafetyMetric {
  id: string;
  metric_year: number;
  metric_month: number;
  metric_quarter: number;
  total_hours_worked: number;
  recordable_injuries: number;
  days_away_from_work: number;
  days_restricted_duty: number;
  days_job_transfer: number;
  near_misses_reported: number;
  safety_observations_positive: number;
  safety_observations_atrisk: number;
  toolbox_talks_conducted: number;
  trir: number;
  dart: number;
  emr: number;
}

interface Violation {
  id: string;
  citation_number: string;
  issue_date: string;
  violation_description: string;
  location_description: string;
  status: string;
  abatement_due_date: string;
  osha_standard_violated: string;
  issuing_agency: string;
  initial_penalty: number;
}

interface JSA {
  id: string;
  jsa_number: string;
  job_title: string;
  job_description: string;
  work_location: string;
  status: string;
  prepared_at: string;
  project: { name: string } | null;
}

interface ToolboxTalk {
  id: string;
  topic: string;
  topic_code: string;
  conducted_date: string;
  conducted_time: string;
  duration_minutes: number;
  total_attendees: number;
  acknowledged_count: number;
  content: string;
  presenter_name: string;
  hazards_discussed: string;
  safety_measures: string;
}

interface Incident {
  id: string;
  incident_number: string;
  incident_date: string;
  classification: string;
  description: string;
  location_description: string;
  status: string;
}

// NOTE: safety_observations table does NOT exist in production
// The database has safety_orientations instead - observations functionality removed

interface CrewMember {
  id: string;
  first_name: string;
  last_name: string;
  trade_classification: string;
  employment_status: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  job_title: string;
  employment_status: string;
}

export function SafetyDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'violations' | 'jsa' | 'toolbox' | 'incidents' | 'workforce'>('overview');
  const [metrics, setMetrics] = useState<SafetyMetric[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [jsas, setJsas] = useState<JSA[]>([]);
  const [toolboxTalks, setToolboxTalks] = useState<ToolboxTalk[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculated stats
  const [stats, setStats] = useState({
    trir: 0,
    dart: 0,
    hoursWorked: 0,
    recordableInjuries: 0,
    nearMisses: 0,
    openViolations: 0,
    toolboxTalksThisMonth: 0,
    pendingJSAs: 0,
    totalObservations: 0,
    positiveObservations: 0,
    emr: 0,
    totalWorkforce: 0,
  });

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadAllData();
    }
  }, [selectedProjectId]);

  async function loadProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, project_number')
      .order('name');

    if (!error && data) {
      setProjects(data);
      if (data.length > 0 && data[0]) {
        setSelectedProjectId(data[0].id);
      }
    }
    setLoading(false);
  }

  async function loadAllData() {
    setLoading(true);
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Load all data in parallel - using ACTUAL column names from production
    const [
      metricsResult,
      violationsResult,
      jsaResult,
      toolboxResult,
      incidentsResult,
      crewResult,
      employeesResult,
    ] = await Promise.all([
      // Safety metrics (with project_id added via migration 130)
      supabase
        .from('safety_metrics')
        .select('*')
        .eq('project_id', selectedProjectId)
        .eq('metric_year', currentYear)
        .order('metric_month', { ascending: false }),

      // Violations - NO severity column in actual table!
      supabase
        .from('safety_violations')
        .select('id, citation_number, issue_date, violation_description, location_description, status, abatement_due_date, osha_standard_violated, issuing_agency, initial_penalty')
        .eq('project_id', selectedProjectId)
        .in('status', ['OPEN', 'CONTESTED'])
        .order('issue_date', { ascending: false }),

      // JSAs (correct columns: jsa_number, job_title, job_description, etc.)
      supabase
        .from('job_safety_analysis')
        .select('id, jsa_number, job_title, job_description, work_location, status, prepared_at, project:projects(name)')
        .eq('project_id', selectedProjectId)
        .order('prepared_at', { ascending: false })
        .limit(15),

      // Toolbox talks - ACTUAL columns: conducted_date, total_attendees, content
      supabase
        .from('toolbox_talks')
        .select('id, topic, topic_code, conducted_date, conducted_time, duration_minutes, total_attendees, acknowledged_count, content, presenter_name, hazards_discussed, safety_measures')
        .eq('project_id', selectedProjectId)
        .order('conducted_date', { ascending: false })
        .limit(15),

      // Incidents (correct columns: classification, location_description)
      supabase
        .from('incidents')
        .select('id, incident_number, incident_date, classification, description, location_description, status')
        .eq('project_id', selectedProjectId)
        .order('incident_date', { ascending: false })
        .limit(20),

      // NOTE: safety_observations table does NOT exist - removed query

      // Crew members
      supabase
        .from('crew_members')
        .select('id, first_name, last_name, trade_classification, employment_status')
        .eq('employment_status', 'ACTIVE')
        .limit(50),

      // Employees
      supabase
        .from('employees')
        .select('id, first_name, last_name, job_title, employment_status')
        .eq('employment_status', 'active')
        .limit(50),
    ]);

    // Process metrics
    if (metricsResult.data) {
      setMetrics(metricsResult.data as SafetyMetric[]);
      calculateStats(metricsResult.data as SafetyMetric[], currentMonth);
    }

    // Process violations
    if (violationsResult.data) {
      setViolations(violationsResult.data as Violation[]);
      setStats(prev => ({ ...prev, openViolations: violationsResult.data?.length || 0 }));
    }

    // Process JSAs
    if (jsaResult.data) {
      setJsas(jsaResult.data as JSA[]);
      const pending = jsaResult.data.filter(j => j.status === 'PENDING_REVIEW' || j.status === 'DRAFT').length;
      setStats(prev => ({ ...prev, pendingJSAs: pending }));
    }

    // Process toolbox talks
    if (toolboxResult.data) {
      setToolboxTalks(toolboxResult.data as ToolboxTalk[]);
    }

    // Process incidents
    if (incidentsResult.data) {
      setIncidents(incidentsResult.data as Incident[]);
    }

    // NOTE: safety_observations table doesn't exist - stats come from safety_metrics

    // Process workforce data
    if (crewResult.data) {
      setCrewMembers(crewResult.data as CrewMember[]);
    }
    if (employeesResult.data) {
      setEmployees(employeesResult.data as Employee[]);
      setStats(prev => ({
        ...prev,
        totalWorkforce: (crewResult.data?.length || 0) + (employeesResult.data?.length || 0)
      }));
    }

    setLoading(false);
  }

  function calculateStats(metricsData: SafetyMetric[], currentMonth: number) {
    const ytdHours = metricsData.reduce((sum, m) => sum + (m.total_hours_worked || 0), 0);
    const ytdRecordables = metricsData.reduce((sum, m) => sum + (m.recordable_injuries || 0), 0);
    const ytdDaysAway = metricsData.reduce((sum, m) => sum + (m.days_away_from_work || 0), 0);
    const ytdDaysRestricted = metricsData.reduce((sum, m) => sum + (m.days_restricted_duty || 0), 0);
    const ytdDaysTransfer = metricsData.reduce((sum, m) => sum + (m.days_job_transfer || 0), 0);
    const ytdNearMisses = metricsData.reduce((sum, m) => sum + (m.near_misses_reported || 0), 0);
    const currentMonthData = metricsData.find(m => m.metric_month === currentMonth);
    const latestEmr = metricsData[0]?.emr || 0;

    // TRIR = (Recordables * 200,000) / Hours Worked
    const trir = ytdHours > 0 ? (ytdRecordables * 200000) / ytdHours : 0;
    // DART = ((Days Away + Days Restricted + Days Transfer) * 200,000) / Hours Worked
    const dart = ytdHours > 0 ? ((ytdDaysAway + ytdDaysRestricted + ytdDaysTransfer) * 200000) / ytdHours : 0;

    setStats(prev => ({
      ...prev,
      hoursWorked: ytdHours,
      recordableInjuries: ytdRecordables,
      nearMisses: ytdNearMisses,
      trir: trir,
      dart: dart,
      emr: latestEmr,
      toolboxTalksThisMonth: currentMonthData?.toolbox_talks_conducted || 0,
    }));
  }

  function getSeverityColor(severity: string) {
    const s = severity?.toLowerCase();
    if (s === 'willful' || s === 'repeat') return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (s === 'serious') return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  }

  function getStatusColor(status: string) {
    const s = status?.toLowerCase();
    if (s === 'closed' || s === 'approved') return 'bg-green-500/20 text-green-400';
    if (s === 'open' || s === 'investigating' || s === 'pending_review') return 'bg-amber-500/20 text-amber-400';
    if (s === 'contested' || s === 'draft') return 'bg-blue-500/20 text-blue-400';
    return 'bg-gray-500/20 text-gray-400';
  }

  function getObservationTypeLabel(type: string) {
    const labels: Record<string, string> = {
      'safe_behavior': 'Safe Behavior',
      'at_risk_behavior': 'At-Risk',
      'hazard_identified': 'Hazard',
      'near_miss': 'Near Miss',
      'positive_recognition': 'Recognition',
      'condition_corrected': 'Corrected'
    };
    return labels[type] || type;
  }

  function getClassificationLabel(classification: string) {
    const labels: Record<string, string> = {
      'fatality': 'Fatality',
      'hospitalization': 'Hospitalization',
      'amputation': 'Amputation',
      'loss_of_eye': 'Loss of Eye',
      'recordable_injury': 'Recordable',
      'first_aid_only': 'First Aid',
      'near_miss': 'Near Miss',
      'property_damage': 'Property Damage',
      'environmental': 'Environmental',
      'third_party': 'Third Party'
    };
    return labels[classification] || classification;
  }

  if (loading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-cyan-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
      </div>
    );
  }

  return (
    <div className="safety-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Safety Management</h1>
            <p className="header-subtitle">OSHA Compliance, Incidents, JSAs & Workforce Safety</p>
          </div>
          <div className="header-right">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="project-select"
            >
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.project_number} - {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="safety-content">
        {/* KPI Cards - North Star Metrics */}
        <div className="kpi-grid">
          <div className="kpi-card trir">
            <div className="kpi-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            </div>
            <div className="kpi-data">
              <span className="kpi-value">{stats.trir.toFixed(2)}</span>
              <span className="kpi-label">TRIR (YTD)</span>
              <span className={`kpi-target ${stats.trir <= 3.0 ? 'good' : 'warning'}`}>
                Target: &lt; 3.0
              </span>
            </div>
          </div>

          <div className="kpi-card dart">
            <div className="kpi-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </div>
            <div className="kpi-data">
              <span className="kpi-value">{stats.dart.toFixed(2)}</span>
              <span className="kpi-label">DART Rate</span>
              <span className={`kpi-target ${stats.dart <= 2.0 ? 'good' : 'warning'}`}>
                Target: &lt; 2.0
              </span>
            </div>
          </div>

          <div className="kpi-card hours">
            <div className="kpi-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <div className="kpi-data">
              <span className="kpi-value">{stats.hoursWorked.toLocaleString()}</span>
              <span className="kpi-label">Hours Worked</span>
              <span className="kpi-target neutral">Year to Date</span>
            </div>
          </div>

          <div className="kpi-card violations">
            <div className="kpi-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            </div>
            <div className="kpi-data">
              <span className={`kpi-value ${stats.openViolations > 0 ? 'danger' : 'success'}`}>
                {stats.openViolations}
              </span>
              <span className="kpi-label">Open Violations</span>
              <span className={`kpi-target ${stats.openViolations === 0 ? 'good' : 'danger'}`}>
                {stats.openViolations > 0 ? 'Action Required' : 'All Clear'}
              </span>
            </div>
          </div>

          <div className="kpi-card emr">
            <div className="kpi-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
            </div>
            <div className="kpi-data">
              <span className="kpi-value">{stats.emr.toFixed(2)}</span>
              <span className="kpi-label">EMR</span>
              <span className={`kpi-target ${stats.emr <= 1.0 ? 'good' : 'warning'}`}>
                Target: &lt; 1.0
              </span>
            </div>
          </div>

          <div className="kpi-card workforce">
            <div className="kpi-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            </div>
            <div className="kpi-data">
              <span className="kpi-value">{stats.totalWorkforce}</span>
              <span className="kpi-label">Active Workforce</span>
              <span className="kpi-target neutral">
                {crewMembers.length} Crew + {employees.length} Staff
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="quick-stats">
          <div className="quick-stat">
            <span className="quick-stat-value">{stats.recordableInjuries}</span>
            <span className="quick-stat-label">Recordables YTD</span>
          </div>
          <div className="quick-stat">
            <span className="quick-stat-value">{stats.nearMisses}</span>
            <span className="quick-stat-label">Near Misses</span>
          </div>
          <div className="quick-stat">
            <span className="quick-stat-value">{stats.pendingJSAs}</span>
            <span className="quick-stat-label">Pending JSAs</span>
          </div>
          <div className="quick-stat">
            <span className="quick-stat-value">{stats.toolboxTalksThisMonth}</span>
            <span className="quick-stat-label">Talks This Month</span>
          </div>
          <div className="quick-stat">
            <span className="quick-stat-value">{stats.totalObservations}</span>
            <span className="quick-stat-label">Observations</span>
          </div>
          <div className="quick-stat positive">
            <span className="quick-stat-value">{stats.positiveObservations}</span>
            <span className="quick-stat-label">Positive</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'violations', label: 'Violations' },
            { key: 'jsa', label: 'JSA/JHA' },
            { key: 'toolbox', label: 'Toolbox Talks' },
            { key: 'incidents', label: 'Incidents' },
            { key: 'workforce', label: 'Workforce Safety' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'overview' && (
            <div className="overview-grid">
              {/* Monthly Metrics Table */}
              <div className="panel metrics-panel">
                <h3>Monthly Safety Metrics - {new Date().getFullYear()}</h3>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th className="text-right">Hours</th>
                        <th className="text-right">Recordables</th>
                        <th className="text-right">Days Away</th>
                        <th className="text-right">Near Misses</th>
                        <th className="text-right">Observations</th>
                        <th className="text-right">Talks</th>
                        <th className="text-right">TRIR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.length > 0 ? metrics.map(metric => (
                        <tr key={metric.id}>
                          <td>
                            {new Date(metric.metric_year, (metric.metric_month || 1) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </td>
                          <td className="text-right mono">{metric.total_hours_worked?.toLocaleString() || 0}</td>
                          <td className="text-right mono">{metric.recordable_injuries || 0}</td>
                          <td className="text-right mono">{metric.days_away_from_work || 0}</td>
                          <td className="text-right mono">{metric.near_misses_reported || 0}</td>
                          <td className="text-right mono">{(metric.safety_observations_positive || 0) + (metric.safety_observations_atrisk || 0)}</td>
                          <td className="text-right mono">{metric.toolbox_talks_conducted || 0}</td>
                          <td className={`text-right mono ${(metric.trir || 0) > 3 ? 'text-red-400' : 'text-green-400'}`}>
                            {metric.trir?.toFixed(2) || '0.00'}
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={8} className="text-center text-gray-500 py-8">
                            No metrics data available for this project. Run migration 130 to add sample data.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Incidents Summary */}
              <div className="panel incidents-summary-panel">
                <h3>Recent Incidents & Near Misses</h3>
                <div className="incidents-list">
                  {incidents.length > 0 ? incidents.slice(0, 5).map(inc => (
                    <div key={inc.id} className={`incident-item ${inc.classification}`}>
                      <div className="incident-header">
                        <span className={`incident-classification ${inc.classification}`}>
                          {getClassificationLabel(inc.classification)}
                        </span>
                        <span className="incident-date">
                          {new Date(inc.incident_date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="incident-desc">{inc.description}</p>
                      <span className="incident-location">{inc.location_description}</span>
                    </div>
                  )) : (
                    <div className="empty-state">No incidents recorded - Safety first!</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'violations' && (
            <div className="panel">
              <div className="panel-header">
                <h3>Safety Violations & Citations</h3>
                <button className="btn-primary">+ New Violation</button>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Citation #</th>
                      <th>Issue Date</th>
                      <th>Description</th>
                      <th>OSHA Standard</th>
                      <th>Location</th>
                      <th>Penalty</th>
                      <th>Status</th>
                      <th>Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {violations.length > 0 ? violations.map(v => (
                      <tr key={v.id} className="clickable">
                        <td className="mono text-cyan-400">{v.citation_number}</td>
                        <td>{new Date(v.issue_date).toLocaleDateString()}</td>
                        <td className="max-w-xs truncate">{v.violation_description}</td>
                        <td className="mono text-xs">{v.osha_standard_violated}</td>
                        <td>{v.location_description}</td>
                        <td className="mono text-amber-400">
                          ${(v.initial_penalty || 0).toLocaleString()}
                        </td>
                        <td>
                          <span className={`badge ${getStatusColor(v.status)}`}>
                            {v.status}
                          </span>
                        </td>
                        <td className={new Date(v.abatement_due_date) < new Date() ? 'text-red-400' : ''}>
                          {v.abatement_due_date ? new Date(v.abatement_due_date).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={8} className="text-center text-gray-500 py-8">
                          No open violations - Great job maintaining compliance!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'jsa' && (
            <div className="panel">
              <div className="panel-header">
                <h3>Job Safety Analyses (JSA/JHA)</h3>
                <button className="btn-primary">+ New JSA</button>
              </div>
              <div className="jsa-grid">
                {jsas.length > 0 ? jsas.map(jsa => (
                  <div key={jsa.id} className="jsa-card">
                    <div className="jsa-header">
                      <span className="jsa-number">{jsa.jsa_number}</span>
                      <span className={`badge ${getStatusColor(jsa.status)}`}>
                        {jsa.status?.replace('_', ' ')}
                      </span>
                    </div>
                    <h4 className="jsa-title">{jsa.job_title}</h4>
                    <p className="jsa-description">{jsa.job_description}</p>
                    <div className="jsa-meta">
                      <span>Location: {jsa.work_location}</span>
                      <span>Prepared: {jsa.prepared_at ? new Date(jsa.prepared_at).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                )) : (
                  <div className="empty-state">No JSAs created yet</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'toolbox' && (
            <div className="panel">
              <div className="panel-header">
                <h3>Toolbox Talks</h3>
                <button className="btn-primary">+ Schedule Talk</button>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Topic</th>
                      <th>Presenter</th>
                      <th>Duration</th>
                      <th>Attendees</th>
                      <th>Acknowledged</th>
                      <th>Hazards</th>
                    </tr>
                  </thead>
                  <tbody>
                    {toolboxTalks.length > 0 ? toolboxTalks.map(talk => (
                      <tr key={talk.id} className="clickable">
                        <td>{talk.conducted_date ? new Date(talk.conducted_date).toLocaleDateString() : '-'}</td>
                        <td className="font-medium">
                          <div>{talk.topic}</div>
                          {talk.topic_code && <span className="text-xs text-gray-500">{talk.topic_code}</span>}
                        </td>
                        <td>{talk.presenter_name || '-'}</td>
                        <td className="mono">{talk.duration_minutes} min</td>
                        <td className="mono text-center font-bold text-cyan-400">
                          {talk.total_attendees || 0}
                        </td>
                        <td className="mono text-center">
                          <span className={talk.acknowledged_count === talk.total_attendees ? 'text-green-400' : 'text-amber-400'}>
                            {talk.acknowledged_count || 0}
                          </span>
                        </td>
                        <td className="max-w-xs truncate text-xs text-gray-400">
                          {talk.hazards_discussed || '-'}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={7} className="text-center text-gray-500 py-8">
                          No toolbox talks recorded
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'incidents' && (
            <div className="panel">
              <div className="panel-header">
                <h3>Incident Reports</h3>
                <button className="btn-primary">+ Report Incident</button>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Incident #</th>
                      <th>Date</th>
                      <th>Classification</th>
                      <th>Description</th>
                      <th>Location</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.length > 0 ? incidents.map(inc => (
                      <tr key={inc.id} className="clickable">
                        <td className="mono text-cyan-400">{inc.incident_number}</td>
                        <td>{new Date(inc.incident_date).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge ${
                            inc.classification === 'near_miss' ? 'bg-amber-500/20 text-amber-400' :
                            inc.classification === 'first_aid_only' ? 'bg-blue-500/20 text-blue-400' :
                            inc.classification === 'recordable_injury' ? 'bg-red-500/20 text-red-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {getClassificationLabel(inc.classification)}
                          </span>
                        </td>
                        <td className="max-w-xs truncate">{inc.description}</td>
                        <td>{inc.location_description}</td>
                        <td>
                          <span className={`badge ${getStatusColor(inc.status)}`}>
                            {inc.status?.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="text-center text-gray-500 py-8">
                          No incidents recorded - Safety first!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'workforce' && (
            <div className="workforce-grid">
              {/* Crew Members */}
              <div className="panel">
                <h3>Crew Members ({crewMembers.length})</h3>
                <div className="workforce-list">
                  {crewMembers.length > 0 ? crewMembers.slice(0, 10).map(crew => (
                    <div key={crew.id} className="workforce-item">
                      <div className="workforce-avatar">
                        {crew.first_name?.[0]}{crew.last_name?.[0]}
                      </div>
                      <div className="workforce-info">
                        <span className="workforce-name">{crew.first_name} {crew.last_name}</span>
                        <span className="workforce-role">{crew.trade_classification || 'General Labor'}</span>
                      </div>
                      <span className={`badge ${crew.employment_status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {crew.employment_status}
                      </span>
                    </div>
                  )) : (
                    <div className="empty-state">No crew members found</div>
                  )}
                </div>
              </div>

              {/* Employees/Staff */}
              <div className="panel">
                <h3>Staff & Supervision ({employees.length})</h3>
                <div className="workforce-list">
                  {employees.length > 0 ? employees.slice(0, 10).map(emp => (
                    <div key={emp.id} className="workforce-item">
                      <div className="workforce-avatar staff">
                        {emp.first_name?.[0]}{emp.last_name?.[0]}
                      </div>
                      <div className="workforce-info">
                        <span className="workforce-name">{emp.first_name} {emp.last_name}</span>
                        <span className="workforce-role">{emp.job_title || 'Staff'}</span>
                      </div>
                      <span className={`badge ${emp.employment_status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {emp.employment_status}
                      </span>
                    </div>
                  )) : (
                    <div className="empty-state">No employees found</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
