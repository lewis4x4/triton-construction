import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';

interface PunchList {
  id: string;
  name: string;
  description: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETE';
  area: string;
  created_at: string;
  total_items: number;
  completed_items: number;
  critical_items: number;
}

interface PunchListItem {
  id: string;
  punch_list_id: string;
  item_number: number;
  description: string;
  location: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETE' | 'VERIFIED' | 'NOT_APPLICABLE';
  assigned_to: string;
  due_date: string | null;
  completed_date: string | null;
  notes: string;
}

interface Props {
  projectId: string;
  onUpdate: () => void;
}

export function PunchListManager({ projectId, onUpdate }: Props) {
  const [punchLists, setPunchLists] = useState<PunchList[]>([]);
  const [selectedList, setSelectedList] = useState<PunchList | null>(null);
  const [items, setItems] = useState<PunchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewListForm, setShowNewListForm] = useState(false);
  const [showNewItemForm, setShowNewItemForm] = useState(false);

  useEffect(() => {
    loadPunchLists();
  }, [projectId]);

  useEffect(() => {
    if (selectedList) {
      loadItems(selectedList.id);
    }
  }, [selectedList]);

  async function loadPunchLists() {
    const { data, error } = await supabase
      .from('punch_lists')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPunchLists(data);
      if (data.length > 0 && !selectedList) {
        setSelectedList(data[0]);
      }
    }
    setLoading(false);
  }

  async function loadItems(punchListId: string) {
    const { data, error } = await supabase
      .from('punch_list_items')
      .select('*')
      .eq('punch_list_id', punchListId)
      .order('item_number', { ascending: true });

    if (!error && data) {
      setItems(data);
    }
  }

  async function updateItemStatus(itemId: string, status: string) {
    const updates: Record<string, unknown> = { status };
    if (status === 'COMPLETE') {
      updates.completed_date = new Date().toISOString().split('T')[0];
    }

    const { error } = await supabase
      .from('punch_list_items')
      .update(updates)
      .eq('id', itemId);

    if (!error && selectedList) {
      loadItems(selectedList.id);
      loadPunchLists();
      onUpdate();
    }
  }

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      LOW: 'bg-gray-100 text-gray-800',
      MEDIUM: 'bg-blue-100 text-blue-800',
      HIGH: 'bg-orange-100 text-orange-800',
      CRITICAL: 'bg-red-100 text-red-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      OPEN: 'bg-red-100 text-red-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      COMPLETE: 'bg-green-100 text-green-800',
      VERIFIED: 'bg-green-200 text-green-900',
      NOT_APPLICABLE: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getProgressPercentage = (list: PunchList) => {
    if (list.total_items === 0) return 0;
    return Math.round((list.completed_items / list.total_items) * 100);
  };

  if (loading) {
    return <div className="animate-pulse h-32 bg-gray-100 rounded"></div>;
  }

  return (
    <div className="flex gap-6">
      {/* Punch List Sidebar */}
      <div className="w-80 flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-gray-900">Punch Lists</h3>
          <button
            onClick={() => setShowNewListForm(true)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            New List
          </button>
        </div>

        <div className="space-y-2">
          {punchLists.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
              No punch lists yet
            </div>
          ) : (
            punchLists.map((list) => (
              <div
                key={list.id}
                onClick={() => setSelectedList(list)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedList?.id === list.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900">{list.name}</h4>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      list.status === 'COMPLETE'
                        ? 'bg-green-100 text-green-800'
                        : list.status === 'ACTIVE'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {list.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{list.area}</p>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">
                    {list.completed_items}/{list.total_items} items
                  </span>
                  {list.critical_items > 0 && (
                    <span className="text-red-600 font-medium">
                      {list.critical_items} critical
                    </span>
                  )}
                </div>
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${getProgressPercentage(list)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Items Panel */}
      <div className="flex-1">
        {selectedList ? (
          <>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{selectedList.name}</h3>
                <p className="text-sm text-gray-600">{selectedList.description}</p>
              </div>
              <button
                onClick={() => setShowNewItemForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Item
              </button>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Assigned
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No items in this punch list
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {item.item_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div className="max-w-xs">
                            <p className="truncate">{item.description}</p>
                            {item.notes && (
                              <p className="text-xs text-gray-500 truncate">{item.notes}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.location || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityBadge(
                              item.priority
                            )}`}
                          >
                            {item.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                              item.status
                            )}`}
                          >
                            {item.status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.assigned_to || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={item.status}
                            onChange={(e) => updateItemStatus(item.id, e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="OPEN">Open</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETE">Complete</option>
                            <option value="VERIFIED">Verified</option>
                            <option value="NOT_APPLICABLE">N/A</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Select a punch list to view items</p>
          </div>
        )}
      </div>

      {showNewListForm && (
        <NewPunchListModal
          projectId={projectId}
          onClose={() => setShowNewListForm(false)}
          onSave={() => {
            setShowNewListForm(false);
            loadPunchLists();
            onUpdate();
          }}
        />
      )}

      {showNewItemForm && selectedList && (
        <NewPunchItemModal
          punchListId={selectedList.id}
          nextItemNumber={items.length + 1}
          onClose={() => setShowNewItemForm(false)}
          onSave={() => {
            setShowNewItemForm(false);
            loadItems(selectedList.id);
            loadPunchLists();
            onUpdate();
          }}
        />
      )}
    </div>
  );
}

function NewPunchListModal({
  projectId,
  onClose,
  onSave,
}: {
  projectId: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    area: '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from('punch_lists').insert({
      project_id: projectId,
      name: formData.name,
      description: formData.description || null,
      area: formData.area || null,
      status: 'DRAFT',
      total_items: 0,
      completed_items: 0,
      critical_items: 0,
    });

    if (!error) {
      onSave();
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">New Punch List</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., Final Walkthrough - Building A"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Area/Zone
            </label>
            <input
              type="text"
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., Building A - 2nd Floor"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={2}
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
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NewPunchItemModal({
  punchListId,
  nextItemNumber,
  onClose,
  onSave,
}: {
  punchListId: string;
  nextItemNumber: number;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    description: '',
    location: '',
    priority: 'MEDIUM',
    assigned_to: '',
    due_date: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from('punch_list_items').insert({
      punch_list_id: punchListId,
      item_number: nextItemNumber,
      description: formData.description,
      location: formData.location || null,
      priority: formData.priority,
      status: 'OPEN',
      assigned_to: formData.assigned_to || null,
      due_date: formData.due_date || null,
      notes: formData.notes || null,
    });

    if (!error) {
      onSave();
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Add Punch List Item</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item #{nextItemNumber} - Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={2}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., Room 201"
              />
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
                Assigned To
              </label>
              <input
                type="text"
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={2}
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
              {saving ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
