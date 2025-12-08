import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';

interface MaterialsStats {
  totalTickets: number;
  pendingVerification: number;
  lowStockItems: number;
  expiringCerts: number;
  totalInventoryValue: number;
  avgSupplierQuality: number;
}

interface MaterialTicket {
  id: string;
  ticket_number: string;
  delivery_date: string;
  material_description: string | null;
  quantity: number;
  unit_of_measure: string;
  delivery_location: string | null;
  status: string | null;
  supplier: { company_name: string } | null;
}

interface InventoryItem {
  id: string;
  material_name: string;
  material_type: string;
  unit: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  minimum_stock_level: number;
  reorder_point: number;
  storage_location: string;
  supplier: { company_name: string } | null;
}

interface Certification {
  id: string;
  material_type: string;
  certification_type: string;
  certificate_number: string;
  issue_date: string;
  expiration_date: string;
  buy_america_compliant: boolean;
  status: string;
  supplier: { company_name: string };
}

interface SupplierQuality {
  id: string;
  score_year: number;
  score_quarter: number | null;
  total_deliveries: number | null;
  on_time_deliveries: number | null;
  documentation_issues: number | null;
  quality_issues: number | null;
  on_time_pct: number | null;
  quality_score: number | null;
  documentation_score: number | null;
  overall_score: number | null;
  notes: string | null;
  supplier: { company_name: string } | null;
  // Computed on client side for display
  on_time_delivery_percentage?: number;
  quality_percentage?: number;
  documentation_percentage?: number;
}

