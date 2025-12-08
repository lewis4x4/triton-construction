import { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  FileText,
  Package,
  Truck,
  Scale,
  Calendar,
  Clock,
  CheckCircle,
  Loader2,
  Scan,
  DollarSign,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './MaterialTicketCapture.css';

interface MaterialTicketCaptureProps {
  projectId: string;
  projectName: string;
  onTicketCreated?: (ticketId: string) => void;
}

interface ExtractedData {
  ticketNumber?: string;
  vendorName?: string;
  materialDescription?: string;
  quantity?: number;
  unit?: string;
  deliveryDate?: string;
  truckNumber?: string;
  grossWeight?: number;
  tareWeight?: number;
  netWeight?: number;
  confidence: number;
}

type MaterialCategory = 'aggregate' | 'asphalt' | 'concrete' | 'steel' | 'lumber' | 'pipe' | 'electrical' | 'fuel' | 'other';

const MATERIAL_CATEGORIES: { value: MaterialCategory; label: string }[] = [
  { value: 'aggregate', label: 'Aggregate' },
  { value: 'asphalt', label: 'Asphalt' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'steel', label: 'Steel' },
  { value: 'lumber', label: 'Lumber' },
  { value: 'pipe', label: 'Pipe' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'other', label: 'Other' },
];

export function MaterialTicketCapture({ projectId, projectName, onTicketCreated }: MaterialTicketCaptureProps) {
  const [step, setStep] = useState<'capture' | 'review' | 'submitting' | 'done'>('capture');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state for manual entry / corrections
  const [formData, setFormData] = useState({
    ticketNumber: '',
    vendorName: '',
    materialDescription: '',
    materialCategory: 'aggregate' as MaterialCategory,
    quantity: '',
    unit: 'ton',
    deliveryDate: new Date().toISOString().split('T')[0],
    deliveryTime: '',
    truckNumber: '',
    grossWeight: '',
    tareWeight: '',
    netWeight: '',
    costCode: '',
    notes: '',
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setImageUrl(url);

    // Process with OCR
    await processOCR(file);
  };

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const processOCR = async (file: File) => {
    setIsProcessingOCR(true);
    try {
      // Upload image to Supabase storage
      const fileName = `temp-tickets/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('wv811-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('wv811-attachments')
        .getPublicUrl(fileName);

      // Call OCR function (would be implemented as Edge Function)
      const { data: ocrResult } = await supabase.functions.invoke('ocr-material-ticket', {
        body: { imageUrl: urlData.publicUrl },
      });

      if (ocrResult) {
        setExtractedData(ocrResult);

        // Pre-fill form with extracted data
        setFormData(prev => ({
          ...prev,
          ticketNumber: ocrResult.ticketNumber || prev.ticketNumber,
          vendorName: ocrResult.vendorName || prev.vendorName,
          materialDescription: ocrResult.materialDescription || prev.materialDescription,
          quantity: ocrResult.quantity?.toString() || prev.quantity,
          unit: ocrResult.unit || prev.unit,
          deliveryDate: ocrResult.deliveryDate || prev.deliveryDate,
          truckNumber: ocrResult.truckNumber || prev.truckNumber,
          grossWeight: ocrResult.grossWeight?.toString() || prev.grossWeight,
          tareWeight: ocrResult.tareWeight?.toString() || prev.tareWeight,
          netWeight: ocrResult.netWeight?.toString() || prev.netWeight,
        }));
      }

      setStep('review');
    } catch (error) {
      console.error('OCR error:', error);
      // Continue to manual entry
      setStep('review');
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const handleSubmit = async () => {
    setStep('submitting');

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Get organization from project
      const { data: project } = await supabase
        .from('projects')
        .select('organization_id')
        .eq('id', projectId)
        .single();

      if (!project) throw new Error('Project not found');

      // Upload final image if exists
      let ticketPhotoUrl = null;
      if (imageFile) {
        const fileName = `tickets/${projectId}/${Date.now()}-${imageFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('material-tickets')
          .upload(fileName, imageFile);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('material-tickets')
            .getPublicUrl(fileName);
          ticketPhotoUrl = urlData.publicUrl;
        }
      }

      // Create material ticket
      const { data: ticket, error } = await supabase
        .from('material_tickets')
        .insert({
          organization_id: project.organization_id,
          project_id: projectId,
          ticket_number: formData.ticketNumber,
          vendor_name: formData.vendorName,
          material_description: formData.materialDescription,
          material_category: formData.materialCategory,
          quantity: parseFloat(formData.quantity) || 0,
          unit_of_measure: formData.unit,
          delivery_date: formData.deliveryDate,
          delivery_time: formData.deliveryTime || null,
          truck_number: formData.truckNumber,
          gross_weight: formData.grossWeight ? parseFloat(formData.grossWeight) : null,
          tare_weight: formData.tareWeight ? parseFloat(formData.tareWeight) : null,
          net_weight: formData.netWeight ? parseFloat(formData.netWeight) : null,
          cost_code: formData.costCode || null,
          notes: formData.notes || null,
          ticket_photo_url: ticketPhotoUrl,
          ocr_status: extractedData ? 'completed' : 'manual_entry',
          status: 'ocr_complete' as any,
          received_by: userData.user.id,
          created_by: userData.user.id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // If OCR was used, store extraction log
      if (extractedData && ticketPhotoUrl) {
        await supabase.from('ocr_extractions').insert({
          material_ticket_id: ticket.id,
          status: 'completed',
          processed_at: new Date().toISOString(),
          provider: 'google_document_ai',
          confidence_score: extractedData.confidence,
          extracted_ticket_number: extractedData.ticketNumber,
          extracted_vendor: extractedData.vendorName,
          extracted_quantity: extractedData.quantity?.toString(),
          extracted_unit: extractedData.unit,
          image_url: ticketPhotoUrl,
        });
      }

      // Try auto-matching to PO
      await supabase.functions.invoke('auto-match-material-ticket', {
        body: { ticketId: ticket.id },
      });

      setStep('done');
      onTicketCreated?.(ticket.id);

    } catch (error) {
      console.error('Submit error:', error);
      setStep('review');
    }
  };

  const resetForm = () => {
    setStep('capture');
    setImageUrl(null);
    setImageFile(null);
    setExtractedData(null);
    setFormData({
      ticketNumber: '',
      vendorName: '',
      materialDescription: '',
      materialCategory: 'aggregate',
      quantity: '',
      unit: 'ton',
      deliveryDate: new Date().toISOString().split('T')[0],
      deliveryTime: '',
      truckNumber: '',
      grossWeight: '',
      tareWeight: '',
      netWeight: '',
      costCode: '',
      notes: '',
    });
  };

  const renderCaptureStep = () => (
    <div className="capture-step">
      <div className="capture-header">
        <FileText size={32} />
        <h2>Capture Material Ticket</h2>
        <p>Take a photo or upload an image of the delivery ticket</p>
      </div>

      <div className="capture-options">
        <button className="capture-option camera" onClick={handleCameraCapture}>
          <Camera size={48} />
          <span>Take Photo</span>
          <p>Use your camera to capture the ticket</p>
        </button>

        <button className="capture-option upload" onClick={() => fileInputRef.current?.click()}>
          <Upload size={48} />
          <span>Upload Image</span>
          <p>Select an existing photo</p>
        </button>
      </div>

      <div className="manual-entry-option">
        <span>or</span>
        <button className="btn btn-link" onClick={() => setStep('review')}>
          Enter ticket manually without photo
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  );

  const renderReviewStep = () => (
    <div className="review-step">
      <div className="review-layout">
        {/* Image Preview */}
        {imageUrl && (
          <div className="image-preview">
            <img src={imageUrl} alt="Ticket" />
            {extractedData && (
              <div className="ocr-badge">
                <Scan size={14} />
                <span>{Math.round(extractedData.confidence * 100)}% confidence</span>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <div className="ticket-form">
          <h3>Ticket Details</h3>

          <div className="form-grid">
            <div className="form-field">
              <label>Ticket Number *</label>
              <input
                type="text"
                value={formData.ticketNumber}
                onChange={e => setFormData({ ...formData, ticketNumber: e.target.value })}
                placeholder="Enter ticket number"
                required
              />
            </div>

            <div className="form-field">
              <label>Vendor / Supplier *</label>
              <input
                type="text"
                value={formData.vendorName}
                onChange={e => setFormData({ ...formData, vendorName: e.target.value })}
                placeholder="Vendor name"
                required
              />
            </div>

            <div className="form-field wide">
              <label>Material Description *</label>
              <input
                type="text"
                value={formData.materialDescription}
                onChange={e => setFormData({ ...formData, materialDescription: e.target.value })}
                placeholder="e.g., #57 Limestone, 3000 PSI Concrete"
                required
              />
            </div>

            <div className="form-field">
              <label>Material Category</label>
              <select
                value={formData.materialCategory}
                onChange={e => setFormData({ ...formData, materialCategory: e.target.value as MaterialCategory })}
              >
                {MATERIAL_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="form-field quantity-field">
              <label>Quantity *</label>
              <div className="quantity-input">
                <input
                  type="number"
                  step="0.01"
                  value={formData.quantity}
                  onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="0.00"
                  required
                />
                <select
                  value={formData.unit}
                  onChange={e => setFormData({ ...formData, unit: e.target.value })}
                >
                  <option value="ton">Tons</option>
                  <option value="cy">CY</option>
                  <option value="sy">SY</option>
                  <option value="lf">LF</option>
                  <option value="ea">EA</option>
                  <option value="gal">GAL</option>
                </select>
              </div>
            </div>

            <div className="form-field">
              <label>
                <Calendar size={14} />
                Delivery Date *
              </label>
              <input
                type="date"
                value={formData.deliveryDate}
                onChange={e => setFormData({ ...formData, deliveryDate: e.target.value })}
                required
              />
            </div>

            <div className="form-field">
              <label>
                <Clock size={14} />
                Delivery Time
              </label>
              <input
                type="time"
                value={formData.deliveryTime}
                onChange={e => setFormData({ ...formData, deliveryTime: e.target.value })}
              />
            </div>

            <div className="form-field">
              <label>
                <Truck size={14} />
                Truck Number
              </label>
              <input
                type="text"
                value={formData.truckNumber}
                onChange={e => setFormData({ ...formData, truckNumber: e.target.value })}
                placeholder="e.g., T-105"
              />
            </div>

            {/* Weight Fields */}
            <div className="form-section-header">
              <Scale size={16} />
              <span>Weights (optional)</span>
            </div>

            <div className="form-field">
              <label>Gross Weight</label>
              <input
                type="number"
                step="0.01"
                value={formData.grossWeight}
                onChange={e => setFormData({ ...formData, grossWeight: e.target.value })}
                placeholder="lbs"
              />
            </div>

            <div className="form-field">
              <label>Tare Weight</label>
              <input
                type="number"
                step="0.01"
                value={formData.tareWeight}
                onChange={e => setFormData({ ...formData, tareWeight: e.target.value })}
                placeholder="lbs"
              />
            </div>

            <div className="form-field">
              <label>Net Weight</label>
              <input
                type="number"
                step="0.01"
                value={formData.netWeight}
                onChange={e => setFormData({ ...formData, netWeight: e.target.value })}
                placeholder="lbs"
              />
            </div>

            <div className="form-field">
              <label>
                <DollarSign size={14} />
                Cost Code
              </label>
              <input
                type="text"
                value={formData.costCode}
                onChange={e => setFormData({ ...formData, costCode: e.target.value })}
                placeholder="e.g., 301.01"
              />
            </div>

            <div className="form-field wide">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="review-actions">
        <button className="btn btn-secondary" onClick={resetForm}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={!formData.ticketNumber || !formData.vendorName || !formData.quantity}
        >
          <CheckCircle size={18} />
          Save Ticket
        </button>
      </div>
    </div>
  );

  const renderSubmittingStep = () => (
    <div className="submitting-step">
      <Loader2 size={48} className="spin" />
      <h3>Saving Material Ticket...</h3>
      <p>Auto-matching with purchase orders</p>
    </div>
  );

  const renderDoneStep = () => (
    <div className="done-step">
      <CheckCircle size={64} />
      <h3>Ticket Saved Successfully</h3>
      <p>Material ticket has been recorded and is being matched to POs</p>

      <div className="done-actions">
        <button className="btn btn-primary" onClick={resetForm}>
          <Camera size={18} />
          Capture Another Ticket
        </button>
      </div>
    </div>
  );

  return (
    <div className="material-ticket-capture">
      <div className="capture-header-bar">
        <div className="header-info">
          <Package size={24} />
          <div>
            <h2>Material Ticket</h2>
            <p>{projectName}</p>
          </div>
        </div>
      </div>

      {isProcessingOCR && (
        <div className="ocr-processing">
          <div className="ocr-animation">
            <Scan size={32} />
            <div className="scan-line" />
          </div>
          <h3>Scanning Ticket...</h3>
          <p>Extracting data with OCR</p>
        </div>
      )}

      {!isProcessingOCR && (
        <>
          {step === 'capture' && renderCaptureStep()}
          {step === 'review' && renderReviewStep()}
          {step === 'submitting' && renderSubmittingStep()}
          {step === 'done' && renderDoneStep()}
        </>
      )}
    </div>
  );
}

export default MaterialTicketCapture;
