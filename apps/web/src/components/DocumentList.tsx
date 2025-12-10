import { useEffect, useState, useCallback, useRef } from 'react';
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
  // AI Analysis fields (optional - may not exist for all documents)
  ai_summary?: string | null;
  ai_key_findings?: Array<{ finding: string; importance: string } | string> | null;
  ai_confidence_score?: number | null;
  ai_document_category?: string | null;
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

// ============================================================================
// Progress Pipeline Component
// ============================================================================

type PipelineStage = 'pending' | 'processing' | 'complete' | 'failed';

interface ProgressPipelineProps {
  uploadComplete: boolean;
  parseStatus: PipelineStage;
  aiStatus: PipelineStage;
  onRetryParse?: () => void;
  onRetryAI?: () => void;
}

function ProgressPipeline({ uploadComplete, parseStatus, aiStatus, onRetryParse, onRetryAI }: ProgressPipelineProps) {
  const getStageIcon = (stage: PipelineStage, canRetry?: () => void) => {
    switch (stage) {
      case 'pending':
        return <span className="stage-icon stage-pending">○</span>;
      case 'processing':
        return <span className="stage-icon stage-processing">⏳</span>;
      case 'complete':
        return <span className="stage-icon stage-complete">✓</span>;
      case 'failed':
        return canRetry ? (
          <button className="stage-icon stage-failed clickable" onClick={canRetry} title="Click to retry">
            ✕
          </button>
        ) : (
          <span className="stage-icon stage-failed">✕</span>
        );
    }
  };

  return (
    <div className="progress-pipeline">
      <div className="pipeline-stage" title="Upload">
        <span className="stage-emoji">📤</span>
        {uploadComplete && <span className="stage-icon stage-complete">✓</span>}
      </div>
      <span className="pipeline-divider">│</span>
      <div className="pipeline-stage" title="Parse/Process">
        <span className="stage-emoji">📄</span>
        {getStageIcon(parseStatus, onRetryParse)}
      </div>
      <span className="pipeline-divider">│</span>
      <div className="pipeline-stage" title="AI Analysis">
        <span className="stage-emoji">🤖</span>
        {getStageIcon(aiStatus, onRetryAI)}
      </div>
    </div>
  );
}

// ============================================================================
// Overflow Menu Component
// ============================================================================

interface OverflowMenuProps {
  onDownload: () => void;
  onDelete: () => void;
  onReanalyze?: () => void;
  hasAIAnalysis: boolean;
}

