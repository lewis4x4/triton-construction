import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';

interface Subcontractor {
  id: string;
  company_name: string;
  primary_trade: string;
  secondary_trades: string[] | null;
  primary_contact_name: string | null;
  primary_contact_phone: string | null;
  primary_contact_email: string | null;
  office_phone: string | null;
  is_dbe_certified: boolean | null;
  dbe_certification_number: string | null;
  dbe_certification_expiration: string | null;
  prequalification_expiration: string | null;
  status: string;
  performance_rating: number | null;
  city: string | null;
  state: string | null;
}

interface SubcontractAgreement {
  id: string;
  agreement_number: string;
  title: string;
  subcontractor_id: string;
  project_id: string;
  scope_of_work: string;
  original_value: number;
  current_value: number;
  status: string;
  start_date: string;
  completion_date: string;
  subcontractors?: { company_name: string };
  projects?: { name: string; project_number: string };
}

export function SubcontractorDashboard() {
  const [activeTab, setActiveTab] = useState<'directory' | 'agreements' | 'invoices' | 'dbe'>('directory');
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [agreements, setAgreements] = useState<SubcontractAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewSubForm, setShowNewSubForm] = useState(false);
  const [showNewAgreementForm, setShowNewAgreementForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (activeTab === 'directory') {
      loadSubcontractors();
    } else if (activeTab === 'agreements') {
      loadAgreements();
    }
  }, [activeTab]);

  async function loadSubcontractors() {
    setLoading(true);
    const { data, error } = await supabase
      .from('subcontractors')
      .select('*')
      .order('company_name');

    if (!error && data) {
      setSubcontractors(data);
    }
    setLoading(false);
  }

  async function loadAgreements() {
    setLoading(true);
    const { data, error } = await supabase
      .from('subcontract_agreements')
      .select(`
        *,
        subcontractors(company_name),
        projects(name, project_number)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAgreements(data);
    }
    setLoading(false);
  }

  const filteredSubcontractors = subcontractors.filter(sub =>
    sub.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.primary_trade?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const expDate = new Date(date);
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    return expDate <= thirtyDays && expDate >= new Date();
  };

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Subcontractor Management</h1>
          <div className="flex gap-3">
            {activeTab === 'directory' && (
              <button
                onClick={() => setShowNewSubForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Subcontractor
              </button>
            )}
            {activeTab === 'agreements' && (
              <button
                onClick={() => setShowNewAgreementForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                New Agreement
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Total Subcontractors</div>
          <div className="text-2xl font-bold text-gray-900">{subcontractors.length}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-sm text-green-600">DBE Certified</div>
          <div className="text-2xl font-bold text-green-700">
            {subcontractors.filter(s => s.is_dbe_certified).length}
          </div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="text-sm text-yellow-600">Prequalification Expiring</div>
          <div className="text-2xl font-bold text-yellow-700">
            {subcontractors.filter(s => isExpiringSoon(s.prequalification_expiration)).length}
          </div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="text-sm text-red-600">DBE Cert Expired</div>
          <div className="text-2xl font-bold text-red-700">
            {subcontractors.filter(s => s.is_dbe_certified && isExpired(s.dbe_certification_expiration)).length}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'directory', label: 'Directory' },
            { id: 'agreements', label: 'Agreements' },
            { id: 'invoices', label: 'Invoices' },
            { id: 'dbe', label: 'DBE Tracking' },
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
          {activeTab === 'directory' && (
            <SubcontractorDirectory
              subcontractors={filteredSubcontractors}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onRefresh={loadSubcontractors}
            />
          )}
          {activeTab === 'agreements' && (
            <AgreementsList agreements={agreements} onRefresh={loadAgreements} />
          )}
          {activeTab === 'invoices' && <InvoicesPanel />}
          {activeTab === 'dbe' && <DBETrackingPanel subcontractors={subcontractors} />}
        </>
      )}

      {showNewSubForm && (
        <NewSubcontractorModal
          onClose={() => setShowNewSubForm(false)}
          onSave={() => {
            setShowNewSubForm(false);
            loadSubcontractors();
          }}
        />
      )}

      {showNewAgreementForm && (
        <NewAgreementModal
          subcontractors={subcontractors}
          onClose={() => setShowNewAgreementForm(false)}
          onSave={() => {
            setShowNewAgreementForm(false);
            loadAgreements();
          }}
        />
      )}
    </div>
  );
}

function SubcontractorDirectory({
  subcontractors,
  searchTerm,
  onSearchChange,
  onRefresh: _onRefresh,
}: {
  subcontractors: Subcontractor[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search subcontractors..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Company
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Trade
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Contact
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                DBE
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Prequalified
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Rating
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {subcontractors.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No subcontractors found
                </td>
              </tr>
            ) : (
              subcontractors.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{sub.company_name}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {sub.primary_trade || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">{sub.primary_contact_name || '-'}</div>
                    <div className="text-sm text-gray-500">{sub.primary_contact_phone || sub.office_phone || '-'}</div>
                  </td>
                  <td className="px-4 py-3">
                    {sub.is_dbe_certified ? (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        DBE
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {sub.prequalification_expiration ? (
                      <span
                        className={`text-sm ${
                          new Date(sub.prequalification_expiration) < new Date()
                            ? 'text-red-600 font-medium'
                            : new Date(sub.prequalification_expiration) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                            ? 'text-yellow-600'
                            : 'text-gray-600'
                        }`}
                      >
                        {new Date(sub.prequalification_expiration).toLocaleDateString()}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {sub.performance_rating !== null ? (
                      <div className="flex items-center">
                        <span className="font-medium text-gray-900">{sub.performance_rating.toFixed(1)}</span>
                        <span className="ml-1 text-yellow-400">★</span>
                      </div>
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
    </div>
  );
}

function AgreementsList({
  agreements,
  onRefresh: _onRefresh,
}: {
  agreements: SubcontractAgreement[];
  onRefresh: () => void;
}) {
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-blue-100 text-blue-800',
      EXECUTED: 'bg-green-100 text-green-800',
      IN_PROGRESS: 'bg-green-100 text-green-800',
      COMPLETE: 'bg-blue-100 text-blue-800',
      TERMINATED: 'bg-red-100 text-red-800',
      SUSPENDED: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Agreement #
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Subcontractor
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Project
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Value
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Dates
            </th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {agreements.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                No agreements found
              </td>
            </tr>
          ) : (
            agreements.map((agreement) => (
              <tr key={agreement.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-blue-600">
                  {agreement.agreement_number}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {agreement.subcontractors?.company_name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {agreement.projects?.project_number} - {agreement.projects?.name}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  ${agreement.current_value?.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                      agreement.status
                    )}`}
                  >
                    {agreement.status?.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {agreement.start_date} - {agreement.completion_date}
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
  );
}

