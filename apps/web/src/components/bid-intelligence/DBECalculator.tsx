import { useState, useMemo } from 'react';
import {
  Users,
  Target,
  CheckCircle,
  AlertTriangle,
  Plus,
  Minus,
  DollarSign,
  Building2,
  Award,
  Star,
  Calendar,
  X,
  Search,
} from 'lucide-react';
import {
  mockDBESubcontractors,
  mockBidItems,
  mockProject,
  calculateTotalBid,
  getDBEOpportunities,
  type DBESubcontractor,
  type BidItem,
} from '../../data/mockBidData';
import './DBECalculator.css';

interface DBECommitment {
  subcontractor: DBESubcontractor;
  items: Array<{
    item: BidItem;
    amount: number;
  }>;
}

export function DBECalculator() {
  const [commitments, setCommitments] = useState<DBECommitment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSubSelector, setShowSubSelector] = useState(false);
  const [selectedItemForAssignment, setSelectedItemForAssignment] = useState<BidItem | null>(null);

  // Get total bid and DBE goal
  const totalBid = useMemo(() => calculateTotalBid(mockBidItems), []);
  const dbeGoal = mockProject.dbeGoal;
  const dbeGoalAmount = (totalBid * dbeGoal) / 100;

  // Get DBE-eligible items
  const dbeItems = useMemo(() => getDBEOpportunities(mockBidItems), []);

  // Calculate current DBE commitment
  const currentDBE = useMemo(() => {
    return commitments.reduce((total, commitment) => {
      return total + commitment.items.reduce((sum, item) => sum + item.amount, 0);
    }, 0);
  }, [commitments]);

  const currentDBEPercent = (currentDBE / totalBid) * 100;
  const meetsGoal = currentDBEPercent >= dbeGoal;
  const shortfall = meetsGoal ? 0 : dbeGoalAmount - currentDBE;

  // Filter subcontractors by search
  const filteredSubs = useMemo(() => {
    if (!searchQuery) return mockDBESubcontractors;
    const query = searchQuery.toLowerCase();
    return mockDBESubcontractors.filter(
      (sub) =>
        sub.companyName.toLowerCase().includes(query) ||
        sub.capabilities.some((cap) => cap.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  // Get remaining amount for an item
  const getRemainingAmount = (item: BidItem) => {
    const committed = commitments.reduce((total, c) => {
      const itemCommit = c.items.find((i) => i.item.id === item.id);
      return total + (itemCommit?.amount || 0);
    }, 0);
    return (item.extension || 0) - committed;
  };

  // Add commitment
  const addCommitment = (sub: DBESubcontractor, item: BidItem, amount: number) => {
    const existingCommitment = commitments.find((c) => c.subcontractor.id === sub.id);

    if (existingCommitment) {
      const existingItem = existingCommitment.items.find((i) => i.item.id === item.id);
      if (existingItem) {
        existingItem.amount += amount;
      } else {
        existingCommitment.items.push({ item, amount });
      }
      setCommitments([...commitments]);
    } else {
      setCommitments([
        ...commitments,
        {
          subcontractor: sub,
          items: [{ item, amount }],
        },
      ]);
    }
    setShowSubSelector(false);
    setSelectedItemForAssignment(null);
  };

  // Remove commitment
  const removeCommitment = (subId: string, itemId?: string) => {
    if (itemId) {
      setCommitments(
        commitments
          .map((c) => {
            if (c.subcontractor.id === subId) {
              return {
                ...c,
                items: c.items.filter((i) => i.item.id !== itemId),
              };
            }
            return c;
          })
          .filter((c) => c.items.length > 0)
      );
    } else {
      setCommitments(commitments.filter((c) => c.subcontractor.id !== subId));
    }
  };

  // Render certification badges
  const renderCertBadges = (certs: DBESubcontractor['certifications']) => {
    return certs.map((cert) => (
      <span key={cert} className={`cert-badge cert-${cert.toLowerCase()}`}>
        {cert}
      </span>
    ));
  };

  return (
    <div className="dbe-calculator">
      {/* Header */}
      <div className="dbe-header">
        <div className="header-info">
          <div className="header-icon">
            <Users size={24} />
          </div>
          <div>
            <h2>DBE Strategy Calculator</h2>
            <p>Plan your DBE participation to meet the {dbeGoal}% goal</p>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="dbe-progress-section">
        <div className="progress-header">
          <div className="progress-labels">
            <span className="current-label">
              Current: <strong>${currentDBE.toLocaleString()}</strong> ({currentDBEPercent.toFixed(1)}%)
            </span>
            <span className="goal-label">
              Goal: <strong>${dbeGoalAmount.toLocaleString()}</strong> ({dbeGoal}%)
            </span>
          </div>
        </div>

        <div className="progress-bar-container">
          <div className="progress-bar">
            <div
              className={`progress-fill ${meetsGoal ? 'meets-goal' : 'below-goal'}`}
              style={{ width: `${Math.min(currentDBEPercent, 100)}%` }}
            />
            <div className="goal-marker" style={{ left: `${dbeGoal}%` }}>
              <span className="goal-line" />
              <span className="goal-flag">
                <Target size={12} />
              </span>
            </div>
          </div>
        </div>

        <div className="progress-status">
          {meetsGoal ? (
            <div className="status-badge status-success">
              <CheckCircle size={16} />
              Goal Met! You're {(currentDBEPercent - dbeGoal).toFixed(1)}% above target
            </div>
          ) : (
            <div className="status-badge status-warning">
              <AlertTriangle size={16} />
              ${shortfall.toLocaleString()} more needed to meet goal
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="dbe-content">
        {/* Left Column: DBE Opportunities */}
        <div className="opportunities-column">
          <div className="column-header">
            <h3>DBE-Eligible Items</h3>
            <span className="item-count">{dbeItems.length} items</span>
          </div>

          <div className="items-list">
            {dbeItems.map((item) => {
              const remaining = getRemainingAmount(item);
              const isFullyCommitted = remaining <= 0;

              return (
                <div key={item.id} className={`dbe-item ${isFullyCommitted ? 'fully-committed' : ''}`}>
                  <div className="item-header">
                    <span className="item-number">{item.itemNumber}</span>
                    <span className="item-category">{item.category}</span>
                  </div>
                  <p className="item-description">{item.description}</p>
                  <div className="item-footer">
                    <span className="item-value">${(item.extension || 0).toLocaleString()}</span>
                    {remaining < (item.extension || 0) && (
                      <span className="item-remaining">${remaining.toLocaleString()} available</span>
                    )}
                    {!isFullyCommitted && (
                      <button
                        className="assign-btn"
                        onClick={() => {
                          setSelectedItemForAssignment(item);
                          setShowSubSelector(true);
                        }}
                      >
                        <Plus size={14} />
                        Assign
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Current Commitments */}
        <div className="commitments-column">
          <div className="column-header">
            <h3>DBE Commitments</h3>
            <span className="commit-total">${currentDBE.toLocaleString()}</span>
          </div>

          {commitments.length === 0 ? (
            <div className="empty-commitments">
              <Users size={32} />
              <p>No DBE commitments yet</p>
              <span>Select items from the left and assign to DBE subcontractors</span>
            </div>
          ) : (
            <div className="commitments-list">
              {commitments.map((commitment) => {
                const subTotal = commitment.items.reduce((sum, i) => sum + i.amount, 0);

                return (
                  <div key={commitment.subcontractor.id} className="commitment-card">
                    <div className="commitment-header">
                      <div className="sub-info">
                        <h4>{commitment.subcontractor.companyName}</h4>
                        <div className="cert-badges">{renderCertBadges(commitment.subcontractor.certifications)}</div>
                      </div>
                      <div className="commitment-total">
                        <DollarSign size={14} />
                        {subTotal.toLocaleString()}
                      </div>
                    </div>

                    <div className="commitment-items">
                      {commitment.items.map((ci) => (
                        <div key={ci.item.id} className="commitment-item">
                          <span className="ci-desc">
                            <span className="ci-number">{ci.item.itemNumber}</span>
                            {ci.item.description}
                          </span>
                          <span className="ci-amount">${ci.amount.toLocaleString()}</span>
                          <button
                            className="remove-item-btn"
                            onClick={() => removeCommitment(commitment.subcontractor.id, ci.item.id)}
                          >
                            <Minus size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="commitment-footer">
                      {commitment.subcontractor.performanceRating && (
                        <span className="rating">
                          <Star size={14} />
                          {commitment.subcontractor.performanceRating.toFixed(1)}
                        </span>
                      )}
                      <span className="cert-expires">
                        <Calendar size={14} />
                        Cert expires {new Date(commitment.subcontractor.certificationExpires).toLocaleDateString()}
                      </span>
                      <button className="remove-all-btn" onClick={() => removeCommitment(commitment.subcontractor.id)}>
                        Remove All
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Subcontractor Selector Modal */}
      {showSubSelector && selectedItemForAssignment && (
        <div className="sub-selector-overlay" onClick={() => setShowSubSelector(false)}>
          <div className="sub-selector-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Select DBE Subcontractor</h3>
              <p>
                For: {selectedItemForAssignment.itemNumber} - {selectedItemForAssignment.description}
              </p>
              <button className="close-btn" onClick={() => setShowSubSelector(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="search-bar">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search by company name or capability..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="subs-list">
              {filteredSubs.map((sub) => {
                const remaining = getRemainingAmount(selectedItemForAssignment);

                return (
                  <div key={sub.id} className="sub-option">
                    <div className="sub-main">
                      <div className="sub-name-row">
                        <Building2 size={18} />
                        <h4>{sub.companyName}</h4>
                        {sub.previousWVDOHWork && (
                          <span className="wvdoh-badge">
                            <Award size={12} />
                            WVDOH Exp
                          </span>
                        )}
                      </div>
                      <div className="cert-badges">{renderCertBadges(sub.certifications)}</div>
                      <div className="capabilities">
                        {sub.capabilities.slice(0, 3).map((cap) => (
                          <span key={cap} className="capability-tag">
                            {cap}
                          </span>
                        ))}
                        {sub.capabilities.length > 3 && (
                          <span className="more-caps">+{sub.capabilities.length - 3} more</span>
                        )}
                      </div>
                    </div>
                    <div className="sub-actions">
                      <div className="sub-meta">
                        {sub.performanceRating && (
                          <span className="rating">
                            <Star size={14} />
                            {sub.performanceRating}
                          </span>
                        )}
                        <span className="bonding">
                          <DollarSign size={14} />
                          {(sub.bondingCapacity / 1000000).toFixed(1)}M bonding
                        </span>
                      </div>
                      <div className="amount-selector">
                        <input
                          type="number"
                          className="amount-input"
                          defaultValue={remaining}
                          max={remaining}
                          min={0}
                          id={`amount-${sub.id}`}
                        />
                        <button
                          className="add-commitment-btn"
                          onClick={() => {
                            const input = document.getElementById(`amount-${sub.id}`) as HTMLInputElement;
                            const amount = parseFloat(input.value) || 0;
                            if (amount > 0) {
                              addCommitment(sub, selectedItemForAssignment, amount);
                            }
                          }}
                        >
                          <Plus size={16} />
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
