import { useState, useRef, useEffect } from 'react';
import {
  Search,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  Tag,
  Link2,
  Sparkles,
  X,
  Clock,
  Loader2,
} from 'lucide-react';
import { mockSpecSections, mockBidItems, type SpecSection } from '../../data/mockBidData';
import './SpecOracle.css';

interface SearchResult extends SpecSection {
  relevanceScore: number;
  matchedKeywords: string[];
  highlightedContent: string;
}

const RECENT_SEARCHES_KEY = 'spec-oracle-recent-searches';
const MAX_RECENT_SEARCHES = 5;

export function SpecOracle() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Load recent searches on mount
  useEffect(() => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Save recent searches
  const saveRecentSearch = (search: string) => {
    const updated = [search, ...recentSearches.filter((s) => s !== search)].slice(0, MAX_RECENT_SEARCHES);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Suggested queries based on common construction topics
  const suggestedQueries = [
    'What are the compaction requirements for embankment?',
    'Asphalt temperature requirements',
    'Concrete curing time and methods',
    'Rebar cover and spacing requirements',
    'Pipe bedding and backfill specifications',
    'Guardrail post installation depth',
    'Pavement marking reflectivity requirements',
    'Seeding seasonal limitations',
  ];

  // Perform semantic search (simulated)
  const performSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    // Simulate API delay
    setTimeout(() => {
      const lowerQuery = searchQuery.toLowerCase();
      const queryWords = lowerQuery.split(/\s+/).filter((w) => w.length > 2);

      const searchResults: SearchResult[] = mockSpecSections
        .map((spec) => {
          let score = 0;
          const matchedKeywords: string[] = [];

          // Score based on keyword matches
          spec.keywords.forEach((keyword) => {
            if (queryWords.some((word) => keyword.toLowerCase().includes(word))) {
              score += 10;
              matchedKeywords.push(keyword);
            }
          });

          // Score based on title matches
          queryWords.forEach((word) => {
            if (spec.title.toLowerCase().includes(word)) {
              score += 15;
            }
          });

          // Score based on content matches
          queryWords.forEach((word) => {
            const matches = (spec.content.toLowerCase().match(new RegExp(word, 'g')) || []).length;
            score += matches * 2;
          });

          // Highlight content
          let highlightedContent = spec.content;
          queryWords.forEach((word) => {
            const regex = new RegExp(`(${word})`, 'gi');
            highlightedContent = highlightedContent.replace(regex, '<<<$1>>>');
          });

          return {
            ...spec,
            relevanceScore: score,
            matchedKeywords: [...new Set(matchedKeywords)],
            highlightedContent,
          };
        })
        .filter((result) => result.relevanceScore > 0)
        .sort((a, b) => b.relevanceScore - a.relevanceScore);

      setResults(searchResults);
      setIsSearching(false);
      saveRecentSearch(searchQuery);
    }, 300);
  };

  // Handle search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
    setShowSuggestions(false);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    performSearch(suggestion);
    setShowSuggestions(false);
  };

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Get related bid items for a spec section
  const getRelatedItems = (relatedItemNumbers: string[]) => {
    return mockBidItems.filter((item) => relatedItemNumbers.includes(item.itemNumber));
  };

  // Render highlighted text
  const renderHighlightedText = (text: string) => {
    const parts = text.split(/(<<<|>>>)/);
    let isHighlight = false;
    return parts.map((part, index) => {
      if (part === '<<<') {
        isHighlight = true;
        return null;
      }
      if (part === '>>>') {
        isHighlight = false;
        return null;
      }
      return isHighlight ? (
        <mark key={index} className="spec-highlight">
          {part}
        </mark>
      ) : (
        <span key={index}>{part}</span>
      );
    });
  };

  // Format content with line breaks preserved
  const formatContent = (_content: string, highlighted: string) => {
    // Take first 500 chars for preview
    const preview = highlighted.slice(0, 500) + (highlighted.length > 500 ? '...' : '');
    return renderHighlightedText(preview);
  };

  return (
    <div className="spec-oracle">
      <div className="spec-oracle-header">
        <div className="oracle-icon">
          <Sparkles size={24} />
        </div>
        <div className="oracle-title">
          <h2>Spec Oracle</h2>
          <p>AI-powered specification search - Ask questions in natural language</p>
        </div>
      </div>

      <form className="search-container" onSubmit={handleSearch}>
        <div className="search-input-wrapper">
          <Search className="search-icon" size={20} />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Ask about specs... e.g., 'What are the compaction requirements for embankment?'"
            className="search-input"
          />
          {query && (
            <button type="button" className="clear-btn" onClick={() => setQuery('')}>
              <X size={16} />
            </button>
          )}
          <button type="submit" className="search-btn" disabled={isSearching}>
            {isSearching ? <Loader2 size={18} className="spin" /> : 'Search'}
          </button>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && (
          <div ref={suggestionsRef} className="suggestions-dropdown">
            {recentSearches.length > 0 && (
              <div className="suggestions-section">
                <div className="suggestions-header">
                  <Clock size={14} />
                  <span>Recent Searches</span>
                </div>
                {recentSearches.map((search, idx) => (
                  <button
                    key={`recent-${idx}`}
                    type="button"
                    className="suggestion-item"
                    onClick={() => handleSuggestionClick(search)}
                  >
                    {search}
                  </button>
                ))}
              </div>
            )}
            <div className="suggestions-section">
              <div className="suggestions-header">
                <Sparkles size={14} />
                <span>Suggested Questions</span>
              </div>
              {suggestedQueries.slice(0, 5).map((suggestion, idx) => (
                <button
                  key={`suggest-${idx}`}
                  type="button"
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>

      {/* Results */}
      <div className="search-results">
        {isSearching ? (
          <div className="loading-state">
            <Loader2 size={32} className="spin" />
            <p>Searching specifications...</p>
          </div>
        ) : results.length > 0 ? (
          <>
            <div className="results-header">
              <span className="results-count">{results.length} specification sections found</span>
              <span className="results-query">for "{query}"</span>
            </div>

            {results.map((result) => {
              const isExpanded = expandedSections.has(result.id);
              const relatedItems = getRelatedItems(result.relatedItems);

              return (
                <div key={result.id} className={`result-card ${isExpanded ? 'expanded' : ''}`}>
                  <div className="result-header" onClick={() => toggleSection(result.id)}>
                    <div className="result-icon">
                      <BookOpen size={20} />
                    </div>
                    <div className="result-title-section">
                      <div className="result-section-number">Section {result.sectionNumber}</div>
                      <h3 className="result-title">{result.title}</h3>
                    </div>
                    <div className="result-meta">
                      <span className="relevance-badge">
                        {Math.min(Math.round(result.relevanceScore / 5) * 10, 100)}% match
                      </span>
                      <span className="expand-icon">
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </span>
                    </div>
                  </div>

                  {/* Preview when collapsed */}
                  {!isExpanded && (
                    <div className="result-preview">
                      {formatContent(result.content, result.highlightedContent)}
                    </div>
                  )}

                  {/* Matched keywords */}
                  {result.matchedKeywords.length > 0 && (
                    <div className="matched-keywords">
                      <Tag size={14} />
                      {result.matchedKeywords.map((keyword) => (
                        <span key={keyword} className="keyword-tag">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="result-expanded">
                      <div className="full-content">
                        {renderHighlightedText(result.highlightedContent)}
                      </div>

                      {/* Subsections */}
                      {result.subsections.length > 0 && (
                        <div className="subsections">
                          <h4>
                            <FileText size={16} />
                            Subsections
                          </h4>
                          <ul>
                            {result.subsections.map((sub) => (
                              <li key={sub}>{sub}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Related bid items */}
                      {relatedItems.length > 0 && (
                        <div className="related-items">
                          <h4>
                            <Link2 size={16} />
                            Related Bid Items
                          </h4>
                          <div className="related-items-grid">
                            {relatedItems.map((item) => (
                              <div key={item.id} className="related-item">
                                <span className="item-number">{item.itemNumber}</span>
                                <span className="item-desc">{item.description}</span>
                                <span className="item-qty">
                                  {item.quantity.toLocaleString()} {item.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ) : query && !isSearching ? (
          <div className="no-results">
            <BookOpen size={48} />
            <h3>No specifications found</h3>
            <p>Try different keywords or check the suggested questions</p>
          </div>
        ) : (
          <div className="empty-state">
            <Sparkles size={48} />
            <h3>Search WVDOH Specifications</h3>
            <p>
              Ask natural language questions about construction specifications, materials,
              methods, and requirements.
            </p>
            <div className="example-queries">
              <p className="examples-label">Example queries:</p>
              <div className="examples-grid">
                {suggestedQueries.slice(0, 4).map((q, idx) => (
                  <button
                    key={idx}
                    className="example-query"
                    onClick={() => handleSuggestionClick(q)}
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
