import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@triton/supabase-client';
import './DocumentList.css';

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
  QUEUED: { label: 'Queued', className: 'status-pending', icon: '📋' },
  PROCESSING: { label: 'Processing', className: 'status-processing', icon: '⚙️' },
  AI_ANALYZING: { label: 'AI Analyzing', className: 'status-processing', icon: '🤖' },
  COMPLETED: { label: 'Processed', className: 'status-completed', icon: '✓' },
  AI_ANALYZED: { label: 'AI Complete', className: 'status-ai-complete', icon: '🤖' },
  FAILED: { label: 'Failed', className: 'status-failed', icon: '✕' },
  NEEDS_OCR: { label: 'Needs AI', className: 'status-needs-ocr', icon: '🤖' },
};

export function DocumentList({ projectId }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [analyzingDocId, setAnalyzingDocId] = useState<string | null>(null);
  const [retryingDocId, setRetryingDocId] = useState<string | null>(null);
  const [isRetryingAll, setIsRetryingAll] = useState(false);

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
    setRetryingDocId(doc.id);
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
    } finally {
      setRetryingDocId(null);
    }
  };

  const retryAllFailed = async () => {
    const failedDocs = documents.filter((doc) => doc.processing_status === 'FAILED');
    if (failedDocs.length === 0) return;

    setIsRetryingAll(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Retry all failed documents in parallel
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-document-queue`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            documentIds: failedDocs.map((doc) => doc.id),
          }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Retry failed');
      }

      // Refresh list
      fetchDocuments();
    } catch (err) {
      console.error('Retry all error:', err);
      alert('Failed to retry documents');
    } finally {
      setIsRetryingAll(false);
    }
  };

  const triggerAIAnalysis = async (doc: Document) => {
    setAnalyzingDocId(doc.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-bid-document`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            document_id: doc.id,
            analysis_type: 'FULL_EXTRACTION',
          }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'AI analysis failed');
      }

      // Refresh list
      fetchDocuments();
    } catch (err) {
      console.error('AI analysis error:', err);
      alert('Failed to trigger AI analysis');
    } finally {
      setAnalyzingDocId(null);
    }
  };

  const triggerAnalyzeAll = async () => {
    const docsToAnalyze = documents.filter(
      (doc) =>
        doc.processing_status === 'COMPLETED' ||
        doc.processing_status === 'PENDING' ||
        doc.processing_status === 'FAILED'
    );

    if (docsToAnalyze.length === 0) {
      alert('No documents to analyze');
      return;
    }

    setIsAnalyzingAll(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Process documents sequentially to avoid overwhelming the API
      for (const doc of docsToAnalyze) {
        setAnalyzingDocId(doc.id);
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-bid-document`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                document_id: doc.id,
                analysis_type: 'FULL_EXTRACTION',
              }),
            }
          );

          if (!response.ok) {
            console.error(`Failed to analyze ${doc.file_name}`);
          }
        } catch (docErr) {
          console.error(`Error analyzing ${doc.file_name}:`, docErr);
        }
      }

      // Refresh list after all done
      fetchDocuments();
    } catch (err) {
      console.error('Analyze all error:', err);
      alert('Failed to analyze documents');
    } finally {
      setIsAnalyzingAll(false);
      setAnalyzingDocId(null);
    }
  };

  const pendingAnalysisCount = documents.filter(
    (doc) =>
      doc.processing_status !== 'AI_ANALYZED' &&
      doc.processing_status !== 'AI_ANALYZING'
  ).length;

  const failedCount = documents.filter(
    (doc) => doc.processing_status === 'FAILED'
  ).length;

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
        <div className="header-actions">
          {failedCount > 0 && (
            <button
              onClick={retryAllFailed}
              className="btn btn-danger btn-sm"
              disabled={isRetryingAll}
            >
              {isRetryingAll ? (
                <>
                  <span className="btn-spinner" />
                  Retrying...
                </>
              ) : (
                <>🔄 Retry Failed ({failedCount})</>
              )}
            </button>
          )}
          {pendingAnalysisCount > 0 && (
            <button
              onClick={triggerAnalyzeAll}
              className="btn btn-primary btn-sm"
              disabled={isAnalyzingAll}
            >
              {isAnalyzingAll ? (
                <>
                  <span className="btn-spinner" />
                  Analyzing...
                </>
              ) : (
                <>🤖 Analyze All ({pendingAnalysisCount})</>
              )}
            </button>
          )}
          <button onClick={fetchDocuments} className="btn btn-icon" title="Refresh">
            🔄
          </button>
        </div>
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
              const isFailed = doc.processing_status === 'FAILED';
              const isRetrying = retryingDocId === doc.id;

              return (
                <tr
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={isFailed ? 'row-failed' : ''}
                >
                  <td className="file-name-cell">
                    <span className="file-icon">{isFailed ? '⚠️' : '📄'}</span>
                    <div className="file-info">
                      <span className="file-name" title={doc.file_name}>
                        {doc.file_name}
                      </span>
                      {isFailed && doc.processing_error && (
                        <span className="error-message-inline" title={doc.processing_error}>
                          {doc.processing_error.length > 60
                            ? doc.processing_error.substring(0, 60) + '...'
                            : doc.processing_error}
                        </span>
                      )}
                    </div>
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
                  </td>
                  <td>{doc.created_at ? formatDate(doc.created_at) : '-'}</td>
                  <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                    {isFailed && (
                      <button
                        className="btn btn-retry btn-sm"
                        onClick={() => triggerProcessing(doc)}
                        title="Retry processing"
                        disabled={isRetrying || isRetryingAll}
                      >
                        {isRetrying ? (
                          <>
                            <span className="btn-spinner" />
                            Retrying
                          </>
                        ) : (
                          <>🔄 Retry</>
                        )}
                      </button>
                    )}
                    <button
                      className="btn btn-icon"
                      onClick={() => handleDownload(doc)}
                      title="Download"
                    >
                      ⬇️
                    </button>
                    {doc.processing_status === 'PENDING' && (
                      <button
                        className="btn btn-icon"
                        onClick={() => triggerProcessing(doc)}
                        title="Process"
                        disabled={isRetrying}
                      >
                        {isRetrying ? '⏳' : '▶️'}
                      </button>
                    )}
                    {doc.processing_status !== 'AI_ANALYZED' &&
                      doc.processing_status !== 'AI_ANALYZING' && (
                      <button
                        className={`btn btn-icon ${analyzingDocId === doc.id ? 'analyzing' : ''}`}
                        onClick={() => triggerAIAnalysis(doc)}
                        title="Analyze with AI"
                        disabled={analyzingDocId === doc.id || isAnalyzingAll}
                      >
                        {analyzingDocId === doc.id ? '⏳' : '🤖'}
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
