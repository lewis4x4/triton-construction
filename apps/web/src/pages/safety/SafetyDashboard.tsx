import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';

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
      .eq('status', 'ACTIVE')
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

  function getSeverityColor(severity: string) {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'major': return 'bg-orange-100 text-orange-800';
      case 'minor': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'closed': return 'bg-green-100 text-green-800';
      case 'open': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  if (loading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Safety Management</h1>
          <p className="text-gray-600">Monitor safety metrics, violations, JSAs, and toolbox talks</p>
        </div>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {projects.map(project => (
            <option key={project.id} value={project.id}>
              {project.project_number} - {project.name}
            </option>
          ))}
        </select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">TRIR (YTD)</div>
          <div className="text-2xl font-bold text-gray-900">{stats.trir.toFixed(2)}</div>
          <div className="text-xs text-green-600">Target: &lt; 3.0</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">DART Rate (YTD)</div>
          <div className="text-2xl font-bold text-gray-900">{stats.dart.toFixed(2)}</div>
          <div className="text-xs text-green-600">Target: &lt; 2.0</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Hours Worked (YTD)</div>
          <div className="text-2xl font-bold text-gray-900">{stats.hoursWorked.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Near Misses (YTD)</div>
          <div className="text-2xl font-bold text-gray-900">{stats.nearMisses}</div>
          <div className="text-xs text-blue-600">Leading indicator</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Recordables (YTD)</div>
          <div className="text-2xl font-bold text-gray-900">{stats.recordableInjuries}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Open Violations</div>
          <div className={`text-2xl font-bold ${stats.openViolations > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {stats.openViolations}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Toolbox Talks (Month)</div>
          <div className="text-2xl font-bold text-gray-900">{stats.toolboxTalksThisMonth}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Pending JSAs</div>
          <div className={`text-2xl font-bold ${stats.pendingJSAs > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
            {stats.pendingJSAs}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {['overview', 'violations', 'jsa', 'toolbox', 'osha'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Safety Metrics</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hours</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Recordables</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Near Misses</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Observations</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Toolbox Talks</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">TRIR</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {metrics.map(metric => (
                        <tr key={metric.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(metric.metric_year, metric.metric_month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{metric.total_hours_worked.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{metric.recordable_injuries}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{metric.near_misses_reported}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{metric.safety_observations}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{metric.toolbox_talks_conducted}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{metric.trir?.toFixed(2) || '-'}</td>
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
                <h3 className="text-lg font-medium text-gray-900">Safety Violations</h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  + New Violation
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Violation #</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {violations.map(violation => (
                      <tr key={violation.id} className="hover:bg-gray-50 cursor-pointer">
                        <td className="px-4 py-3 text-sm font-medium text-blue-600">{violation.violation_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{new Date(violation.violation_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 capitalize">{violation.category}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getSeverityColor(violation.severity)}`}>
                            {violation.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{violation.description}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(violation.status)}`}>
                            {violation.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
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
                <h3 className="text-lg font-medium text-gray-900">Job Safety Analyses</h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  + New JSA
                </button>
              </div>
              <div className="grid gap-4">
                {jsas.map(jsa => (
                  <div key={jsa.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{jsa.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{jsa.activity_description}</p>
                        <div className="flex gap-4 mt-2 text-sm text-gray-500">
                          <span>Location: {jsa.work_location}</span>
                          <span>Date: {new Date(jsa.prepared_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(jsa.status)}`}>
                        {jsa.status}
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
                <h3 className="text-lg font-medium text-gray-900">Toolbox Talk Templates</h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  + New Template
                </button>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(template => (
                  <div key={template.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{template.title}</h4>
                      <span className="text-sm text-gray-500">{template.duration_minutes} min</span>
                    </div>
                    <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full capitalize mb-2">
                      {template.category.replace('_', ' ')}
                    </span>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.required_for_trades?.slice(0, 3).map(trade => (
                        <span key={trade} className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
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
              <h3 className="text-lg font-medium text-gray-900 mb-4">OSHA 300 Log</h3>
              <p className="text-gray-600 mb-4">
                OSHA 300 Log tracking and Form 301 incident reports are managed at the establishment level.
              </p>
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <div className="text-gray-500 mb-4">
                  View and manage OSHA recordkeeping requirements
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  View OSHA 300 Log
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
