// =============================================================================
// OCR Verification Panel
// Review and verify OCR-extracted ticket data with confidence indicators
// Supports field correction, variance alerts, and PO matching confirmation
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import './OCRVerificationPanel.css';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface OCRField {
  value: string | number | null;
  confidence: number;
  source: 'ocr' | 'ai_corrected' | 'ai_inferred';
  original_value?: string;
  validation_notes?: string;
}

interface ExtractedData {
  ticket_number?: OCRField;
  delivery_date?: OCRField;
  delivery_time?: OCRField;
  supplier_name?: OCRField;
  material_description?: OCRField;
  quantity?: OCRField;
  unit?: OCRField;
  unit_price?: OCRField;
  total_amount?: OCRField;
  truck_number?: OCRField;
  driver_name?: OCRField;
  po_number?: OCRField;
  project_name?: OCRField;
  receiver_signature?: OCRField;
  notes?: OCRField;
  // Concrete-specific
  batch_time?: OCRField;
  concrete_mix_design?: OCRField;
  slump?: OCRField;
  air_content?: OCRField;
  concrete_temperature?: OCRField;
  water_added?: OCRField;
  load_number?: OCRField;
  plant_name?: OCRField;
  // Asphalt-specific
  mix_type?: OCRField;
  pg_grade?: OCRField;
  asphalt_temperature?: OCRField;
  tare_weight?: OCRField;
  gross_weight?: OCRField;
  net_weight?: OCRField;
}

interface MaterialTicket {
  id: string;
  ticket_number: string;
  ticket_date: string;
  document_type: string;
  supplier_id?: string;
  supplier?: { name: string };
  material_description?: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  total_amount?: number;
  ocr_status: 'pending' | 'processing' | 'completed' | 'failed' | 'verified';
  ocr_confidence?: number;
  ocr_extracted_data?: ExtractedData;
  ocr_raw_text?: string;
  verification_status: 'unverified' | 'verified' | 'rejected' | 'needs_review';
  verified_by?: string;
  verified_at?: string;
  matched_po_id?: string;
  matched_po?: { po_number: string; supplier?: { name: string } };
  po_match_confidence?: number;
  has_variance?: boolean;
  variance_type?: string;
  variance_amount?: number;
  variance_percentage?: number;
  document_url?: string;
  // Concrete fields
  batch_time?: string;
  mix_design?: string;
  slump_value?: number;
  air_content?: number;
  concrete_temp?: number;
  water_added?: number;
  load_number?: number;
  // Asphalt fields
  mix_type?: string;
  pg_grade?: string;
  asphalt_temp?: number;
  tare_weight?: number;
  gross_weight?: number;
  net_weight?: number;
}

interface OCRVerificationPanelProps {
  ticketId: string;
  onVerified?: (ticketId: string) => void;
  onRejected?: (ticketId: string) => void;
  onClose?: () => void;
}

// -----------------------------------------------------------------------------
// Confidence Level Helpers
// -----------------------------------------------------------------------------

const getConfidenceLevel = (confidence: number): 'high' | 'medium' | 'low' => {
  if (confidence >= 0.9) return 'high';
  if (confidence >= 0.7) return 'medium';
  return 'low';
};

const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.9) return '#22c55e'; // green
  if (confidence >= 0.7) return '#f59e0b'; // amber
  return '#ef4444'; // red
};

const formatConfidence = (confidence: number): string => {
  return `${Math.round(confidence * 100)}%`;
};

// -----------------------------------------------------------------------------
// Field Row Component
// -----------------------------------------------------------------------------

interface FieldRowProps {
  label: string;
  field?: OCRField;
  value: string | number | null | undefined;
  editedValue?: string | number | null;
  onEdit: (value: string) => void;
  type?: 'text' | 'number' | 'date' | 'time';
  unit?: string;
  isEditing: boolean;
}

