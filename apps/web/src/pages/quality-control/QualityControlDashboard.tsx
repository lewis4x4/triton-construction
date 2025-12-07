import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { InspectionList } from '../../components/quality-control/InspectionList';
import { TestResultsPanel } from '../../components/quality-control/TestResultsPanel';
import { NCRTracker } from '../../components/quality-control/NCRTracker';
import { PunchListManager } from '../../components/quality-control/PunchListManager';

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
  const [projects, setProjects] = useState<any[]>([]);
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
      .eq('status', 'ACTIVE')
      .order('name');

    if (!error && data) {
      setProjects(data);
      if (data.length > 0) {
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
      .in('status', ['SCHEDULED', 'IN_PROGRESS']);

    // Load NCR stats
    const { count: openNCRs } = await supabase
      .from('non_conformances')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', selectedProjectId)
      .in('status', ['OPEN', 'UNDER_REVIEW', 'PENDING_ACTION']);

    const { count: criticalNCRs } = await supabase
      .from('non_conformances')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', selectedProjectId)
      .eq('severity', 'CRITICAL')
      .in('status', ['OPEN', 'UNDER_REVIEW']);

    // Load test results
    const { count: failedTests } = await supabase
      .from('test_results')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', selectedProjectId)
      .eq('result_status', 'FAIL');

    // Load punch list
    const { count: punchListItems } = await supabase
      .from('punch_list_items')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'OPEN');

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
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Quality Control</h1>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.project_number} - {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
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
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
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
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  return (
    <div
      className={`p-4 rounded-lg border ${colorClasses[color]} ${
        highlight ? 'ring-2 ring-red-400 animate-pulse' : ''
      }`}
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

export default QualityControlDashboard;
