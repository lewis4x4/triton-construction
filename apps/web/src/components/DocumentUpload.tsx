import { useState, useRef, useCallback } from 'react';
import { supabase } from '@triton/supabase-client';
import './DocumentUpload.css';

interface DocumentUploadProps {
  projectId: string;
  onUploadComplete?: () => void;
}

type DocumentType =
  | 'PROPOSAL'
  | 'BIDX'
  | 'PLANS'
  | 'EXISTING_PLANS'
  | 'SPECIAL_PROVISIONS'
  | 'ENVIRONMENTAL'
  | 'ASBESTOS'
  | 'HAZMAT'
  | 'GEOTECHNICAL'
  | 'TRAFFIC_STUDY'
  | 'ADDENDUM'
  | 'OTHER';

const DOCUMENT_TYPES: { value: DocumentType; label: string; description: string }[] = [
  { value: 'PROPOSAL', label: 'Proposal', description: 'Main bid proposal document' },
  { value: 'BIDX', label: 'Bidx File', description: 'Bidx XML file with line items' },
  { value: 'PLANS', label: 'Plans', description: 'Project construction plans' },
  { value: 'EXISTING_PLANS', label: 'Existing Plans', description: 'As-built or existing conditions' },
  { value: 'SPECIAL_PROVISIONS', label: 'Special Provisions', description: 'SP document' },
  { value: 'ENVIRONMENTAL', label: 'Environmental', description: 'Environmental permits/commitments' },
  { value: 'ASBESTOS', label: 'Asbestos Report', description: 'Asbestos survey report' },
  { value: 'HAZMAT', label: 'Hazmat Report', description: 'Hazardous materials report' },
  { value: 'GEOTECHNICAL', label: 'Geotechnical', description: 'Geotech/boring logs' },
  { value: 'TRAFFIC_STUDY', label: 'Traffic Study', description: 'Traffic analysis' },
  { value: 'ADDENDUM', label: 'Addendum', description: 'Bid addendum' },
  { value: 'OTHER', label: 'Other', description: 'Other supporting documents' },
];

const ACCEPTED_TYPES: Record<DocumentType, string> = {
  PROPOSAL: '.pdf',
  BIDX: '.xml',
  PLANS: '.pdf,.tif,.tiff',
  EXISTING_PLANS: '.pdf,.tif,.tiff',
  SPECIAL_PROVISIONS: '.pdf',
  ENVIRONMENTAL: '.pdf',
  ASBESTOS: '.pdf',
  HAZMAT: '.pdf',
  GEOTECHNICAL: '.pdf',
  TRAFFIC_STUDY: '.pdf',
  ADDENDUM: '.pdf',
  OTHER: '.pdf,.xml,.xls,.xlsx,.png,.jpg,.jpeg,.tif,.tiff',
};

interface UploadingFile {
  file: File;
  documentType: DocumentType;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

// File size threshold for using Railway service
// Set to 0 to route ALL uploads through Railway (more reliable for all file sizes)
const LARGE_FILE_THRESHOLD = 0;
// Railway service URL (handles large files that exceed edge function memory)
const RAILWAY_UPLOAD_URL = import.meta.env.VITE_DOCUMENT_PROCESSOR_URL || 'https://document-processor-production-b5d6.up.railway.app';

export function DocumentUpload({ projectId, onUploadComplete }: DocumentUploadProps) {
  const [documentType, setDocumentType] = useState<DocumentType>('PROPOSAL');
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const uploadFile = async (file: File, docType: DocumentType) => {
    setUploadingFiles((prev) => [
      ...prev,
      { file, documentType: docType, progress: 0, status: 'uploading' },
    ]);

    try {
      // Get session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      let response: Response;

      // Route large files to Railway service, small files to edge function
      if (file.size > LARGE_FILE_THRESHOLD) {
        // Use Railway service for large files (multipart upload)
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bidProjectId', projectId);
        formData.append('documentType', docType);

        response = await fetch(`${RAILWAY_UPLOAD_URL}/upload-document`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
        });
      } else {
        // Use edge function for small files (base64)
        const fileContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix
            const base64 = result.split(',')[1] ?? '';
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-bid-document`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              bidProjectId: projectId,
              documentType: docType,
              fileName: file.name,
              fileContent,
              mimeType: file.type,
            }),
          }
        );
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.file === file ? { ...f, progress: 100, status: 'success' } : f
        )
      );

      // Refresh after successful upload
      onUploadComplete?.();
    } catch (err) {
      console.error('Upload error:', err);
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.file === file
            ? {
                ...f,
                status: 'error',
                error: err instanceof Error ? err.message : 'Upload failed',
              }
            : f
        )
      );
    }
  };

  const handleFiles = useCallback(
    (files: FileList) => {
      Array.from(files).forEach((file) => {
        uploadFile(file, documentType);
      });
    },
    [documentType, projectId]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      // Reset input
      e.target.value = '';
    }
  };

  const clearCompleted = () => {
    setUploadingFiles((prev) =>
      prev.filter((f) => f.status !== 'success' && f.status !== 'error')
    );
  };

  const hasCompleted = uploadingFiles.some(
    (f) => f.status === 'success' || f.status === 'error'
  );

  return (
    <div className="document-upload">
      <div className="upload-header">
        <h3>Upload Documents</h3>
        <div className="document-type-select">
          <label>Document Type:</label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
          >
            {DOCUMENT_TYPES.map((dt) => (
              <option key={dt.value} value={dt.value}>
                {dt.label}
              </option>
            ))}
          </select>
          <span className="type-hint">
            {DOCUMENT_TYPES.find((dt) => dt.value === documentType)?.description}
          </span>
        </div>
      </div>

      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept={ACCEPTED_TYPES[documentType]}
          multiple
          style={{ display: 'none' }}
        />
        <div className="drop-zone-content">
          <span className="drop-icon">📁</span>
          <p className="drop-text">
            Drag and drop files here, or <span className="browse-link">browse</span>
          </p>
          <p className="drop-hint">Accepted: {ACCEPTED_TYPES[documentType]}</p>
        </div>
      </div>

      {uploadingFiles.length > 0 && (
        <div className="upload-progress-list">
          <div className="upload-list-header">
            <span>Upload Progress</span>
            {hasCompleted && (
              <button onClick={clearCompleted} className="clear-btn">
                Clear Completed
              </button>
            )}
          </div>
          {uploadingFiles.map((uf, index) => (
            <div key={index} className={`upload-item ${uf.status}`}>
              <div className="upload-item-info">
                <span className="file-name">{uf.file.name}</span>
                <span className="file-type">{uf.documentType}</span>
              </div>
              <div className="upload-item-status">
                {uf.status === 'uploading' && (
                  <div className="upload-spinner" />
                )}
                {uf.status === 'success' && <span className="status-icon">✓</span>}
                {uf.status === 'error' && (
                  <span className="status-icon error" title={uf.error}>
                    ✕
                  </span>
                )}
              </div>
              {uf.status === 'error' && uf.error && (
                <div className="upload-error">{uf.error}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
