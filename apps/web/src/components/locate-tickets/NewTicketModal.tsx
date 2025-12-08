import { useState, useCallback, type DragEvent, type ChangeEvent } from 'react';
import {
  X,
  Upload,
  Mail,
  FileText,
  Loader2,
  MapPin,
  Calendar,
  Building2,
  Wrench,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './NewTicketModal.css';

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedTicketData {
  ticket_number: string;
  ticket_type?: string;
  dig_site_address: string;
  dig_site_city?: string;
  dig_site_county?: string;
  dig_site_state?: string;
  dig_site_zip?: string;
  cross_street_1?: string;
  cross_street_2?: string;
  location_description?: string;
  excavator_company?: string;
  excavator_name?: string;
  excavator_phone?: string;
  excavator_email?: string;
  work_type?: string;
  work_description?: string;
  depth_in_inches?: number;
  ticket_created_at?: string;
  legal_dig_date?: string;
  ticket_expires_at?: string;
  utilities?: Array<{
    utility_code: string;
    utility_name: string;
    utility_type?: string;
    response_type?: string;
  }>;
}

type Step = 'upload' | 'parsing' | 'review' | 'saving';

export function NewTicketModal({ isOpen, onClose, onSuccess }: NewTicketModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [emailContent, setEmailContent] = useState('');
  const [parsedData, setParsedData] = useState<ParsedTicketData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetModal = useCallback(() => {
    setStep('upload');
    setEmailContent('');
    setParsedData(null);
    setError(null);
    setIsDragging(false);
  }, []);

  const handleClose = useCallback(() => {
    resetModal();
    onClose();
  }, [onClose, resetModal]);

  const parseEmailContent = useCallback(async (content: string) => {
    setStep('parsing');
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('wv811-email-parse-manual', {
        body: { emailContent: content },
      });

      if (fnError) throw fnError;

      if (data.parsed) {
        setParsedData(data.parsed);
        setStep('review');
      } else {
        throw new Error('Failed to parse email content');
      }
    } catch (err) {
      console.error('Parse error:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse email');
      setStep('upload');
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const emailFile = files.find(
        (f) => f.name.endsWith('.eml') || f.name.endsWith('.txt') || f.type === 'message/rfc822'
      );

      if (emailFile) {
        const content = await emailFile.text();
        setEmailContent(content);
        parseEmailContent(content);
      } else {
        // Try to get text content from drag
        const textContent = e.dataTransfer.getData('text/plain');
        if (textContent) {
          setEmailContent(textContent);
          parseEmailContent(textContent);
        } else {
          setError('Please drop an .eml file or paste email text');
        }
      }
    },
    [parseEmailContent]
  );

  const handleFileSelect = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const content = await file.text();
        setEmailContent(content);
        parseEmailContent(content);
      }
    },
    [parseEmailContent]
  );

  const handlePasteEmail = useCallback(() => {
    if (emailContent.trim()) {
      parseEmailContent(emailContent);
    }
  }, [emailContent, parseEmailContent]);

  const handleFieldChange = useCallback((field: keyof ParsedTicketData, value: string | number) => {
    setParsedData((prev) => (prev ? { ...prev, [field]: value } : null));
  }, []);

  const handleSaveTicket = useCallback(async () => {
    if (!parsedData) return;

    setStep('saving');
    setError(null);

    try {
      // Get user's organization
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', userData.user.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      // Calculate dates if not provided
      const ticketCreatedAt = parsedData.ticket_created_at || new Date().toISOString();

      // Insert ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('wv811_tickets')
        .insert({
          organization_id: profile.organization_id,
          ticket_number: parsedData.ticket_number,
          ticket_type: parsedData.ticket_type,
          dig_site_address: parsedData.dig_site_address,
          dig_site_city: parsedData.dig_site_city,
          dig_site_county: parsedData.dig_site_county,
          dig_site_state: parsedData.dig_site_state || 'WV',
          dig_site_zip: parsedData.dig_site_zip,
          cross_street_1: parsedData.cross_street_1,
          cross_street_2: parsedData.cross_street_2,
          location_description: parsedData.location_description,
          excavator_company: parsedData.excavator_company,
          excavator_name: parsedData.excavator_name,
          excavator_phone: parsedData.excavator_phone,
          excavator_email: parsedData.excavator_email,
          work_type: (parsedData.work_type?.toUpperCase() as any) || 'OTHER',
          work_description: parsedData.work_description,
          depth_in_inches: parsedData.depth_in_inches,
          ticket_created_at: ticketCreatedAt,
          legal_dig_date: parsedData.legal_dig_date || new Date().toISOString().split('T')[0],
          ticket_expires_at: parsedData.ticket_expires_at || new Date().toISOString().split('T')[0],
          status: 'PENDING',
          created_by: userData.user.id,
        } as any)
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Insert utilities if provided
      if (parsedData.utilities && parsedData.utilities.length > 0 && ticket) {
        const utilityInserts = parsedData.utilities.map((u) => ({
          ticket_id: ticket.id,
          utility_code: u.utility_code,
          utility_name: u.utility_name,
          utility_type: u.utility_type,
          response_type: (u.response_type?.toUpperCase() as any) || 'PENDING',
        }));

        await supabase.from('wv811_utility_responses').insert(utilityInserts);
      }

      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save ticket');
      setStep('review');
    }
  }, [parsedData, onSuccess, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content new-ticket-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <Mail size={20} />
            New WV811 Ticket
          </h2>
          <button className="modal-close" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="modal-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {step === 'upload' && (
          <div className="modal-body">
            <div
              className={`drop-zone ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload size={48} />
              <h3>Drag & Drop Email</h3>
              <p>Drop a WV811 ticket email (.eml file) here to automatically parse it</p>
              <div className="drop-zone-divider">
                <span>or</span>
              </div>
              <label className="file-select-btn">
                <FileText size={16} />
                Select File
                <input
                  type="file"
                  accept=".eml,.txt,message/rfc822"
                  onChange={handleFileSelect}
                  hidden
                />
              </label>
            </div>

            <div className="paste-section">
              <h4>Or paste email content:</h4>
              <textarea
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                placeholder="Paste the full email content from WV811 here..."
                rows={8}
              />
              <button
                className="btn btn-primary"
                onClick={handlePasteEmail}
                disabled={!emailContent.trim()}
              >
                Parse Email
              </button>
            </div>
          </div>
        )}

        {step === 'parsing' && (
          <div className="modal-body parsing-state">
            <Loader2 size={48} className="spinner" />
            <h3>Parsing Email...</h3>
            <p>Using AI to extract ticket information</p>
          </div>
        )}

        {step === 'review' && parsedData && (
          <div className="modal-body review-form">
            <div className="form-section">
              <h4>
                <FileText size={16} />
                Ticket Information
              </h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Ticket Number *</label>
                  <input
                    type="text"
                    value={parsedData.ticket_number}
                    onChange={(e) => handleFieldChange('ticket_number', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Ticket Type</label>
                  <input
                    type="text"
                    value={parsedData.ticket_type || ''}
                    onChange={(e) => handleFieldChange('ticket_type', e.target.value)}
                    placeholder="Normal, Emergency, etc."
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>
                <MapPin size={16} />
                Dig Site Location
              </h4>
              <div className="form-group">
                <label>Address *</label>
                <input
                  type="text"
                  value={parsedData.dig_site_address}
                  onChange={(e) => handleFieldChange('dig_site_address', e.target.value)}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    value={parsedData.dig_site_city || ''}
                    onChange={(e) => handleFieldChange('dig_site_city', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>County</label>
                  <input
                    type="text"
                    value={parsedData.dig_site_county || ''}
                    onChange={(e) => handleFieldChange('dig_site_county', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>ZIP</label>
                  <input
                    type="text"
                    value={parsedData.dig_site_zip || ''}
                    onChange={(e) => handleFieldChange('dig_site_zip', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Cross Street 1</label>
                  <input
                    type="text"
                    value={parsedData.cross_street_1 || ''}
                    onChange={(e) => handleFieldChange('cross_street_1', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Cross Street 2</label>
                  <input
                    type="text"
                    value={parsedData.cross_street_2 || ''}
                    onChange={(e) => handleFieldChange('cross_street_2', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>
                <Building2 size={16} />
                Excavator Information
              </h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Company</label>
                  <input
                    type="text"
                    value={parsedData.excavator_company || ''}
                    onChange={(e) => handleFieldChange('excavator_company', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Contact Name</label>
                  <input
                    type="text"
                    value={parsedData.excavator_name || ''}
                    onChange={(e) => handleFieldChange('excavator_name', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={parsedData.excavator_phone || ''}
                    onChange={(e) => handleFieldChange('excavator_phone', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={parsedData.excavator_email || ''}
                    onChange={(e) => handleFieldChange('excavator_email', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>
                <Calendar size={16} />
                Key Dates
              </h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Ticket Created</label>
                  <input
                    type="datetime-local"
                    value={parsedData.ticket_created_at?.slice(0, 16) || ''}
                    onChange={(e) => handleFieldChange('ticket_created_at', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Legal Dig Date *</label>
                  <input
                    type="date"
                    value={parsedData.legal_dig_date || ''}
                    onChange={(e) => handleFieldChange('legal_dig_date', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Expires</label>
                  <input
                    type="date"
                    value={parsedData.ticket_expires_at || ''}
                    onChange={(e) => handleFieldChange('ticket_expires_at', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>
                <Wrench size={16} />
                Work Details
              </h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Work Type</label>
                  <select
                    value={parsedData.work_type || ''}
                    onChange={(e) => handleFieldChange('work_type', e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="EXCAVATION">Excavation</option>
                    <option value="BORING">Boring</option>
                    <option value="TRENCHING">Trenching</option>
                    <option value="DEMOLITION">Demolition</option>
                    <option value="GRADING">Grading</option>
                    <option value="UTILITY_INSTALL">Utility Install</option>
                    <option value="UTILITY_REPAIR">Utility Repair</option>
                    <option value="ROAD_WORK">Road Work</option>
                    <option value="CONSTRUCTION">Construction</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Depth (inches)</label>
                  <input
                    type="number"
                    value={parsedData.depth_in_inches || ''}
                    onChange={(e) => handleFieldChange('depth_in_inches', parseInt(e.target.value))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Work Description</label>
                <textarea
                  value={parsedData.work_description || ''}
                  onChange={(e) => handleFieldChange('work_description', e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            {parsedData.utilities && parsedData.utilities.length > 0 && (
              <div className="form-section">
                <h4>
                  <Building2 size={16} />
                  Utilities ({parsedData.utilities.length})
                </h4>
                <div className="utilities-preview">
                  {parsedData.utilities.map((u, i) => (
                    <div key={i} className="utility-chip">
                      {u.utility_name} ({u.utility_code})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'saving' && (
          <div className="modal-body parsing-state">
            <Loader2 size={48} className="spinner" />
            <h3>Saving Ticket...</h3>
          </div>
        )}

        {step === 'review' && (
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={resetModal}>
              Start Over
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSaveTicket}
              disabled={!parsedData?.ticket_number || !parsedData?.dig_site_address}
            >
              <CheckCircle size={16} />
              Create Ticket
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
