import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Project {
  id: string;
  project_number: string;
  name: string;
  status: string;
  project_type: string;
  contract_type: string;
  original_contract_value: number;
  current_contract_value: number;
  notice_to_proceed_date: string;
  original_completion_date: string;
  current_completion_date: string;
  original_working_days: number;
  current_working_days: number;
  working_days_used: number;
  wvdoh_district: number;
  is_federal_aid: boolean;
  davis_bacon_required: boolean;
  dbe_goal_percentage: number;
  percent_complete: number;
}

export function ProjectDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    loadProjects();
  }, [filter]);

  async function loadProjects() {
    setLoading(true);
    let query = supabase
      .from('projects')
      .select('*')
      .order('project_number', { ascending: false });

    if (filter === 'active') {
      query = query.in('status', ['ACTIVE', 'MOBILIZATION', 'PUNCH_LIST']);
    } else if (filter === 'completed') {
      query = query.in('status', ['COMPLETE', 'CLOSED']);
    }

    const { data, error } = await query;

    if (!error && data) {
      setProjects(data);
    }
    setLoading(false);
  }

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.project_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PLANNING: 'bg-gray-100 text-gray-800',
      BIDDING: 'bg-blue-100 text-blue-800',
      AWARDED: 'bg-purple-100 text-purple-800',
      MOBILIZATION: 'bg-yellow-100 text-yellow-800',
      ACTIVE: 'bg-green-100 text-green-800',
      SUBSTANTIAL_COMPLETION: 'bg-teal-100 text-teal-800',
      PUNCH_LIST: 'bg-orange-100 text-orange-800',
      COMPLETE: 'bg-blue-100 text-blue-800',
      CLOSED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getDaysRemaining = (project: Project) => {
    if (!project.current_completion_date) return null;
    const today = new Date();
    const completion = new Date(project.current_completion_date);
    const diff = Math.ceil((completion.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const totalContractValue = projects.reduce((sum, p) => sum + (p.current_contract_value || 0), 0);
  const activeProjects = projects.filter(p => p.status === 'ACTIVE').length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Project Management</h1>
          <button
            onClick={() => setShowNewProjectForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            New Project
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Total Projects</div>
          <div className="text-2xl font-bold text-gray-900">{projects.length}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-sm text-green-600">Active Projects</div>
          <div className="text-2xl font-bold text-green-700">{activeProjects}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-600">Total Contract Value</div>
          <div className="text-2xl font-bold text-blue-700">
            ${(totalContractValue / 1000000).toFixed(1)}M
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="text-sm text-purple-600">Federal Aid Projects</div>
          <div className="text-2xl font-bold text-purple-700">
            {projects.filter(p => p.is_federal_aid).length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'All Projects' },
            { id: 'active', label: 'Active' },
            { id: 'completed', label: 'Completed' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as typeof filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === f.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg flex-1 max-w-md"
        />
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.length === 0 ? (
            <div className="col-span-full bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
              No projects found
            </div>
          ) : (
            filteredProjects.map((project) => {
              const daysRemaining = getDaysRemaining(project);
              return (
                <div
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-sm text-gray-500">{project.project_number}</div>
                      <h3 className="font-semibold text-gray-900">{project.name}</h3>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(project.status)}`}>
                      {project.status?.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Progress</span>
                      <span className="font-medium">{project.percent_complete || 0}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all"
                        style={{ width: `${project.percent_complete || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Contract Value */}
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">Contract Value</span>
                    <span className="font-medium text-gray-900">
                      ${project.current_contract_value?.toLocaleString()}
                    </span>
                  </div>

                  {/* Days Remaining */}
                  {daysRemaining !== null && (
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-500">Days Remaining</span>
                      <span className={`font-medium ${daysRemaining < 0 ? 'text-red-600' : daysRemaining < 30 ? 'text-yellow-600' : 'text-gray-900'}`}>
                        {daysRemaining < 0 ? `${Math.abs(daysRemaining)} overdue` : daysRemaining}
                      </span>
                    </div>
                  )}

                  {/* Working Days */}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Working Days</span>
                    <span className="font-medium text-gray-900">
                      {project.working_days_used || 0} / {project.current_working_days || '-'}
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {project.is_federal_aid && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                        Federal Aid
                      </span>
                    )}
                    {project.davis_bacon_required && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                        Davis-Bacon
                      </span>
                    )}
                    {project.dbe_goal_percentage > 0 && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                        DBE {project.dbe_goal_percentage}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {showNewProjectForm && (
        <NewProjectModal
          onClose={() => setShowNewProjectForm(false)}
          onSave={() => {
            setShowNewProjectForm(false);
            loadProjects();
          }}
        />
      )}

      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdate={() => {
            setSelectedProject(null);
            loadProjects();
          }}
        />
      )}
    </div>
  );
}

function NewProjectModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    project_number: '',
    name: '',
    project_type: 'HIGHWAY',
    contract_type: 'UNIT_PRICE',
    original_contract_value: '',
    notice_to_proceed_date: '',
    original_completion_date: '',
    original_working_days: '',
    wvdoh_district: '',
    is_federal_aid: false,
    davis_bacon_required: false,
    dbe_goal_percentage: '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from('projects').insert({
      project_number: formData.project_number,
      name: formData.name,
      project_type: formData.project_type,
      contract_type: formData.contract_type,
      original_contract_value: parseFloat(formData.original_contract_value) || 0,
      current_contract_value: parseFloat(formData.original_contract_value) || 0,
      notice_to_proceed_date: formData.notice_to_proceed_date || null,
      original_completion_date: formData.original_completion_date || null,
      current_completion_date: formData.original_completion_date || null,
      original_working_days: parseInt(formData.original_working_days) || null,
      current_working_days: parseInt(formData.original_working_days) || null,
      wvdoh_district: formData.wvdoh_district ? parseInt(formData.wvdoh_district) : null,
      is_federal_aid: formData.is_federal_aid,
      davis_bacon_required: formData.davis_bacon_required,
      dbe_goal_percentage: parseFloat(formData.dbe_goal_percentage) || 0,
      status: 'PLANNING',
    });

    if (!error) {
      onSave();
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">New Project</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Number *
              </label>
              <input
                type="text"
                value={formData.project_number}
                onChange={(e) => setFormData({ ...formData, project_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., 2024-001"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WVDOH District
              </label>
              <select
                value={formData.wvdoh_district}
                onChange={(e) => setFormData({ ...formData, wvdoh_district: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select district...</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(d => (
                  <option key={d} value={d}>District {d}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Type
              </label>
              <select
                value={formData.project_type}
                onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="HIGHWAY">Highway</option>
                <option value="BRIDGE">Bridge</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="UTILITY">Utility</option>
                <option value="COMMERCIAL">Commercial</option>
                <option value="RESIDENTIAL">Residential</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contract Type
              </label>
              <select
                value={formData.contract_type}
                onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="UNIT_PRICE">Unit Price</option>
                <option value="LUMP_SUM">Lump Sum</option>
                <option value="COST_PLUS">Cost Plus</option>
                <option value="TIME_MATERIALS">Time & Materials</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contract Value ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.original_contract_value}
                onChange={(e) => setFormData({ ...formData, original_contract_value: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Working Days
              </label>
              <input
                type="number"
                value={formData.original_working_days}
                onChange={(e) => setFormData({ ...formData, original_working_days: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notice to Proceed
              </label>
              <input
                type="date"
                value={formData.notice_to_proceed_date}
                onChange={(e) => setFormData({ ...formData, notice_to_proceed_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Completion Date
              </label>
              <input
                type="date"
                value={formData.original_completion_date}
                onChange={(e) => setFormData({ ...formData, original_completion_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_federal_aid}
                  onChange={(e) => setFormData({ ...formData, is_federal_aid: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Federal Aid Project</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.davis_bacon_required}
                  onChange={(e) => setFormData({ ...formData, davis_bacon_required: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Davis-Bacon Required</span>
              </label>
            </div>

            {formData.is_federal_aid && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  DBE Goal (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.dbe_goal_percentage}
                  onChange={(e) => setFormData({ ...formData, dbe_goal_percentage: e.target.value })}
                  className="w-full max-w-32 px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectDetailModal({
  project,
  onClose,
  onUpdate: _onUpdate,
}: {
  project: Project;
  onClose: () => void;
  onUpdate: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-sm text-gray-500">{project.project_number}</span>
            <h2 className="text-xl font-bold text-gray-900">{project.name}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <span className="text-sm text-gray-500">Status</span>
            <p className="font-medium">{project.status?.replace(/_/g, ' ')}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <span className="text-sm text-gray-500">Contract Value</span>
            <p className="font-medium">${project.current_contract_value?.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <span className="text-sm text-gray-500">Completion Date</span>
            <p className="font-medium">{project.current_completion_date || '-'}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <span className="text-sm text-gray-500">Working Days</span>
            <p className="font-medium">
              {project.working_days_used || 0} / {project.current_working_days || '-'}
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <span className="text-sm text-gray-500">Progress</span>
            <p className="font-medium">{project.percent_complete || 0}%</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <span className="text-sm text-gray-500">WVDOH District</span>
            <p className="font-medium">{project.wvdoh_district ? `District ${project.wvdoh_district}` : '-'}</p>
          </div>
        </div>

        <div className="flex gap-4 mt-6 flex-wrap">
          {project.is_federal_aid && (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
              Federal Aid
            </span>
          )}
          {project.davis_bacon_required && (
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
              Davis-Bacon Required
            </span>
          )}
          {project.dbe_goal_percentage > 0 && (
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
              DBE Goal: {project.dbe_goal_percentage}%
            </span>
          )}
        </div>

        <div className="mt-6 pt-4 border-t flex gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProjectDashboard;
