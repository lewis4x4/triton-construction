import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Target,
  FileText,
  Truck,
  Users,
  MessageSquarePlus,
  Sparkles,
  Calendar,
  DollarSign,
  MapPin,
  Clock,
  ChevronRight,
  Award,
  RefreshCw,
} from 'lucide-react';
import { SpecOracle } from '../../components/bid-intelligence/SpecOracle';
import { AddendumDiff } from '../../components/bid-intelligence/AddendumDiff';
import { HaulRouteMap } from '../../components/bid-intelligence/HaulRouteMap';
import { DBECalculator } from '../../components/bid-intelligence/DBECalculator';
import { RFIDrafter } from '../../components/bid-intelligence/RFIDrafter';
import { mockProject, mockBidItems, calculateTotalBid, getAddendumImpact, mockAddenda } from '../../data/mockBidData';
import './BidCommandCenter.css';

type ActiveTab = 'overview' | 'specs' | 'addenda' | 'haul' | 'dbe' | 'rfi';

const tabs: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Overview', icon: <Building2 size={18} /> },
  { id: 'specs', label: 'Spec Oracle', icon: <Sparkles size={18} /> },
  { id: 'addenda', label: 'Addendum Tracker', icon: <FileText size={18} /> },
  { id: 'haul', label: 'Haul Intel', icon: <Truck size={18} /> },
  { id: 'dbe', label: 'DBE Strategy', icon: <Users size={18} /> },
  { id: 'rfi', label: 'RFI Drafter', icon: <MessageSquarePlus size={18} /> },
];

