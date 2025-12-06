import { useState, useCallback, useEffect } from 'react';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  chunks?: Array<{
    chunkId: string;
    sectionId: string;
    sectionNumber: string;
    sectionTitle: string;
    chunkType: string;
    content: string;
    sectionContext: string;
    similarity: number;
    pageNumber: number | null;
  }>;
  timestamp: Date;
}

export interface SavedConversation {
  id: string;
  title: string;
  preview: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'triton_spec_conversations';
const MAX_CONVERSATIONS = 50;

function generateId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getTitle(messages: ConversationMessage[]): string {
  const firstUserMessage = messages.find(m => m.role === 'user');
  if (!firstUserMessage) return 'New Conversation';
  const title = firstUserMessage.content.slice(0, 50);
  return title.length < firstUserMessage.content.length ? `${title}...` : title;
}

function getPreview(messages: ConversationMessage[]): string {
  const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
  if (!lastAssistantMessage) return 'No response yet';
  const preview = lastAssistantMessage.content.slice(0, 80);
  return preview.length < lastAssistantMessage.content.length ? `${preview}...` : preview;
}

export function useConversationHistory() {
  const [conversations, setConversations] = useState<SavedConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load conversations from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setConversations(parsed);
      }
    } catch (error) {
      console.error('Failed to load conversations from localStorage:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
      } catch (error) {
        console.error('Failed to save conversations to localStorage:', error);
      }
    }
  }, [conversations, isLoaded]);

  // Save or update a conversation
  const saveConversation = useCallback((messages: ConversationMessage[], conversationId?: string | null): string => {
    const now = new Date().toISOString();
    const id = conversationId || generateId();

    setConversations(prev => {
      const existingIndex = prev.findIndex(c => c.id === id);
      const existingConversation = existingIndex >= 0 ? prev[existingIndex] : null;

      const conversation: SavedConversation = {
        id,
        title: getTitle(messages),
        preview: getPreview(messages),
        messages,
        createdAt: existingConversation?.createdAt ?? now,
        updatedAt: now,
      };

      let updated: SavedConversation[];
      if (existingIndex >= 0) {
        // Update existing conversation
        updated = [...prev];
        updated[existingIndex] = conversation;
      } else {
        // Add new conversation at the beginning
        updated = [conversation, ...prev];
      }

      // Enforce max conversations limit (FIFO)
      if (updated.length > MAX_CONVERSATIONS) {
        updated = updated.slice(0, MAX_CONVERSATIONS);
      }

      // Sort by updatedAt (most recent first)
      updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      return updated;
    });

    setCurrentConversationId(id);
    return id;
  }, []);

  // Load a specific conversation
  const loadConversation = useCallback((conversationId: string): ConversationMessage[] | null => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setCurrentConversationId(conversationId);
      // Restore Date objects from ISO strings
      return conversation.messages.map(m => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
    }
    return null;
  }, [conversations]);

  // Delete a conversation
  const deleteConversation = useCallback((conversationId: string) => {
    setConversations(prev => prev.filter(c => c.id !== conversationId));
    if (currentConversationId === conversationId) {
      setCurrentConversationId(null);
    }
  }, [currentConversationId]);

  // Start a new conversation
  const startNewConversation = useCallback(() => {
    setCurrentConversationId(null);
  }, []);

  // Get all conversations for display
  const getAllConversations = useCallback((): SavedConversation[] => {
    return conversations;
  }, [conversations]);

  // Search through conversations
  const searchConversations = useCallback((query: string): SavedConversation[] => {
    if (!query.trim()) return conversations;
    const lowerQuery = query.toLowerCase();
    return conversations.filter(c =>
      c.title.toLowerCase().includes(lowerQuery) ||
      c.preview.toLowerCase().includes(lowerQuery) ||
      c.messages.some(m => m.content.toLowerCase().includes(lowerQuery))
    );
  }, [conversations]);

  return {
    conversations,
    currentConversationId,
    isLoaded,
    saveConversation,
    loadConversation,
    deleteConversation,
    startNewConversation,
    getAllConversations,
    searchConversations,
  };
}