const FieldRow: React.FC<FieldRowProps> = ({
  label,
  field,
  value,
  editedValue,
  onEdit,
  type = 'text',
  unit,
  isEditing,
}) => {
  const displayValue = editedValue !== undefined ? editedValue : value;
  const confidence = field?.confidence ?? 1;
  const source = field?.source;
  const wasEdited = editedValue !== undefined && editedValue !== value;

  return (
    <div className={`ocr-field-row ${wasEdited ? 'edited' : ''}`}>
      <div className="field-label">{label}</div>
      <div className="field-content">
        {isEditing ? (
          <input
            type={type}
            value={displayValue?.toString() ?? ''}
            onChange={(e) => onEdit(e.target.value)}
            className="field-input"
          />
        ) : (
          <span className="field-value">
            {displayValue ?? '-'}
            {unit && displayValue != null && <span className="field-unit">{unit}</span>}
          </span>
        )}
        {field && (
          <div className="field-confidence">
            <div
              className={`confidence-badge ${getConfidenceLevel(confidence)}`}
              style={{ borderColor: getConfidenceColor(confidence) }}
              title={`Confidence: ${formatConfidence(confidence)}`}
            >
              {formatConfidence(confidence)}
            </div>
            {source === 'ai_corrected' && (
              <span className="source-badge corrected" title="AI corrected this value">
                AI
              </span>
            )}
            {source === 'ai_inferred' && (
              <span className="source-badge inferred" title="AI inferred this value">
                Inferred
              </span>
            )}
          </div>
        )}
      </div>
      {field?.original_value && field.original_value !== field.value?.toString() && (
        <div className="original-value" title="Original OCR value">
          Original: {field.original_value}
        </div>
      )}
      {field?.validation_notes && (
        <div className="validation-notes">{field.validation_notes}</div>
      )}
    </div>
  );
};

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export const OCRVerificationPanel: React.FC<OCRVerificationPanelProps> = ({
  ticketId,
  onVerified,
  onRejected,
  onClose,
}) => {
  const [ticket, setTicket] = useState<MaterialTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedFields, setEditedFields] = useState<Record<string, string | number | null>>({});
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'raw' | 'matching'>('details');

  // ---------------------------------------------------------------------------
  // Data Loading
  // ---------------------------------------------------------------------------

  const loadTicket = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('material_tickets')
        .select(`
          *,
          supplier:suppliers(name),
          matched_po:purchase_orders(po_number, supplier:suppliers(name))
        `)
        .eq('id', ticketId)
        .single();

      if (fetchError) throw fetchError;
      setTicket(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  // ---------------------------------------------------------------------------
  // Field Editing
  // ---------------------------------------------------------------------------

  const handleFieldEdit = (fieldName: string, value: string) => {
    setEditedFields((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const getEditedValue = (fieldName: string) => {
    return editedFields[fieldName];
  };

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleSaveEdits = async () => {
    if (!ticket || Object.keys(editedFields).length === 0) return;

    try {
      setSaving(true);
      setError(null);

      // Map edited fields to database columns
      const updates: Record<string, any> = {};

      Object.entries(editedFields).forEach(([field, value]) => {
        switch (field) {
          case 'ticket_number':
            updates.ticket_number = value;
            break;
          case 'delivery_date':
            updates.ticket_date = value;
            break;
          case 'material_description':
            updates.material_description = value;
            break;
          case 'quantity':
            updates.quantity = parseFloat(value as string) || null;
            break;
          case 'unit':
            updates.unit = value;
            break;
          case 'unit_price':
            updates.unit_price = parseFloat(value as string) || null;
            break;
          case 'total_amount':
            updates.total_amount = parseFloat(value as string) || null;
            break;
          case 'truck_number':
            updates.truck_number = value;
            break;
          case 'driver_name':
            updates.driver_name = value;
            break;
          // Concrete fields
          case 'slump':
            updates.slump_value = parseFloat(value as string) || null;
            break;
          case 'air_content':
            updates.air_content = parseFloat(value as string) || null;
            break;
          case 'concrete_temperature':
            updates.concrete_temp = parseFloat(value as string) || null;
            break;
          case 'mix_design':
            updates.mix_design = value;
            break;
          // Asphalt fields
          case 'mix_type':
            updates.mix_type = value;
            break;
          case 'pg_grade':
            updates.pg_grade = value;
            break;
          case 'asphalt_temperature':
            updates.asphalt_temp = parseFloat(value as string) || null;
            break;
          case 'net_weight':
            updates.net_weight = parseFloat(value as string) || null;
            break;
        }
      });

      updates.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('material_tickets')
        .update(updates)
        .eq('id', ticketId);

      if (updateError) throw updateError;

      setEditedFields({});
      setIsEditing(false);
      await loadTicket();
    } catch (err: any) {
      setError(err.message || 'Failed to save edits');
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    if (!ticket) return;

    try {
      setSaving(true);
      setError(null);

      // Save any pending edits first
      if (Object.keys(editedFields).length > 0) {
        await handleSaveEdits();
      }

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
        .eq('id', ticketId);

      if (updateError) throw updateError;

      onVerified?.(ticketId);
    } catch (err: any) {
      setError(err.message || 'Failed to verify ticket');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!ticket) return;

    try {
      setSaving(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();

      const { error: updateError } = await supabase
        .from('material_tickets')
        .update({
          verification_status: 'rejected',
          rejection_reason: rejectionReason || 'Rejected by reviewer',
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      if (updateError) throw updateError;

      setShowRejectionModal(false);
      onRejected?.(ticketId);
    } catch (err: any) {
      setError(err.message || 'Failed to reject ticket');
    } finally {
      setSaving(false);
    }
  };

  const handleReprocessOCR = async () => {
    if (!ticket?.document_url) return;

    try {
      setSaving(true);
      setError(null);

      // Reset OCR status
      await supabase
        .from('material_tickets')
        .update({
          ocr_status: 'pending',
          verification_status: 'unverified',
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      // Call enhanced OCR function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-process-enhanced`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            document_url: ticket.document_url,
            document_type: ticket.document_type,
            ticket_id: ticketId,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'OCR reprocessing failed');
      }

      await loadTicket();
    } catch (err: any) {
      setError(err.message || 'Failed to reprocess OCR');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmPOMatch = async () => {
    if (!ticket?.matched_po_id) return;

    try {
      setSaving(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('material_tickets')
        .update({
          po_match_confirmed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      if (updateError) throw updateError;

      await loadTicket();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm PO match');
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="ocr-verification-panel">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading ticket data...</p>
        </div>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="ocr-verification-panel">
        <div className="error-state">
          <span className="error-icon">!</span>
          <p>{error}</p>
          <button onClick={loadTicket}>Retry</button>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="ocr-verification-panel">
        <div className="empty-state">
          <p>Ticket not found</p>
        </div>
      </div>
    );
  }

  const extractedData = ticket.ocr_extracted_data || {};
  const isConcreteTicket = ticket.document_type === 'BATCH_TICKET';
  const isAsphaltTicket = ticket.document_type === 'ASPHALT_TICKET';
  const overallConfidence = ticket.ocr_confidence ?? 0;

  return (
    <div className="ocr-verification-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="header-left">
          <h2>OCR Verification</h2>
          <span className={`status-badge ${ticket.verification_status}`}>
            {ticket.verification_status.replace('_', ' ')}
          </span>
        </div>
        <div className="header-right">
          {onClose && (
            <button className="close-btn" onClick={onClose} title="Close">
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      {/* Variance Alert */}
      {ticket.has_variance && (
        <div className={`variance-alert ${ticket.variance_type}`}>
          <span className="alert-icon">!</span>
          <div className="alert-content">
            <strong>Variance Detected:</strong> {ticket.variance_type?.replace('_', ' ')}
            {ticket.variance_amount != null && (
              <span className="variance-amount">
                ${Math.abs(ticket.variance_amount).toFixed(2)} ({Math.abs(ticket.variance_percentage || 0).toFixed(1)}%)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Overall Confidence */}
      <div className="overall-confidence">
        <div className="confidence-label">Overall OCR Confidence</div>
        <div className="confidence-bar-container">
          <div
            className="confidence-bar"
            style={{
              width: `${overallConfidence * 100}%`,
              backgroundColor: getConfidenceColor(overallConfidence),
            }}
          />
        </div>
        <span className={`confidence-value ${getConfidenceLevel(overallConfidence)}`}>
          {formatConfidence(overallConfidence)}
        </span>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Extracted Fields
        </button>
        <button
          className={`tab-btn ${activeTab === 'matching' ? 'active' : ''}`}
          onClick={() => setActiveTab('matching')}
        >
          PO Matching
        </button>
        <button
          className={`tab-btn ${activeTab === 'raw' ? 'active' : ''}`}
          onClick={() => setActiveTab('raw')}
        >
          Raw OCR
        </button>
      </div>

      {/* Content Area */}
      <div className="panel-content">
        {/* Document Preview */}
        {ticket.document_url && (
          <div className="document-preview">
            <img
              src={ticket.document_url}
              alt="Delivery ticket"
              onClick={() => window.open(ticket.document_url!, '_blank')}
            />
            <span className="preview-hint">Click to enlarge</span>
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="fields-section">
            <div className="section-header">
              <h3>Basic Information</h3>
              {!isEditing ? (
                <button className="edit-btn" onClick={() => setIsEditing(true)}>
                  Edit Fields
                </button>
              ) : (
                <div className="edit-actions">
                  <button
                    className="cancel-btn"
                    onClick={() => {
                      setIsEditing(false);
                      setEditedFields({});
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="save-btn"
                    onClick={handleSaveEdits}
                    disabled={saving || Object.keys(editedFields).length === 0}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            <div className="fields-grid">
              <FieldRow
                label="Ticket Number"
                field={extractedData.ticket_number}
                value={ticket.ticket_number}
                editedValue={getEditedValue('ticket_number')}
                onEdit={(v) => handleFieldEdit('ticket_number', v)}
                isEditing={isEditing}
              />
              <FieldRow
                label="Date"
                field={extractedData.delivery_date}
                value={ticket.ticket_date}
                editedValue={getEditedValue('delivery_date')}
                onEdit={(v) => handleFieldEdit('delivery_date', v)}
                type="date"
                isEditing={isEditing}
              />
              <FieldRow
                label="Supplier"
                field={extractedData.supplier_name}
                value={ticket.supplier?.name || extractedData.supplier_name?.value}
                editedValue={getEditedValue('supplier_name')}
                onEdit={(v) => handleFieldEdit('supplier_name', v)}
                isEditing={isEditing}
              />
              <FieldRow
                label="Material"
                field={extractedData.material_description}
                value={ticket.material_description}
                editedValue={getEditedValue('material_description')}
                onEdit={(v) => handleFieldEdit('material_description', v)}
                isEditing={isEditing}
              />
              <FieldRow
                label="Quantity"
                field={extractedData.quantity}
                value={ticket.quantity}
                editedValue={getEditedValue('quantity')}
                onEdit={(v) => handleFieldEdit('quantity', v)}
                type="number"
                unit={ticket.unit}
                isEditing={isEditing}
              />
              <FieldRow
                label="Unit Price"
                field={extractedData.unit_price}
                value={ticket.unit_price}
                editedValue={getEditedValue('unit_price')}
                onEdit={(v) => handleFieldEdit('unit_price', v)}
                type="number"
                unit="$"
                isEditing={isEditing}
              />
              <FieldRow
                label="Total Amount"
                field={extractedData.total_amount}
                value={ticket.total_amount}
                editedValue={getEditedValue('total_amount')}
                onEdit={(v) => handleFieldEdit('total_amount', v)}
                type="number"
                unit="$"
                isEditing={isEditing}
              />
              <FieldRow
                label="Truck Number"
                field={extractedData.truck_number}
                value={ticket.truck_number}
                editedValue={getEditedValue('truck_number')}
                onEdit={(v) => handleFieldEdit('truck_number', v)}
                isEditing={isEditing}
              />
              <FieldRow
                label="Driver"
                field={extractedData.driver_name}
                value={ticket.driver_name}
                editedValue={getEditedValue('driver_name')}
                onEdit={(v) => handleFieldEdit('driver_name', v)}
                isEditing={isEditing}
              />
            </div>

            {/* Concrete-specific fields */}
            {isConcreteTicket && (
              <>
                <h3 className="section-subtitle">Concrete Details</h3>
                <div className="fields-grid">
                  <FieldRow
                    label="Mix Design"
                    field={extractedData.concrete_mix_design}
                    value={ticket.mix_design}
                    editedValue={getEditedValue('mix_design')}
                    onEdit={(v) => handleFieldEdit('mix_design', v)}
                    isEditing={isEditing}
                  />
                  <FieldRow
                    label="Slump"
                    field={extractedData.slump}
                    value={ticket.slump_value}
                    editedValue={getEditedValue('slump')}
                    onEdit={(v) => handleFieldEdit('slump', v)}
                    type="number"
                    unit="in"
                    isEditing={isEditing}
                  />
                  <FieldRow
                    label="Air Content"
                    field={extractedData.air_content}
                    value={ticket.air_content}
                    editedValue={getEditedValue('air_content')}
                    onEdit={(v) => handleFieldEdit('air_content', v)}
                    type="number"
                    unit="%"
                    isEditing={isEditing}
                  />
                  <FieldRow
                    label="Temperature"
                    field={extractedData.concrete_temperature}
                    value={ticket.concrete_temp}
                    editedValue={getEditedValue('concrete_temperature')}
                    onEdit={(v) => handleFieldEdit('concrete_temperature', v)}
                    type="number"
                    unit="F"
                    isEditing={isEditing}
                  />
                  <FieldRow
                    label="Water Added"
                    field={extractedData.water_added}
                    value={ticket.water_added}
                    editedValue={getEditedValue('water_added')}
                    onEdit={(v) => handleFieldEdit('water_added', v)}
                    type="number"
                    unit="gal"
                    isEditing={isEditing}
                  />
                  <FieldRow
                    label="Load Number"
                    field={extractedData.load_number}
                    value={ticket.load_number}
                    editedValue={getEditedValue('load_number')}
                    onEdit={(v) => handleFieldEdit('load_number', v)}
                    type="number"
                    isEditing={isEditing}
                  />
                </div>
              </>
            )}

            {/* Asphalt-specific fields */}
            {isAsphaltTicket && (
              <>
                <h3 className="section-subtitle">Asphalt Details</h3>
                <div className="fields-grid">
                  <FieldRow
                    label="Mix Type"
                    field={extractedData.mix_type}
                    value={ticket.mix_type}
                    editedValue={getEditedValue('mix_type')}
                    onEdit={(v) => handleFieldEdit('mix_type', v)}
                    isEditing={isEditing}
                  />
                  <FieldRow
                    label="PG Grade"
                    field={extractedData.pg_grade}
                    value={ticket.pg_grade}
                    editedValue={getEditedValue('pg_grade')}
                    onEdit={(v) => handleFieldEdit('pg_grade', v)}
                    isEditing={isEditing}
                  />
                  <FieldRow
                    label="Temperature"
                    field={extractedData.asphalt_temperature}
                    value={ticket.asphalt_temp}
                    editedValue={getEditedValue('asphalt_temperature')}
                    onEdit={(v) => handleFieldEdit('asphalt_temperature', v)}
                    type="number"
                    unit="F"
                    isEditing={isEditing}
                  />
                  <FieldRow
                    label="Gross Weight"
                    field={extractedData.gross_weight}
                    value={ticket.gross_weight}
                    editedValue={getEditedValue('gross_weight')}
                    onEdit={(v) => handleFieldEdit('gross_weight', v)}
                    type="number"
                    unit="tons"
                    isEditing={isEditing}
                  />
                  <FieldRow
                    label="Tare Weight"
                    field={extractedData.tare_weight}
                    value={ticket.tare_weight}
                    editedValue={getEditedValue('tare_weight')}
                    onEdit={(v) => handleFieldEdit('tare_weight', v)}
                    type="number"
                    unit="tons"
                    isEditing={isEditing}
                  />
                  <FieldRow
                    label="Net Weight"
                    field={extractedData.net_weight}
                    value={ticket.net_weight}
                    editedValue={getEditedValue('net_weight')}
                    onEdit={(v) => handleFieldEdit('net_weight', v)}
                    type="number"
                    unit="tons"
                    isEditing={isEditing}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* PO Matching Tab */}
        {activeTab === 'matching' && (
          <div className="matching-section">
            {ticket.matched_po_id ? (
              <div className="po-match-card">
                <div className="match-header">
                  <h3>Matched Purchase Order</h3>
                  <span className={`match-confidence ${getConfidenceLevel(ticket.po_match_confidence || 0)}`}>
                    {formatConfidence(ticket.po_match_confidence || 0)} confidence
                  </span>
                </div>
                <div className="match-details">
                  <div className="detail-row">
                    <span className="label">PO Number:</span>
                    <span className="value">{ticket.matched_po?.po_number}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Supplier:</span>
                    <span className="value">{ticket.matched_po?.supplier?.name}</span>
                  </div>
                </div>
                {!ticket.po_match_confirmed && (
                  <div className="match-actions">
                    <button className="confirm-match-btn" onClick={handleConfirmPOMatch} disabled={saving}>
                      Confirm Match
                    </button>
                    <button className="reject-match-btn" disabled={saving}>
                      Wrong PO
                    </button>
                  </div>
                )}
                {ticket.po_match_confirmed && (
                  <div className="match-confirmed">
                    <span className="check-icon">&#10003;</span> Match Confirmed
                  </div>
                )}
              </div>
            ) : (
              <div className="no-match">
                <p>No purchase order matched for this ticket.</p>
                <p className="hint">
                  Tickets are auto-matched based on supplier, material, and PO number in the ticket.
                </p>
                <button className="manual-match-btn" disabled>
                  Manual Match (Coming Soon)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Raw OCR Tab */}
        {activeTab === 'raw' && (
          <div className="raw-section">
            <div className="raw-header">
              <h3>Raw OCR Text</h3>
              <button className="reprocess-btn" onClick={handleReprocessOCR} disabled={saving}>
                {saving ? 'Reprocessing...' : 'Reprocess OCR'}
              </button>
            </div>
            <pre className="raw-text">{ticket.ocr_raw_text || 'No raw text available'}</pre>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="panel-actions">
        {ticket.verification_status !== 'verified' && (
          <>
            <button
              className="action-btn reject"
              onClick={() => setShowRejectionModal(true)}
              disabled={saving}
            >
              Reject
            </button>
            <button
              className="action-btn verify"
              onClick={handleVerify}
              disabled={saving}
            >
              {saving ? 'Processing...' : 'Verify & Approve'}
            </button>
          </>
        )}
        {ticket.verification_status === 'verified' && (
          <div className="verified-badge">
            <span className="check-icon">&#10003;</span>
            Verified on {new Date(ticket.verified_at!).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="modal-overlay">
          <div className="rejection-modal">
            <h3>Reject Ticket</h3>
            <p>Please provide a reason for rejection:</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={3}
            />
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowRejectionModal(false)}>
                Cancel
              </button>
              <button className="reject-btn" onClick={handleReject} disabled={saving}>
                {saving ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OCRVerificationPanel;
