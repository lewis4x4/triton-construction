import { useState } from 'react';
import {
  MessageSquarePlus,
  FileQuestion,
  Send,
  Copy,
  Check,
  DollarSign,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Edit3,
  Trash2,
  BookOpen,
  FileText,
  Tag,
} from 'lucide-react';
import { mockRFIs, mockSpecSections, type RFI } from '../../data/mockBidData';
import './RFIDrafter.css';

const priorityColors: Record<RFI['priority'], string> = {
  LOW: 'priority-low',
  MEDIUM: 'priority-medium',
  HIGH: 'priority-high',
  CRITICAL: 'priority-critical',
};

const statusColors: Record<RFI['status'], string> = {
  DRAFT: 'status-draft',
  SUBMITTED: 'status-submitted',
  PENDING: 'status-pending',
  ANSWERED: 'status-answered',
  CLOSED: 'status-closed',
};

export function RFIDrafter() {
  const [rfis, setRfis] = useState<RFI[]>(mockRFIs);
  const [expandedRFI, setExpandedRFI] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newRFI, setNewRFI] = useState({
    subject: '',
    question: '',
    specReference: '',
    planReference: '',
    priority: 'MEDIUM' as RFI['priority'],
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate AI suggestion based on question
  const generateAISuggestion = async () => {
    if (!newRFI.question.trim()) return;

    setIsGenerating(true);

    // Simulate AI generation delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simple keyword matching for demo
    const question = newRFI.question.toLowerCase();
    let suggestedResponse = '';

    if (question.includes('rock') || question.includes('excavation')) {
      suggestedResponse =
        'Rock excavation will be classified when material requires use of a CAT D9 or equivalent (minimum 400 HP) dozer with single-shank ripper and material still cannot be excavated. Field determination will be made jointly by Contractor and WVDOH inspector per Section 203.';
    } else if (question.includes('concrete') || question.includes('curing')) {
      suggestedResponse =
        'Per Section 502, concrete shall be cured for minimum 7 days using approved curing compound or wet burlap/polyethylene. HPC concrete requires 14-day wet cure. Temperature during curing period shall be maintained above 50°F.';
    } else if (question.includes('asphalt') || question.includes('hma') || question.includes('temperature')) {
      suggestedResponse =
        'Per Section 411, minimum placement temperature behind the screed shall be 280°F for PG 64-22 binder and 300°F for PG 76-22 modified binder. Ambient temperature shall be minimum 45°F and rising.';
    } else if (question.includes('utility') || question.includes('conflict')) {
      suggestedResponse =
        'Utility coordination is governed by Section 702. Contractor shall contact utility owner minimum 72 hours prior to work near utilities. All conflicts shall be documented and resolved prior to construction. Utility relocations are the responsibility of the utility owner unless otherwise specified.';
    } else if (question.includes('compaction') || question.includes('density')) {
      suggestedResponse =
        'Embankment compaction shall achieve 95% of maximum dry density per AASHTO T-180. Base course requires 98% density. Testing frequency shall be minimum 1 test per 1,000 CY for embankment and 1 test per 500 tons for base course.';
    } else {
      suggestedResponse =
        'Please refer to the applicable specification section for detailed requirements. The Engineer will provide field direction for items not specifically addressed in the contract documents.';
    }

    setNewRFI((prev) => ({ ...prev }));
    setIsGenerating(false);

    // Return the suggestion
    return suggestedResponse;
  };

  // Copy RFI to clipboard
  const copyToClipboard = async (rfi: RFI) => {
    const text = `RFI: ${rfi.subject}

Question:
${rfi.question}

${rfi.specReference ? `Specification Reference: ${rfi.specReference}` : ''}
${rfi.planReference ? `Plan Reference: ${rfi.planReference}` : ''}

Priority: ${rfi.priority}
${rfi.costImpact ? 'Potential Cost Impact: Yes' : ''}
${rfi.scheduleImpact ? 'Potential Schedule Impact: Yes' : ''}
`;

    await navigator.clipboard.writeText(text);
    setCopiedId(rfi.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Create new RFI
  const createRFI = () => {
    const rfi: RFI = {
      id: `rfi-${Date.now()}`,
      number: `RFI-${String(rfis.length + 1).padStart(3, '0')}`,
      subject: newRFI.subject,
      question: newRFI.question,
      specReference: newRFI.specReference || undefined,
      planReference: newRFI.planReference || undefined,
      priority: newRFI.priority,
      status: 'DRAFT',
      costImpact: newRFI.question.toLowerCase().includes('cost') || newRFI.question.toLowerCase().includes('price'),
      scheduleImpact:
        newRFI.question.toLowerCase().includes('schedule') || newRFI.question.toLowerCase().includes('time'),
    };

    setRfis([rfi, ...rfis]);
    setNewRFI({
      subject: '',
      question: '',
      specReference: '',
      planReference: '',
      priority: 'MEDIUM',
    });
    setIsCreating(false);
  };

  // Delete RFI
  const deleteRFI = (rfiId: string) => {
    setRfis(rfis.filter((r) => r.id !== rfiId));
    if (expandedRFI === rfiId) {
      setExpandedRFI(null);
    }
  };

  // Get spec section for reference
  const getSpecSection = (reference: string) => {
    const sectionNum = reference.replace('Section ', '').split('.')[0];
    return mockSpecSections.find((s) => s.sectionNumber === sectionNum);
  };

  return (
    <div className="rfi-drafter">
      {/* Header */}
      <div className="rfi-header">
        <div className="header-info">
          <div className="header-icon">
            <FileQuestion size={24} />
          </div>
          <div>
            <h2>Smart RFI Drafter</h2>
            <p>AI-assisted Request for Information generator</p>
          </div>
        </div>
        <button className="create-rfi-btn" onClick={() => setIsCreating(true)}>
          <MessageSquarePlus size={18} />
          New RFI
        </button>
      </div>

      {/* Stats */}
      <div className="rfi-stats">
        <div className="stat-item">
          <span className="stat-value">{rfis.length}</span>
          <span className="stat-label">Total RFIs</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{rfis.filter((r) => r.status === 'DRAFT').length}</span>
          <span className="stat-label">Drafts</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{rfis.filter((r) => r.priority === 'CRITICAL' || r.priority === 'HIGH').length}</span>
          <span className="stat-label">High Priority</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{rfis.filter((r) => r.costImpact).length}</span>
          <span className="stat-label">Cost Impact</span>
        </div>
      </div>

      {/* New RFI Form */}
      {isCreating && (
        <div className="new-rfi-form">
          <div className="form-header">
            <h3>
              <Sparkles size={18} />
              Create New RFI
            </h3>
            <button className="cancel-btn" onClick={() => setIsCreating(false)}>
              Cancel
            </button>
          </div>

          <div className="form-grid">
            <div className="form-group full-width">
              <label>Subject</label>
              <input
                type="text"
                placeholder="Brief description of the question..."
                value={newRFI.subject}
                onChange={(e) => setNewRFI({ ...newRFI, subject: e.target.value })}
              />
            </div>

            <div className="form-group full-width">
              <label>Question</label>
              <textarea
                placeholder="Enter your detailed question. Be specific about what clarification is needed..."
                value={newRFI.question}
                onChange={(e) => setNewRFI({ ...newRFI, question: e.target.value })}
                rows={5}
              />
              <button className="ai-suggest-btn" onClick={generateAISuggestion} disabled={isGenerating || !newRFI.question.trim()}>
                {isGenerating ? (
                  <>
                    <div className="spinner" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    AI Assist
                  </>
                )}
              </button>
            </div>

            <div className="form-group">
              <label>Spec Reference</label>
              <input
                type="text"
                placeholder="e.g., Section 203.2"
                value={newRFI.specReference}
                onChange={(e) => setNewRFI({ ...newRFI, specReference: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Plan Reference</label>
              <input
                type="text"
                placeholder="e.g., Sheet D-15"
                value={newRFI.planReference}
                onChange={(e) => setNewRFI({ ...newRFI, planReference: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select value={newRFI.priority} onChange={(e) => setNewRFI({ ...newRFI, priority: e.target.value as RFI['priority'] })}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button className="save-draft-btn" onClick={createRFI} disabled={!newRFI.subject || !newRFI.question}>
              <Edit3 size={16} />
              Save as Draft
            </button>
            <button className="submit-btn" onClick={createRFI} disabled={!newRFI.subject || !newRFI.question}>
              <Send size={16} />
              Submit RFI
            </button>
          </div>
        </div>
      )}

      {/* RFI List */}
      <div className="rfi-list">
        {rfis.length === 0 ? (
          <div className="empty-state">
            <FileQuestion size={48} />
            <h3>No RFIs yet</h3>
            <p>Create your first Request for Information</p>
          </div>
        ) : (
          rfis.map((rfi) => {
            const isExpanded = expandedRFI === rfi.id;
            const specSection = rfi.specReference ? getSpecSection(rfi.specReference) : null;

            return (
              <div key={rfi.id} className={`rfi-card ${isExpanded ? 'expanded' : ''}`}>
                <div className="rfi-card-header" onClick={() => setExpandedRFI(isExpanded ? null : rfi.id)}>
                  <span className="expand-icon">
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </span>
                  <span className="rfi-number">{rfi.number}</span>
                  <h4 className="rfi-subject">{rfi.subject}</h4>
                  <div className="rfi-badges">
                    <span className={`priority-badge ${priorityColors[rfi.priority]}`}>{rfi.priority}</span>
                    <span className={`status-badge ${statusColors[rfi.status]}`}>{rfi.status}</span>
                    {rfi.costImpact && (
                      <span className="impact-badge cost">
                        <DollarSign size={12} />
                      </span>
                    )}
                    {rfi.scheduleImpact && (
                      <span className="impact-badge schedule">
                        <Calendar size={12} />
                      </span>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="rfi-content">
                    <div className="question-section">
                      <h5>Question</h5>
                      <p>{rfi.question}</p>
                    </div>

                    {(rfi.specReference || rfi.planReference) && (
                      <div className="references-section">
                        <h5>References</h5>
                        <div className="references">
                          {rfi.specReference && (
                            <span className="reference">
                              <BookOpen size={14} />
                              {rfi.specReference}
                            </span>
                          )}
                          {rfi.planReference && (
                            <span className="reference">
                              <FileText size={14} />
                              {rfi.planReference}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {rfi.suggestedResponse && (
                      <div className="suggested-response">
                        <h5>
                          <Sparkles size={14} />
                          Suggested Response
                        </h5>
                        <p>{rfi.suggestedResponse}</p>
                      </div>
                    )}

                    {specSection && (
                      <div className="spec-context">
                        <h5>Related Specification</h5>
                        <div className="spec-preview">
                          <span className="spec-title">
                            Section {specSection.sectionNumber}: {specSection.title}
                          </span>
                          <div className="spec-keywords">
                            {specSection.keywords.slice(0, 5).map((kw) => (
                              <span key={kw} className="keyword">
                                <Tag size={10} />
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="rfi-actions">
                      <button className="action-btn copy" onClick={() => copyToClipboard(rfi)}>
                        {copiedId === rfi.id ? <Check size={14} /> : <Copy size={14} />}
                        {copiedId === rfi.id ? 'Copied!' : 'Copy'}
                      </button>
                      <button className="action-btn edit">
                        <Edit3 size={14} />
                        Edit
                      </button>
                      <button className="action-btn delete" onClick={() => deleteRFI(rfi.id)}>
                        <Trash2 size={14} />
                        Delete
                      </button>
                      {rfi.status === 'DRAFT' && (
                        <button className="action-btn submit">
                          <Send size={14} />
                          Submit
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
