import { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Minus,
  AlertCircle,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Filter,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Edit3,
  HelpCircle,
  Package,
  Trash2,
} from 'lucide-react';
import {
  mockAddenda,
  getAddendumImpact,
  type AddendumChange,
} from '../../data/mockBidData';
import './AddendumDiff.css';

type ChangeTypeFilter = 'ALL' | AddendumChange['changeType'];

const changeTypeLabels: Record<AddendumChange['changeType'], string> = {
  QUANTITY: 'Quantity Change',
  SPECIFICATION: 'Spec Revision',
  PLAN_REVISION: 'Plan Revision',
  NEW_ITEM: 'New Item',
  DELETE_ITEM: 'Deleted Item',
  CLARIFICATION: 'Clarification',
  DATE_CHANGE: 'Date Change',
};

const changeTypeIcons: Record<AddendumChange['changeType'], React.ReactNode> = {
  QUANTITY: <TrendingUp size={16} />,
  SPECIFICATION: <Edit3 size={16} />,
  PLAN_REVISION: <FileText size={16} />,
  NEW_ITEM: <Plus size={16} />,
  DELETE_ITEM: <Trash2 size={16} />,
  CLARIFICATION: <HelpCircle size={16} />,
  DATE_CHANGE: <Calendar size={16} />,
};

const changeTypeColors: Record<AddendumChange['changeType'], string> = {
  QUANTITY: 'type-quantity',
  SPECIFICATION: 'type-spec',
  PLAN_REVISION: 'type-plan',
  NEW_ITEM: 'type-new',
  DELETE_ITEM: 'type-delete',
  CLARIFICATION: 'type-clarify',
  DATE_CHANGE: 'type-date',
};

