import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import { Send, Sparkles, X, Plus } from 'lucide-react';

interface ChunkResult {
  chunkId: string;
  sectionId: string;
  sectionNumber: string;
  sectionTitle: string;
  chunkType: string;
  content: string;
  sectionContext: string;
  similarity: number;
  pageNumber: number | null;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  chunks?: ChunkResult[];
  timestamp: Date;
}

interface SpecSearchProps {
  bidProjectId?: string;
  lineItemId?: string;
  payItemCode?: string;
  initialQuery?: string;
  initialMessages?: ConversationMessage[];
  compact?: boolean;
  onClose?: () => void;
  onMessagesChange?: (messages: ConversationMessage[]) => void;
  onNewConversation?: () => void;
}

const CHUNK_TYPE_LABELS: Record<string, string> = {
  SECTION_HEADER: 'Section',
  REQUIREMENT: 'Requirement',
  PROCEDURE: 'Procedure',
  MATERIAL_SPEC: 'Material',
  MEASUREMENT: 'Measurement',
  PAYMENT: 'Payment',
  TABLE: 'Table',
  REFERENCE: 'Reference',
  DEFINITION: 'Definition',
};

const CHUNK_TYPE_COLORS: Record<string, string> = {
  SECTION_HEADER: 'badge-blue',
  REQUIREMENT: 'badge-purple',
  PROCEDURE: 'badge-green',
  MATERIAL_SPEC: 'badge-yellow',
  MEASUREMENT: 'badge-cyan',
  PAYMENT: 'badge-orange',
  TABLE: 'badge-gray',
  REFERENCE: 'badge-gray',
  DEFINITION: 'badge-gray',
};