export function MaterialsDashboard() {
  const [activeTab, setActiveTab] = useState<'tickets' | 'inventory' | 'certifications' | 'suppliers'>('tickets');
  const [stats, setStats] = useState<MaterialsStats>({
    totalTickets: 0,
    pendingVerification: 0,
    lowStockItems: 0,
    expiringCerts: 0,
    totalInventoryValue: 0,
    avgSupplierQuality: 0,
  });
  const [tickets, setTickets] = useState<MaterialTicket[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [supplierScores, setSupplierScores] = useState<SupplierQuality[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadData();
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
      if (data.length > 0 && data[0]) {
        setSelectedProjectId(data[0].id);
      }
    }
    setLoading(false);
  }

  async function loadData() {
    setLoading(true);

    // Load material tickets
    const { data: ticketsData, count: totalTickets } = await supabase
      .from('material_tickets')
      .select('*, supplier:suppliers(company_name)', { count: 'exact' })
      .eq('project_id', selectedProjectId)
      .order('delivery_date', { ascending: false })
      .limit(20);

    if (ticketsData) {
      setTickets(ticketsData);
    }

    const { count: pendingVerification } = await supabase
      .from('material_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', selectedProjectId)
      .eq('status', 'PENDING_OCR' as any);

    // Load inventory
    const { data: inventoryData } = await supabase
      .from('material_inventory')
      .select('*, supplier:suppliers(company_name)')
      .eq('project_id', selectedProjectId)
      .order('material_name');

    if (inventoryData) {
      setInventory(inventoryData as any);
      const lowStock = inventoryData.filter(i =>
        (i.quantity_on_hand ?? 0) - (i.quantity_reserved ?? 0) < (i.reorder_point ?? 0)
      ).length;
      setStats(prev => ({ ...prev, lowStockItems: lowStock }));
    }

    // Load certifications (org-level)
    const { data: orgData } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', selectedProjectId)
      .single();

    if (orgData) {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { data: certsData } = await supabase
        .from('material_certifications')
        .select('*, supplier:suppliers(company_name)')
        .eq('organization_id', orgData.organization_id)
        .order('expiration_date');

      if (certsData) {
        setCertifications(certsData as any);
        const expiring = certsData.filter((c: any) =>
          new Date(c.expiration_date) <= thirtyDaysFromNow && c.status === 'ACTIVE'
        ).length;
        setStats(prev => ({ ...prev, expiringCerts: expiring }));
      }

      // Load supplier quality scores
      const { data: scoresData } = await supabase
        .from('supplier_quality_scores')
        .select('*, supplier:suppliers(company_name)')
        .eq('organization_id', orgData.organization_id)
        .order('score_year', { ascending: false })
        .limit(20);

      if (scoresData) {
        // Use generated columns if available, otherwise compute from raw data
        const enrichedScores = scoresData.map(s => ({
          ...s,
          on_time_delivery_percentage: s.on_time_pct ?? ((s.total_deliveries || 0) > 0 ? ((s.on_time_deliveries || 0) / (s.total_deliveries || 1)) * 100 : 0),
          quality_percentage: s.quality_score ?? 100,
          documentation_percentage: s.documentation_score ?? 100,
        }));

        setSupplierScores(enrichedScores);

        if (enrichedScores.length > 0) {
          const avgScore = enrichedScores.reduce((sum, s) => sum + (s.overall_score || 0), 0) / enrichedScores.length;
          setStats(prev => ({ ...prev, avgSupplierQuality: avgScore }));
        }
      }
    }

    setStats(prev => ({
      ...prev,
      totalTickets: totalTickets || 0,
      pendingVerification: pendingVerification || 0,
    }));

    setLoading(false);
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'expiring_soon': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getInventoryStatus(item: InventoryItem) {
    const available = item.quantity_on_hand - item.quantity_reserved;
    if (available <= item.minimum_stock_level) return { color: 'text-red-600', label: 'Critical' };
    if (available <= item.reorder_point) return { color: 'text-yellow-600', label: 'Low' };
    return { color: 'text-green-600', label: 'OK' };
  }

  if (loading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Materials Management</h1>
          <p className="text-gray-600">Track deliveries, inventory, certifications, and supplier quality</p>
        </div>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {projects.map(project => (
            <option key={project.id} value={project.id}>
              {project.project_number} - {project.name}
            </option>
          ))}
        </select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Tickets</div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalTickets}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Pending Verification</div>
          <div className={`text-2xl font-bold ${stats.pendingVerification > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
            {stats.pendingVerification}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Low Stock Items</div>
          <div className={`text-2xl font-bold ${stats.lowStockItems > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {stats.lowStockItems}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Expiring Certs (30d)</div>
          <div className={`text-2xl font-bold ${stats.expiringCerts > 0 ? 'text-orange-600' : 'text-green-600'}`}>
            {stats.expiringCerts}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Inventory Items</div>
          <div className="text-2xl font-bold text-gray-900">{inventory.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Avg Supplier Score</div>
          <div className="text-2xl font-bold text-gray-900">{stats.avgSupplierQuality.toFixed(1)}%</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {['tickets', 'inventory', 'certifications', 'suppliers'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'suppliers' ? 'Supplier Quality' :
                 tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'tickets' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Recent Material Tickets</h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  + New Ticket
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket #</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tickets.map(ticket => (
                      <tr key={ticket.id} className="hover:bg-gray-50 cursor-pointer">
                        <td className="px-4 py-3 text-sm font-medium text-blue-600">{ticket.ticket_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{new Date(ticket.delivery_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{ticket.supplier?.company_name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{ticket.material_description || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{ticket.quantity.toLocaleString()} {ticket.unit_of_measure}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{ticket.delivery_location || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(ticket.status || 'pending')}`}>
                            {ticket.status || 'pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">On-Site Inventory</h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  + Add Item
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">On Hand</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reserved</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Available</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reorder Point</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {inventory.map(item => {
                      const status = getInventoryStatus(item);
                      const available = item.quantity_on_hand - item.quantity_reserved;
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.material_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 capitalize">{item.material_type.replace('_', ' ')}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity_on_hand.toLocaleString()} {item.unit}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity_reserved.toLocaleString()}</td>
                          <td className={`px-4 py-3 text-sm font-medium text-right ${status.color}`}>
                            {available.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-right">{item.reorder_point.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className={`${status.color} font-medium text-sm`}>{status.label}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{item.storage_location}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'certifications' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Material Certifications</h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  + Upload Cert
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Certificate #</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiration</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Buy America</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {certifications.map(cert => {
                      const isExpiringSoon = new Date(cert.expiration_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                      const isExpired = new Date(cert.expiration_date) < new Date();
                      return (
                        <tr key={cert.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{cert.supplier?.company_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{cert.material_type}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 capitalize">{cert.certification_type.replace('_', ' ')}</td>
                          <td className="px-4 py-3 text-sm font-medium text-blue-600">{cert.certificate_number}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{new Date(cert.issue_date).toLocaleDateString()}</td>
                          <td className={`px-4 py-3 text-sm font-medium ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-orange-600' : 'text-gray-900'}`}>
                            {new Date(cert.expiration_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {cert.buy_america_compliant ? (
                              <span className="text-green-600">Yes</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(isExpired ? 'expired' : isExpiringSoon ? 'expiring_soon' : cert.status)}`}>
                              {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : cert.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'suppliers' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Supplier Quality Scores</h3>
              <div className="grid gap-4">
                {supplierScores.map(score => (
                  <div key={score.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{score.supplier?.company_name}</h4>
                        <p className="text-sm text-gray-500">
                          {score.score_quarter ? `Q${score.score_quarter} ` : ''}{score.score_year}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${
                          (score.overall_score || 0) >= 90 ? 'text-green-600' :
                          (score.overall_score || 0) >= 70 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {(score.overall_score || 0).toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500">Overall Score</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">On-Time Delivery</div>
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${Math.min(100, score.on_time_delivery_percentage || 0)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{(score.on_time_delivery_percentage || 0).toFixed(0)}%</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Quality (No Defects)</div>
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${Math.min(100, score.quality_percentage || 0)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{(score.quality_percentage || 0).toFixed(0)}%</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Documentation</div>
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full"
                              style={{ width: `${Math.min(100, score.documentation_percentage || 0)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{(score.documentation_percentage || 0).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                    {score.notes && (
                      <p className="text-sm text-gray-600 italic">"{score.notes}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
