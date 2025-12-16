import { useState, useRef } from 'react';
import {
  Upload,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  FileText,
  Check,
  X,
  File,
  Image,
  Calendar,
  Trash2,
} from 'lucide-react';
import type { WizardStepProps } from './types';
import './DocumentUploadStep.css';

interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  uploadedAt: string;
}

interface DocumentSlot {
  id: string;
  title: string;
  description: string;
  required: boolean;
  acceptedTypes: string[];
  maxSizeMB: number;
  expirationField?: string;
}

const REQUIRED_DOCUMENTS: DocumentSlot[] = [
  {
    id: 'medical_certificate',
    title: 'DOT Medical Examiner\'s Certificate',
    description: 'Current DOT medical card (Form MCSA-5876). Must be valid and not expired.',
    required: true,
    acceptedTypes: ['image/*', 'application/pdf'],
    maxSizeMB: 10,
    expirationField: 'medical_card_expiration',
  },
  {
    id: 'mvr',
    title: 'Motor Vehicle Record (MVR)',
    description: 'Current MVR from your licensing state, dated within the last 30 days. Or sign the MVR authorization in the next step.',
    required: false,
    acceptedTypes: ['image/*', 'application/pdf'],
    maxSizeMB: 10,
  },
  {
    id: 'cdl_front',
    title: 'CDL - Front',
    description: 'Clear photo of the front of your Commercial Driver\'s License.',
    required: true,
    acceptedTypes: ['image/*', 'application/pdf'],
    maxSizeMB: 10,
  },
  {
    id: 'cdl_back',
    title: 'CDL - Back',
    description: 'Clear photo of the back of your Commercial Driver\'s License.',
    required: true,
    acceptedTypes: ['image/*', 'application/pdf'],
    maxSizeMB: 10,
  },
];

const OPTIONAL_DOCUMENTS: DocumentSlot[] = [
  {
    id: 'employment_verification',
    title: 'Previous Employment Verification',
    description: 'Documentation from previous employers verifying employment dates and safety performance.',
    required: false,
    acceptedTypes: ['image/*', 'application/pdf'],
    maxSizeMB: 10,
  },
  {
    id: 'training_certificates',
    title: 'Training Certificates',
    description: 'Any relevant training certificates (HAZMAT, tanker, etc.).',
    required: false,
    acceptedTypes: ['image/*', 'application/pdf'],
    maxSizeMB: 10,
  },
  {
    id: 'other',
    title: 'Other Supporting Documents',
    description: 'Any other documents that support your application.',
    required: false,
    acceptedTypes: ['image/*', 'application/pdf'],
    maxSizeMB: 10,
  },
];