export function SpecSearch({
  bidProjectId,
  lineItemId,
  payItemCode,
  initialQuery = '',
  initialMessages = [],
  compact = false,
  onClose,
  onMessagesChange,
  onNewConversation,
}: SpecSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>(initialMessages);
  const [error, setError] = useState<string | null>(null);
  const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync with parent when messages change
  useEffect(() => {
    if (onMessagesChange && messages.length > 0) {
      onMessagesChange(messages);
    }
  }, [messages, onMessagesChange]);

  // Update messages when initialMessages changes (loading a conversation)
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // Handle initial query from quick search
  useEffect(() => {
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery);
      // Auto-submit if there's an initial query
      if (initialQuery.trim()) {
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 100);
      }
    }
  }, [initialQuery]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const clearSearch = useCallback(() => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setQuery('');
    setError(null);
    setIsSearching(false);
    setExpandedChunks(new Set());
  }, []);

  const startNewConversation = useCallback(() => {
    clearSearch();
    setMessages([]);
    if (onNewConversation) {
      onNewConversation();
    }
  }, [clearSearch, onNewConversation]);

  const performSearch = useCallback(async () => {
    if (!query.trim()) return;

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsSearching(true);
    setError(null);
    setQuery(''); // Clear input after sending

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Build conversation history for context (just the text, not chunks)
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/spec-query`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            query: userMessage.content,
            payItemCode,
            bidProjectId,
            lineItemId,
            maxResults: 5,
            includeAISynthesis: true,
            conversationHistory,
          }),
          signal: abortController.signal,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      // Add assistant response to messages
      const assistantMessage: ConversationMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer || 'No answer available for this query.',
        chunks: data.chunks,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      // Don't show error if request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        // Remove the user message if request was aborted
        setMessages(prev => prev.filter(m => m.id !== userMessage.id));
        return;
      }
      console.error('Spec search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      // Remove the user message on error
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      // Only set isSearching to false if this is still the active request
      if (abortControllerRef.current === abortController) {
        setIsSearching(false);
      }
    }
  }, [query, payItemCode, bidProjectId, lineItemId, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      performSearch();
    }
  };

  const toggleChunkExpanded = (chunkId: string) => {
    setExpandedChunks(prev => {
      const next = new Set(prev);
      if (next.has(chunkId)) {
        next.delete(chunkId);
      } else {
        next.add(chunkId);
      }
      return next;
    });
  };

  // Render a single message with its chunks
  const renderMessage = (message: ConversationMessage) => {
    if (message.role === 'user') {
      return (
        <div key={message.id} className="chat-message chat-message-user">
          <div className="chat-message-content">
            <div className="chat-message-text">{message.content}</div>
          </div>
        </div>
      );
    }

    // Assistant message
    return (
      <div key={message.id} className="chat-message chat-message-assistant">
        <div className="chat-message-content">
          <div className="answer-header">
            <span className="ai-icon">AI</span>
            <span>AI Response</span>
          </div>
          <div className="chat-message-text">{message.content}</div>

          {/* Source Chunks for this message */}
          {message.chunks && message.chunks.length > 0 && (
            <div className="spec-search-chunks">
              <h4>Sources ({message.chunks.length})</h4>
              {message.chunks.map((chunk) => (
                <div
                  key={chunk.chunkId}
                  className={`spec-chunk ${expandedChunks.has(chunk.chunkId) ? 'expanded' : ''}`}
                >
                  <div
                    className="spec-chunk-header"
                    onClick={() => toggleChunkExpanded(chunk.chunkId)}
                  >
                    <div className="chunk-meta">
                      <span className={`badge ${CHUNK_TYPE_COLORS[chunk.chunkType] || 'badge-gray'}`}>
                        {CHUNK_TYPE_LABELS[chunk.chunkType] || chunk.chunkType}
                      </span>
                      <span className="chunk-section">
                        Section {chunk.sectionNumber} - {chunk.sectionTitle}
                      </span>
                      {chunk.pageNumber && (
                        <span className="chunk-page">p. {chunk.pageNumber}</span>
                      )}
                    </div>
                    <div className="chunk-similarity">
                      {Math.round(chunk.similarity * 100)}% match
                    </div>
                    <span className="expand-icon">
                      {expandedChunks.has(chunk.chunkId) ? '▼' : '▶'}
                    </span>
                  </div>
                  <div className="spec-chunk-content">
                    <div className="chunk-text">
                      {chunk.content}
                    </div>
                    {chunk.sectionContext && (
                      <div className="chunk-context">
                        {chunk.sectionContext}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`spec-search ${compact ? 'spec-search-compact' : ''}`}>
      {/* Header */}
      <div className="spec-search-header">
        <div className="spec-search-header-title">
          <Sparkles size={20} className="header-icon" />
          <h3>WVDOH Specification Search</h3>
        </div>
        <div className="spec-search-header-actions">
          {messages.length > 0 && (
            <button
              className="btn btn-secondary btn-sm btn-with-icon"
              onClick={startNewConversation}
              title="Start new conversation"
            >
              <Plus size={14} />
              New Chat
            </button>
          )}
          {onClose && (
            <button className="btn btn-icon" onClick={onClose} title="Close">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Pay Item Context */}
      {payItemCode && (
        <div className="spec-search-context">
          <span className="context-label">Searching for pay item:</span>
          <span className="context-value">{payItemCode}</span>
        </div>
      )}

      {/* Conversation Messages */}
      {messages.length > 0 ? (
        <div className="spec-search-conversation">
          {messages.map(renderMessage)}

          {/* Loading indicator */}
          {isSearching && (
            <div className="chat-message chat-message-assistant">
              <div className="chat-message-content chat-message-loading">
                <span className="loading-spinner small" />
                <span>Searching specifications...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      ) : (
        /* Empty State */
        <div className="spec-search-empty">
          <div className="empty-icon">📚</div>
          <p>Search WVDOH construction specifications</p>
          <p className="empty-hint">
            Ask questions like "What are the requirements for Class B concrete?" or
            "How is structural steel measured for payment?"
          </p>
          <p className="empty-hint">
            You can ask follow-up questions to continue the conversation.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="spec-search-error">
          <span className="error-icon">!</span>
          {error}
        </div>
      )}

      {/* Search Input */}
      <div className="spec-search-input-container">
        <div className="spec-search-input-wrapper">
          <textarea
            ref={textareaRef}
            className="spec-search-input"
            placeholder={messages.length > 0 ? "Ask a follow-up question..." : "Ask a question about WVDOH specifications..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={compact ? 2 : 2}
          />
          {query && (
            <button
              className="btn-clear"
              onClick={clearSearch}
              title="Clear input"
              type="button"
            >
              ✕
            </button>
          )}
        </div>
        <div className="spec-search-actions">
          <button
            className="btn btn-primary spec-search-button btn-with-icon"
            onClick={performSearch}
            disabled={isSearching || !query.trim()}
          >
            {isSearching ? (
              <>
                <span className="loading-spinner small" />
                Searching...
              </>
            ) : (
              <>
                <Send size={16} />
                {messages.length > 0 ? 'Send' : 'Search'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