export function AddendumDiff() {
  const [expandedAddenda, setExpandedAddenda] = useState<Set<string>>(
    new Set(mockAddenda.map((a) => a.id)) // Expand all by default
  );
  const [filterType, setFilterType] = useState<ChangeTypeFilter>('ALL');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Calculate overall impact
  const impact = useMemo(() => getAddendumImpact(mockAddenda), []);

  // Filter changes across all addenda
  const filteredAddenda = useMemo(() => {
    if (filterType === 'ALL') return mockAddenda;

    return mockAddenda
      .map((addendum) => ({
        ...addendum,
        changes: addendum.changes.filter((c) => c.changeType === filterType),
      }))
      .filter((addendum) => addendum.changes.length > 0);
  }, [filterType]);

  // Toggle addendum expansion
  const toggleAddendum = (addendumId: string) => {
    const newExpanded = new Set(expandedAddenda);
    if (newExpanded.has(addendumId)) {
      newExpanded.delete(addendumId);
    } else {
      newExpanded.add(addendumId);
    }
    setExpandedAddenda(newExpanded);
  };

  // Render diff for quantity changes
  const renderQuantityDiff = (change: AddendumChange) => {
    if (!change.quantityChange) return null;
    const { original, revised, difference, percentChange } = change.quantityChange;
    const isIncrease = difference > 0;

    return (
      <div className="quantity-diff">
        <div className="qty-row qty-original">
          <Minus size={14} className="qty-icon remove" />
          <span className="qty-value">{original.toLocaleString()}</span>
        </div>
        <div className="qty-row qty-revised">
          <Plus size={14} className="qty-icon add" />
          <span className="qty-value">{revised.toLocaleString()}</span>
        </div>
        <div className={`qty-change ${isIncrease ? 'increase' : 'decrease'}`}>
          {isIncrease ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span>
            {isIncrease ? '+' : ''}
            {difference.toLocaleString()} ({isIncrease ? '+' : ''}
            {percentChange.toFixed(1)}%)
          </span>
        </div>
      </div>
    );
  };

  // Render diff for text changes
  const renderTextDiff = (change: AddendumChange) => {
    if (!change.originalText && !change.revisedText) return null;

    return (
      <div className="text-diff">
        {change.originalText && (
          <div className="diff-line removed">
            <span className="diff-prefix">-</span>
            <span className="diff-content">{change.originalText}</span>
          </div>
        )}
        {change.revisedText && (
          <div className="diff-line added">
            <span className="diff-prefix">+</span>
            <span className="diff-content">{change.revisedText}</span>
          </div>
        )}
      </div>
    );
  };

  // Render cost impact badge
  const renderCostImpact = (change: AddendumChange) => {
    if (!change.costImpact) return null;

    const impactClass = {
      INCREASE: 'impact-increase',
      DECREASE: 'impact-decrease',
      NEUTRAL: 'impact-neutral',
      TBD: 'impact-tbd',
    }[change.costImpact];

    const impactIcon = {
      INCREASE: <TrendingUp size={12} />,
      DECREASE: <TrendingDown size={12} />,
      NEUTRAL: <Minus size={12} />,
      TBD: <HelpCircle size={12} />,
    }[change.costImpact];

    return (
      <div className={`cost-impact ${impactClass}`}>
        {impactIcon}
        <span>{change.costImpact}</span>
        {change.impactEstimate && (
          <span className="impact-amount">
            {change.impactEstimate > 0 ? '+' : ''}${Math.abs(change.impactEstimate).toLocaleString()}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="addendum-diff">
      {/* Header */}
      <div className="addendum-header">
        <div className="header-info">
          <div className="header-icon">
            <FileText size={24} />
          </div>
          <div>
            <h2>Addendum Tracker</h2>
            <p>
              {mockAddenda.length} addenda with {impact.quantityChanges + impact.specChanges + impact.newItems} total
              changes
            </p>
          </div>
        </div>
        <div className="header-actions">
          <div className="filter-dropdown">
            <button className="filter-btn" onClick={() => setShowFilterMenu(!showFilterMenu)}>
              <Filter size={16} />
              {filterType === 'ALL' ? 'All Changes' : changeTypeLabels[filterType]}
              <ChevronDown size={14} />
            </button>
            {showFilterMenu && (
              <div className="filter-menu">
                <button
                  className={`filter-option ${filterType === 'ALL' ? 'active' : ''}`}
                  onClick={() => {
                    setFilterType('ALL');
                    setShowFilterMenu(false);
                  }}
                >
                  All Changes
                </button>
                {Object.entries(changeTypeLabels).map(([type, label]) => (
                  <button
                    key={type}
                    className={`filter-option ${filterType === type ? 'active' : ''}`}
                    onClick={() => {
                      setFilterType(type as ChangeTypeFilter);
                      setShowFilterMenu(false);
                    }}
                  >
                    {changeTypeIcons[type as AddendumChange['changeType']]}
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Impact Summary */}
      <div className="impact-summary">
        <div className="impact-card">
          <div className="impact-icon increase">
            <TrendingUp size={20} />
          </div>
          <div className="impact-content">
            <span className="impact-label">Cost Increases</span>
            <span className="impact-value increase">+${impact.totalIncrease.toLocaleString()}</span>
          </div>
        </div>
        <div className="impact-card">
          <div className="impact-icon decrease">
            <TrendingDown size={20} />
          </div>
          <div className="impact-content">
            <span className="impact-label">Cost Decreases</span>
            <span className="impact-value decrease">-${impact.totalDecrease.toLocaleString()}</span>
          </div>
        </div>
        <div className="impact-card">
          <div className={`impact-icon ${impact.netImpact >= 0 ? 'increase' : 'decrease'}`}>
            <DollarSign size={20} />
          </div>
          <div className="impact-content">
            <span className="impact-label">Net Impact</span>
            <span className={`impact-value ${impact.netImpact >= 0 ? 'increase' : 'decrease'}`}>
              {impact.netImpact >= 0 ? '+' : '-'}${Math.abs(impact.netImpact).toLocaleString()}
            </span>
          </div>
        </div>
        <div className="impact-card">
          <div className="impact-icon neutral">
            <Package size={20} />
          </div>
          <div className="impact-content">
            <span className="impact-label">New Items</span>
            <span className="impact-value">{impact.newItems}</span>
          </div>
        </div>
      </div>

      {/* Addenda List */}
      <div className="addenda-list">
        {filteredAddenda.length === 0 ? (
          <div className="no-changes">
            <AlertCircle size={32} />
            <p>No changes match the selected filter</p>
          </div>
        ) : (
          filteredAddenda.map((addendum) => {
            const isExpanded = expandedAddenda.has(addendum.id);

            return (
              <div key={addendum.id} className={`addendum-card ${isExpanded ? 'expanded' : ''}`}>
                <div className="addendum-card-header" onClick={() => toggleAddendum(addendum.id)}>
                  <span className="expand-icon">
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </span>
                  <div className="addendum-number">Addendum {addendum.number}</div>
                  <div className="addendum-meta">
                    <span className="addendum-date">
                      <Calendar size={14} />
                      {new Date(addendum.issueDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="changes-count">{addendum.changes.length} changes</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="addendum-content">
                    <p className="addendum-description">{addendum.description}</p>

                    <div className="changes-list">
                      {addendum.changes.map((change) => (
                        <div key={change.id} className="change-item">
                          <div className="change-header">
                            <span className={`change-type ${changeTypeColors[change.changeType]}`}>
                              {changeTypeIcons[change.changeType]}
                              {changeTypeLabels[change.changeType]}
                            </span>
                            {change.itemNumber && (
                              <span className="change-item-number">Item {change.itemNumber}</span>
                            )}
                            {change.section && <span className="change-section">{change.section}</span>}
                            {renderCostImpact(change)}
                          </div>

                          <div className="change-body">
                            {change.changeType === 'QUANTITY' ? (
                              <>
                                {renderTextDiff(change)}
                                {renderQuantityDiff(change)}
                              </>
                            ) : change.changeType === 'CLARIFICATION' ? (
                              <div className="clarification-content">
                                {change.revisedText.split('\n').map((line, idx) => (
                                  <p
                                    key={idx}
                                    className={line.startsWith('Q:') ? 'question' : line.startsWith('A:') ? 'answer' : ''}
                                  >
                                    {line}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              renderTextDiff(change)
                            )}
                          </div>
                        </div>
                      ))}
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
