import { useState, useEffect, useRef, useMemo, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { supabase } from '@triton/supabase-client';
import { MessageSquare, Send, Menu, Plus, WifiOff, AlertCircle, RefreshCw, X } from 'lucide-react';
import './AIQueryPage.css';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  isOptimistic?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  project_id: string;
  created_at: string;
  message_count?: number;
}

interface Project {
  id: string;
  name: string;
  project_number: string;
  organization_id: string;
}

interface LoadingStates {
  projects: boolean;
  conversations: boolean;
  messages: boolean;
  sending: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_MESSAGE_LENGTH = 10000;
const RETRY_DELAY_MS = 1000;
const MAX_RETRIES = 3;

const SUGGESTED_QUERIES = [
  "What work was completed last week?",
  "Show me all open RFIs",
  "What are the current change order totals?",
  "List subcontractors on site today",
  "What's the weather forecast for this week?",
  "Summarize recent safety observations",
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sanitizes text content to prevent XSS attacks
 * For user messages: strips all HTML
 * For assistant messages: allows safe markdown-like formatting
 */
function sanitizeContent(content: string, _role: 'user' | 'assistant'): string {
  if (!content) return '';

  // Basic HTML entity encoding
  const encoded = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // For assistant messages, we could later add markdown parsing
  // For now, just return sanitized plain text
  // _role parameter reserved for future role-specific sanitization
  return encoded;
}

/**
 * Validates message input
 */
function validateMessage(message: string): { valid: boolean; error?: string } {
  if (!message.trim()) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` };
  }
  // Check for potential injection patterns (basic protection)
  const suspiciousPatterns = /<script/i;
  if (suspiciousPatterns.test(message)) {
    return { valid: false, error: 'Invalid characters in message' };
  }
  return { valid: true };
}

/**
 * Hook to track online/offline status
 */
function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Generates a unique optimistic message ID
 */
function generateOptimisticId(): string {
  return `optimistic-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// ============================================================================
// ERROR BOUNDARY COMPONENT
// ============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AIQueryPage ErrorBoundary caught:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[calc(100vh-64px)] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              We encountered an error loading the AI assistant. Please try refreshing the page.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// TOAST NOTIFICATION COMPONENT
// ============================================================================

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  action?: { label: string; onClick: () => void };
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2" role="alert" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[300px] ${toast.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
            toast.type === 'warning' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' :
              toast.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
                'bg-blue-50 border border-blue-200 text-blue-800'
            }`}
        >
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <div className="flex-1">
            <p className="text-sm font-medium">{toast.message}</p>
            {toast.action && (
              <button
                onClick={toast.action.onClick}
                className="text-sm font-medium underline mt-1"
              >
                {toast.action.label}
              </button>
            )}
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="p-1 hover:bg-black/5 rounded"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// LOADING SKELETON COMPONENTS
// ============================================================================

function ConversationSkeleton() {
  return (
    <div className="px-4 py-2 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="flex justify-start animate-pulse">
      <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-100">
        <div className="h-4 bg-gray-200 rounded w-48 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-64 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-24" />
      </div>
    </div>
  );
}

// ============================================================================
// OFFLINE BANNER COMPONENT
// ============================================================================

function OfflineBanner() {
  return (
    <div
      className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center gap-2 text-yellow-800"
      role="alert"
      aria-live="assertive"
    >
      <WifiOff className="w-4 h-4" />
      <span className="text-sm font-medium">
        You&apos;re offline. Messages will be queued and sent when you reconnect.
      </span>
    </div>
  );
}

// ============================================================================
// MESSAGE CONTENT COMPONENT (with sanitization)
// ============================================================================

interface MessageContentProps {
  content: string;
  role: 'user' | 'assistant';
}

function MessageContent({ content, role }: MessageContentProps) {
  const sanitizedContent = useMemo(() => {
    return sanitizeContent(content, role);
  }, [content, role]);

  return (
    <div
      className="whitespace-pre-wrap break-words"
    // Using dangerouslySetInnerHTML with sanitized content
    // In production, consider using a markdown renderer with sanitization
    >
      {sanitizedContent}
    </div>
  );
}

// ============================================================================
// MAIN AI QUERY PAGE COMPONENT
// ============================================================================

function AIQueryPageContent() {
  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<Map<string, Message>>(new Map());
  const [input, setInput] = useState('');
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    projects: false,
    conversations: false,
    messages: false,
    sending: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [ariaLiveMessage, setAriaLiveMessage] = useState('');
  const [pendingMessages, setPendingMessages] = useState<{ id: string; content: string }[]>([]);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);
  const conversationListRef = useRef<HTMLDivElement>(null);

  // Hooks
  const isOnline = useNetworkStatus();

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Merge messages with optimistic messages
  const displayMessages = useMemo(() => {
    const merged = [...messages];
    optimisticMessages.forEach((msg) => merged.push(msg));
    return merged.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [messages, optimisticMessages]);

  // Toast management
  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      if (isMountedRef.current) {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages]);

  // Announce new messages to screen readers
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        const preview = lastMessage.content.substring(0, 100);
        setAriaLiveMessage(`AI responded: ${preview}${lastMessage.content.length > 100 ? '...' : ''}`);
        setTimeout(() => setAriaLiveMessage(''), 3000);
      }
    }
  }, [messages]);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Load conversations when project changes
  useEffect(() => {
    if (selectedProjectId) {
      loadConversations();
    }
  }, [selectedProjectId]);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation.id);
    }
  }, [currentConversation]);

  // Process pending messages when coming back online
  useEffect(() => {
    if (isOnline && pendingMessages.length > 0) {
      addToast({
        type: 'info',
        message: `Sending ${pendingMessages.length} queued message(s)...`,
      });
      // Process pending messages
      pendingMessages.forEach((pending) => {
        handleSendMessage(pending.content);
      });
      setPendingMessages([]);
    }
  }, [isOnline, pendingMessages]);

  // ============================================================================
  // DATA LOADING FUNCTIONS
  // ============================================================================

  const loadProjects = useCallback(async () => {
    setLoadingStates((prev) => ({ ...prev, projects: true }));
    setError(null);

    try {
      // Get current user for authorization
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Please sign in to access the AI assistant');
      }

      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('id, name, project_number, organization_id')
        .select('id, name, project_number, organization_id')
        .order('name');

      if (fetchError) throw new Error(`Failed to load projects: ${fetchError.message}`);

      if (!isMountedRef.current) return;

      if (data && data.length > 0) {
        setProjects(data);
        setSelectedProjectId(data[0]!.id);
      } else {
        setProjects([]);
        addToast({
          type: 'info',
          message: 'No active projects found. Please contact your administrator.',
        });
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Failed to load projects';
      setError(message);
      console.error('loadProjects error:', err);
    } finally {
      if (isMountedRef.current) {
        setLoadingStates((prev) => ({ ...prev, projects: false }));
      }
    }
  }, [addToast]);

  const loadConversations = useCallback(async () => {
    // if (!selectedProjectId) return;

    setLoadingStates((prev) => ({ ...prev, conversations: true }));

    try {
      let query = supabase
        .from('ai_conversations')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedProjectId) {
        query = query.eq('project_id', selectedProjectId);
      } else {
        query = query.is('project_id', null);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw new Error(`Failed to load conversations: ${fetchError.message}`);

      if (!isMountedRef.current) return;

      setConversations((data as Conversation[]) || []);
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('loadConversations error:', err);
      addToast({
        type: 'error',
        message: 'Failed to load conversations',
        action: { label: 'Retry', onClick: loadConversations },
      });
    } finally {
      if (isMountedRef.current) {
        setLoadingStates((prev) => ({ ...prev, conversations: false }));
      }
    }
  }, [selectedProjectId, addToast]);

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingStates((prev) => ({ ...prev, messages: true }));

    try {
      const { data, error: fetchError } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (fetchError) throw new Error(`Failed to load messages: ${fetchError.message}`);

      if (!isMountedRef.current) return;

      setMessages((data as Message[]) || []);
      // Clear any optimistic messages for this conversation
      setOptimisticMessages(new Map());
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('loadMessages error:', err);
      addToast({
        type: 'error',
        message: 'Failed to load messages',
        action: { label: 'Retry', onClick: () => loadMessages(conversationId) },
      });
    } finally {
      if (isMountedRef.current) {
        setLoadingStates((prev) => ({ ...prev, messages: false }));
      }
    }
  }, [addToast]);

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  const startNewConversation = useCallback(() => {
    setCurrentConversation(null);
    setMessages([]);
    setOptimisticMessages(new Map());
    inputRef.current?.focus();
    setAriaLiveMessage('Started new conversation');
  }, []);

  const handleSendMessage = useCallback(async (messageContent: string, retryCount = 0) => {
    const validation = validateMessage(messageContent);
    if (!validation.valid) {
      addToast({ type: 'error', message: validation.error! });
      return;
    }

    // if (!selectedProjectId) {
    //   addToast({ type: 'error', message: 'Please select a project first' });
    //   return;
    // }

    // Queue message if offline
    if (!isOnline) {
      const pendingId = generateOptimisticId();
      setPendingMessages((prev) => [...prev, { id: pendingId, content: messageContent }]);
      addToast({
        type: 'warning',
        message: 'You\'re offline. Message will be sent when you reconnect.',
      });
      return;
    }

    const optimisticId = generateOptimisticId();

    setLoadingStates((prev) => ({ ...prev, sending: true }));

    // Add optimistic user message
    const tempUserMessage: Message = {
      id: optimisticId,
      role: 'user',
      content: messageContent,
      created_at: new Date().toISOString(),
      isOptimistic: true,
    };

    setOptimisticMessages((prev) => new Map(prev).set(optimisticId, tempUserMessage));

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('ai-query', {
        body: {
          project_id: selectedProjectId,
          conversation_id: currentConversation?.id,
          message: messageContent,
          client_message_id: optimisticId,
        },
      });

      if (invokeError) throw invokeError;

      if (!isMountedRef.current) return;

      // Remove optimistic message
      setOptimisticMessages((prev) => {
        const next = new Map(prev);
        next.delete(optimisticId);
        return next;
      });

      // Update conversation and messages
      if (data.conversation) {
        setCurrentConversation(data.conversation);
        loadConversations();
      }

      if (data.messages) {
        setMessages(data.messages);
      } else if (data.response) {
        // Add confirmed messages
        setMessages((prev) => [
          ...prev,
          {
            id: `user-${Date.now()}`,
            role: 'user',
            content: messageContent,
            created_at: new Date().toISOString(),
          },
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.response,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      console.error('AI query failed:', err);

      // Remove failed optimistic message
      setOptimisticMessages((prev) => {
        const next = new Map(prev);
        next.delete(optimisticId);
        return next;
      });

      // Retry logic
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => {
          handleSendMessage(messageContent, retryCount + 1);
        }, RETRY_DELAY_MS * (retryCount + 1));
        addToast({
          type: 'warning',
          message: `Retrying... (attempt ${retryCount + 2}/${MAX_RETRIES + 1})`,
        });
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        addToast({
          type: 'error',
          message: errorMessage,
          action: { label: 'Retry', onClick: () => handleSendMessage(messageContent, 0) },
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingStates((prev) => ({ ...prev, sending: false }));
      }
    }
  }, [selectedProjectId, currentConversation, isOnline, addToast, loadConversations]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loadingStates.sending) return;

    const messageContent = input.trim();
    setInput('');
    handleSendMessage(messageContent);
  }, [input, loadingStates.sending, handleSendMessage]);

  // ============================================================================
  // KEYBOARD NAVIGATION
  // ============================================================================

  const handleConversationKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
    conv: Conversation
  ) => {
    const buttons = conversationListRef.current?.querySelectorAll<HTMLButtonElement>('[data-conv-button]');
    if (!buttons) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        buttons[index + 1]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        buttons[index - 1]?.focus();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        setCurrentConversation(conv);
        break;
      case 'Home':
        e.preventDefault();
        buttons[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        buttons[buttons.length - 1]?.focus();
        break;
    }
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  const isSending = loadingStates.sending;
  const isLoadingProjects = loadingStates.projects;
  const isLoadingConversations = loadingStates.conversations;
  const isLoadingMessages = loadingStates.messages;

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {ariaLiveMessage}
      </div>

      {/* Offline banner */}
      {!isOnline && <OfflineBanner />}

      {/* Error banner */}
      {error && (
        <div
          className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center gap-3"
          role="alert"
        >
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-sm text-red-800 flex-1">{error}</span>
          <button
            onClick={loadProjects}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Retry
          </button>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="ai-query-container">
        {/* Sidebar */}
        <aside
          className={`ai-sidebar ${!sidebarOpen ? 'ai-sidebar-closed' : ''}`}
          aria-label="Conversation sidebar"
        >
          {/* Project selector */}
          <div className="project-selector">
            <select
              id="project-select"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="project-select-input"
              disabled={isLoadingProjects}
              aria-busy={isLoadingProjects}
            >
              {isLoadingProjects ? (
                <option>Loading projects...</option>
              ) : projects.length === 0 ? (
                <option>No projects available</option>
              ) : (
                projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_number} - {p.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* New conversation button */}
          <button
            onClick={startNewConversation}
            className="new-chat-btn"
            aria-label="Start new conversation"
          >
            <Plus className="w-5 h-5" />
            New Conversation
          </button>

          {/* Conversation list */}
          <nav
            ref={conversationListRef}
            className="conversation-list"
            aria-label="Conversation history"
          >
            <h2 className="conversation-list-header">
              Recent Conversations
            </h2>

            {isLoadingConversations ? (
              <>
                <ConversationSkeleton />
                <ConversationSkeleton />
                <ConversationSkeleton />
              </>
            ) : conversations.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500">
                No conversations yet
              </div>
            ) : (
              <ul role="listbox" aria-label="Conversations">
                {conversations.map((conv, index) => (
                  <li key={conv.id}>
                    <button
                      data-conv-button
                      onClick={() => setCurrentConversation(conv)}
                      onKeyDown={(e) => handleConversationKeyDown(e, index, conv)}
                      className={`conversation-item ${currentConversation?.id === conv.id ? 'active' : ''
                        }`}
                      role="option"
                      aria-selected={currentConversation?.id === conv.id}
                    >
                      <div className="conversation-title">
                        {conv.title || 'New Conversation'}
                      </div>
                      <div className="conversation-date">
                        {new Date(conv.created_at).toLocaleDateString()}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </nav>
        </aside>

        {/* Main Chat Area */}
        <main className="chat-main" role="main">
          {/* Header */}
          <header className="chat-header">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="sidebar-toggle"
              aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              aria-expanded={sidebarOpen}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="chat-header-title">
              <h1>AI Project Assistant</h1>
              <p>Ask questions about your project in natural language</p>
            </div>
          </header>

          {/* Messages */}
          <div
            className="messages-container custom-scrollbar"
            role="log"
            aria-label="Conversation messages"
            aria-live="polite"
          >
            {isLoadingMessages ? (
              <div className="space-y-4 max-w-3xl mx-auto w-full">
                <MessageSkeleton />
                <MessageSkeleton />
              </div>
            ) : displayMessages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <MessageSquare />
                </div>
                <h2>How can I help you today?</h2>
                <p>
                  Ask me anything about your project - daily reports, equipment, crew, materials, or schedules.
                </p>

                <div className="suggested-queries">
                  {SUGGESTED_QUERIES.map((query, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInput(query);
                        inputRef.current?.focus();
                      }}
                      className="query-chip"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-full max-w-3xl mx-auto">
                {displayMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`message-wrapper ${message.role}`}
                  >
                    <div className={`message-bubble ${message.isOptimistic ? 'opacity-70' : ''}`}>
                      <MessageContent content={message.content} role={message.role} />
                      <div className="message-time">
                        {message.isOptimistic ? (
                          <span className="italic">Sending...</span>
                        ) : (
                          new Date(message.created_at).toLocaleTimeString()
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isSending && !optimisticMessages.size && (
                  <div className="message-wrapper assistant">
                    <div className="message-bubble">
                      <div className="typing-indicator">
                        <div className="dot" />
                        <div className="dot" />
                        <div className="dot" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="input-area">
            <form onSubmit={handleSubmit} className="input-container">
              <label htmlFor="message-input" className="sr-only">
                Type your message
              </label>
              <input
                ref={inputRef}
                id="message-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about your project..."
                className="chat-input"
                disabled={isSending || !isOnline}
                maxLength={MAX_MESSAGE_LENGTH}
                aria-describedby="input-help"
              />
              <button
                type="submit"
                disabled={isSending || !input.trim() || !isOnline}
                className="send-btn"
                aria-label="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
            <p id="input-help" className="input-disclaimer">
              AI responses are generated based on your project data. Always verify critical information.
            </p>
          </div>
        </main>
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

// ============================================================================
// EXPORTED COMPONENT WITH ERROR BOUNDARY
// ============================================================================

export function AIQueryPage() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // In production, send to error monitoring service
        console.error('AIQueryPage error:', error, errorInfo);
      }}
    >
      <AIQueryPageContent />
    </ErrorBoundary>
  );
}

export default AIQueryPage;
