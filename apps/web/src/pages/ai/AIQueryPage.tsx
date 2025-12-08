import { useState, useEffect, useRef } from 'react';
import { supabase } from '@triton/supabase-client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  project_id: string;
  created_at: string;
  message_count: number;
}

export function AIQueryPage() {
  const [projects, setProjects] = useState<{ id: string; name: string; project_number: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadConversations();
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation.id);
    }
  }, [currentConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function loadProjects() {
    const { data } = await supabase
      .from('projects')
      .select('id, name, project_number')
      .eq('status', 'ACTIVE')
      .order('name');

    if (data) {
      setProjects(data);
      if (data.length > 0) {
        setSelectedProjectId(data[0]!.id);
      }
    }
  }

  async function loadConversations() {
    const { data } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('project_id', selectedProjectId)
      .order('created_at', { ascending: false });

    if (data) {
      setConversations(data as any);
    }
  }

  async function loadMessages(conversationId: string) {
    const { data } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data as any);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function startNewConversation() {
    setCurrentConversation(null);
    setMessages([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Optimistically add user message
    const tempUserMessage: Message = {
      id: 'temp-user',
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      // Call AI query edge function
      const { data, error } = await supabase.functions.invoke('ai-query', {
        body: {
          project_id: selectedProjectId,
          conversation_id: currentConversation?.id,
          message: userMessage,
        },
      });

      if (error) throw error;

      // Update conversation and messages
      if (data.conversation) {
        setCurrentConversation(data.conversation);
        loadConversations();
      }

      if (data.messages) {
        setMessages(data.messages);
      } else if (data.response) {
        // Add assistant response
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== 'temp-user'),
          {
            id: 'user-' + Date.now(),
            role: 'user',
            content: userMessage,
            created_at: new Date().toISOString(),
          },
          {
            id: 'assistant-' + Date.now(),
            role: 'assistant',
            content: data.response,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error('AI query failed:', err);
      // Remove optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== 'temp-user'));
      alert('Failed to get AI response. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const suggestedQueries = [
    "What work was completed last week?",
    "Show me all open RFIs",
    "What are the current change order totals?",
    "List subcontractors on site today",
    "What's the weather forecast for this week?",
    "Summarize recent safety observations",
  ];

  return (
    <div className="h-[calc(100vh-64px)] flex">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_number}
                </option>
              ))}
            </select>
          </div>

          <div className="p-4">
            <button
              onClick={startNewConversation}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              + New Conversation
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">
              Recent Conversations
            </div>
            {conversations.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500">No conversations yet</div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setCurrentConversation(conv)}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                    currentConversation?.id === conv.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                  }`}
                >
                  <div className="font-medium truncate">{conv.title || 'New Conversation'}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(conv.created_at).toLocaleDateString()}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-gray-200 flex items-center px-4 gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <h1 className="font-semibold text-gray-900">AI Project Assistant</h1>
            <p className="text-xs text-gray-500">
              Ask questions about your project in natural language
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  How can I help you today?
                </h2>
                <p className="text-gray-500 mb-6">
                  Ask me anything about your project - daily reports, equipment, crew, materials, or schedules.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {suggestedQueries.map((query, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(query)}
                      className="text-left text-sm px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div
                      className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-blue-200' : 'text-gray-400'
                      }`}
                    >
                      {new Date(message.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about your project..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              AI responses are generated based on your project data. Always verify critical information.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AIQueryPage;
