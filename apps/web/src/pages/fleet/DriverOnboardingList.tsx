import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  Filter,
  Truck,
  Car,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  OnboardingTypeSelector,
  ApplicationStatusBadge,
} from '../../components/driver-onboarding';
import type { DriverApplication, ApplicationStatus } from '../../components/driver-onboarding/types';
import './DriverOnboardingList.css';

export default function DriverOnboardingList() {
  const navigate = useNavigate();
  const location = useLocation();
  const { organizationId } = useAuth();
  const [applications, setApplications] = useState<DriverApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CDL' | 'NON_CDL'>('ALL');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check for success message from navigation
  useEffect(() => {
    if (location.state?.success && location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the state
      window.history.replaceState({}, document.title);
      // Auto-dismiss after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  }, [location]);

  // Fetch applications
  useEffect(() => {
    const fetchApplications = async () => {
      if (!organizationId) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('driver_applications')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setApplications(data || []);
      } catch (err) {
        console.error('Failed to fetch applications:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplications();
  }, [organizationId]);

  const handleSelectType = (type: 'CDL' | 'NON_CDL') => {
    if (type === 'CDL') {
      navigate('/fleet/driver-onboarding/cdl/new');
    } else {
      navigate('/fleet/driver-onboarding/non-cdl/new');
    }
  };

  const handleApplicationClick = (app: DriverApplication) => {
    if (app.status === 'DRAFT' || app.status === 'IN_PROGRESS') {
      if (app.application_type === 'CDL') {
        navigate(`/fleet/driver-onboarding/cdl/${app.id}`);
      } else {
        navigate(`/fleet/driver-onboarding/non-cdl/${app.id}`);
      }
    } else {
      navigate(`/fleet/driver-onboarding/${app.id}`);
    }
  };

  // Filter applications
  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      searchQuery === '' ||
      `${app.first_name} ${app.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.application_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.license_number?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || app.application_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Stats
  const stats = {
    total: applications.length,
    pending: applications.filter((a) =>
      ['PENDING_DOCUMENTS', 'PENDING_VERIFICATION'].includes(a.status)
    ).length,
    approved: applications.filter((a) => a.status === 'APPROVED').length,
    drafts: applications.filter((a) => ['DRAFT', 'IN_PROGRESS'].includes(a.status)).length,
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="driver-onboarding-list">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>
            <Users size={28} />
            Driver Onboarding
          </h1>
          <p>Manage driver applications and onboarding workflows</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowTypeSelector(true)}>
          <Plus size={18} />
          New Application
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="success-banner">
          <CheckCircle size={18} />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)}>&times;</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <FileText size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Applications</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pending">
            <Clock size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.pending}</span>
            <span className="stat-label">Pending Review</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon approved">
            <CheckCircle size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.approved}</span>
            <span className="stat-label">Approved</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon drafts">
            <AlertCircle size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.drafts}</span>
            <span className="stat-label">In Progress</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by name, license, or application #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={16} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | 'ALL')}
          >
            <option value="ALL">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="PENDING_DOCUMENTS">Pending Documents</option>
            <option value="PENDING_VERIFICATION">Pending Verification</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'ALL' | 'CDL' | 'NON_CDL')}
          >
            <option value="ALL">All Types</option>
            <option value="CDL">CDL</option>
            <option value="NON_CDL">Non-CDL</option>
          </select>
        </div>
      </div>

      {/* Applications List */}
      <div className="applications-list">
        {isLoading ? (
          <div className="loading-state">
            <RefreshCw size={24} className="spin" />
            <span>Loading applications...</span>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <h3>No applications found</h3>
            <p>
              {applications.length === 0
                ? 'Start by creating a new driver application.'
                : 'Try adjusting your search or filters.'}
            </p>
            {applications.length === 0 && (
              <button className="btn btn-primary" onClick={() => setShowTypeSelector(true)}>
                <Plus size={18} />
                New Application
              </button>
            )}
          </div>
        ) : (
          <div className="applications-table">
            <div className="table-header">
              <div className="col-applicant">Applicant</div>
              <div className="col-type">Type</div>
              <div className="col-license">License</div>
              <div className="col-status">Status</div>
              <div className="col-date">Submitted</div>
              <div className="col-action"></div>
            </div>
            {filteredApplications.map((app) => (
              <div
                key={app.id}
                className="table-row"
                onClick={() => handleApplicationClick(app)}
              >
                <div className="col-applicant">
                  <div className="applicant-info">
                    <span className="applicant-name">
                      {app.first_name || 'Unnamed'} {app.last_name || 'Applicant'}
                    </span>
                    {app.application_number && (
                      <span className="application-number">#{app.application_number}</span>
                    )}
                  </div>
                </div>
                <div className="col-type">
                  <span className={`type-badge ${app.application_type.toLowerCase()}`}>
                    {app.application_type === 'CDL' ? (
                      <>
                        <Truck size={14} />
                        CDL
                      </>
                    ) : (
                      <>
                        <Car size={14} />
                        Non-CDL
                      </>
                    )}
                  </span>
                </div>
                <div className="col-license">
                  {app.license_number ? (
                    <span className="license-info">
                      {app.license_state} {app.license_number}
                    </span>
                  ) : (
                    <span className="no-data">Not provided</span>
                  )}
                </div>
                <div className="col-status">
                  <ApplicationStatusBadge status={app.status} size="sm" />
                </div>
                <div className="col-date">
                  <span className="date-info">
                    <Calendar size={14} />
                    {app.submitted_at ? formatDate(app.submitted_at) : formatDate(app.created_at)}
                  </span>
                </div>
                <div className="col-action">
                  <ChevronRight size={18} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Type Selector Modal */}
      {showTypeSelector && (
        <div className="modal-overlay" onClick={() => setShowTypeSelector(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <OnboardingTypeSelector
              onSelect={handleSelectType}
              onCancel={() => setShowTypeSelector(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
