import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Inspection {
  id: string;
  inspection_number: string;
  inspection_type: string;
  title: string;
  status: string;
  scheduled_date: string;
  location: string;
  inspector_name: string;
  score: number | null;
}

interface Props {
  projectId: string;
  onUpdate: () => void;
}

export function InspectionList({ projectId, onUpdate }: Props) {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    loadInspections();
  }, [projectId, filter]);

  async function loadInspections() {
    let query = supabase
      .from('inspections')
      .select('*')
      .eq('project_id', projectId)
      .order('scheduled_date', { ascending: false });

    if (filter === 'pending') {
      query = query.in('status', ['SCHEDULED', 'IN_PROGRESS']);
    } else if (filter === 'completed') {
      query = query.in('status', ['PASSED', 'PASSED_WITH_COMMENTS', 'FAILED']);
    }

    const { data, error } = await query.limit(50);

    if (!error && data) {
      setInspections(data);
    }
    setLoading(false);
  }

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      SCHEDULED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      PASSED: 'bg-green-100 text-green-800',
      PASSED_WITH_COMMENTS: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="animate-pulse h-32 bg-gray-100 rounded"></div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          {['all', 'pending', 'completed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
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
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          New Inspection
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Inspection #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Title
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Location
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Score
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {inspections.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No inspections found
                </td>
              </tr>
            ) : (
              inspections.map((inspection) => (
                <tr key={inspection.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-blue-600">
                    {inspection.inspection_number}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {inspection.inspection_type?.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {inspection.title}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {inspection.scheduled_date}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {inspection.location || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                        inspection.status
                      )}`}
                    >
                      {inspection.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {inspection.score !== null ? (
                      <span
                        className={`font-medium ${
                          inspection.score >= 80
                            ? 'text-green-600'
                            : inspection.score >= 60
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        {inspection.score}%
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showNewForm && (
        <NewInspectionModal
          projectId={projectId}
          onClose={() => setShowNewForm(false)}
          onSave={() => {
            setShowNewForm(false);
            loadInspections();
            onUpdate();
          }}
        />
      )}
    </div>
  );
}

function NewInspectionModal({
  projectId,
  onClose,
  onSave,
}: {
  projectId: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    inspection_type: 'QUALITY',
    title: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    location: '',
    inspector_name: '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from('inspections').insert({
      project_id: projectId,
      ...formData,
      status: 'SCHEDULED',
    });

    if (!error) {
      onSave();
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">New Inspection</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={formData.inspection_type}
              onChange={(e) =>
                setFormData({ ...formData, inspection_type: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="QUALITY">Quality</option>
              <option value="SAFETY">Safety</option>
              <option value="WVDOH">WVDOH</option>
              <option value="ENVIRONMENTAL">Environmental</option>
              <option value="FINAL">Final</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={formData.scheduled_date}
              onChange={(e) =>
                setFormData({ ...formData, scheduled_date: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Inspector
            </label>
            <input
              type="text"
              value={formData.inspector_name}
              onChange={(e) =>
                setFormData({ ...formData, inspector_name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
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
              {saving ? 'Saving...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
