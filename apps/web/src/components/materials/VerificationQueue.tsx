// =============================================================================
// Verification Queue Component
// Lists all tickets pending OCR verification with filtering and batch actions
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import OCRVerificationPanel from './OCRVerificationPanel';
import './VerificationQueue.css';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface QueueTicket {
  id: string;
  ticket_number: string;
  ticket_date: string;
  document_type: string;
  ocr_status: string;
  ocr_confidence: number | null;
  verification_status: string;
  has_variance: boolean;
  variance_type: string | null;
  material_description: string | null;
  quantity: number | null;
  unit: string | null;
  total_amount: number | null;
  supplier: { name: string } | null;
  project: { name: string; project_number: string } | null;
  document_url: string | null;
  created_at: string;
}

interface FilterState {
  status: 'all' | 'unverified' | 'needs_review' | 'verified' | 'rejected';
  documentType: string;
  hasVariance: 'all' | 'yes' | 'no';
  confidenceLevel: 'all' | 'high' | 'medium' | 'low';
  projectId: string;
  supplierId: string;
}

interface VerificationQueueProps {
  projectId?: string;
  onTicketVerified?: (ticketId: string) => void;
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

const getConfidenceLevel = (confidence: number | null): 'high' | 'medium' | 'low' | 'none' => {
  if (confidence === null) return 'none';
  if (confidence >= 0.9) return 'high';
  if (confidence >= 0.7) return 'medium';
  return 'low';
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatCurrency = (amount: number | null): string => {
  if (amount === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export const VerificationQueue: React.FC<VerificationQueueProps> = ({
  projectId,
  onTicketVerified,
}) => {
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    status: 'unverified',
    documentType: 'all',
    hasVariance: 'all',
    confidenceLevel: 'all',
    projectId: projectId || '',
    supplierId: '',
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);

  // ---------------------------------------------------------------------------
  // Data Loading
  // ---------------------------------------------------------------------------

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('material_tickets')
        .select(`
          id,
          ticket_number,
          ticket_date,
          document_type,
          ocr_status,
          ocr_confidence,
          verification_status,
          has_variance,
          variance_type,
          material_description,
          quantity,
          unit,
          total_amount,
          document_url,
          created_at,
          supplier:suppliers(name),
          project:projects(name, project_number)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.status !== 'all') {
        query = query.eq('verification_status', filters.status);
      }

      if (filters.documentType !== 'all') {
        query = query.eq('document_type', filters.documentType);
      }

      if (filters.hasVariance === 'yes') {
        query = query.eq('has_variance', true);
      } else if (filters.hasVariance === 'no') {
        query = query.eq('has_variance', false);
      }

      if (filters.confidenceLevel !== 'all') {
        switch (filters.confidenceLevel) {
          case 'high':
            query = query.gte('ocr_confidence', 0.9);
            break;
          case 'medium':
            query = query.gte('ocr_confidence', 0.7).lt('ocr_confidence', 0.9);
            break;
          case 'low':
            query = query.lt('ocr_confidence', 0.7);
            break;
        }
      }

      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId);
      }

      if (filters.supplierId) {
        query = query.eq('supplier_id', filters.supplierId);
      }

      const { data, error: fetchError } = await query.limit(100);

      if (fetchError) throw fetchError;

      // Transform data to match expected types (Supabase returns relations as objects, not arrays)
      const transformedTickets: QueueTicket[] = (data || []).map((row: any) => ({
        id: row.id,
        ticket_number: row.ticket_number,
        ticket_date: row.ticket_date,
        document_type: row.document_type,
        ocr_status: row.ocr_status,
        ocr_confidence: row.ocr_confidence,
        verification_status: row.verification_status,
        has_variance: row.has_variance,
        variance_type: row.variance_type,
        material_description: row.material_description,
        quantity: row.quantity,
        unit: row.unit,
        total_amount: row.total_amount,
        document_url: row.document_url,
        created_at: row.created_at,
        supplier: row.supplier || null,
        project: row.project || null,
      }));

      setTickets(transformedTickets);
    } catch (err: any) {
      setError(err.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // ---------------------------------------------------------------------------
  // Selection Handling
  // ---------------------------------------------------------------------------

  const toggleSelectAll = () => {
    if (selectedIds.size === tickets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tickets.map((t) => t.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // ---------------------------------------------------------------------------
  // Batch Actions
  // ---------------------------------------------------------------------------

  const handleBatchVerify = async () => {
    if (selectedIds.size === 0) return;

    try {
      setBatchProcessing(true);
      const { data: { user } } = await supabase.auth.getUser();

      const { error: updateError } = await supabase
        .from('material_tickets')
        .update({
          verification_status: 'verified',
          ocr_status: 'verified',
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', Array.from(selectedIds));

      if (updateError) throw updateError;

      setSelectedIds(new Set());
      await loadTickets();
    } catch (err: any) {
      setError(err.message || 'Failed to batch verify tickets');
    } finally {
      setBatchProcessing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  const handleTicketVerified = (ticketId: string) => {
    setSelectedTicketId(null);
    loadTickets();
    onTicketVerified?.(ticketId);
  };

  const handleTicketRejected = () => {
    setSelectedTicketId(null);
    loadTickets();
  };

  // ---------------------------------------------------------------------------
  // Stats Calculation
  // ---------------------------------------------------------------------------

  const stats = {
    total: tickets.length,
    unverified: tickets.filter((t) => t.verification_status === 'unverified').length,
    needsReview: tickets.filter((t) => t.verification_status === 'needs_review').length,
    withVariance: tickets.filter((t) => t.has_variance).length,
    lowConfidence: tickets.filter((t) => getConfidenceLevel(t.ocr_confidence) === 'low').length,
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (selectedTicketId) {
    return (
      <div className="verification-queue">
        <div className="queue-back-bar">
          <button className="back-btn" onClick={() => setSelectedTicketId(null)}>
            &larr; Back to Queue
          </button>
          <span className="queue-position">
            {tickets.findIndex((t) => t.id === selectedTicketId) + 1} of {tickets.length}
          </span>
          <div className="nav-buttons">
            <button
              className="nav-btn"
              disabled={tickets.findIndex((t) => t.id === selectedTicketId) === 0}
              onClick={() => {
                const idx = tickets.findIndex((t) => t.id === selectedTicketId);
                const prevTicket = idx > 0 ? tickets[idx - 1] : null;
                if (prevTicket) setSelectedTicketId(prevTicket.id);
              }}
            >
              Previous
            </button>
            <button
              className="nav-btn"
              disabled={tickets.findIndex((t) => t.id === selectedTicketId) === tickets.length - 1}
              onClick={() => {
                const idx = tickets.findIndex((t) => t.id === selectedTicketId);
                const nextTicket = idx < tickets.length - 1 ? tickets[idx + 1] : null;
                if (nextTicket) setSelectedTicketId(nextTicket.id);
              }}
            >
              Next
            </button>
          </div>
        </div>
        <OCRVerificationPanel
          ticketId={selectedTicketId}
          onVerified={handleTicketVerified}
          onRejected={handleTicketRejected}
          onClose={() => setSelectedTicketId(null)}
        />
      </div>
    );
  }

  return (
    <div className="verification-queue">
      {/* Header */}
      <div className="queue-header">
        <div className="header-left">
          <h2>OCR Verification Queue</h2>
          <span className="queue-count">{tickets.length} tickets</span>
        </div>
        <button className="refresh-btn" onClick={loadTickets} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-value">{stats.unverified}</span>
          <span className="stat-label">Unverified</span>
        </div>
        <div className="stat-item warning">
          <span className="stat-value">{stats.needsReview}</span>
          <span className="stat-label">Needs Review</span>
        </div>
        <div className="stat-item alert">
          <span className="stat-value">{stats.withVariance}</span>
          <span className="stat-label">With Variance</span>
        </div>
        <div className="stat-item danger">
          <span className="stat-value">{stats.lowConfidence}</span>
          <span className="stat-label">Low Confidence</span>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <label>Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as any }))}
          >
            <option value="all">All</option>
            <option value="unverified">Unverified</option>
            <option value="needs_review">Needs Review</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Document Type</label>
          <select
            value={filters.documentType}
            onChange={(e) => setFilters((f) => ({ ...f, documentType: e.target.value }))}
          >
            <option value="all">All Types</option>
            <option value="DELIVERY_TICKET">Delivery Ticket</option>
            <option value="BATCH_TICKET">Concrete Batch</option>
            <option value="ASPHALT_TICKET">Asphalt Ticket</option>
            <option value="WEIGHT_TICKET">Weight Ticket</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Variance</label>
          <select
            value={filters.hasVariance}
            onChange={(e) => setFilters((f) => ({ ...f, hasVariance: e.target.value as any }))}
          >
            <option value="all">All</option>
            <option value="yes">Has Variance</option>
            <option value="no">No Variance</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Confidence</label>
          <select
            value={filters.confidenceLevel}
            onChange={(e) =>
              setFilters((f) => ({ ...f, confidenceLevel: e.target.value as any }))
            }
          >
            <option value="all">All</option>
            <option value="high">High (90%+)</option>
            <option value="medium">Medium (70-90%)</option>
            <option value="low">Low (&lt;70%)</option>
          </select>
        </div>
      </div>

      {/* Batch Actions */}
      {selectedIds.size > 0 && (
        <div className="batch-actions-bar">
          <span className="selected-count">{selectedIds.size} selected</span>
          <div className="batch-buttons">
            <button className="batch-btn clear" onClick={() => setSelectedIds(new Set())}>
              Clear Selection
            </button>
            <button
              className="batch-btn verify"
              onClick={handleBatchVerify}
              disabled={batchProcessing}
            >
              {batchProcessing ? 'Processing...' : 'Verify Selected'}
            </button>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      {/* Tickets Table */}
      <div className="tickets-table-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">&#128203;</div>
            <h3>No Tickets Found</h3>
            <p>There are no tickets matching your current filters.</p>
          </div>
        ) : (
          <table className="tickets-table">
            <thead>
              <tr>
                <th className="checkbox-col">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === tickets.length && tickets.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>Ticket #</th>
                <th>Date</th>
                <th>Type</th>
                <th>Supplier</th>
                <th>Material</th>
                <th>Amount</th>
                <th>Confidence</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => {
                const confidence = getConfidenceLevel(ticket.ocr_confidence);
                return (
                  <tr
                    key={ticket.id}
                    className={`
                      ${selectedIds.has(ticket.id) ? 'selected' : ''}
                      ${ticket.has_variance ? 'has-variance' : ''}
                      ${confidence === 'low' ? 'low-confidence' : ''}
                    `}
                  >
                    <td className="checkbox-col">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(ticket.id)}
                        onChange={() => toggleSelect(ticket.id)}
                      />
                    </td>
                    <td className="ticket-number">
                      <span>{ticket.ticket_number || '-'}</span>
                      {ticket.has_variance && (
                        <span className="variance-badge" title={ticket.variance_type || 'Variance'}>
                          !
                        </span>
                      )}
                    </td>
                    <td>{formatDate(ticket.ticket_date)}</td>
                    <td>
                      <span className={`type-badge ${ticket.document_type.toLowerCase()}`}>
                        {ticket.document_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{ticket.supplier?.name || '-'}</td>
                    <td className="material-col">
                      {ticket.material_description
                        ? ticket.material_description.length > 30
                          ? `${ticket.material_description.slice(0, 30)}...`
                          : ticket.material_description
                        : '-'}
                    </td>
                    <td className="amount-col">{formatCurrency(ticket.total_amount)}</td>
                    <td>
                      <span className={`confidence-badge ${confidence}`}>
                        {ticket.ocr_confidence != null
                          ? `${Math.round(ticket.ocr_confidence * 100)}%`
                          : '-'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${ticket.verification_status}`}>
                        {ticket.verification_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="actions-col">
                      <button
                        className="review-btn"
                        onClick={() => setSelectedTicketId(ticket.id)}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default VerificationQueue;
