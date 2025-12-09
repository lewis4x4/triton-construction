import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@triton/supabase-client';
import './QuestionsTab.css';

interface QuestionsTabProps {
  projectId: string;
}

interface Question {
  id: string;
  question_number: string | null;
  question_text: string;
  justification: string | null;
  category: string | null;
  status: string | null;
  ai_generated: boolean | null;
  ai_confidence: number | null;
  edited_by: string | null;
  submitted_at: string | null;
  response_text: string | null;
  response_received_at: string | null;
  source_page_numbers: string | null;
  created_at: string | null;
}

type StatusFilter = 'all' | 'AI_SUGGESTED' | 'APPROVED' | 'SUBMITTED' | 'ANSWERED' | 'DISCARDED';

const QUESTION_CATEGORIES = [
  { value: 'SCOPE', label: 'Scope' },
  { value: 'SCHEDULE', label: 'Schedule' },
  { value: 'QUANTITIES', label: 'Quantities' },
  { value: 'SPECIFICATIONS', label: 'Specifications' },
  { value: 'SITE_CONDITIONS', label: 'Site Conditions' },
  { value: 'ENVIRONMENTAL', label: 'Environmental' },
  { value: 'MOT', label: 'Maintenance of Traffic' },
  { value: 'DBE', label: 'DBE Requirements' },
  { value: 'PERMITS', label: 'Permits' },
  { value: 'UTILITIES', label: 'Utilities' },
  { value: 'MATERIALS', label: 'Materials' },
  { value: 'OTHER', label: 'Other' },
];