export function BidCommandCenter() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  const totalBid = calculateTotalBid(mockBidItems);
  const addendumImpact = getAddendumImpact(mockAddenda);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const daysUntilBid = Math.ceil(
    (new Date(mockProject.bidDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="bid-command-center">
      {/* Header */}
      <div className="bcc-header">
        <Link to="/bids" className="back-link">
          <ArrowLeft size={18} />
          Back to Bids
        </Link>

        <div className="header-content">
          <div className="project-badge">
            <Award size={16} />
            {mockProject.ownerType}
          </div>
          <h1>{mockProject.name}</h1>
          <p className="project-meta">
            <span>
              <MapPin size={14} />
              {mockProject.county} County, WV
            </span>
            <span>
              <FileText size={14} />
              Contract {mockProject.contractId}
            </span>
            <span>
              <Calendar size={14} />
              Bid Date: {formatDate(mockProject.bidDate)}
            </span>
          </p>
        </div>

        <div className="header-actions">
          <div className={`bid-countdown ${daysUntilBid <= 7 ? 'urgent' : ''}`}>
            <Clock size={20} />
            <div className="countdown-content">
              <span className="countdown-value">{daysUntilBid}</span>
              <span className="countdown-label">days to bid</span>
            </div>
          </div>
          <button className="refresh-btn">
            <RefreshCw size={18} />
            Sync
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bcc-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bcc-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            {/* Key Metrics */}
            <div className="metrics-grid">
              <div className="metric-card metric-primary">
                <div className="metric-icon">
                  <DollarSign size={24} />
                </div>
                <div className="metric-content">
                  <span className="metric-label">Estimated Bid</span>
                  <span className="metric-value">{formatCurrency(totalBid)}</span>
                  <span className="metric-sub">Engineer's Est: {formatCurrency(mockProject.engineersEstimate || 0)}</span>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon">
                  <Target size={24} />
                </div>
                <div className="metric-content">
                  <span className="metric-label">DBE Goal</span>
                  <span className="metric-value">{mockProject.dbeGoal}%</span>
                  <span className="metric-sub">{formatCurrency(totalBid * mockProject.dbeGoal / 100)}</span>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon">
                  <FileText size={24} />
                </div>
                <div className="metric-content">
                  <span className="metric-label">Bid Items</span>
                  <span className="metric-value">{mockBidItems.length}</span>
                  <span className="metric-sub">{mockBidItems.filter(i => i.dbeOpportunity).length} DBE-eligible</span>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon">
                  <Calendar size={24} />
                </div>
                <div className="metric-content">
                  <span className="metric-label">Working Days</span>
                  <span className="metric-value">{mockProject.workingDays}</span>
                  <span className="metric-sub">LD: {formatCurrency(mockProject.liquidatedDamages)}/day</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <div className="actions-grid">
                <button className="action-card" onClick={() => setActiveTab('specs')}>
                  <Sparkles size={28} />
                  <div>
                    <h4>Search Specs</h4>
                    <p>Find specification requirements</p>
                  </div>
                  <ChevronRight size={18} />
                </button>

                <button className="action-card" onClick={() => setActiveTab('addenda')}>
                  <FileText size={28} />
                  <div>
                    <h4>Review Addenda</h4>
                    <p>{mockAddenda.length} addenda, {addendumImpact.netImpact >= 0 ? '+' : ''}{formatCurrency(addendumImpact.netImpact)} impact</p>
                  </div>
                  <ChevronRight size={18} />
                </button>

                <button className="action-card" onClick={() => setActiveTab('dbe')}>
                  <Users size={28} />
                  <div>
                    <h4>Plan DBE Strategy</h4>
                    <p>Build your subcontractor plan</p>
                  </div>
                  <ChevronRight size={18} />
                </button>

                <button className="action-card" onClick={() => setActiveTab('rfi')}>
                  <MessageSquarePlus size={28} />
                  <div>
                    <h4>Draft RFIs</h4>
                    <p>AI-assisted question drafting</p>
                  </div>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Project Details */}
            <div className="project-details">
              <h3>Project Details</h3>
              <div className="details-grid">
                <div className="detail-section">
                  <h4>Contract Information</h4>
                  <dl>
                    <dt>Project Number</dt>
                    <dd>{mockProject.projectNumber}</dd>
                    <dt>Contract ID</dt>
                    <dd>{mockProject.contractId}</dd>
                    <dt>Owner</dt>
                    <dd>{mockProject.owner}</dd>
                    <dt>District</dt>
                    <dd>{mockProject.district}</dd>
                  </dl>
                </div>

                <div className="detail-section">
                  <h4>Key Dates</h4>
                  <dl>
                    <dt>Bid Opening</dt>
                    <dd>{formatDate(mockProject.bidDate)} at {mockProject.bidTime}</dd>
                    <dt>Questions Due</dt>
                    <dd>{formatDate(mockProject.questionDeadline)}</dd>
                    <dt>Pre-Bid Meeting</dt>
                    <dd>{mockProject.preBidDate ? formatDate(mockProject.preBidDate) : 'N/A'}</dd>
                    <dt>Notice to Proceed</dt>
                    <dd>{formatDate(mockProject.keyDates.noticeToProceed)}</dd>
                  </dl>
                </div>

                <div className="detail-section">
                  <h4>Bonding Requirements</h4>
                  <dl>
                    <dt>Bid Bond</dt>
                    <dd>{mockProject.bondRequirements.bidBond}%</dd>
                    <dt>Performance Bond</dt>
                    <dd>{mockProject.bondRequirements.performanceBond}%</dd>
                    <dt>Payment Bond</dt>
                    <dd>{mockProject.bondRequirements.paymentBond}%</dd>
                  </dl>
                </div>

                <div className="detail-section">
                  <h4>Compliance</h4>
                  <dl>
                    <dt>Federal Aid</dt>
                    <dd>{mockProject.federalAid ? 'Yes' : 'No'}</dd>
                    <dt>Davis-Bacon</dt>
                    <dd>{mockProject.davisBaconRequired ? 'Required' : 'No'}</dd>
                    <dt>Buy America</dt>
                    <dd>{mockProject.buyAmericaRequired ? 'Required' : 'No'}</dd>
                    <dt>DBE Goal</dt>
                    <dd>{mockProject.dbeGoal}%</dd>
                  </dl>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="project-description">
              <h3>Scope of Work</h3>
              <p>{mockProject.description}</p>
            </div>
          </div>
        )}

        {activeTab === 'specs' && <SpecOracle />}
        {activeTab === 'addenda' && <AddendumDiff />}
        {activeTab === 'haul' && <HaulRouteMap />}
        {activeTab === 'dbe' && <DBECalculator />}
        {activeTab === 'rfi' && <RFIDrafter />}
      </div>
    </div>
  );
}
