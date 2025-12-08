import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';

interface ChangeOrderRequest {
  id: string;
  pcr_number: string;
  title: string;
  description: string;
  reason: string;
  status: string;
  estimated_cost: number;
  estimated_days: number;
  submitted_date: string;
  priority: string;
}

interface ChangeOrder {
  id: string;
  change_order_number: string;
  title: string;
  description: string;
  status: string;
  total_amount: number;
  time_extension_days: number;
  effective_date: string;
  approved_date: string | null;
}

export function ChangeOrderDashboard() {
  const [activeTab, setActiveTab] = useState<'pcrs' | 'change-orders' | 'time-extensions'>('pcrs');
  const [pcrs, setPcrs] = useState<ChangeOrderRequest[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; project_number: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewPCRForm, setShowNewPCRForm] = useState(false);
  const [contractValue, setContractValue] = useState({ original: 0, current: 0 });

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadData();
    }
  }, [selectedProjectId, activeTab]);

  async function loadProjects() {
    const { data } = await supabase
      .from('projects')
      .select('id, name, project_number, original_contract_value, current_contract_value')
      .eq('status', 'ACTIVE')
      .order('name');

    if (data) {
      setProjects(data);
      if (data.length > 0 && data[0]) {
        setSelectedProjectId(data[0].id);
        setContractValue({
          original: data[0].original_contract_value ?? 0,
          current: data[0].current_contract_value ?? 0,
        });
      }
    }
    setLoading(false);
  }

  async function loadData() {
    setLoading(true);

    if (activeTab === 'pcrs') {
      const { data, error } = await supabase
        .from('change_order_requests')
        .select('*')
        .eq('project_id', selectedProjectId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPcrs(data as any);
      }
    } else if (activeTab === 'change-orders') {
      const { data, error } = await supabase
        .from('change_orders')
        .select('*')
        .eq('project_id', selectedProjectId)
        .order('change_order_number', { ascending: false });

      if (!error && data) {
        setChangeOrders(data as any);
      }
    }

    setLoading(false);
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SUBMITTED: 'bg-blue-100 text-blue-800',
      UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
      PENDING_APPROVAL: 'bg-orange-100 text-orange-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      EXECUTED: 'bg-purple-100 text-purple-800',
      VOID: 'bg-gray-100 text-gray-500',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const totalApprovedChanges = changeOrders
    .filter(co => co.status === 'APPROVED' || co.status === 'EXECUTED')
    .reduce((sum, co) => sum + (co.total_amount || 0), 0);

  const pendingAmount = pcrs
    .filter(pcr => pcr.status !== 'APPROVED' && pcr.status !== 'REJECTED')
    .reduce((sum, pcr) => sum + (pcr.estimated_cost || 0), 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Change Order Management</h1>
          <div className="flex gap-3">
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                const project = projects.find(p => p.id === e.target.value);
                if (project) {
                  setContractValue({
                    original: (project as unknown as { original_contract_value: number }).original_contract_value || 0,
                    current: (project as unknown as { current_contract_value: number }).current_contract_value || 0,
                  });
                }
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_number} - {p.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowNewPCRForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              New PCR
            </button>
          </div>
        </div>
      </div>

      {/* Contract Value Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <div className="text-sm text-gray-500">Original Contract</div>
            <div className="text-xl font-bold text-gray-900">
              ${contractValue.original.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Approved Changes</div>
            <div className={`text-xl font-bold ${totalApprovedChanges >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalApprovedChanges >= 0 ? '+' : ''}${totalApprovedChanges.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Current Contract</div>
            <div className="text-xl font-bold text-blue-600">
              ${(contractValue.original + totalApprovedChanges).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Pending Changes</div>
            <div className="text-xl font-bold text-yellow-600">
              ${pendingAmount.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">% Change</div>
            <div className={`text-xl font-bold ${totalApprovedChanges >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {contractValue.original > 0
                ? ((totalApprovedChanges / contractValue.original) * 100).toFixed(1)
                : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'pcrs', label: 'Potential Change Requests' },
            { id: 'change-orders', label: 'Change Orders' },
            { id: 'time-extensions', label: 'Time Extensions' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
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
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {activeTab === 'pcrs' && (
            <PCRList pcrs={pcrs} getStatusBadge={getStatusBadge} onRefresh={loadData} />
          )}
          {activeTab === 'change-orders' && (
            <ChangeOrderList changeOrders={changeOrders} getStatusBadge={getStatusBadge} />
          )}
          {activeTab === 'time-extensions' && <TimeExtensionsPanel projectId={selectedProjectId} />}
        </>
      )}

      {showNewPCRForm && (
        <NewPCRModal
          projectId={selectedProjectId}
          onClose={() => setShowNewPCRForm(false)}
          onSave={() => {
            setShowNewPCRForm(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function PCRList({
  pcrs,
  getStatusBadge,
  onRefresh: _onRefresh,
}: {
  pcrs: ChangeOrderRequest[];
  getStatusBadge: (status: string) => string;
  onRefresh: () => void;
}) {
  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      LOW: 'bg-gray-100 text-gray-800',
      MEDIUM: 'bg-blue-100 text-blue-800',
      HIGH: 'bg-orange-100 text-orange-800',
      CRITICAL: 'bg-red-100 text-red-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              PCR #
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Title
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Reason
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Est. Cost
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Est. Days
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Priority
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Status
            </th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {pcrs.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                No potential change requests found
              </td>
            </tr>
          ) : (
            pcrs.map((pcr) => (
              <tr key={pcr.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-blue-600">
                  {pcr.pcr_number}
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">{pcr.title}</div>
                  <div className="text-sm text-gray-500 truncate max-w-xs">{pcr.description}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {pcr.reason?.replace(/_/g, ' ')}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  ${pcr.estimated_cost?.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {pcr.estimated_days || '-'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityBadge(
                      pcr.priority
                    )}`}
                  >
                    {pcr.priority}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                      pcr.status
                    )}`}
                  >
                    {pcr.status?.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="text-blue-600 hover:text-blue-800 text-sm">View</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ChangeOrderList({
  changeOrders,
  getStatusBadge,
}: {
  changeOrders: ChangeOrder[];
  getStatusBadge: (status: string) => string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              CO #
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Title
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Amount
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Time Extension
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Effective Date
            </th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {changeOrders.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                No change orders found
              </td>
            </tr>
          ) : (
            changeOrders.map((co) => (
              <tr key={co.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-blue-600">
                  {co.change_order_number}
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">{co.title}</div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-sm font-medium ${
                      co.total_amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {co.total_amount >= 0 ? '+' : ''}${co.total_amount?.toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {co.time_extension_days ? `+${co.time_extension_days} days` : '-'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                      co.status
                    )}`}
                  >
                    {co.status?.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{co.effective_date}</td>
                <td className="px-4 py-3 text-right">
                  <button className="text-blue-600 hover:text-blue-800 text-sm">View</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function TimeExtensionsPanel({ projectId }: { projectId: string }) {
  const [extensions, setExtensions] = useState<{
    id: string;
    extension_number: string;
    reason: string;
    days_requested: number;
    days_approved: number | null;
    status: string;
    request_date: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExtensions();
  }, [projectId]);

  async function loadExtensions() {
    const { data, error } = await supabase
      .from('time_extension_requests')
      .select('*')
      .eq('project_id', projectId)
      .order('request_date', { ascending: false });

    if (!error && data) {
      setExtensions(data as any);
    }
    setLoading(false);
  }

  if (loading) {
    return <div className="animate-pulse h-32 bg-gray-100 rounded"></div>;
  }

  const totalApproved = extensions.reduce((sum, ext) => sum + (ext.days_approved || 0), 0);
  const totalPending = extensions
    .filter(ext => ext.status === 'PENDING' || ext.status === 'UNDER_REVIEW')
    .reduce((sum, ext) => sum + ext.days_requested, 0);

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-sm text-green-600">Approved Extensions</div>
          <div className="text-2xl font-bold text-green-700">+{totalApproved} days</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="text-sm text-yellow-600">Pending Extensions</div>
          <div className="text-2xl font-bold text-yellow-700">+{totalPending} days</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-600">Total Requests</div>
          <div className="text-2xl font-bold text-blue-700">{extensions.length}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Extension #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Reason
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Days Requested
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Days Approved
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {extensions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No time extension requests found
                </td>
              </tr>
            ) : (
              extensions.map((ext) => (
                <tr key={ext.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-blue-600">
                    {ext.extension_number}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{ext.reason}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">+{ext.days_requested}</td>
                  <td className="px-4 py-3 text-sm font-medium text-green-600">
                    {ext.days_approved !== null ? `+${ext.days_approved}` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        ext.status === 'APPROVED'
                          ? 'bg-green-100 text-green-800'
                          : ext.status === 'REJECTED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {ext.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{ext.request_date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewPCRModal({
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
    reason: 'OWNER_DIRECTED',
    estimated_cost: '',
    estimated_days: '',
    priority: 'MEDIUM',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from('change_order_requests').insert({
      project_id: projectId,
      title: formData.title,
      description: formData.description,
      reason: formData.reason,
      estimated_cost: parseFloat(formData.estimated_cost) || 0,
      estimated_days: parseInt(formData.estimated_days) || 0,
      priority: formData.priority,
      status: 'DRAFT',
      submitted_date: new Date().toISOString().split('T')[0] ?? '',
    } as any);

    if (!error) {
      onSave();
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-lg font-bold mb-4">New Potential Change Request</h2>
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
                Reason
              </label>
              <select
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="OWNER_DIRECTED">Owner Directed</option>
                <option value="DESIGN_CHANGE">Design Change</option>
                <option value="DIFFERING_CONDITIONS">Differing Conditions</option>
                <option value="VALUE_ENGINEERING">Value Engineering</option>
                <option value="REGULATORY_CHANGE">Regulatory Change</option>
                <option value="UNFORESEEN_CONDITIONS">Unforeseen Conditions</option>
                <option value="SCOPE_CLARIFICATION">Scope Clarification</option>
              </select>
            </div>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Cost ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.estimated_cost}
                onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Days
              </label>
              <input
                type="number"
                value={formData.estimated_days}
                onChange={(e) => setFormData({ ...formData, estimated_days: e.target.value })}
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
              {saving ? 'Creating...' : 'Create PCR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChangeOrderDashboard;
