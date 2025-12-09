import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import { InspectionList } from '../../components/quality-control/InspectionList';
import { TestResultsPanel } from '../../components/quality-control/TestResultsPanel';
import { Filter, Plus } from 'lucide-react';
import { NCRTracker } from '../../components/quality-control/NCRTracker';
import { PunchListManager } from '../../components/quality-control/PunchListManager';
import './QualityControlDashboard.css';

interface QCStats {
  totalInspections: number;
  pendingInspections: number;
  openNCRs: number;
  criticalNCRs: number;
  failedTests: number;
  punchListItems: number;
}

export function QualityControlDashboard() {
  const [activeTab, setActiveTab] = useState<'inspections' | 'tests' | 'ncrs' | 'punchlist'>('inspections');
  const [stats, setStats] = useState<QCStats>({
    totalInspections: 0,
    pendingInspections: 0,
    openNCRs: 0,
    criticalNCRs: 0,
    failedTests: 0,
    punchListItems: 0,
  });
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projects, setProjects] = useState<{ id: string; name: string; project_number: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadStats();
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

  async function loadStats() {
    // Load inspection stats
    const { count: totalInspections } = await supabase
      .from('inspections')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', selectedProjectId);

    const { count: pendingInspections } = await supabase
      .from('inspections')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', selectedProjectId)
      .in('status', ['scheduled', 'in_progress']);

    // Load NCR stats
    const { count: openNCRs } = await supabase
      .from('non_conformances')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', selectedProjectId)
      .in('status', ['open', 'investigation', 'corrective_action', 'verification']);

    const { count: criticalNCRs } = await supabase
      .from('non_conformances')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', selectedProjectId)
      .eq('severity', 'critical')
      .in('status', ['open', 'investigation']);

    // Load test results
    const { count: failedTests } = await supabase
      .from('test_results')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', selectedProjectId)
      .eq('result_status', 'fail');

    // Load punch list
    const { count: punchListItems } = await supabase
      .from('punch_list_items')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    setStats({
      totalInspections: totalInspections || 0,
      pendingInspections: pendingInspections || 0,
      openNCRs: openNCRs || 0,
      criticalNCRs: criticalNCRs || 0,
      failedTests: failedTests || 0,
      punchListItems: punchListItems || 0,
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="qc-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Quality Control</h1>
            <p className="header-subtitle">Manage project quality standards, inspections, and compliance</p>
          </div>
          <div className="header-actions">
            <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1 border border-white/10">
              <span className="text-sm text-gray-400 ml-2">Project:</span>
              <select
                className="bg-transparent text-white text-sm border-none focus:ring-0 cursor-pointer"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id} className="bg-slate-900">
                    {project.project_number} - {project.name}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn-secondary">
              <Filter size={18} />
              Filters
            </button>
            <button className="new-project-btn">
              <Plus size={18} />
              New Inspection
            </button>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="stats-grid">
        <StatCard
          title="Total Inspections"
          value={stats.totalInspections}
          color="blue"
        />
        <StatCard
          title="Pending"
          value={stats.pendingInspections}
          color="yellow"
        />
        <StatCard
          title="Open NCRs"
          value={stats.openNCRs}
          color="orange"
        />
        <StatCard
          title="Critical NCRs"
          value={stats.criticalNCRs}
          color="red"
          highlight={stats.criticalNCRs > 0}
        />
        <StatCard
          title="Failed Tests"
          value={stats.failedTests}
          color="red"
        />
        <StatCard
          title="Punch List"
          value={stats.punchListItems}
          color="purple"
        />
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'inspections', label: 'Inspections' },
            { id: 'tests', label: 'Test Results' },
            { id: 'ncrs', label: 'NCRs' },
            { id: 'punchlist', label: 'Punch List' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'inspections' && (
          <InspectionList projectId={selectedProjectId} onUpdate={loadStats} />
        )}
        {activeTab === 'tests' && (
          <TestResultsPanel projectId={selectedProjectId} onUpdate={loadStats} />
        )}
        {activeTab === 'ncrs' && (
          <NCRTracker projectId={selectedProjectId} onUpdate={loadStats} />
        )}
        {activeTab === 'punchlist' && (
          <PunchListManager projectId={selectedProjectId} onUpdate={loadStats} />
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  color,
  highlight = false,
}: {
  title: string;
  value: number;
  color: string;
  highlight?: boolean;
}) {


  return (
    <div className={`stat-card ${color === 'red' && highlight ? 'alert' : ''}`}>
      <div className="stat-title">{title}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

export default QualityControlDashboard;