export function QuestionsTab({ projectId }: QuestionsTabProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showNewQuestionModal, setShowNewQuestionModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState<Question | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('bid_prebid_questions')
        .select('*')
        .eq('bid_project_id', projectId)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setQuestions(data || []);
    } catch (err) {
      console.error('Error fetching questions:', err);
      setError('Failed to load questions');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, statusFilter]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // ============================================================================
  // Action Handlers
  // ============================================================================

  const handleApprove = async (questionId: string) => {
    setActionInProgress(questionId);
    try {
      const { error } = await supabase
        .from('bid_prebid_questions')
        .update({ status: 'APPROVED' })
        .eq('id', questionId);

      if (error) throw error;
      await fetchQuestions();
    } catch (err) {
      console.error('Error approving question:', err);
      setError('Failed to approve question');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (questionId: string) => {
    setActionInProgress(questionId);
    try {
      const { error } = await supabase
        .from('bid_prebid_questions')
        .update({ status: 'DISCARDED' })
        .eq('id', questionId);

      if (error) throw error;
      await fetchQuestions();
    } catch (err) {
      console.error('Error rejecting question:', err);
      setError('Failed to reject question');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleMarkSubmitted = async (questionId: string) => {
    setActionInProgress(questionId);
    try {
      const { error } = await supabase
        .from('bid_prebid_questions')
        .update({
          status: 'SUBMITTED',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', questionId);

      if (error) throw error;
      await fetchQuestions();
    } catch (err) {
      console.error('Error marking as submitted:', err);
      setError('Failed to mark as submitted');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedQuestions.size === 0) return;
    setActionInProgress('bulk');
    try {
      const { error } = await supabase
        .from('bid_prebid_questions')
        .update({ status: 'APPROVED' })
        .in('id', Array.from(selectedQuestions));

      if (error) throw error;
      setSelectedQuestions(new Set());
      await fetchQuestions();
    } catch (err) {
      console.error('Error bulk approving:', err);
      setError('Failed to approve selected questions');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleBulkReject = async () => {
    if (selectedQuestions.size === 0) return;
    setActionInProgress('bulk');
    try {
      const { error } = await supabase
        .from('bid_prebid_questions')
        .update({ status: 'DISCARDED' })
        .in('id', Array.from(selectedQuestions));

      if (error) throw error;
      setSelectedQuestions(new Set());
      await fetchQuestions();
    } catch (err) {
      console.error('Error bulk rejecting:', err);
      setError('Failed to reject selected questions');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleBulkSubmit = async () => {
    if (selectedQuestions.size === 0) return;
    setActionInProgress('bulk');
    try {
      const { error } = await supabase
        .from('bid_prebid_questions')
        .update({
          status: 'SUBMITTED',
          submitted_at: new Date().toISOString(),
        })
        .in('id', Array.from(selectedQuestions));

      if (error) throw error;
      setSelectedQuestions(new Set());
      await fetchQuestions();
    } catch (err) {
      console.error('Error bulk submitting:', err);
      setError('Failed to submit selected questions');
    } finally {
      setActionInProgress(null);
    }
  };

  const toggleQuestionSelection = (questionId: string) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestions(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedQuestions.size === questions.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(questions.map((q) => q.id)));
    }
  };

  // ============================================================================
  // Helper Functions
  // ============================================================================

  const getStatusClass = (status: string | null) => {
    switch (status) {
      case 'AI_SUGGESTED':
        return 'status-suggested';
      case 'APPROVED':
        return 'status-approved';
      case 'SUBMITTED':
        return 'status-submitted';
      case 'ANSWERED':
        return 'status-answered';
      case 'DISCARDED':
        return 'status-rejected';
      default:
        return '';
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const stats = {
    total: questions.length,
    aiSuggested: questions.filter((q) => q.status === 'AI_SUGGESTED').length,
    approved: questions.filter((q) => q.status === 'APPROVED').length,
    submitted: questions.filter((q) => q.status === 'SUBMITTED').length,
    answered: questions.filter((q) => q.status === 'ANSWERED').length,
  };

  const getDisplayStatus = (status: string | null) => {
    return (status || 'PENDING').replace(/_/g, ' ');
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <div className="questions-loading">
        <div className="loading-spinner" />
        <span>Loading questions...</span>
      </div>
    );
  }

  return (
    <div className="questions-tab">
      {/* Header with Stats */}
      <div className="questions-header">
        <div className="questions-stats">
          <div className="stat-item">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-item suggested">
            <span className="stat-value">{stats.aiSuggested}</span>
            <span className="stat-label">AI Suggested</span>
          </div>
          <div className="stat-item approved">
            <span className="stat-value">{stats.approved}</span>
            <span className="stat-label">Approved</span>
          </div>
          <div className="stat-item submitted">
            <span className="stat-value">{stats.submitted}</span>
            <span className="stat-label">Submitted</span>
          </div>
          <div className="stat-item answered">
            <span className="stat-value">{stats.answered}</span>
            <span className="stat-label">Answered</span>
          </div>
        </div>
        <div className="questions-actions-bar">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="AI_SUGGESTED">AI Suggested</option>
            <option value="APPROVED">Approved</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="ANSWERED">Answered</option>
            <option value="DISCARDED">Discarded</option>
          </select>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowNewQuestionModal(true)}
          >
            + Add Question
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedQuestions.size > 0 && (
        <div className="bulk-actions-bar">
          <span className="selected-count">{selectedQuestions.size} selected</span>
          <button
            className="btn btn-sm btn-success"
            onClick={handleBulkApprove}
            disabled={actionInProgress === 'bulk'}
          >
            Approve Selected
          </button>
          <button
            className="btn btn-sm btn-warning"
            onClick={handleBulkSubmit}
            disabled={actionInProgress === 'bulk'}
          >
            Mark Submitted
          </button>
          <button
            className="btn btn-sm btn-danger"
            onClick={handleBulkReject}
            disabled={actionInProgress === 'bulk'}
          >
            Reject Selected
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setSelectedQuestions(new Set())}
          >
            Clear Selection
          </button>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {questions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">❓</div>
          <h4>No Pre-Bid Questions</h4>
          <p>
            AI will suggest pre-bid questions based on risks identified during document analysis
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setShowNewQuestionModal(true)}
          >
            Add Question Manually
          </button>
        </div>
      ) : (
        <div className="questions-list">
          {/* Select All Header */}
          <div className="questions-list-header">
            <label className="select-all-label">
              <input
                type="checkbox"
                checked={selectedQuestions.size === questions.length && questions.length > 0}
                onChange={toggleSelectAll}
              />
              Select All
            </label>
          </div>

          {questions.map((question, index) => (
            <div
              key={question.id}
              className={`question-card ${selectedQuestions.has(question.id) ? 'selected' : ''}`}
            >
              <div className="question-card-header">
                <label className="question-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedQuestions.has(question.id)}
                    onChange={() => toggleQuestionSelection(question.id)}
                  />
                </label>
                <span className="question-number">
                  {question.question_number || `Q${index + 1}`}
                </span>
                <span className={`status-badge ${getStatusClass(question.status)}`}>
                  {getDisplayStatus(question.status)}
                </span>
                {question.ai_generated && (
                  <span className="ai-badge">
                    AI
                    {question.ai_confidence !== null && (
                      <span className="confidence">
                        {Math.round((question.ai_confidence || 0) * 100)}%
                      </span>
                    )}
                  </span>
                )}
              </div>

              <div className="question-text">{question.question_text}</div>

              {question.justification && (
                <div className="question-justification">
                  <strong>Justification:</strong> {question.justification}
                </div>
              )}

              <div className="question-meta">
                {question.category && (
                  <span className="meta-item">
                    <strong>Category:</strong> {question.category.replace(/_/g, ' ')}
                  </span>
                )}
                {question.source_page_numbers && (
                  <span className="meta-item">
                    <strong>Source:</strong> Page {question.source_page_numbers}
                  </span>
                )}
                {question.submitted_at && (
                  <span className="meta-item">
                    <strong>Submitted:</strong> {formatDate(question.submitted_at)}
                  </span>
                )}
              </div>

              {question.response_text && (
                <div className="question-response">
                  <div className="response-header">
                    <span className="response-label">Response</span>
                    {question.response_received_at && (
                      <span className="response-date">
                        Received {formatDate(question.response_received_at)}
                      </span>
                    )}
                  </div>
                  <div className="response-text">{question.response_text}</div>
                </div>
              )}

              <div className="question-actions">
                {question.status === 'AI_SUGGESTED' && (
                  <>
                    <button
                      className="action-btn approve"
                      onClick={() => handleApprove(question.id)}
                      disabled={actionInProgress === question.id}
                    >
                      {actionInProgress === question.id ? '...' : 'Approve'}
                    </button>
                    <button
                      className="action-btn reject"
                      onClick={() => handleReject(question.id)}
                      disabled={actionInProgress === question.id}
                    >
                      {actionInProgress === question.id ? '...' : 'Reject'}
                    </button>
                  </>
                )}
                {question.status === 'APPROVED' && (
                  <button
                    className="action-btn submit"
                    onClick={() => handleMarkSubmitted(question.id)}
                    disabled={actionInProgress === question.id}
                  >
                    {actionInProgress === question.id ? '...' : 'Mark Submitted'}
                  </button>
                )}
                {question.status === 'SUBMITTED' && (
                  <button
                    className="action-btn response"
                    onClick={() => setShowResponseModal(question)}
                  >
                    Record Response
                  </button>
                )}
                <button
                  className="action-btn secondary"
                  onClick={() => setEditingQuestion(question)}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Question Modal */}
      {editingQuestion && (
        <EditQuestionModal
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSave={async (updated) => {
            try {
              const { error } = await supabase
                .from('bid_prebid_questions')
                .update({
                  question_text: updated.question_text,
                  justification: updated.justification,
                  category: updated.category,
                })
                .eq('id', updated.id);

              if (error) throw error;
              setEditingQuestion(null);
              await fetchQuestions();
            } catch (err) {
              console.error('Error updating question:', err);
              setError('Failed to update question');
            }
          }}
        />
      )}

      {/* New Question Modal */}
      {showNewQuestionModal && (
        <NewQuestionModal
          projectId={projectId}
          onClose={() => setShowNewQuestionModal(false)}
          onSave={async (newQuestion) => {
            try {
              // Get next question number
              const { data: existing } = await supabase
                .from('bid_prebid_questions')
                .select('question_number')
                .eq('bid_project_id', projectId)
                .order('created_at', { ascending: false })
                .limit(1);

              let nextNumber = 1;
              if (existing && existing.length > 0 && existing[0].question_number) {
                const match = existing[0].question_number.match(/Q-(\d+)/);
                if (match) {
                  nextNumber = parseInt(match[1], 10) + 1;
                }
              }

              const { error } = await supabase.from('bid_prebid_questions').insert({
                bid_project_id: projectId,
                question_number: `Q-${String(nextNumber).padStart(3, '0')}`,
                question_text: newQuestion.question_text,
                justification: newQuestion.justification,
                category: newQuestion.category,
                status: 'APPROVED', // Manual questions start as approved
                ai_generated: false,
              });

              if (error) throw error;
              setShowNewQuestionModal(false);
              await fetchQuestions();
            } catch (err) {
              console.error('Error creating question:', err);
              setError('Failed to create question');
            }
          }}
        />
      )}

      {/* Response Modal */}
      {showResponseModal && (
        <ResponseModal
          question={showResponseModal}
          onClose={() => setShowResponseModal(null)}
          onSave={async (questionId, responseText) => {
            try {
              const { error } = await supabase
                .from('bid_prebid_questions')
                .update({
                  status: 'ANSWERED',
                  response_text: responseText,
                  response_received_at: new Date().toISOString(),
                })
                .eq('id', questionId);

              if (error) throw error;
              setShowResponseModal(null);
              await fetchQuestions();
            } catch (err) {
              console.error('Error saving response:', err);
              setError('Failed to save response');
            }
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Edit Question Modal
// ============================================================================

interface EditQuestionModalProps {
  question: Question;
  onClose: () => void;
  onSave: (updated: Partial<Question> & { id: string }) => void;
}

function EditQuestionModal({ question, onClose, onSave }: EditQuestionModalProps) {
  const [questionText, setQuestionText] = useState(question.question_text);
  const [justification, setJustification] = useState(question.justification || '');
  const [category, setCategory] = useState(question.category || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave({
      id: question.id,
      question_text: questionText,
      justification: justification || null,
      category: category || null,
    });
    setIsSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content question-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Question</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Question Text *</label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={4}
              required
              placeholder="Enter your pre-bid question..."
            />
          </div>
          <div className="form-group">
            <label>Justification</label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={2}
              placeholder="Why is this question important?"
            />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Select Category</option>
              {QUESTION_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// New Question Modal
// ============================================================================

interface NewQuestionModalProps {
  projectId: string;
  onClose: () => void;
  onSave: (question: { question_text: string; justification: string | null; category: string | null }) => void;
}

function NewQuestionModal({ onClose, onSave }: NewQuestionModalProps) {
  const [questionText, setQuestionText] = useState('');
  const [justification, setJustification] = useState('');
  const [category, setCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave({
      question_text: questionText,
      justification: justification || null,
      category: category || null,
    });
    setIsSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content question-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add New Question</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Question Text *</label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={4}
              required
              placeholder="Enter your pre-bid question..."
            />
          </div>
          <div className="form-group">
            <label>Justification</label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={2}
              placeholder="Why is this question important?"
            />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Select Category</option>
              {QUESTION_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving || !questionText.trim()}>
              {isSaving ? 'Creating...' : 'Add Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Response Modal
// ============================================================================

interface ResponseModalProps {
  question: Question;
  onClose: () => void;
  onSave: (questionId: string, responseText: string) => void;
}

function ResponseModal({ question, onClose, onSave }: ResponseModalProps) {
  const [responseText, setResponseText] = useState(question.response_text || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(question.id, responseText);
    setIsSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content question-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Record Response</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="response-question-preview">
          <strong>Question:</strong>
          <p>{question.question_text}</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Response from WVDOH *</label>
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              rows={6}
              required
              placeholder="Enter the response received from WVDOH..."
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving || !responseText.trim()}>
              {isSaving ? 'Saving...' : 'Save Response'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
