import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import './SafetyDashboard.css';

interface SafetyStats {
  trir: number;
  dart: number;
  hoursWorked: number;
  recordableInjuries: number;
  nearMisses: number;
  openViolations: number;
  toolboxTalksThisMonth: number;
  pendingJSAs: number;
}

interface SafetyMetric {
  id: string;
  metric_year: number;
  metric_month: number;
  total_hours_worked: number;
  recordable_injuries: number;
  dart_cases: number;
  near_misses_reported: number;
  safety_observations: number;
  toolbox_talks_conducted: number;
  trir: number;
  dart: number;
  emr: number;
}

interface Violation {
  id: string;
  violation_number: string;
  violation_date: string;
  severity: string;
  category: string;
  description: string;
  location: string;
  status: string;
  corrective_action_due: string;
}

interface JSA {
  id: string;
  title: string;
  activity_description: string;
  work_location: string;
  status: string;
  prepared_date: string;
  project: { name: string };
}

interface ToolboxTemplate {
  id: string;
  title: string;
  category: string;
  duration_minutes: number;
  required_for_trades: string[];
}

export function SafetyDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'violations' | 'jsa' | 'toolbox' | 'osha'>('overview');
  const [stats, setStats] = useState<SafetyStats>({
    trir: 0,
    dart: 0,
    hoursWorked: 0,
    recordableInjuries: 0,
    nearMisses: 0,
    openViolations: 0,
    toolboxTalksThisMonth: 0,
    pendingJSAs: 0,
  });
  const [metrics, setMetrics] = useState<SafetyMetric[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [jsas, setJsas] = useState<JSA[]>([]);
  const [templates, setTemplates] = useState<ToolboxTemplate[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadData();
    }
  }, [selectedProjectId]);

  async function loadProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, project_number')
      // Removed status filter for visibility
      .order('name');

    if (!error && data) {
      setProjects(data);
      if (data.length > 0 && data[0]) {
        setSelectedProjectId(data[0].id);
      }
    }
    setLoading(false);
  }

  async function loadData() {
    setLoading(true);

    // Load safety metrics
    const currentYear = new Date().getFullYear();
    const { data: metricsData } = await supabase
      .from('safety_metrics')
      .select('*')
      .eq('project_id', selectedProjectId)
      .eq('metric_year', currentYear)
      .order('metric_month', { ascending: false });

    if (metricsData) {
      setMetrics(metricsData as any);

      // Calculate YTD stats
      const ytdHours = metricsData.reduce((sum, m) => sum + (m.total_hours_worked || 0), 0);
      const ytdRecordables = metricsData.reduce((sum, m) => sum + (m.recordable_injuries || 0), 0);
      const ytdDart = metricsData.reduce((sum, m) => sum + (m.dart_cases || 0), 0);
      const ytdNearMisses = metricsData.reduce((sum, m) => sum + (m.near_misses_reported || 0), 0);
      const currentMonth = metricsData.find(m => m.metric_month === new Date().getMonth() + 1);

      setStats(prev => ({
        ...prev,
        hoursWorked: ytdHours,
        recordableInjuries: ytdRecordables,
        nearMisses: ytdNearMisses,
        trir: ytdHours > 0 ? (ytdRecordables * 200000) / ytdHours : 0,
        dart: ytdHours > 0 ? (ytdDart * 200000) / ytdHours : 0,
        toolboxTalksThisMonth: currentMonth?.toolbox_talks_conducted || 0,
      }));
    }

    // Load open violations
    const { data: violationsData, count: openViolationCount } = await supabase
      .from('safety_violations')
      .select('*', { count: 'exact' })
      .eq('project_id', selectedProjectId)
      .neq('status', 'closed')
      .order('violation_date', { ascending: false });

    if (violationsData) {
      setViolations(violationsData as any);
      setStats(prev => ({ ...prev, openViolations: openViolationCount || 0 }));
    }

    // Load JSAs
    const { data: jsaData } = await supabase
      .from('job_safety_analysis')
      .select('*, project:projects(name)', { count: 'exact' })
      .eq('project_id', selectedProjectId)
      .order('prepared_date', { ascending: false })
      .limit(10);

    if (jsaData) {
      setJsas(jsaData as any);
      const pending = jsaData.filter(j => j.status !== 'APPROVED').length;
      setStats(prev => ({ ...prev, pendingJSAs: pending }));
    }

    // Load toolbox templates
    const { data: templatesData } = await supabase
      .from('toolbox_talk_templates')
      .select('*')
      .eq('is_active', true)
      .order('title');

    if (templatesData) {
      setTemplates(templatesData as any);
    }

    setLoading(false);
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
            <p className="header-subtitle">Monitor safety metrics, violations, JSAs, and toolbox talks</p>
          </div>
          <div className="header-right">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-4 py-2 border border-white/10 rounded-lg focus:ring-1 focus:ring-cyan-500 bg-void-deep text-white text-sm"
              style={{ background: 'rgba(0,0,0,0.3)' }}
            >
              {projects.map(project => (
                <option key={project.id} value={project.id} className="bg-void-deep">
                  {project.project_number} - {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* North Star Analytics */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            </div>
            <div className="stat-content">
              <span className="stat-label">TRIR (YTD)</span>
              <span className="stat-value">{stats.trir.toFixed(2)}</span>
              <span className="stat-target">Target: &lt; 3.0</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </div>
            <div className="stat-content">
              <span className="stat-label">DART Rate</span>
              <span className="stat-value">{stats.dart.toFixed(2)}</span>
              <span className="stat-target">Target: &lt; 2.0</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <div className="stat-content">
              <span className="stat-label">Hours Worked</span>
              <span className="stat-value">{stats.hoursWorked.toLocaleString()}</span>
              <span className="stat-target">Year to Date</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            </div>
            <div className="stat-content">
              <span className="stat-label">Open Violations</span>
              <span className={`stat-value ${stats.openViolations > 0 ? 'text-red-400' : 'text-green-400'}`}>{stats.openViolations}</span>
              <span className="stat-target">Action Required</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="dashboard-card">
          <div className="border-b border-white/10">
            <nav className="flex -mb-px">
              {['overview', 'violations', 'jsa', 'toolbox', 'osha'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-700'
                    }`}
                >
                  {tab === 'jsa' ? 'Job Safety Analysis' :
                    tab === 'osha' ? 'OSHA Logs' :
                      tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Monthly Safety Metrics</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-800">
                      <thead className="bg-void-deep">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Month</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Hours</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Recordables</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Near Misses</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Observations</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Toolbox Talks</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">TRIR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {metrics.map(metric => (
                          <tr key={metric.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-300">
                              {new Date(metric.metric_year, metric.metric_month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-300 font-mono text-right">{metric.total_hours_worked.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-gray-300 font-mono text-right">{metric.recordable_injuries}</td>
                            <td className="px-4 py-3 text-sm text-gray-300 font-mono text-right">{metric.near_misses_reported}</td>
                            <td className="px-4 py-3 text-sm text-gray-300 font-mono text-right">{metric.safety_observations}</td>
                            <td className="px-4 py-3 text-sm text-gray-300 font-mono text-right">{metric.toolbox_talks_conducted}</td>
                            <td className={`px-4 py-3 text-sm font-mono text-right ${metric.trir > 3 ? 'text-red-400' : 'text-green-400'}`}>{metric.trir?.toFixed(2) || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'violations' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white">Safety Violations</h3>
                  <button className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-600/50 rounded-lg hover:bg-blue-600/30 transition-colors">
                    + New Violation
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-800">
                    <thead className="bg-void-deep">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Violation #</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Severity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Due Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {violations.map(violation => (
                        <tr key={violation.id} className="hover:bg-white/5 transition-colors cursor-pointer">
                          <td className="px-4 py-3 text-sm font-medium font-mono text-cyan-400">{violation.violation_number}</td>
                          <td className="px-4 py-3 text-sm text-gray-300">{new Date(violation.violation_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-300 capitalize">{violation.category}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${violation.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                              violation.severity === 'major' ? 'bg-orange-500/20 text-orange-400' :
                                'bg-yellow-500/20 text-yellow-400'
                              }`}>
                              {violation.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300 max-w-xs truncate">{violation.description}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${violation.status === 'closed' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                              }`}>
                              {violation.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">
                            {violation.corrective_action_due ? new Date(violation.corrective_action_due).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'jsa' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white">Job Safety Analyses</h3>
                  <button className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-600/50 rounded-lg hover:bg-blue-600/30 transition-colors">
                    + New JSA
                  </button>
                </div>
                <div className="grid gap-4">
                  {jsas.map(jsa => (
                    <div key={jsa.id} className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-cyan-500/50 transition-colors cursor-pointer">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-white">{jsa.title}</h4>
                          <p className="text-sm text-gray-400 mt-1">{jsa.activity_description}</p>
                          <div className="flex gap-4 mt-2 text-sm text-gray-500">
                            <span>Location: {jsa.work_location}</span>
                            <span>Date: {new Date(jsa.prepared_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${jsa.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                          {jsa.status.toLowerCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'toolbox' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white">Toolbox Talk Templates</h3>
                  <button className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-600/50 rounded-lg hover:bg-blue-600/30 transition-colors">
                    + New Template
                  </button>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map(template => (
                    <div key={template.id} className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-cyan-500/50 transition-colors cursor-pointer">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-white">{template.title}</h4>
                        <span className="text-sm text-gray-400 font-mono">{template.duration_minutes} min</span>
                      </div>
                      <span className="inline-block px-2 py-1 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full capitalize mb-2">
                        {template.category.replace('_', ' ')}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.required_for_trades?.slice(0, 3).map(trade => (
                          <span key={trade} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                            {trade}
                          </span>
                        ))}
                        {template.required_for_trades?.length > 3 && (
                          <span className="text-xs text-gray-500">+{template.required_for_trades.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'osha' && (
              <div>
                <h3 className="text-lg font-bold text-white mb-4">OSHA 300 Log</h3>
                <p className="text-gray-400 mb-4">
                  OSHA 300 Log tracking and Form 301 incident reports are managed at the establishment level.
                </p>
                <div className="bg-white/5 border border-white/10 border-dashed rounded-lg p-6 text-center">
                  <div className="text-gray-400 mb-4">
                    View and manage OSHA recordkeeping requirements
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    View OSHA 300 Log
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
