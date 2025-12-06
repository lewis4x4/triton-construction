import { useState } from 'react';
import { History, Search, FileText, Trash2, ChevronRight, Clock, BookOpen } from 'lucide-react';
import type { SavedConversation } from '../../hooks/useConversationHistory';
import './SpecsSidebar.css';

interface SpecsSidebarProps {
  conversations: SavedConversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onQuickSearch: (query: string) => void;
}

const QUICK_SEARCHES = [
  { label: 'Class B Concrete', query: 'What are the requirements for Class B concrete?' },
  { label: 'Reinforcing Steel', query: 'What are the specifications for reinforcing steel?' },
  { label: 'Structural Steel', query: 'What are the requirements for structural steel?' },
  { label: 'Asphalt Paving', query: 'What are the asphalt paving specifications?' },
  { label: 'Excavation', query: 'What are the excavation requirements?' },
  { label: 'Erosion Control', query: 'What are the erosion control specifications?' },
];

const DOCUMENT_INFO = {
  name: 'WVDOH 2023 Standard Specifications',
  sections: 115,
  chunks: 5337,
  lastUpdated: '2024',
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes <= 1 ? 'Just now' : `${minutes}m ago`;
    }
    return hours === 1 ? '1h ago' : `${hours}h ago`;
  }
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function SpecsSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onDeleteConversation,
  onQuickSearch,
}: SpecsSidebarProps) {
  const [expandedSection, setExpandedSection] = useState<'history' | 'quick' | 'docs'>('history');

  const toggleSection = (section: 'history' | 'quick' | 'docs') => {
    setExpandedSection(prev => prev === section ? section : section);
  };

  return (
    <aside className="specs-sidebar">
      {/* Conversation History */}
      <div className={`sidebar-section ${expandedSection === 'history' ? 'expanded' : ''}`}>
        <button
          className="sidebar-section-header"
          onClick={() => toggleSection('history')}
        >
          <div className="section-header-left">
            <History size={16} />
            <span>Recent Conversations</span>
          </div>
          <span className="section-badge">{conversations.length}</span>
        </button>

        <div className="sidebar-section-content">
          {conversations.length === 0 ? (
            <div className="empty-state">
              <Clock size={24} className="empty-icon" />
              <p>No conversations yet</p>
              <span>Start a new search to see your history here</span>
            </div>
          ) : (
            <div className="conversation-list">
              {conversations.slice(0, 10).map((conv) => (
                <div
                  key={conv.id}
                  className={`conversation-item ${currentConversationId === conv.id ? 'active' : ''}`}
                  onClick={() => onSelectConversation(conv.id)}
                >
                  <div className="conversation-content">
                    <div className="conversation-title">{conv.title}</div>
                    <div className="conversation-preview">{conv.preview}</div>
                    <div className="conversation-meta">
                      <span className="conversation-time">{formatDate(conv.updatedAt)}</span>
                      <span className="conversation-count">{conv.messages.length} messages</span>
                    </div>
                  </div>
                  <button
                    className="conversation-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conv.id);
                    }}
                    title="Delete conversation"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Searches */}
      <div className={`sidebar-section ${expandedSection === 'quick' ? 'expanded' : ''}`}>
        <button
          className="sidebar-section-header"
          onClick={() => toggleSection('quick')}
        >
          <div className="section-header-left">
            <Search size={16} />
            <span>Quick Searches</span>
          </div>
          <ChevronRight size={16} className="section-chevron" />
        </button>

        <div className="sidebar-section-content">
          <div className="quick-search-list">
            {QUICK_SEARCHES.map((item, index) => (
              <button
                key={index}
                className="quick-search-item"
                onClick={() => onQuickSearch(item.query)}
              >
                <Search size={14} className="quick-search-icon" />
                <span>{item.label}</span>
                <ChevronRight size={14} className="quick-search-arrow" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Document Info */}
      <div className={`sidebar-section ${expandedSection === 'docs' ? 'expanded' : ''}`}>
        <button
          className="sidebar-section-header"
          onClick={() => toggleSection('docs')}
        >
          <div className="section-header-left">
            <FileText size={16} />
            <span>Active Document</span>
          </div>
          <ChevronRight size={16} className="section-chevron" />
        </button>

        <div className="sidebar-section-content">
          <div className="document-info">
            <div className="document-icon">
              <BookOpen size={24} />
            </div>
            <div className="document-details">
              <h4>{DOCUMENT_INFO.name}</h4>
              <div className="document-stats">
                <div className="stat">
                  <span className="stat-value">{DOCUMENT_INFO.sections}</span>
                  <span className="stat-label">Sections</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{DOCUMENT_INFO.chunks.toLocaleString()}</span>
                  <span className="stat-label">Chunks</span>
                </div>
              </div>
              <div className="document-updated">
                Last updated: {DOCUMENT_INFO.lastUpdated}
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
