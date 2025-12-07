import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';

interface NCR {
  id: string;
  ncr_number: string;
  title: string;
  description: string;
  severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
  status: 'OPEN' | 'UNDER_REVIEW' | 'PENDING_ACTION' | 'CLOSED' | 'VOIDED';
  category: string;
  location: string;
  identified_date: string;
  identified_by: string;
  responsible_party: string;
  due_date: string | null;
  closed_date: string | null;
  root_cause: string | null;
  corrective_action: string | null;
}

interface Props {
  projectId: string;
  onUpdate: () => void;
}

export function NCRTracker({ projectId, onUpdate }: Props) {
  const [ncrs, setNcrs] = useState<NCR[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedNCR, setSelectedNCR] = useState<NCR | null>(null);

  useEffect(() => {
    loadNCRs();
  }, [projectId, filter]);

  async function loadNCRs() {
    let query = supabase
      .from('non_conformances')
      .select('*')
      .eq('project_id', projectId)
      .order('identified_date', { ascending: false });

    if (filter === 'open') {
      query = query.in('status', ['OPEN', 'UNDER_REVIEW', 'PENDING_ACTION']);
    } else if (filter === 'closed') {
      query = query.in('status', ['CLOSED', 'VOIDED']);
    }

    const { data, error } = await query.limit(50);

    if (!error && data) {
      setNcrs(data);
    }
    setLoading(false);
  }

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      MINOR: 'bg-yellow-100 text-yellow-800',
      MAJOR: 'bg-orange-100 text-orange-800',
      CRITICAL: 'bg-red-100 text-red-800 animate-pulse',
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      OPEN: 'bg-red-100 text-red-800',
      UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
      PENDING_ACTION: 'bg-blue-100 text-blue-800',
      CLOSED: 'bg-green-100 text-green-800',
      VOIDED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const isOverdue = (ncr: NCR) => {
    if (!ncr.due_date || ncr.status === 'CLOSED' || ncr.status === 'VOIDED') return false;
    return new Date(ncr.due_date) < new Date();
  };

  if (loading) {
    return <div className="animate-pulse h-32 bg-gray-100 rounded"></div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          {['all', 'open', 'closed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as typeof filter)}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          New NCR
        </button>
      </div>

      <div className="grid gap-4">
        {ncrs.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            No non-conformances found
          </div>
        ) : (
          ncrs.map((ncr) => (
            <div
              key={ncr.id}
              className={`bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer ${
                isOverdue(ncr) ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
              onClick={() => setSelectedNCR(ncr)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-red-600">{ncr.ncr_number}</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityBadge(ncr.severity)}`}>
                    {ncr.severity}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(ncr.status)}`}>
                    {ncr.status?.replace(/_/g, ' ')}
                  </span>
                  {isOverdue(ncr) && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-600 text-white">
                      OVERDUE
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-500">{ncr.identified_date}</span>
              </div>

              <h3 className="font-medium text-gray-900 mb-1">{ncr.title}</h3>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{ncr.description}</p>

              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                {ncr.location && (
                  <span>
                    <span className="font-medium">Location:</span> {ncr.location}
                  </span>
                )}
                {ncr.responsible_party && (
                  <span>
                    <span className="font-medium">Responsible:</span> {ncr.responsible_party}
                  </span>
                )}
                {ncr.due_date && (
                  <span className={isOverdue(ncr) ? 'text-red-600 font-medium' : ''}>
                    <span className="font-medium">Due:</span> {ncr.due_date}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showNewForm && (
        <NewNCRModal
          projectId={projectId}
          onClose={() => setShowNewForm(false)}
          onSave={() => {
            setShowNewForm(false);
            loadNCRs();
            onUpdate();
          }}
        />
      )}

      {selectedNCR && (
        <NCRDetailModal
          ncr={selectedNCR}
          onClose={() => setSelectedNCR(null)}
          onUpdate={() => {
            setSelectedNCR(null);
            loadNCRs();
            onUpdate();
          }}
        />
      )}
    </div>
  );
}

function NewNCRModal({
  projectId,
  onClose,
  onSave,
}: {
  projectId: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'MAJOR',
    category: 'WORKMANSHIP',
    location: '',
    identified_date: new Date().toISOString().split('T')[0],
    identified_by: '',
    responsible_party: '',
    due_date: '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from('non_conformances').insert({
      project_id: projectId,
      title: formData.title,
      description: formData.description,
      severity: formData.severity,
      category: formData.category,
      location: formData.location || null,
      identified_date: formData.identified_date,
      identified_by: formData.identified_by || null,
      responsible_party: formData.responsible_party || null,
      due_date: formData.due_date || null,
      status: 'OPEN',
    });

    if (!error) {
      onSave();
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4 text-red-600">New Non-Conformance Report</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Severity *
              </label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="MINOR">Minor</option>
                <option value="MAJOR">Major</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="WORKMANSHIP">Workmanship</option>
                <option value="MATERIAL">Material</option>
                <option value="DESIGN">Design</option>
                <option value="DOCUMENTATION">Documentation</option>
                <option value="SAFETY">Safety</option>
                <option value="ENVIRONMENTAL">Environmental</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Identified Date
              </label>
              <input
                type="date"
                value={formData.identified_date}
                onChange={(e) => setFormData({ ...formData, identified_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., STA 100+00 to STA 105+00"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Identified By
              </label>
              <input
                type="text"
                value={formData.identified_by}
                onChange={(e) => setFormData({ ...formData, identified_by: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Responsible Party
              </label>
              <input
                type="text"
                value={formData.responsible_party}
                onChange={(e) => setFormData({ ...formData, responsible_party: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
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
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create NCR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NCRDetailModal({
  ncr,
  onClose,
  onUpdate,
}: {
  ncr: NCR;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [rootCause, setRootCause] = useState(ncr.root_cause || '');
  const [correctiveAction, setCorrectiveAction] = useState(ncr.corrective_action || '');
  const [saving, setSaving] = useState(false);

  async function handleClose() {
    setSaving(true);
    const { error } = await supabase
      .from('non_conformances')
      .update({
        root_cause: rootCause,
        corrective_action: correctiveAction,
        status: 'CLOSED',
        closed_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', ncr.id);

    if (!error) {
      onUpdate();
    }
    setSaving(false);
  }

  async function handleStatusChange(newStatus: string) {
    setSaving(true);
    const { error } = await supabase
      .from('non_conformances')
      .update({ status: newStatus })
      .eq('id', ncr.id);

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
            <span className="font-mono font-bold text-red-600 text-lg">{ncr.ncr_number}</span>
            <h2 className="text-xl font-bold text-gray-900">{ncr.title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-700 mb-2">Description</h3>
            <p className="text-gray-600">{ncr.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-500">Severity</span>
              <p className="font-medium">{ncr.severity}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Category</span>
              <p className="font-medium">{ncr.category}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Location</span>
              <p className="font-medium">{ncr.location || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Responsible Party</span>
              <p className="font-medium">{ncr.responsible_party || '-'}</p>
            </div>
          </div>

          {ncr.status !== 'CLOSED' && ncr.status !== 'VOIDED' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Root Cause Analysis
                </label>
                <textarea
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Describe the root cause of this non-conformance..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Corrective Action
                </label>
                <textarea
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Describe the corrective action taken..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                {ncr.status === 'OPEN' && (
                  <button
                    onClick={() => handleStatusChange('UNDER_REVIEW')}
                    disabled={saving}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
                  >
                    Start Review
                  </button>
                )}
                {ncr.status === 'UNDER_REVIEW' && (
                  <button
                    onClick={() => handleStatusChange('PENDING_ACTION')}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    Request Action
                  </button>
                )}
                <button
                  onClick={handleClose}
                  disabled={saving || !rootCause || !correctiveAction}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Close NCR'}
                </button>
                <button
                  onClick={() => handleStatusChange('VOIDED')}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
                >
                  Void
                </button>
              </div>
            </>
          )}

          {(ncr.status === 'CLOSED' || ncr.status === 'VOIDED') && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-800 mb-2">Resolution</h3>
              {ncr.root_cause && (
                <div className="mb-2">
                  <span className="text-sm text-green-600">Root Cause:</span>
                  <p className="text-green-900">{ncr.root_cause}</p>
                </div>
              )}
              {ncr.corrective_action && (
                <div>
                  <span className="text-sm text-green-600">Corrective Action:</span>
                  <p className="text-green-900">{ncr.corrective_action}</p>
                </div>
              )}
              {ncr.closed_date && (
                <p className="text-sm text-green-600 mt-2">Closed on: {ncr.closed_date}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
