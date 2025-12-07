import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';

interface TestResult {
  id: string;
  test_number: string;
  test_type: string;
  sample_id: string;
  test_date: string;
  location: string;
  result_status: 'PASS' | 'FAIL' | 'PENDING' | 'RETEST';
  result_value: number | null;
  specification_min: number | null;
  specification_max: number | null;
  units: string;
  tested_by: string;
  lab_name: string;
}

interface Props {
  projectId: string;
  onUpdate: () => void;
}

export function TestResultsPanel({ projectId, onUpdate }: Props) {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pass' | 'fail' | 'pending'>('all');
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    loadResults();
  }, [projectId, filter]);

  async function loadResults() {
    let query = supabase
      .from('test_results')
      .select('*')
      .eq('project_id', projectId)
      .order('test_date', { ascending: false });

    if (filter === 'pass') {
      query = query.eq('result_status', 'PASS');
    } else if (filter === 'fail') {
      query = query.eq('result_status', 'FAIL');
    } else if (filter === 'pending') {
      query = query.in('result_status', ['PENDING', 'RETEST']);
    }

    const { data, error } = await query.limit(50);

    if (!error && data) {
      setResults(data);
    }
    setLoading(false);
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PASS: 'bg-green-100 text-green-800',
      FAIL: 'bg-red-100 text-red-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      RETEST: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const isWithinSpec = (result: TestResult) => {
    if (result.result_value === null) return null;
    if (result.specification_min !== null && result.result_value < result.specification_min) return false;
    if (result.specification_max !== null && result.result_value > result.specification_max) return false;
    return true;
  };

  if (loading) {
    return <div className="animate-pulse h-32 bg-gray-100 rounded"></div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          {['all', 'pass', 'fail', 'pending'].map((f) => (
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
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          New Test Result
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Test #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Sample ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Location
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Result
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Spec Range
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {results.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  No test results found
                </td>
              </tr>
            ) : (
              results.map((result) => {
                const withinSpec = isWithinSpec(result);
                return (
                  <tr key={result.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">
                      {result.test_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {result.test_type?.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {result.sample_id || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {result.test_date}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {result.location || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {result.result_value !== null ? (
                        <span
                          className={`font-medium ${
                            withinSpec === true
                              ? 'text-green-600'
                              : withinSpec === false
                              ? 'text-red-600'
                              : 'text-gray-600'
                          }`}
                        >
                          {result.result_value} {result.units}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {result.specification_min !== null || result.specification_max !== null
                        ? `${result.specification_min ?? '-'} - ${result.specification_max ?? '-'} ${result.units}`
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                          result.result_status
                        )}`}
                      >
                        {result.result_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-blue-600 hover:text-blue-800 text-sm">
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showNewForm && (
        <NewTestResultModal
          projectId={projectId}
          onClose={() => setShowNewForm(false)}
          onSave={() => {
            setShowNewForm(false);
            loadResults();
            onUpdate();
          }}
        />
      )}
    </div>
  );
}

function NewTestResultModal({
  projectId,
  onClose,
  onSave,
}: {
  projectId: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    test_type: 'CONCRETE_STRENGTH',
    sample_id: '',
    test_date: new Date().toISOString().split('T')[0],
    location: '',
    result_value: '',
    specification_min: '',
    specification_max: '',
    units: 'PSI',
    tested_by: '',
    lab_name: '',
    result_status: 'PENDING',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from('test_results').insert({
      project_id: projectId,
      test_type: formData.test_type,
      sample_id: formData.sample_id || null,
      test_date: formData.test_date,
      location: formData.location || null,
      result_value: formData.result_value ? parseFloat(formData.result_value) : null,
      specification_min: formData.specification_min ? parseFloat(formData.specification_min) : null,
      specification_max: formData.specification_max ? parseFloat(formData.specification_max) : null,
      units: formData.units,
      tested_by: formData.tested_by || null,
      lab_name: formData.lab_name || null,
      result_status: formData.result_status,
    });

    if (!error) {
      onSave();
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">New Test Result</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Type
              </label>
              <select
                value={formData.test_type}
                onChange={(e) => setFormData({ ...formData, test_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="CONCRETE_STRENGTH">Concrete Strength</option>
                <option value="CONCRETE_SLUMP">Concrete Slump</option>
                <option value="CONCRETE_AIR">Concrete Air Content</option>
                <option value="ASPHALT_DENSITY">Asphalt Density</option>
                <option value="SOIL_COMPACTION">Soil Compaction</option>
                <option value="SOIL_MOISTURE">Soil Moisture</option>
                <option value="AGGREGATE_GRADATION">Aggregate Gradation</option>
                <option value="PAINT_THICKNESS">Paint Thickness</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sample ID
              </label>
              <input
                type="text"
                value={formData.sample_id}
                onChange={(e) => setFormData({ ...formData, sample_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., CYL-001"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Date
              </label>
              <input
                type="date"
                value={formData.test_date}
                onChange={(e) => setFormData({ ...formData, test_date: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., STA 100+00"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Result Value
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.result_value}
                onChange={(e) => setFormData({ ...formData, result_value: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Spec Min
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.specification_min}
                onChange={(e) => setFormData({ ...formData, specification_min: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Spec Max
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.specification_max}
                onChange={(e) => setFormData({ ...formData, specification_max: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Units
              </label>
              <select
                value={formData.units}
                onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="PSI">PSI</option>
                <option value="INCHES">Inches</option>
                <option value="PERCENT">Percent</option>
                <option value="PCF">PCF</option>
                <option value="MILS">Mils</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.result_status}
                onChange={(e) => setFormData({ ...formData, result_status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="PENDING">Pending</option>
                <option value="PASS">Pass</option>
                <option value="FAIL">Fail</option>
                <option value="RETEST">Retest Required</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tested By
              </label>
              <input
                type="text"
                value={formData.tested_by}
                onChange={(e) => setFormData({ ...formData, tested_by: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lab Name
              </label>
              <input
                type="text"
                value={formData.lab_name}
                onChange={(e) => setFormData({ ...formData, lab_name: e.target.value })}
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
