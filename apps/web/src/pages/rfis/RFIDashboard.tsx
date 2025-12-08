import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';

interface RFI {
  id: string;
  rfi_number: string;
  subject: string;
  question: string;
  status: string;
  priority: string;
  spec_section: string;
  drawing_reference: string;
  submitted_date: string;
  required_date: string;
  response_date: string | null;
  submitted_by_name: string;
  assigned_to_name: string;
  cost_impact: boolean;
  schedule_impact: boolean;
  days_open: number;
}

export function RFIDashboard() {
  const [rfis, setRfis] = useState<RFI[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; project_number: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'answered' | 'overdue'>('all');
  const [showNewRFIForm, setShowNewRFIForm] = useState(false);
  const [selectedRFI, setSelectedRFI] = useState<RFI | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadRFIs();
    }
  }, [selectedProjectId, filter]);

  async function loadProjects() {
    const { data } = await supabase
      .from('projects')
      .select('id, name, project_number')
      .eq('status', 'ACTIVE')
      .order('name');

    if (data) {
      setProjects(data);
      if (data.length > 0 && data[0]) {
        setSelectedProjectId(data[0].id);
      }
    }
    setLoading(false);
  }

  async function loadRFIs() {
    setLoading(true);
    let query = supabase
      .from('rfis')
      .select('*')
      .eq('project_id', selectedProjectId)
      .order('submitted_date', { ascending: false });

    if (filter === 'open') {
      query = query.in('status', ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW']);
    } else if (filter === 'answered') {
      query = query.in('status', ['RESPONDED', 'CLOSED']);
    } else if (filter === 'overdue') {
      query = query
        .in('status', ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW'])
        .lt('required_date', new Date().toISOString().split('T')[0]);
    }

    const { data, error } = await query;

    if (!error && data) {
      // Calculate days open for each RFI
      const rfisWithDays: RFI[] = data.map((rfi: any) => ({
        id: rfi.id,
        rfi_number: rfi.rfi_number,
        subject: rfi.subject,
        question: rfi.question,
        status: rfi.status,
        priority: rfi.priority,
        spec_section: rfi.spec_section || '',
        drawing_reference: rfi.drawing_reference || '',
        submitted_date: rfi.submitted_at,
        required_date: rfi.response_required_by || '',
        response_date: rfi.responded_at || null,
        submitted_by_name: '',
        assigned_to_name: '',
        cost_impact: rfi.cost_impact,
        schedule_impact: rfi.schedule_impact,
        days_open: Math.floor(
          (new Date().getTime() - new Date(rfi.submitted_at).getTime()) / (1000 * 60 * 60 * 24)
        ),
      }));
      setRfis(rfisWithDays);
    }
    setLoading(false);
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SUBMITTED: 'bg-blue-100 text-blue-800',
      UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
      ANSWERED: 'bg-green-100 text-green-800',
      CLOSED: 'bg-purple-100 text-purple-800',
      VOID: 'bg-gray-100 text-gray-500',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      LOW: 'bg-gray-100 text-gray-800',
      MEDIUM: 'bg-blue-100 text-blue-800',
      HIGH: 'bg-orange-100 text-orange-800',
      CRITICAL: 'bg-red-100 text-red-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const isOverdue = (rfi: RFI) => {
    if (!rfi.required_date) return false;
    if (rfi.status === 'ANSWERED' || rfi.status === 'CLOSED') return false;
    return new Date(rfi.required_date) < new Date();
  };

  const openCount = rfis.filter(r => ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW'].includes(r.status)).length;
  const overdueCount = rfis.filter(r => isOverdue(r)).length;
  const avgResponseTime = rfis
    .filter(r => r.response_date)
    .reduce((acc, r) => {
      const days = Math.floor(
        (new Date(r.response_date!).getTime() - new Date(r.submitted_date).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return acc + days;
    }, 0) / (rfis.filter(r => r.response_date).length || 1);

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">RFI Management</h1>
          <div className="flex gap-3">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_number} - {p.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowNewRFIForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              New RFI
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Total RFIs</div>
          <div className="text-2xl font-bold text-gray-900">{rfis.length}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-600">Open</div>
          <div className="text-2xl font-bold text-blue-700">{openCount}</div>
        </div>
        <div className={`p-4 rounded-lg border ${overdueCount > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className={`text-sm ${overdueCount > 0 ? 'text-red-600' : 'text-gray-500'}`}>Overdue</div>
          <div className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-700' : 'text-gray-700'}`}>
            {overdueCount}
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-sm text-green-600">Avg Response (days)</div>
          <div className="text-2xl font-bold text-green-700">{avgResponseTime.toFixed(1)}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'all', label: 'All RFIs' },
          { id: 'open', label: 'Open' },
          { id: 'answered', label: 'Answered' },
          { id: 'overdue', label: 'Overdue' },
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

      {/* RFI List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  RFI #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Subject
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Spec/Drawing
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Required
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Days Open
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rfis.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No RFIs found
                  </td>
                </tr>
              ) : (
                rfis.map((rfi) => (
                  <tr
                    key={rfi.id}
                    className={`hover:bg-gray-50 cursor-pointer ${isOverdue(rfi) ? 'bg-red-50' : ''}`}
                    onClick={() => setSelectedRFI(rfi)}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">
                      {rfi.rfi_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{rfi.subject}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">{rfi.question}</div>
                      <div className="flex gap-2 mt-1">
                        {rfi.cost_impact && (
                          <span className="text-xs text-orange-600 font-medium">$ Cost Impact</span>
                        )}
                        {rfi.schedule_impact && (
                          <span className="text-xs text-purple-600 font-medium">Schedule Impact</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{rfi.spec_section || '-'}</div>
                      <div className="text-gray-400">{rfi.drawing_reference || ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityBadge(
                          rfi.priority
                        )}`}
                      >
                        {rfi.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                          rfi.status
                        )}`}
                      >
                        {rfi.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={isOverdue(rfi) ? 'text-red-600 font-medium' : 'text-gray-600'}>
                        {rfi.required_date}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{rfi.days_open}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-blue-600 hover:text-blue-800 text-sm">View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showNewRFIForm && (
        <NewRFIModal
          projectId={selectedProjectId}
          onClose={() => setShowNewRFIForm(false)}
          onSave={() => {
            setShowNewRFIForm(false);
            loadRFIs();
          }}
        />
      )}

      {selectedRFI && (
        <RFIDetailModal
          rfi={selectedRFI}
          onClose={() => setSelectedRFI(null)}
          onUpdate={() => {
            setSelectedRFI(null);
            loadRFIs();
          }}
        />
      )}
    </div>
  );
}

function NewRFIModal({
  projectId,
  onClose,
  onSave,
}: {
  projectId: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    subject: '',
    question: '',
    spec_section: '',
    drawing_reference: '',
    priority: 'MEDIUM',
    required_date: '',
    cost_impact: false,
    schedule_impact: false,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from('rfis').insert({
      project_id: projectId,
      subject: formData.subject,
      question: formData.question,
      spec_section: formData.spec_section || null,
      drawing_reference: formData.drawing_reference || null,
      priority: formData.priority as any,
      response_required_by: formData.required_date || null,
      cost_impact: formData.cost_impact,
      schedule_impact: formData.schedule_impact,
      status: 'DRAFT',
      submitted_at: new Date().toISOString(),
    } as any);

    if (!error) {
      onSave();
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">New RFI</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject *
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question *
            </label>
            <textarea
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Spec Section
              </label>
              <input
                type="text"
                value={formData.spec_section}
                onChange={(e) => setFormData({ ...formData, spec_section: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., 03 30 00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Drawing Reference
              </label>
              <input
                type="text"
                value={formData.drawing_reference}
                onChange={(e) => setFormData({ ...formData, drawing_reference: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., Sheet C-101"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Required Response Date
              </label>
              <input
                type="date"
                value={formData.required_date}
                onChange={(e) => setFormData({ ...formData, required_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.cost_impact}
                onChange={(e) => setFormData({ ...formData, cost_impact: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Cost Impact</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.schedule_impact}
                onChange={(e) => setFormData({ ...formData, schedule_impact: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Schedule Impact</span>
            </label>
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
              {saving ? 'Creating...' : 'Create RFI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RFIDetailModal({
  rfi,
  onClose,
  onUpdate,
}: {
  rfi: RFI;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [response, setResponse] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleRespond() {
    setSaving(true);
    const { error } = await supabase
      .from('rfis')
      .update({
        response: response,
        responded_at: new Date().toISOString(),
        status: 'RESPONDED' as any,
      })
      .eq('id', rfi.id);

    if (!error) {
      onUpdate();
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-sm text-blue-600 font-medium">{rfi.rfi_number}</span>
            <h2 className="text-xl font-bold text-gray-900">{rfi.subject}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-700 mb-2">Question</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{rfi.question}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-500">Spec Section</span>
              <p className="font-medium">{rfi.spec_section || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Drawing Reference</span>
              <p className="font-medium">{rfi.drawing_reference || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Submitted</span>
              <p className="font-medium">{rfi.submitted_date}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Required</span>
              <p className="font-medium">{rfi.required_date || '-'}</p>
            </div>
          </div>

          {rfi.status === 'ANSWERED' || rfi.status === 'CLOSED' ? (
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-800 mb-2">Response</h3>
              <p className="text-green-700">Response recorded on {rfi.response_date}</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Response
              </label>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={4}
                placeholder="Enter response to this RFI..."
              />
              <div className="flex justify-end mt-4">
                <button
                  onClick={handleRespond}
                  disabled={saving || !response}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Submitting...' : 'Submit Response'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RFIDashboard;
