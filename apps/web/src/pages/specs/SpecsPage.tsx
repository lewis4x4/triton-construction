import { useState, useCallback } from 'react';
import { SpecSearch } from '../../components/specs/SpecSearch';
import { SpecsSidebar } from '../../components/specs/SpecsSidebar';
import { useConversationHistory, type ConversationMessage } from '../../hooks/useConversationHistory';
import '../../components/specs/SpecSearch.css';
import '../../components/specs/SpecsSidebar.css';
import './SpecsPage.css';

export function SpecsPage() {
  // Conversation history
  const {
    conversations,
    currentConversationId,
    saveConversation,
    loadConversation,
    deleteConversation,
    startNewConversation,
  } = useConversationHistory();

  // State for current search messages (passed to SpecSearch)
  const [currentMessages, setCurrentMessages] = useState<ConversationMessage[]>([]);
  const [quickSearchQuery, setQuickSearchQuery] = useState<string>('');

  // Handle conversation updates from SpecSearch
  const handleMessagesChange = useCallback((messages: ConversationMessage[]) => {
    setCurrentMessages(messages);
    if (messages.length > 0) {
      saveConversation(messages, currentConversationId);
    }
  }, [saveConversation, currentConversationId]);

  // Handle selecting a conversation from sidebar
  const handleSelectConversation = useCallback((id: string) => {
    const messages = loadConversation(id);
    if (messages) {
      setCurrentMessages(messages);
    }
  }, [loadConversation]);

  // Handle starting a new conversation
  const handleNewConversation = useCallback(() => {
    startNewConversation();
    setCurrentMessages([]);
  }, [startNewConversation]);

  // Handle quick search from sidebar
  const handleQuickSearch = useCallback((query: string) => {
    handleNewConversation();
    setQuickSearchQuery(query);
    // Clear after a tick to allow SpecSearch to pick it up
    setTimeout(() => setQuickSearchQuery(''), 100);
  }, [handleNewConversation]);

  return (
    <>
      <div className="page-header">
        <div className="page-header-content">
          <h1>WVDOH Specifications</h1>
        </div>
      </div>

      <div className="specs-search-layout">
        <div className="specs-search-main">
          <SpecSearch
            initialMessages={currentMessages}
            initialQuery={quickSearchQuery}
            onMessagesChange={handleMessagesChange}
            onNewConversation={handleNewConversation}
          />
        </div>
        <SpecsSidebar
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={deleteConversation}
          onQuickSearch={handleQuickSearch}
        />
      </div>
    </>
  );
}