export function DocumentUploadStep({
  application,
  onUpdate,
  onNext,
  onPrev,
  isLoading,
}: WizardStepProps) {
  const [errors, setErrors] = useState<string[]>([]);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, UploadedDocument | null>>({});
  const [medicalExpiration, setMedicalExpiration] = useState(application.medical_card_expiration || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentSlotId, setCurrentSlotId] = useState<string | null>(null);

  const handleFileSelect = async (slotId: string) => {
    setCurrentSlotId(slotId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentSlotId) return;

    const slot = [...REQUIRED_DOCUMENTS, ...OPTIONAL_DOCUMENTS].find(s => s.id === currentSlotId);
    if (!slot) return;

    // Validate file size
    if (file.size > slot.maxSizeMB * 1024 * 1024) {
      setErrors([`File size exceeds ${slot.maxSizeMB}MB limit`]);
      return;
    }

    setUploadingSlot(currentSlotId);
    setErrors([]);

    try {
      // In a real implementation, this would upload to Supabase Storage
      // For now, we'll create a local URL and store the file info
      const docInfo: UploadedDocument = {
        id: `doc_${Date.now()}`,
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
        uploadedAt: new Date().toISOString(),
      };

      setUploadedDocs(prev => ({
        ...prev,
        [currentSlotId]: docInfo,
      }));

      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setErrors(['Failed to upload file. Please try again.']);
    } finally {
      setUploadingSlot(null);
      setCurrentSlotId(null);
    }
  };

  const handleRemoveDocument = (slotId: string) => {
    setUploadedDocs(prev => {
      const newDocs = { ...prev };
      if (newDocs[slotId]?.url) {
        URL.revokeObjectURL(newDocs[slotId]!.url!);
      }
      delete newDocs[slotId];
      return newDocs;
    });
  };

  const validateStep = (): boolean => {
    const newErrors: string[] = [];

    // Check required documents
    REQUIRED_DOCUMENTS.forEach(doc => {
      if (doc.required && !uploadedDocs[doc.id]) {
        newErrors.push(`${doc.title} is required`);
      }
    });

    // Check medical card expiration if uploaded
    if (uploadedDocs['medical_certificate'] && !medicalExpiration) {
      newErrors.push('Please enter the medical card expiration date');
    }

    // Validate expiration date is in the future
    if (medicalExpiration) {
      const expDate = new Date(medicalExpiration);
      if (expDate < new Date()) {
        newErrors.push('Medical card has expired. A valid card is required.');
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      // Save expiration date
      if (medicalExpiration) {
        onUpdate({ medical_card_expiration: medicalExpiration });
      }
      onNext();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image size={18} />;
    return <File size={18} />;
  };

  const renderDocumentSlot = (slot: DocumentSlot) => {
    const doc = uploadedDocs[slot.id];
    const isUploading = uploadingSlot === slot.id;

    return (
      <div key={slot.id} className={`document-slot ${doc ? 'uploaded' : ''}`}>
        <div className="slot-header">
          <div className="slot-info">
            <h4>
              {slot.title}
              {slot.required && <span className="required">*</span>}
            </h4>
            <p>{slot.description}</p>
          </div>
          {doc ? (
            <div className="slot-status uploaded">
              <Check size={16} />
              Uploaded
            </div>
          ) : (
            <div className={`slot-status ${slot.required ? 'required' : 'optional'}`}>
              {slot.required ? 'Required' : 'Optional'}
            </div>
          )}
        </div>

        {doc ? (
          <div className="uploaded-file">
            <div className="file-info">
              {getFileIcon(doc.type)}
              <div className="file-details">
                <span className="file-name">{doc.name}</span>
                <span className="file-meta">
                  {formatFileSize(doc.size)} • Uploaded {new Date(doc.uploadedAt).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="file-actions">
              {doc.url && (
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-view"
                >
                  View
                </a>
              )}
              <button
                type="button"
                className="btn-remove"
                onClick={() => handleRemoveDocument(slot.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="upload-area"
            onClick={() => handleFileSelect(slot.id)}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <div className="upload-spinner" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload size={24} />
                <span>Click to upload or drag and drop</span>
                <span className="upload-hint">
                  PDF, PNG, JPG up to {slot.maxSizeMB}MB
                </span>
              </>
            )}
          </button>
        )}

        {/* Medical card expiration date input */}
        {slot.id === 'medical_certificate' && doc && (
          <div className="expiration-input">
            <label>
              <Calendar size={16} />
              Medical Card Expiration Date <span className="required">*</span>
            </label>
            <input
              type="date"
              value={medicalExpiration}
              onChange={(e) => setMedicalExpiration(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        )}
      </div>
    );
  };

  const requiredCount = REQUIRED_DOCUMENTS.filter(d => d.required).length;
  const uploadedRequiredCount = REQUIRED_DOCUMENTS.filter(d => d.required && uploadedDocs[d.id]).length;

  return (
    <div className="document-step">
      <div className="step-header">
        <div className="step-icon">
          <Upload size={24} />
        </div>
        <div className="step-title-content">
          <h2>Document Uploads</h2>
          <p>
            Upload the required documents for your CDL driver file. All documents will be
            securely stored and verified by our compliance team.
          </p>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="validation-errors">
          <AlertCircle size={16} />
          <div className="error-list">
            {errors.map((error, index) => (
              <span key={index}>{error}</span>
            ))}
          </div>
        </div>
      )}

      {/* Progress Summary */}
      <div className="upload-progress">
        <div className="progress-text">
          <FileText size={18} />
          <span>
            <strong>{uploadedRequiredCount}</strong> of <strong>{requiredCount}</strong> required documents uploaded
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${(uploadedRequiredCount / requiredCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept="image/*,application/pdf"
      />

      {/* Required Documents */}
      <div className="document-section">
        <h3>Required Documents</h3>
        <div className="document-slots">
          {REQUIRED_DOCUMENTS.map(renderDocumentSlot)}
        </div>
      </div>

      {/* Optional Documents */}
      <div className="document-section">
        <h3>Optional Documents</h3>
        <p className="section-note">
          These documents are not required but may help expedite your application processing.
        </p>
        <div className="document-slots">
          {OPTIONAL_DOCUMENTS.map(renderDocumentSlot)}
        </div>
      </div>

      {/* Info Box */}
      <div className="info-box">
        <AlertCircle size={18} />
        <div>
          <strong>Document Requirements</strong>
          <p>
            All documents must be clearly legible. Photos should be taken in good lighting
            with the entire document visible. If we cannot verify a document, we will
            contact you for a replacement.
          </p>
        </div>
      </div>

      <div className="step-navigation">
        <button type="button" className="btn btn-secondary" onClick={onPrev} disabled={isLoading}>
          <ChevronLeft size={18} />
          Previous
        </button>
        <button type="button" className="btn btn-primary" onClick={handleNext} disabled={isLoading}>
          Continue
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
