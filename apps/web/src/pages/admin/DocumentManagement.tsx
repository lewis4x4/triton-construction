import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@triton/supabase-client';
import { ArrowLeft, Upload, RefreshCw, Trash2, RotateCw, Zap } from 'lucide-react';
import './Admin.css';
import './DocumentManagement.css';

interface SpecDocument {
  id: string;
  title: string;
  document_type: string;
  version_year: number;
  edition: string | null;
  processing_status: string;
  total_sections: number;
  total_chunks: number;
  total_pages: number | null;
  created_at: string;
  processing_error: string | null;
}

const DOCUMENT_TYPES = [
  { value: 'STANDARD_SPECS', label: 'Standard Specifications' },
  { value: 'SUPPLEMENTAL_SPECS', label: 'Supplemental Specifications' },
  { value: 'SPECIAL_PROVISIONS', label: 'Special Provisions' },
  { value: 'TECHNICAL_BULLETIN', label: 'Technical Bulletin' },
  { value: 'DESIGN_DIRECTIVE', label: 'Design Directive' },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'badge-gray',
  EXTRACTING: 'badge-blue',
  PARSING: 'badge-blue',
  CHUNKING: 'badge-blue',
  EMBEDDING: 'badge-purple',
  COMPLETED: 'badge-green',
  FAILED: 'badge-red',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  EXTRACTING: 'Extracting Text',
  PARSING: 'Parsing Structure',
  CHUNKING: 'Creating Chunks',
  EMBEDDING: 'Generating Embeddings',
  COMPLETED: 'Ready',
  FAILED: 'Failed',
};