function InvoicesPanel() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
      <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Invoice Management</h3>
      <p className="text-gray-500">Track and manage subcontractor invoices, pay applications, and retainage</p>
    </div>
  );
}

function DBETrackingPanel({ subcontractors }: { subcontractors: Subcontractor[] }) {
  const dbeSubcontractors = subcontractors.filter(s => s.is_dbe_certified);

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-sm text-green-600">Total DBE Subcontractors</div>
          <div className="text-3xl font-bold text-green-700">{dbeSubcontractors.length}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-600">Active DBE Contracts</div>
          <div className="text-3xl font-bold text-blue-700">-</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="text-sm text-purple-600">YTD DBE Payments</div>
          <div className="text-3xl font-bold text-purple-700">$0</div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">DBE Certified Subcontractors</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Company
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Trade
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Certification #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Expiration
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {dbeSubcontractors.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  No DBE subcontractors found
                </td>
              </tr>
            ) : (
              dbeSubcontractors.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{sub.company_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{sub.primary_trade}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {sub.dbe_certification_number || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {sub.dbe_certification_expiration ? new Date(sub.dbe_certification_expiration).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewSubcontractorModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    company_name: '',
    primary_trade: '',
    primary_contact_name: '',
    primary_contact_phone: '',
    primary_contact_email: '',
    address: '',
    city: '',
    state: 'WV',
    zip_code: '',
    is_dbe_certified: false,
    dbe_certification_number: '',
    dbe_certification_expiration: '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    // Get organization ID
    const { data: orgData } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single();

    if (!orgData?.id) {
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('subcontractors').insert({
      organization_id: orgData.id,
      company_name: formData.company_name,
      primary_trade: formData.primary_trade || 'OTHER',
      primary_contact_name: formData.primary_contact_name || null,
      primary_contact_phone: formData.primary_contact_phone || null,
      primary_contact_email: formData.primary_contact_email || null,
      address_line1: formData.address || null,
      city: formData.city || null,
      state: formData.state || null,
      zip_code: formData.zip_code || null,
      is_dbe_certified: formData.is_dbe_certified,
      dbe_certification_number: formData.dbe_certification_number || null,
      dbe_certification_expiration: formData.dbe_certification_expiration || null,
      status: 'ACTIVE',
    });

    if (!error) {
      onSave();
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Add Subcontractor</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name *
            </label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Trade *
            </label>
            <select
              value={formData.primary_trade}
              onChange={(e) => setFormData({ ...formData, primary_trade: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            >
              <option value="">Select trade...</option>
              <option value="EARTHWORK">Earthwork</option>
              <option value="CONCRETE">Concrete</option>
              <option value="ASPHALT">Asphalt</option>
              <option value="ELECTRICAL">Electrical</option>
              <option value="PLUMBING">Plumbing</option>
              <option value="HVAC">HVAC</option>
              <option value="STRUCTURAL_STEEL">Structural Steel</option>
              <option value="MASONRY">Masonry</option>
              <option value="ROOFING">Roofing</option>
              <option value="PAINTING">Painting</option>
              <option value="LANDSCAPING">Landscaping</option>
              <option value="TRAFFIC_CONTROL">Traffic Control</option>
              <option value="SIGNAGE">Signage</option>
              <option value="GUARDRAIL">Guardrail</option>
              <option value="FENCING">Fencing</option>
              <option value="DRILLING">Drilling</option>
              <option value="UTILITIES">Utilities</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Name
              </label>
              <input
                type="text"
                value={formData.primary_contact_name}
                onChange={(e) => setFormData({ ...formData, primary_contact_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.primary_contact_phone}
                onChange={(e) => setFormData({ ...formData, primary_contact_phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.primary_contact_email}
              onChange={(e) => setFormData({ ...formData, primary_contact_email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="border-t pt-4">
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={formData.is_dbe_certified}
                onChange={(e) => setFormData({ ...formData, is_dbe_certified: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">DBE Certified</span>
            </label>

            {formData.is_dbe_certified && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Certification Number
                  </label>
                  <input
                    type="text"
                    value={formData.dbe_certification_number}
                    onChange={(e) =>
                      setFormData({ ...formData, dbe_certification_number: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiration Date
                  </label>
                  <input
                    type="date"
                    value={formData.dbe_certification_expiration}
                    onChange={(e) =>
                      setFormData({ ...formData, dbe_certification_expiration: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
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
              {saving ? 'Saving...' : 'Add Subcontractor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NewAgreementModal({
  subcontractors,
  onClose,
  onSave,
}: {
  subcontractors: Subcontractor[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [projects, setProjects] = useState<{ id: string; name: string; project_number: string }[]>([]);
  const [formData, setFormData] = useState({
    subcontractor_id: '',
    project_id: '',
    title: '',
    scope_of_work: '',
    original_value: '',
    start_date: new Date().toISOString().split('T')[0],
    completion_date: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    const { data } = await supabase
      .from('projects')
      .select('id, name, project_number')
      .eq('status', 'ACTIVE')
      .order('name');

    if (data) {
      setProjects(data);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    // Get organization ID from user context (assuming first org for now)
    const { data: orgData } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single();

    if (!orgData?.id) {
      setSaving(false);
      return;
    }

    // Get project number for agreement number generation
    const selectedProject = projects.find(p => p.id === formData.project_id);
    const agreementNumber = `${selectedProject?.project_number || 'PROJ'}-SUB-${Date.now().toString().slice(-6)}`;

    const originalValue = parseFloat(formData.original_value);
    const { error } = await supabase.from('subcontract_agreements').insert({
      organization_id: orgData.id,
      subcontractor_id: formData.subcontractor_id,
      project_id: formData.project_id,
      agreement_number: agreementNumber,
      title: formData.title,
      scope_of_work: formData.scope_of_work,
      original_value: originalValue,
      current_value: originalValue,
      start_date: formData.start_date,
      completion_date: formData.completion_date,
      status: 'DRAFT',
    } as any);

    if (!error) {
      onSave();
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-lg font-bold mb-4">New Subcontract Agreement</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subcontractor *
            </label>
            <select
              value={formData.subcontractor_id}
              onChange={(e) => setFormData({ ...formData, subcontractor_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            >
              <option value="">Select subcontractor...</option>
              {subcontractors.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.company_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project *
            </label>
            <select
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            >
              <option value="">Select project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_number} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., Concrete Work Phase 1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scope of Work *
            </label>
            <textarea
              value={formData.scope_of_work}
              onChange={(e) => setFormData({ ...formData, scope_of_work: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contract Value *
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.original_value}
              onChange={(e) => setFormData({ ...formData, original_value: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Completion Date *
              </label>
              <input
                type="date"
                value={formData.completion_date}
                onChange={(e) => setFormData({ ...formData, completion_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
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
              {saving ? 'Creating...' : 'Create Agreement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SubcontractorDashboard;
