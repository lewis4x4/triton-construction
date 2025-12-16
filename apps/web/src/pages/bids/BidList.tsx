import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@triton/supabase-client';
import { useAuth } from '../../hooks/useAuth';
import './BidList.css';

// Timeout for API calls (15 seconds)
const API_TIMEOUT = 15000;

interface BidProject {
  id: string;
  project_name: string;
  owner: string | null;
  state_project_number: string | null;
  letting_date: string | null;
  bid_due_date: string | null;
  status: string;
  created_at: string;
  county: string | null;
  route: string | null;
  // Dashboard metrics from v_bid_project_dashboard
  total_line_items?: number | null;
  items_reviewed?: number | null;
  total_bid_value?: number | null;
  total_risks?: number | null;
  high_critical_risks?: number | null;
  total_documents?: number | null;
  documents_processed?: number | null;
  estimated_completion_pct?: number | null;
}

// Status values matching database enum (bid_status_enum)
type StatusFilter = 'all' | 'IDENTIFIED' | 'REVIEWING' | 'ANALYZING' | 'READY_FOR_REVIEW' | 'IN_REVIEW' | 'APPROVED' | 'ESTIMATING' | 'SUBMITTED' | 'WON' | 'LOST' | 'NO_BID' | 'CANCELLED';

export function BidList() {
  const navigate = useNavigate();
  const { isAuthenticated, refreshSession } = useAuth();
  const [projects, setProjects] = useState<BidProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchProjects = useCallback(async () => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    // Set up timeout
    const timeoutId = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }, API_TIMEOUT);

    try {
      // First check if session is still valid
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        // Try to refresh the session
        const refreshed = await refreshSession();
        if (!refreshed) {
          console.log('Session expired, redirecting to login...');
          navigate('/login');
          return;
        }
      }

      // First get basic project info - select specific fields matching the database schema
      let query = supabase
        .from('bid_projects')
        .select('id, project_name, owner, state_project_number, county, route, letting_date, bid_due_date, status, created_at')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        query = query.eq('status', statusFilter as any);
      }

      if (searchQuery) {
        query = query.or(`project_name.ilike.%${searchQuery}%,state_project_number.ilike.%${searchQuery}%`);
      }

      const { data: basicProjects, error: projectsError } = await query;

      if (projectsError) {
        // Check for auth-related errors
        if (projectsError.message?.includes('JWT') ||
            projectsError.message?.includes('token') ||
            projectsError.code === 'PGRST301') {
          console.log('Auth error, attempting session refresh...');
          const refreshed = await refreshSession();
          if (!refreshed) {
            navigate('/login');
            return;
          }
          // Retry the fetch after refresh
          fetchProjects();
          return;
        }
        throw projectsError;
      }

      // Then fetch dashboard metrics
      const { data: dashboardData } = await supabase
        .from('v_bid_project_dashboard')
        .select('*');

      // Merge dashboard data with projects
      const dashboardMap = new Map(
        (dashboardData || []).map(d => [d.bid_project_id, d])
      );

      const enrichedProjects = (basicProjects || []).map(project => ({
        ...project,
        ...(dashboardMap.get(project.id) || {}),
      })) as BidProject[];

      setProjects(enrichedProjects);
    } catch (err: unknown) {
      // Check if it was aborted (timeout or navigation)
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Request timed out or was cancelled');
        setError('Request timed out. Please check your connection and try again.');
        return;
      }

      console.error('Error fetching projects:', err);

      // Check for auth errors in the catch block too
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('JWT') || errorMessage.includes('token') || errorMessage.includes('expired')) {
        setError('Session expired. Redirecting to login...');
        setTimeout(() => navigate('/login'), 1500);
        return;
      }

      setError('Failed to load bid projects. Please try again.');
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery, refreshSession, navigate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'IDENTIFIED':
      case 'REVIEWING':
        return 'badge-gray';
      case 'ANALYZING':
        return 'badge-blue';
      case 'READY_FOR_REVIEW':
      case 'IN_REVIEW':
        return 'badge-purple';
      case 'APPROVED':
      case 'ESTIMATING':
        return 'badge-yellow';
      case 'SUBMITTED':
        return 'badge-blue';
      case 'WON':
        return 'badge-green';
      case 'LOST':
      case 'NO_BID':
      case 'CANCELLED':
        return 'badge-red';
      default:
        return 'badge-gray';
    }
  };

  const getDaysUntilBid = (bidDueDate: string | null) => {
    if (!bidDueDate) return null;
    const now = new Date();
    const due = new Date(bidDueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <>
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Bid Packages</h1>
            <p className="header-subtitle">Manage your bid projects and track estimation progress</p>
          </div>
          <div className="header-right">
            <Link to="/bids/new" className="btn btn-primary">
              + New Bid Project
            </Link>
          </div>
        </div>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="IDENTIFIED">Identified</option>
            <option value="REVIEWING">Reviewing</option>
            <option value="ANALYZING">Analyzing</option>
            <option value="READY_FOR_REVIEW">Ready for Review</option>
            <option value="ESTIMATING">Estimating</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="WON">Won</option>
            <option value="LOST">Lost</option>
            <option value="NO_BID">No Bid</option>
          </select>
        </div>

        <button onClick={fetchProjects} className="btn btn-secondary">
          Refresh
        </button>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <span>Loading bid projects...</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No Bid Projects</h3>
          <p>Get started by creating your first bid project</p>
          <Link to="/bids/new" className="btn btn-primary">
            Create Bid Project
          </Link>
        </div>
      ) : (
        <div className="bid-cards-grid">
          {projects.map((project) => {
            const daysUntilBid = getDaysUntilBid(project.bid_due_date);
            const isUrgent = daysUntilBid !== null && daysUntilBid <= 7 && daysUntilBid >= 0;
            const isPastDue = daysUntilBid !== null && daysUntilBid < 0;

            return (
              <div
                key={project.id}
                className={`bid-card ${isUrgent ? 'urgent' : ''} ${isPastDue ? 'past-due' : ''}`}
                onClick={() => navigate(`/bids/${project.id}`)}
              >
                <div className="bid-card-header">
                  <h3>{project.project_name}</h3>
                  <span className={`badge ${getStatusBadgeClass(project.status)}`}>
                    {project.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="bid-card-info">
                  {project.state_project_number && (
                    <div className="info-row">
                      <span className="label">Project #:</span>
                      <span>{project.state_project_number}</span>
                    </div>
                  )}
                  {project.owner && (
                    <div className="info-row">
                      <span className="label">Owner:</span>
                      <span>{project.owner}</span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="label">Bid Due:</span>
                    <span className={isUrgent || isPastDue ? 'text-danger' : ''}>
                      {formatDate(project.bid_due_date)}
                      {daysUntilBid !== null && (
                        <span className="days-badge">
                          {isPastDue
                            ? `${Math.abs(daysUntilBid)}d overdue`
                            : daysUntilBid === 0
                              ? 'Today'
                              : `${daysUntilBid}d`}
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="bid-card-metrics">
                  <div className="metric">
                    <span className="metric-value">{project.total_line_items || 0}</span>
                    <span className="metric-label">Items</span>
                  </div>
                  <div className="metric">
                    <span className="metric-value">
                      {project.items_reviewed || 0}/{project.total_line_items || 0}
                    </span>
                    <span className="metric-label">Reviewed</span>
                  </div>
                  <div className="metric">
                    <span className="metric-value">{formatCurrency(project.total_bid_value)}</span>
                    <span className="metric-label">Value</span>
                  </div>
                  <div className="metric">
                    <span className={`metric-value ${(project.high_critical_risks || 0) > 0 ? 'text-danger' : ''}`}>
                      {project.high_critical_risks || 0}
                    </span>
                    <span className="metric-label">High Risks</span>
                  </div>
                </div>

                <div className="bid-card-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${project.estimated_completion_pct || 0}%` }}
                    />
                  </div>
                  <span className="progress-label">
                    {project.estimated_completion_pct?.toFixed(0) || 0}% Complete
                  </span>
                </div>

                <div className="bid-card-docs">
                  <span className="doc-count">
                    📄 {project.documents_processed || 0}/{project.total_documents || 0} docs processed
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
