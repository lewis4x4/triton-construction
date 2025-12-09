import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import {
  Receipt,
  Search,
  Filter,
  Camera,
  CheckCircle,
  Clock,
  Truck,
  MapPin,
  Calendar,
  ChevronRight,
  X,
  RefreshCw,
  Eye,
  AlertTriangle,
  Scan,
  FileCheck,
} from 'lucide-react';
import './MaterialTicketViewer.css';

interface MaterialTicket {
  id: string;
  ticket_number: string;
  vendor_ticket_number: string | null;
  material_description: string;
  quantity: number;
  unit_of_measure: string;
  delivery_date: string;
  delivery_time: string | null;
  delivery_location: string | null;
  truck_number: string | null;
  driver_name: string | null;
  ocr_status: string;
  status: string;
  has_variance: boolean;
  variance_amount: number | null;
  variance_reason: string | null;
  matched_po_id: string | null;
  ticket_photo_url: string | null;
  net_weight: number | null;
  slump_at_site: string | null;
  concrete_temp: string | null;
  project_id: string;
}

interface TicketStats {
  total: number;
  pending: number;
  verified: number;
  withVariance: number;
  ocrPending: number;
}

export function MaterialTicketViewer() {
  const [tickets, setTickets] = useState<MaterialTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<MaterialTicket | null>(null);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [stats, setStats] = useState<TicketStats>({
    total: 0,
    pending: 0,
    verified: 0,
    withVariance: 0,
    ocrPending: 0,
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('material_tickets')
        .select('*')
        .order('delivery_date', { ascending: false });

      if (error) throw error;

      setTickets(data || []);
      calculateStats(data || []);
    } catch (err) {
      console.error('Error fetching material tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: MaterialTicket[]) => {
    setStats({
      total: data.length,
      pending: data.filter(t => t.status?.toLowerCase() === 'pending').length,
      verified: data.filter(t => t.status?.toLowerCase() === 'verified').length,
      withVariance: data.filter(t => t.has_variance).length,
      ocrPending: data.filter(t => t.ocr_status?.toLowerCase() === 'pending').length,
    });
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch =
      ticket.ticket_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.material_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.driver_name?.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'variance') return matchesSearch && ticket.has_variance;
    return matchesSearch && ticket.status?.toLowerCase() === statusFilter.toLowerCase();
  });

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'status-pending';
      case 'verified':
        return 'status-verified';
      case 'rejected':
        return 'status-rejected';
      case 'matched':
        return 'status-matched';
      default:
        return 'status-unknown';
    }
  };

  const getOCRStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'ocr-pending';
      case 'processing':
        return 'ocr-processing';
      case 'complete':
        return 'ocr-complete';
      case 'failed':
        return 'ocr-failed';
      default:
        return 'ocr-unknown';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatQuantity = (qty: number, unit: string) => {
    return `${qty.toLocaleString()} ${unit}`;
  };

  return (
    <div className="material-ticket-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <Receipt size={32} />
            Material Ticket Viewer
          </h1>
          <p>View, verify, and match delivery tickets with purchase orders</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary">
            <Scan size={18} />
            Bulk OCR
          </button>
          <button className="btn btn-primary" onClick={() => setShowCaptureModal(true)}>
            <Camera size={18} />
            Capture Ticket
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <Receipt size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Tickets</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pending">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.pending}</span>
            <span className="stat-label">Pending Review</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon verified">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.verified}</span>
            <span className="stat-label">Verified</span>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon variance">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.withVariance}</span>
            <span className="stat-label">With Variance</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon ocr">
            <Scan size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.ocrPending}</span>
            <span className="stat-label">OCR Pending</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by ticket number, material, or driver..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={18} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="matched">Matched</option>
            <option value="variance">With Variance</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="loading-state">
          <RefreshCw size={32} className="spinning" />
          <p>Loading material tickets...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="empty-state">
          <Receipt size={48} />
          <h3>No Material Tickets Found</h3>
          <p>Capture a delivery ticket to get started.</p>
          <button className="btn btn-primary" onClick={() => setShowCaptureModal(true)}>
            <Camera size={18} />
            Capture Ticket
          </button>
        </div>
      ) : (
        <div className="tickets-list">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className={`ticket-card ${selectedTicket?.id === ticket.id ? 'selected' : ''} ${ticket.has_variance ? 'has-variance' : ''}`}
              onClick={() => setSelectedTicket(ticket)}
            >
              <div className="ticket-header">
                <div className="ticket-identity">
                  <span className="ticket-number">{ticket.ticket_number}</span>
                  {ticket.vendor_ticket_number && (
                    <span className="vendor-ticket">#{ticket.vendor_ticket_number}</span>
                  )}
                </div>
                <div className="ticket-badges">
                  <span className={`ocr-badge ${getOCRStatusBadge(ticket.ocr_status)}`}>
                    <Scan size={12} />
                    {ticket.ocr_status}
                  </span>
                  <span className={`status-badge ${getStatusBadge(ticket.status)}`}>
                    {ticket.status}
                  </span>
                </div>
              </div>

              <div className="material-info">
                <h3 className="material-name">{ticket.material_description}</h3>
                <span className="quantity">{formatQuantity(ticket.quantity, ticket.unit_of_measure)}</span>
              </div>

              <div className="ticket-meta">
                <span>
                  <Calendar size={14} />
                  {formatDate(ticket.delivery_date)}
                </span>
                <span>
                  <Truck size={14} />
                  {ticket.truck_number || '—'}
                </span>
                {ticket.delivery_location && (
                  <span>
                    <MapPin size={14} />
                    {ticket.delivery_location}
                  </span>
                )}
              </div>

              {ticket.has_variance && (
                <div className="variance-alert">
                  <AlertTriangle size={14} />
                  <span>
                    Variance: {ticket.variance_amount} {ticket.unit_of_measure}
                    {ticket.variance_reason && ` - ${ticket.variance_reason}`}
                  </span>
                </div>
              )}

              {ticket.matched_po_id && (
                <div className="matched-po">
                  <FileCheck size={14} />
                  <span>Matched to PO</span>
                </div>
              )}

              <ChevronRight size={20} className="chevron" />
            </div>
          ))}
        </div>
      )}

      {/* Detail Panel */}
      {selectedTicket && (
        <div className="detail-panel">
          <div className="panel-header">
            <h2>{selectedTicket.ticket_number}</h2>
            <button className="btn btn-icon" onClick={() => setSelectedTicket(null)}>
              <X size={20} />
            </button>
          </div>

          <div className="panel-content">
            {/* Ticket Photo */}
            <div className="detail-section photo-section">
              {selectedTicket.ticket_photo_url ? (
                <img
                  src={selectedTicket.ticket_photo_url}
                  alt="Ticket"
                  className="ticket-photo"
                />
              ) : (
                <div className="no-photo">
                  <Camera size={32} />
                  <p>No photo available</p>
                </div>
              )}
            </div>

            {/* Status */}
            <div className="detail-section">
              <div className="status-row">
                <span className={`status-badge large ${getStatusBadge(selectedTicket.status)}`}>
                  {selectedTicket.status}
                </span>
                <span className={`ocr-badge large ${getOCRStatusBadge(selectedTicket.ocr_status)}`}>
                  <Scan size={14} />
                  OCR: {selectedTicket.ocr_status}
                </span>
              </div>
            </div>

            {/* Material Info */}
            <div className="detail-section">
              <h4>
                <Receipt size={16} />
                Material Information
              </h4>
              <div className="material-detail">
                <h3>{selectedTicket.material_description}</h3>
                <div className="quantity-display">
                  <span className="qty">{selectedTicket.quantity.toLocaleString()}</span>
                  <span className="unit">{selectedTicket.unit_of_measure}</span>
                </div>
              </div>
              {selectedTicket.net_weight && (
                <div className="weight-info">
                  <label>Net Weight</label>
                  <span>{selectedTicket.net_weight.toLocaleString()} lbs</span>
                </div>
              )}
            </div>

            {/* Delivery Details */}
            <div className="detail-section">
              <h4>
                <Truck size={16} />
                Delivery Details
              </h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Date</label>
                  <span>{formatDate(selectedTicket.delivery_date)}</span>
                </div>
                <div className="detail-item">
                  <label>Time</label>
                  <span>{selectedTicket.delivery_time || '—'}</span>
                </div>
                <div className="detail-item">
                  <label>Truck #</label>
                  <span>{selectedTicket.truck_number || '—'}</span>
                </div>
                <div className="detail-item">
                  <label>Driver</label>
                  <span>{selectedTicket.driver_name || '—'}</span>
                </div>
              </div>
              {selectedTicket.delivery_location && (
                <div className="location-info">
                  <MapPin size={14} />
                  <span>{selectedTicket.delivery_location}</span>
                </div>
              )}
            </div>

            {/* Concrete/Asphalt Properties */}
            {(selectedTicket.slump_at_site || selectedTicket.concrete_temp) && (
              <div className="detail-section">
                <h4>Material Properties</h4>
                <div className="detail-grid">
                  {selectedTicket.slump_at_site && (
                    <div className="detail-item">
                      <label>Slump</label>
                      <span>{selectedTicket.slump_at_site}"</span>
                    </div>
                  )}
                  {selectedTicket.concrete_temp && (
                    <div className="detail-item">
                      <label>Temperature</label>
                      <span>{selectedTicket.concrete_temp}°F</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Variance Alert */}
            {selectedTicket.has_variance && (
              <div className="detail-section variance-section">
                <h4>
                  <AlertTriangle size={16} />
                  Variance Detected
                </h4>
                <div className="variance-details">
                  <div className="variance-amount">
                    <span className="label">Amount</span>
                    <span className="value">
                      {selectedTicket.variance_amount} {selectedTicket.unit_of_measure}
                    </span>
                  </div>
                  {selectedTicket.variance_reason && (
                    <div className="variance-reason">
                      <span className="label">Reason</span>
                      <span className="value">{selectedTicket.variance_reason}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="panel-footer">
              <button className="btn btn-secondary">
                <Eye size={16} />
                View Full Image
              </button>
              <button className="btn btn-primary">
                <CheckCircle size={16} />
                Verify Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Capture Modal */}
      {showCaptureModal && (
        <div className="modal-overlay" onClick={() => setShowCaptureModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Capture Delivery Ticket</h2>
              <button className="btn btn-icon" onClick={() => setShowCaptureModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p className="coming-soon">Ticket capture with OCR coming soon!</p>
              <p>The capture feature will include:</p>
              <ul>
                <li>Camera capture with GPS tagging</li>
                <li>Automatic OCR extraction</li>
                <li>AI-powered field recognition</li>
                <li>Automatic PO matching</li>
                <li>Variance detection and alerts</li>
                <li>Batch ticket processing</li>
                <li>Offline capture with sync</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
