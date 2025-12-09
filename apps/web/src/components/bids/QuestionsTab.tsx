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

export function QuestionsTab({ projectId }: QuestionsTabProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

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
        <div className="questions-filters">
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
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {questions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">❓</div>
          <h4>No Pre-Bid Questions</h4>
          <p>
            AI will suggest pre-bid questions based on risks identified during document analysis
          </p>
        </div>
      ) : (
        <div className="questions-list">
          {questions.map((question, index) => (
            <div key={question.id} className="question-card">
              <div className="question-card-header">
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
                    <button className="action-btn approve">Approve</button>
                    <button className="action-btn reject">Reject</button>
                  </>
                )}
                {question.status === 'APPROVED' && (
                  <button className="action-btn submit">Mark Submitted</button>
                )}
                <button className="action-btn secondary">Edit</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