export function DocumentManagement() {
  const [documents, setDocuments] = useState<SpecDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    documentType: 'STANDARD_SPECS',
    versionYear: new Date().getFullYear(),
    edition: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: fetchError } = await (supabase as any)
        .from('spec_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setDocuments((data || []) as SpecDocument[]);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load specification documents');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Auto-poll when any document is in a processing state
  useEffect(() => {
    const processingStatuses = ['PENDING', 'EXTRACTING', 'PARSING', 'CHUNKING', 'EMBEDDING'];
    const hasProcessingDocs = documents.some(doc => processingStatuses.includes(doc.processing_status));

    if (hasProcessingDocs) {
      const interval = setInterval(() => {
        fetchDocuments();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [documents, fetchDocuments]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadForm.title) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setUploadForm(prev => ({ ...prev, title: nameWithoutExt }));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    if (!uploadForm.title) {
      setError('Please enter a title');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Create the spec_documents record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: docRecord, error: docError } = await (supabase as any)
        .from('spec_documents')
        .insert({
          title: uploadForm.title,
          document_type: uploadForm.documentType,
          version_year: uploadForm.versionYear,
          edition: uploadForm.edition || null,
          processing_status: 'PENDING',
          created_by: session.user.id,
        })
        .select()
        .single();

      if (docError) throw docError;

      // Upload file to storage
      const filePath = `specs/${docRecord.id}/${selectedFile.name}`;
      const { error: storageError } = await supabase.storage
        .from('spec-documents')
        .upload(filePath, selectedFile, {
          contentType: selectedFile.type,
        });

      if (storageError) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('spec_documents').delete().eq('id', docRecord.id);
        throw storageError;
      }

      // Update document with file path
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('spec_documents')
        .update({ source_file_path: filePath })
        .eq('id', docRecord.id);

      // Reset form
      setSelectedFile(null);
      setUploadForm({
        title: '',
        documentType: 'STANDARD_SPECS',
        versionYear: new Date().getFullYear(),
        edition: '',
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setSuccess('Document uploaded successfully! Processing will begin shortly.');
      fetchDocuments();

      // Trigger processing
      triggerProcessing(docRecord.id, session.access_token);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const triggerProcessing = async (documentId: string, accessToken: string) => {
    try {
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-spec-pdf`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ documentId }),
        }
      );
    } catch (err) {
      console.error('Failed to trigger processing:', err);
    }
  };

  const handleReprocess = async (documentId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('spec_documents')
        .update({ processing_status: 'PENDING', processing_error: null })
        .eq('id', documentId);

      await triggerProcessing(documentId, session.access_token);
      fetchDocuments();
      setSuccess('Reprocessing started');
    } catch (err) {
      console.error('Reprocess error:', err);
      setError('Failed to reprocess document');
    }
  };

  const handleGenerateEmbeddings = async (documentId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-spec-embeddings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ documentId }),
        }
      );
      fetchDocuments();
      setSuccess('Embedding generation started');
    } catch (err) {
      console.error('Embedding error:', err);
      setError('Failed to generate embeddings');
    }
  };

  const handleDelete = async (documentId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: deleteError } = await (supabase as any)
        .from('spec_documents')
        .delete()
        .eq('id', documentId);

      if (deleteError) throw deleteError;

      setSuccess('Document deleted successfully');
      fetchDocuments();
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete document');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const processingDocs = documents.filter(doc =>
    ['PENDING', 'EXTRACTING', 'PARSING', 'CHUNKING', 'EMBEDDING'].includes(doc.processing_status)
  );

  return (
    <>
      <div className="page-header">
        <div className="page-header-content">
          <Link to="/admin" className="back-link">
            <ArrowLeft size={18} />
            Back to Admin
          </Link>
          <h1>Document Management</h1>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="doc-management">
        {/* Upload Section */}
        <div className="doc-upload-card">
          <div className="card-header">
            <Upload size={20} />
            <h2>Upload Specification Document</h2>
          </div>
          <div className="upload-form">
            <div className="form-row">
              <div className="form-group">
                <label>Document Title *</label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., WVDOH Standard Specifications 2023"
                  disabled={isUploading}
                />
              </div>
              <div className="form-group">
                <label>Document Type</label>
                <select
                  value={uploadForm.documentType}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, documentType: e.target.value }))}
                  disabled={isUploading}
                >
                  {DOCUMENT_TYPES.map(dt => (
                    <option key={dt.value} value={dt.value}>{dt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Version Year</label>
                <input
                  type="number"
                  value={uploadForm.versionYear}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, versionYear: parseInt(e.target.value) }))}
                  min={2000}
                  max={2100}
                  disabled={isUploading}
                />
              </div>
              <div className="form-group">
                <label>Edition (optional)</label>
                <input
                  type="text"
                  value={uploadForm.edition}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, edition: e.target.value }))}
                  placeholder="e.g., Metric, English"
                  disabled={isUploading}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group file-input-group">
                <label>PDF File *</label>
                <div className="file-input-wrapper">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                  />
                  {selectedFile && (
                    <span className="selected-file">{selectedFile.name}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button
                className="btn btn-primary btn-with-icon"
                onClick={handleUpload}
                disabled={isUploading || !selectedFile}
              >
                <Upload size={16} />
                {isUploading ? 'Uploading...' : 'Upload & Process'}
              </button>
            </div>
          </div>
        </div>

        {/* Processing Status */}
        {processingDocs.length > 0 && (
          <div className="processing-banner">
            <div className="processing-banner-icon">
              <div className="processing-spinner" />
            </div>
            <div className="processing-banner-content">
              <h3>Processing in Progress</h3>
              <p>{processingDocs.length} document(s) are being processed. Status updates automatically.</p>
              <ul className="processing-list">
                {processingDocs.map(doc => (
                  <li key={doc.id}>
                    <strong>{doc.title}</strong>: {STATUS_LABELS[doc.processing_status] || doc.processing_status}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Documents List */}
        <div className="doc-list-card">
          <div className="card-header">
            <h2>Uploaded Documents</h2>
            <button className="btn btn-secondary btn-sm btn-with-icon" onClick={fetchDocuments}>
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="loading-container">
              <div className="loading-spinner" />
              <span>Loading documents...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📚</div>
              <h3>No Specification Documents</h3>
              <p>Upload a WVDOH specification PDF to get started</p>
            </div>
          ) : (
            <div className="documents-table-container">
              <table className="documents-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Year</th>
                    <th>Status</th>
                    <th>Sections</th>
                    <th>Chunks</th>
                    <th>Uploaded</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td className="doc-title">
                        {doc.title}
                        {doc.edition && <span className="doc-edition">({doc.edition})</span>}
                      </td>
                      <td>
                        {DOCUMENT_TYPES.find(dt => dt.value === doc.document_type)?.label || doc.document_type}
                      </td>
                      <td>{doc.version_year}</td>
                      <td>
                        <span className={`badge ${STATUS_COLORS[doc.processing_status] || 'badge-gray'} ${['PENDING', 'EXTRACTING', 'PARSING', 'CHUNKING', 'EMBEDDING'].includes(doc.processing_status) ? 'badge-processing' : ''}`}>
                          {['PENDING', 'EXTRACTING', 'PARSING', 'CHUNKING', 'EMBEDDING'].includes(doc.processing_status) && (
                            <span className="processing-dot" />
                          )}
                          {STATUS_LABELS[doc.processing_status] || doc.processing_status}
                        </span>
                        {doc.processing_error && (
                          <div className="processing-error" title={doc.processing_error}>
                            <span className="error-text">{doc.processing_error.substring(0, 50)}...</span>
                          </div>
                        )}
                      </td>
                      <td>{doc.total_sections || 0}</td>
                      <td>{doc.total_chunks || 0}</td>
                      <td>{formatDate(doc.created_at)}</td>
                      <td className="actions-cell">
                        {doc.processing_status === 'FAILED' && (
                          <button
                            className="btn btn-sm btn-secondary btn-icon"
                            onClick={() => handleReprocess(doc.id)}
                            title="Retry processing"
                          >
                            <RotateCw size={14} />
                          </button>
                        )}
                        {doc.processing_status === 'COMPLETED' && doc.total_chunks === 0 && (
                          <button
                            className="btn btn-sm btn-secondary btn-icon"
                            onClick={() => handleGenerateEmbeddings(doc.id)}
                            title="Generate embeddings"
                          >
                            <Zap size={14} />
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-danger btn-icon"
                          onClick={() => handleDelete(doc.id, doc.title)}
                          title="Delete document"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