function OverflowMenu({ onDownload, onDelete, onReanalyze, hasAIAnalysis }: OverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="overflow-menu-container" ref={menuRef}>
      <button
        className="overflow-menu-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title="More options"
      >
        ⋮
      </button>
      {isOpen && (
        <div className="overflow-menu-dropdown">
          <button onClick={() => { onDownload(); setIsOpen(false); }}>
            <span>⬇️</span> Download
          </button>
          {hasAIAnalysis && onReanalyze && (
            <button onClick={() => { onReanalyze(); setIsOpen(false); }}>
              <span>🔄</span> Re-analyze
            </button>
          )}
          <button className="danger" onClick={() => { onDelete(); setIsOpen(false); }}>
            <span>🗑️</span> Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// AI Details Expanded Row Component
// ============================================================================

interface AIDetailsRowProps {
  doc: Document;
}

function AIDetailsRow({ doc }: AIDetailsRowProps) {
  if (!doc.ai_summary) return null;

  const findingsCount = Array.isArray(doc.ai_key_findings) ? doc.ai_key_findings.length : 0;
  const confidence = doc.ai_confidence_score ?? 0;
  const category = doc.ai_document_category || 'Unknown';

  return (
    <tr className="ai-details-row">
      <td colSpan={6}>
        <div className="ai-details-content">
          <div className="ai-summary">
            <span className="ai-summary-icon">📝</span>
            <p>{doc.ai_summary}</p>
          </div>
          <div className="ai-meta-row">
            <span className="ai-meta-item" title="Key findings">
              🔍 {findingsCount} finding{findingsCount !== 1 ? 's' : ''}
            </span>
            <span className="ai-meta-divider">│</span>
            <span className="ai-meta-item" title="Confidence score">
              📊 {confidence.toFixed(0)}% confidence
            </span>
            <span className="ai-meta-divider">│</span>
            <span className="ai-meta-item" title="Document category">
              🏷️ {category}
            </span>
          </div>
        </div>
      </td>
    </tr>
  );
}

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
              <th>Progress</th>
              <th>Action</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => {
              const status = doc.processing_status || 'PENDING';
              const isFailed = status === 'FAILED';
              const isRetrying = retryingDocId === doc.id;
              const isAnalyzing = analyzingDocId === doc.id;
              const hasAISummary = !!doc.ai_summary;

              // Determine pipeline stages
              const parseStatus: PipelineStage =
                status === 'PENDING' || status === 'QUEUED' ? 'pending' :
                status === 'PROCESSING' ? 'processing' :
                status === 'FAILED' ? 'failed' : 'complete';

              const aiStatus: PipelineStage =
                hasAISummary ? 'complete' :
                status === 'AI_ANALYZING' || isAnalyzing ? 'processing' :
                parseStatus === 'complete' ? 'pending' : 'pending';

              // Determine smart action button
              const getSmartAction = () => {
                if (isFailed) {
                  return (
                    <button
                      className="btn btn-smart btn-retry"
                      onClick={() => triggerProcessing(doc)}
                      disabled={isRetrying || isRetryingAll}
                    >
                      {isRetrying ? (
                        <>
                          <span className="btn-spinner" />
                          Retrying...
                        </>
                      ) : (
                        'Retry'
                      )}
                    </button>
                  );
                }
                if (status === 'PENDING' || status === 'QUEUED') {
                  return (
                    <button
                      className="btn btn-smart btn-process"
                      onClick={() => triggerProcessing(doc)}
                      disabled={isRetrying}
                    >
                      {isRetrying ? (
                        <>
                          <span className="btn-spinner" />
                          Processing...
                        </>
                      ) : (
                        'Process'
                      )}
                    </button>
                  );
                }
                if (status === 'PROCESSING') {
                  return (
                    <button className="btn btn-smart" disabled>
                      <span className="btn-spinner" />
                      Processing...
                    </button>
                  );
                }
                if (status === 'AI_ANALYZING' || isAnalyzing) {
                  return (
                    <button className="btn btn-smart" disabled>
                      <span className="btn-spinner" />
                      Analyzing...
                    </button>
                  );
                }
                if (!hasAISummary && parseStatus === 'complete') {
                  return (
                    <button
                      className="btn btn-smart btn-analyze"
                      onClick={() => triggerAIAnalysis(doc)}
                      disabled={isAnalyzingAll}
                    >
                      Analyze
                    </button>
                  );
                }
                // AI complete - no button needed
                return null;
              };

              return (
                <>
                  <tr
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`${isFailed ? 'row-failed' : ''} ${hasAISummary ? 'row-analyzed' : ''}`}
                  >
                    <td className="file-name-cell">
                      <span className="file-icon">{isFailed ? '⚠️' : '📄'}</span>
                      <div className="file-info">
                        <span className="file-name" title={doc.file_name}>
                          {doc.file_name}
                        </span>
                        {isFailed && doc.processing_error && (
                          <span className="error-message-inline" title={doc.processing_error}>
                            {doc.processing_error.length > 50
                              ? doc.processing_error.substring(0, 50) + '...'
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
                    <td className="size-cell">{formatFileSize(doc.file_size_bytes)}</td>
                    <td className="progress-cell">
                      <ProgressPipeline
                        uploadComplete={true}
                        parseStatus={parseStatus}
                        aiStatus={aiStatus}
                        onRetryParse={isFailed ? () => triggerProcessing(doc) : undefined}
                      />
                    </td>
                    <td className="action-cell" onClick={(e) => e.stopPropagation()}>
                      {getSmartAction()}
                    </td>
                    <td className="overflow-cell" onClick={(e) => e.stopPropagation()}>
                      <OverflowMenu
                        onDownload={() => handleDownload(doc)}
                        onDelete={() => handleDelete(doc)}
                        onReanalyze={hasAISummary ? () => triggerAIAnalysis(doc) : undefined}
                        hasAIAnalysis={hasAISummary}
                      />
                    </td>
                  </tr>
                  {hasAISummary && <AIDetailsRow key={`${doc.id}-ai`} doc={doc} />}
                </>
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
                <span className="status-badge">
                  {selectedDoc.processing_status || 'PENDING'}
                </span>
              </div>
              <div className="detail-row">
                <label>Uploaded:</label>
                <span>{selectedDoc.created_at ? formatDate(selectedDoc.created_at) : '-'}</span>
              </div>
              {selectedDoc.processing_error && (
                <div className="detail-row error">
                  <label>Error:</label>
                  <span>{selectedDoc.processing_error}</span>
                </div>
              )}
              {selectedDoc.ai_summary && (
                <>
                  <div className="detail-section-header">AI Analysis</div>
                  <div className="detail-row">
                    <label>Summary:</label>
                    <span>{selectedDoc.ai_summary}</span>
                  </div>
                  {selectedDoc.ai_document_category && (
                    <div className="detail-row">
                      <label>Category:</label>
                      <span>{selectedDoc.ai_document_category}</span>
                    </div>
                  )}
                  {selectedDoc.ai_confidence_score && (
                    <div className="detail-row">
                      <label>Confidence:</label>
                      <span>{selectedDoc.ai_confidence_score.toFixed(0)}%</span>
                    </div>
                  )}
                  {selectedDoc.ai_key_findings && selectedDoc.ai_key_findings.length > 0 && (
                    <div className="detail-row">
                      <label>Key Findings:</label>
                      <ul className="findings-list">
                        {selectedDoc.ai_key_findings.map((finding, idx) => (
                          <li key={idx}>{typeof finding === 'string' ? finding : finding.finding}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
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
