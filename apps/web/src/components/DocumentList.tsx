import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@triton/supabase-client';

interface DocumentListProps {
  projectId: string;
}

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  document_type: string;
  processing_status: string | null;
  processing_error: string | null;
  created_at: string | null;
  extracted_metadata?: Record<string, unknown> | null;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  PROPOSAL: 'Proposal',
  BIDX: 'Bidx File',
  PLANS: 'Plans',
  EXISTING_PLANS: 'Existing Plans',
  SPECIAL_PROVISIONS: 'Special Provisions',
  ENVIRONMENTAL: 'Environmental',
  ASBESTOS: 'Asbestos Report',
  HAZMAT: 'Hazmat Report',
  GEOTECHNICAL: 'Geotechnical',
  TRAFFIC_STUDY: 'Traffic Study',
  ADDENDUM: 'Addendum',
  OTHER: 'Other',
};

const PROCESSING_STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: string }
> = {
  PENDING: { label: 'Pending', className: 'status-pending', icon: '⏳' },
  PROCESSING: { label: 'Processing', className: 'status-processing', icon: '⚙️' },
  COMPLETED: { label: 'Completed', className: 'status-completed', icon: '✓' },
  FAILED: { label: 'Failed', className: 'status-failed', icon: '✕' },
  NEEDS_OCR: { label: 'Needs AI', className: 'status-needs-ocr', icon: '🤖' },
};

export function DocumentList({ projectId }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('bid_documents')
        .select('*')
        .eq('bid_project_id', projectId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setDocuments((data || []) as Document[]);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchDocuments();

    // Set up real-time subscription for document updates
    const channel = supabase
      .channel(`documents-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bid_documents',
          filter: `bid_project_id=eq.${projectId}`,
        },
        () => {
          // Refetch when documents change
          fetchDocuments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDocuments, projectId]);

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Delete "${doc.file_name}"? This cannot be undone.`)) {
      return;
    }

    try {
      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('bid-documents')
        .remove([doc.file_path]);

      if (storageError) {
        console.warn('Storage delete error:', storageError);
      }

      // Delete database record
      const { error: dbError } = await supabase
        .from('bid_documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      // Refresh list
      fetchDocuments();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete document');
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('bid-documents')
        .download(doc.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download document');
    }
  };

  const triggerProcessing = async (doc: Document) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-document-queue`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            documentIds: [doc.id],
          }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Processing failed');
      }

      // Refresh list
      fetchDocuments();
    } catch (err) {
      console.error('Processing error:', err);
      alert('Failed to trigger processing');
    }
  };

  if (isLoading) {
    return (
      <div className="document-list">
        <div className="loading-inline">
          <div className="loading-spinner small" />
          <span>Loading documents...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="document-list">
        <div className="error-message">{error}</div>
        <button onClick={fetchDocuments} className="btn btn-secondary">
          Retry
        </button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="document-list">
        <div className="empty-state-inline">
          <span className="empty-icon">📄</span>
          <p>No documents uploaded yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="document-list">
      <div className="document-list-header">
        <h3>Uploaded Documents ({documents.length})</h3>
        <button onClick={fetchDocuments} className="btn btn-icon" title="Refresh">
          🔄
        </button>
      </div>

      <div className="document-table-container">
        <table className="document-table">
          <thead>
            <tr>
              <th>File Name</th>
              <th>Type</th>
              <th>Size</th>
              <th>Status</th>
              <th>Uploaded</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => {
              const status = doc.processing_status || 'PENDING';
              const statusConfig = PROCESSING_STATUS_CONFIG[status] ?? PROCESSING_STATUS_CONFIG.PENDING;

              return (
                <tr key={doc.id} onClick={() => setSelectedDoc(doc)}>
                  <td className="file-name-cell">
                    <span className="file-icon">📄</span>
                    <span className="file-name" title={doc.file_name}>
                      {doc.file_name}
                    </span>
                  </td>
                  <td>
                    <span className="doc-type-badge">
                      {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                    </span>
                  </td>
                  <td>{formatFileSize(doc.file_size_bytes)}</td>
                  <td>
                    <span className={`status-badge ${statusConfig?.className ?? 'status-pending'}`}>
                      <span className="status-icon">{statusConfig?.icon ?? '⏳'}</span>
                      {statusConfig?.label ?? 'Pending'}
                    </span>
                    {doc.processing_status === 'FAILED' && doc.processing_error && (
                      <span className="error-hint" title={doc.processing_error}>
                        ⓘ
                      </span>
                    )}
                  </td>
                  <td>{doc.created_at ? formatDate(doc.created_at) : '-'}</td>
                  <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn btn-icon"
                      onClick={() => handleDownload(doc)}
                      title="Download"
                    >
                      ⬇️
                    </button>
                    {(doc.processing_status === 'PENDING' ||
                      doc.processing_status === 'FAILED') && (
                      <button
                        className="btn btn-icon"
                        onClick={() => triggerProcessing(doc)}
                        title="Process"
                      >
                        ▶️
                      </button>
                    )}
                    <button
                      className="btn btn-icon btn-danger"
                      onClick={() => handleDelete(doc)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Document Detail Modal */}
      {selectedDoc && (
        <div className="modal-overlay" onClick={() => setSelectedDoc(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Document Details</h3>
              <button
                className="modal-close"
                onClick={() => setSelectedDoc(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <label>File Name:</label>
                <span>{selectedDoc.file_name}</span>
              </div>
              <div className="detail-row">
                <label>Type:</label>
                <span>
                  {DOCUMENT_TYPE_LABELS[selectedDoc.document_type] ||
                    selectedDoc.document_type}
                </span>
              </div>
              <div className="detail-row">
                <label>MIME Type:</label>
                <span>{selectedDoc.mime_type || '-'}</span>
              </div>
              <div className="detail-row">
                <label>Size:</label>
                <span>{formatFileSize(selectedDoc.file_size_bytes)}</span>
              </div>
              <div className="detail-row">
                <label>Status:</label>
                <span
                  className={`status-badge ${
                    PROCESSING_STATUS_CONFIG[selectedDoc.processing_status || 'PENDING']
                      ?.className ?? ''
                  }`}
                >
                  {PROCESSING_STATUS_CONFIG[selectedDoc.processing_status || 'PENDING']?.label ?? 'Unknown'}
                </span>
              </div>
              {selectedDoc.processing_error && (
                <div className="detail-row error">
                  <label>Error:</label>
                  <span>{selectedDoc.processing_error}</span>
                </div>
              )}
              {selectedDoc.extracted_metadata && (
                <div className="detail-row">
                  <label>Extracted Data:</label>
                  <pre className="metadata-json">
                    {JSON.stringify(selectedDoc.extracted_metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => handleDownload(selectedDoc)}
              >
                Download
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setSelectedDoc(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
