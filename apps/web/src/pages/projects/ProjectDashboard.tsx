import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@triton/supabase-client';
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import './ProjectDashboard.css';

interface Project {
  id: string;
  project_number: string;
  name: string;
  status: string;
  project_type: string;
  contract_type: string;
  original_contract_value: number;
  current_contract_value: number;
  notice_to_proceed_date: string;
  original_completion_date: string;
  current_completion_date: string;
  original_working_days: number;
  current_working_days: number;
  working_days_used: number;
  wvdoh_district: number;
  is_federal_aid: boolean;
  davis_bacon_required: boolean;
  dbe_goal_percentage: number;
  percent_complete: number;
  created_at: string;
}

interface DeadlineItem {
  id: string;
  project_name: string;
  project_number: string;
  deadline_type: string;
  deadline_date: string;
  days_remaining: number;
  priority: 'critical' | 'warning' | 'normal';
}

interface ActivityItem {
  id: string;
  type: 'project_created' | 'status_change' | 'milestone' | 'payment' | 'report';
  description: string;
  project_name: string;
  timestamp: string;
  user_name?: string;
}

const STATUS_COLORS: Record<string, string> = {
  PLANNING: '#6B7280',
  BIDDING: '#3B82F6',
  AWARDED: '#8B5CF6',
  MOBILIZATION: '#F59E0B',
  ACTIVE: '#10B981',
  SUBSTANTIAL_COMPLETION: '#14B8A6',
  PUNCH_LIST: '#F97316',
  COMPLETE: '#3B82F6',
  CLOSED: '#6B7280',
};

export function ProjectDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('month');
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    loadProjects();
    loadDeadlines();
    loadActivities();
  }, [filter, timeRange]);

  async function loadProjects() {
    setLoading(true);
    let query = supabase
      .from('projects')
      .select('*')
      .order('project_number', { ascending: false });

    if (filter === 'active') {
      query = query.in('status', ['ACTIVE', 'MOBILIZATION', 'PUNCH_LIST']);
    } else if (filter === 'completed') {
      query = query.in('status', ['COMPLETE', 'CLOSED']);
    }

    const { data, error } = await query;

    if (!error && data) {
      setProjects(data as unknown as Project[]);
    }
    setLoading(false);
  }

  async function loadDeadlines() {
    // Generate deadlines from project data
    const { data: projectData } = await supabase
      .from('projects')
      .select('id, name, project_number, current_completion_date, status')
      .in('status', ['ACTIVE', 'MOBILIZATION', 'PUNCH_LIST'])
      .not('current_completion_date', 'is', null)
      .order('current_completion_date', { ascending: true })
      .limit(10);

    if (projectData) {
      const today = new Date();
      const deadlineItems: DeadlineItem[] = projectData.map((p) => {
        const deadlineDate = new Date(p.current_completion_date || '');
        const daysRemaining = Math.ceil(
          (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          id: p.id,
          project_name: p.name,
          project_number: p.project_number,
          deadline_type: 'Completion',
          deadline_date: p.current_completion_date || '',
          days_remaining: daysRemaining,
          priority:
            daysRemaining < 0 ? 'critical' : daysRemaining < 30 ? 'warning' : 'normal',
        };
      });
      setDeadlines(deadlineItems.slice(0, 5));
    }
  }

  async function loadActivities() {
    // For now, generate sample activities from project data
    const { data: recentProjects } = await supabase
      .from('projects')
      .select('id, name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentProjects) {
      const activityItems: ActivityItem[] = recentProjects.map((p, idx) => ({
        id: `activity-${idx}`,
        type: 'project_created',
        description: `Project "${p.name}" was created`,
        project_name: p.name,
        timestamp: p.created_at,
        user_name: 'System',
      }));
      setActivities(activityItems.slice(0, 5));
    }
  }

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.project_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate statistics
  const stats = useMemo(() => {
    const activeProjects = projects.filter((p) =>
      ['ACTIVE', 'MOBILIZATION', 'PUNCH_LIST'].includes(p.status)
    ).length;
    const totalContractValue = projects.reduce(
      (sum, p) => sum + (p.current_contract_value || 0),
      0
    );
    const avgCompletion =
      projects.length > 0
        ? projects.reduce((sum, p) => sum + (p.percent_complete || 0), 0) / projects.length
        : 0;
    const federalAidCount = projects.filter((p) => p.is_federal_aid).length;

    return {
      activeProjects,
      totalContractValue,
      avgCompletion,
      federalAidCount,
      paymentCompliance: 94, // This would come from pay_periods table
      revenueThisMonth: totalContractValue * 0.08, // Placeholder calculation
    };
  }, [projects]);

  // Chart data for project status distribution
  const statusChartData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    projects.forEach((p) => {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.replace(/_/g, ' '),
      value: count,
      color: STATUS_COLORS[status] || '#6B7280',
    }));
  }, [projects]);

  // Revenue vs Cost chart data (mock data for demonstration)
  const revenueChartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();

    return months.slice(0, currentMonth + 1).map((month, idx) => ({
      month,
      revenue: Math.floor(Math.random() * 500000 + 200000 + idx * 50000),
      cost: Math.floor(Math.random() * 400000 + 150000 + idx * 40000),
    }));
  }, []);

  // Payment overview data (mock data for demonstration)
  const paymentData = useMemo(() => {
    return [
      { label: 'On Time', value: 85, color: '#10B981' },
      { label: 'Pending', value: 10, color: '#F59E0B' },
      { label: 'Overdue', value: 5, color: '#EF4444' },
    ];
  }, []);

  // Working days utilization
  const workingDaysData = useMemo(() => {
    return projects
      .filter((p) => p.current_working_days && p.current_working_days > 0)
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name,
        project_number: p.project_number,
        used: p.working_days_used || 0,
        total: p.current_working_days,
        percentage: Math.round(((p.working_days_used || 0) / p.current_working_days) * 100),
      }));
  }, [projects]);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PLANNING: 'status-badge-gray',
      BIDDING: 'status-badge-blue',
      AWARDED: 'status-badge-purple',
      MOBILIZATION: 'status-badge-yellow',
      ACTIVE: 'status-badge-green',
      SUBSTANTIAL_COMPLETION: 'status-badge-teal',
      PUNCH_LIST: 'status-badge-orange',
      COMPLETE: 'status-badge-blue',
      CLOSED: 'status-badge-gray',
    };
    return colors[status] || 'status-badge-gray';
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="project-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Project Management</h1>
            <p className="header-subtitle">Overview of all construction projects</p>
          </div>

          <div className="header-right">
            <div className="time-filter">
              {(['today', 'week', 'month'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`time-filter-btn ${timeRange === range ? 'active' : ''}`}
                >
                  {range === 'today' ? 'Today' : range === 'week' ? 'This Week' : 'This Month'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowNewProjectForm(true)}
              className="new-project-btn"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card stat-card-primary">
          <div className="stat-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Active Projects</span>
            <span className="stat-value">{stats.activeProjects}</span>
            <span className="stat-change positive">+2 this month</span>
          </div>
        </div>

        <div className="stat-card stat-card-success">
          <div className="stat-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Contract Value</span>
            <span className="stat-value">{formatCurrency(stats.totalContractValue)}</span>
            <span className="stat-change positive">+15% vs last year</span>
          </div>
        </div>

        <div className="stat-card stat-card-info">
          <div className="stat-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Revenue This Month</span>
            <span className="stat-value">{formatCurrency(stats.revenueThisMonth)}</span>
            <span className="stat-change positive">+8.2% vs last month</span>
          </div>
        </div>

        <div className="stat-card stat-card-warning">
          <div className="stat-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Payment Compliance</span>
            <span className="stat-value">{stats.paymentCompliance}%</span>
            <span className="stat-change neutral">14-day target met</span>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Projects Overview Chart */}
        <div className="dashboard-card chart-card">
          <div className="card-header">
            <h3>Projects Overview</h3>
            <span className="card-subtitle">By Status</span>
          </div>
          <div className="chart-container">
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value} projects`, 'Count']}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">
                <p>No project data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Revenue vs Cost Chart */}
        <div className="dashboard-card chart-card wide">
          <div className="card-header">
            <h3>Revenue vs Cost</h3>
            <span className="card-subtitle">Monthly Trend</span>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), '']}
                  labelStyle={{ color: '#374151' }}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#colorRevenue)"
                  name="Revenue"
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#colorCost)"
                  name="Cost"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="dashboard-card deadlines-card">
          <div className="card-header">
            <h3>Upcoming Deadlines</h3>
            <button className="view-all-btn">View All</button>
          </div>
          <div className="deadlines-list">
            {deadlines.length > 0 ? (
              deadlines.map((deadline) => (
                <div key={deadline.id} className={`deadline-item ${deadline.priority}`}>
                  <div className="deadline-indicator" />
                  <div className="deadline-content">
                    <span className="deadline-project">{deadline.project_name}</span>
                    <span className="deadline-type">{deadline.deadline_type}</span>
                  </div>
                  <div className="deadline-date">
                    <span className="date">{formatDate(deadline.deadline_date)}</span>
                    <span className={`days ${deadline.days_remaining < 0 ? 'overdue' : ''}`}>
                      {deadline.days_remaining < 0
                        ? `${Math.abs(deadline.days_remaining)}d overdue`
                        : `${deadline.days_remaining}d left`}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>No upcoming deadlines</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Overview */}
        <div className="dashboard-card payment-card">
          <div className="card-header">
            <h3>Payment Overview</h3>
            <span className="card-subtitle">14-Day Compliance</span>
          </div>
          <div className="payment-bars">
            {paymentData.map((item, idx) => (
              <div key={idx} className="payment-bar-item">
                <div className="payment-bar-header">
                  <span className="payment-label">{item.label}</span>
                  <span className="payment-value">{item.value}%</span>
                </div>
                <div className="payment-bar-track">
                  <div
                    className="payment-bar-fill"
                    style={{ width: `${item.value}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="payment-summary">
            <div className="payment-stat">
              <span className="label">Total Pending</span>
              <span className="value">$1.2M</span>
            </div>
            <div className="payment-stat">
              <span className="label">Due This Week</span>
              <span className="value">$450K</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="dashboard-card activity-card">
          <div className="card-header">
            <h3>Recent Activity</h3>
            <button className="view-all-btn">View All</button>
          </div>
          <div className="activity-list">
            {activities.length > 0 ? (
              activities.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-icon">
                    {activity.type === 'project_created' && (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                    {activity.type === 'status_change' && (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    {activity.type === 'payment' && (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div className="activity-content">
                    <p className="activity-description">{activity.description}</p>
                    <span className="activity-time">{getTimeAgo(activity.timestamp)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Working Days Utilization */}
        <div className="dashboard-card working-days-card">
          <div className="card-header">
            <h3>Working Days Utilization</h3>
            <span className="card-subtitle">Active Projects</span>
          </div>
          <div className="working-days-list">
            {workingDaysData.length > 0 ? (
              workingDaysData.map((project) => (
                <div key={project.id} className="working-days-item">
                  <div className="project-info">
                    <span className="project-name">{project.name}</span>
                    <span className="project-number">{project.project_number}</span>
                  </div>
                  <div className="progress-section">
                    <div className="progress-bar-container">
                      <div
                        className={`progress-bar-fill ${project.percentage > 90
                          ? 'critical'
                          : project.percentage > 75
                            ? 'warning'
                            : 'normal'
                          }`}
                        style={{ width: `${Math.min(project.percentage, 100)}%` }}
                      />
                    </div>
                    <span className="progress-text">
                      {project.used}/{project.total} ({project.percentage}%)
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>No active projects with working days</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="filters-section">
        <div className="filter-tabs">
          {[
            { id: 'all', label: 'All Projects' },
            { id: 'active', label: 'Active' },
            { id: 'completed', label: 'Completed' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as typeof filter)}
              className={`filter-tab ${filter === f.id ? 'active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="search-box">
          <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="loading-spinner">
          <div className="spinner" />
          <p>Loading projects...</p>
        </div>
      ) : (
        <div className="projects-grid">
          {filteredProjects.length === 0 ? (
            <div className="empty-projects">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3>No projects found</h3>
              <p>Create your first project to get started</p>
              <button onClick={() => setShowNewProjectForm(true)} className="create-btn">
                Create Project
              </button>
            </div>
          ) : (
            filteredProjects.map((project) => {
              const daysRemaining = project.current_completion_date
                ? Math.ceil(
                  (new Date(project.current_completion_date).getTime() - new Date().getTime()) /
                  (1000 * 60 * 60 * 24)
                )
                : null;
              const workingDaysPercent = project.current_working_days
                ? Math.round(((project.working_days_used || 0) / project.current_working_days) * 100)
                : 0;

              return (
                <div
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className="project-card"
                >
                  <div className="project-card-header">
                    <div className="project-info">
                      <span className="project-number">{project.project_number}</span>
                      <h4 className="project-name">{project.name}</h4>
                    </div>
                    <span className={`status-badge ${getStatusBadge(project.status)}`}>
                      {project.status?.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="project-progress">
                    <div className="progress-header">
                      <span>Progress</span>
                      <span className="progress-value">{project.percent_complete || 0}%</span>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${project.percent_complete || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="project-metrics">
                    <div className="metric">
                      <span className="metric-label">Contract Value</span>
                      <span className="metric-value">
                        {formatCurrency(project.current_contract_value || 0)}
                      </span>
                    </div>
                    {daysRemaining !== null && (
                      <div className="metric">
                        <span className="metric-label">Days Remaining</span>
                        <span
                          className={`metric-value ${daysRemaining < 0 ? 'overdue' : daysRemaining < 30 ? 'warning' : ''
                            }`}
                        >
                          {daysRemaining < 0 ? `${Math.abs(daysRemaining)} overdue` : daysRemaining}
                        </span>
                      </div>
                    )}
                    <div className="metric">
                      <span className="metric-label">Working Days</span>
                      <span
                        className={`metric-value ${workingDaysPercent > 90
                          ? 'overdue'
                          : workingDaysPercent > 75
                            ? 'warning'
                            : ''
                          }`}
                      >
                        {project.working_days_used || 0} / {project.current_working_days || '-'}
                      </span>
                    </div>
                  </div>

                  <div className="project-tags">
                    {project.is_federal_aid && (
                      <span className="tag tag-blue">Federal Aid</span>
                    )}
                    {project.davis_bacon_required && (
                      <span className="tag tag-purple">Davis-Bacon</span>
                    )}
                    {project.dbe_goal_percentage > 0 && (
                      <span className="tag tag-green">DBE {project.dbe_goal_percentage}%</span>
                    )}
                    {project.wvdoh_district && (
                      <span className="tag tag-gray">Dist. {project.wvdoh_district}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {showNewProjectForm && (
        <NewProjectModal
          onClose={() => setShowNewProjectForm(false)}
          onSave={() => {
            setShowNewProjectForm(false);
            loadProjects();
          }}
        />
      )}

      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdate={() => {
            setSelectedProject(null);
            loadProjects();
          }}
        />
      )}
    </div>
  );
}

function NewProjectModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    project_number: '',
    name: '',
    project_type: 'HIGHWAY',
    contract_type: 'UNIT_PRICE',
    original_contract_value: '',
    notice_to_proceed_date: '',
    original_completion_date: '',
    original_working_days: '',
    wvdoh_district: '',
    is_federal_aid: false,
    davis_bacon_required: false,
    dbe_goal_percentage: '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from('projects').insert([{
      project_number: formData.project_number,
      name: formData.name,
      project_type: formData.project_type,
      contract_type: formData.contract_type,
      original_contract_value: parseFloat(formData.original_contract_value) || 0,
      current_contract_value: parseFloat(formData.original_contract_value) || 0,
      notice_to_proceed_date: formData.notice_to_proceed_date || null,
      original_completion_date: formData.original_completion_date || null,
      current_completion_date: formData.original_completion_date || null,
      original_working_days: parseInt(formData.original_working_days, 10) || null,
      current_working_days: parseInt(formData.original_working_days, 10) || null,
      wvdoh_district: formData.wvdoh_district ? parseInt(formData.wvdoh_district, 10) : null,
      is_federal_aid: formData.is_federal_aid,
      davis_bacon_required: formData.davis_bacon_required,
      dbe_goal_percentage: parseFloat(formData.dbe_goal_percentage) || 0,
      status: 'PLANNING',
    }] as any);

    if (!error) {
      onSave();
    }
    setSaving(false);
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>New Project</h2>
          <button onClick={onClose} className="modal-close">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Project Number *</label>
              <input
                type="text"
                value={formData.project_number}
                onChange={(e) => setFormData({ ...formData, project_number: e.target.value })}
                placeholder="e.g., 2024-001"
                required
              />
            </div>
            <div className="form-group">
              <label>WVDOH District</label>
              <select
                value={formData.wvdoh_district}
                onChange={(e) => setFormData({ ...formData, wvdoh_district: e.target.value })}
              >
                <option value="">Select district...</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
                  <option key={d} value={d}>
                    District {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group full-width">
            <label>Project Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Project Type</label>
              <select
                value={formData.project_type}
                onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
              >
                <option value="HIGHWAY">Highway</option>
                <option value="BRIDGE">Bridge</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="UTILITY">Utility</option>
                <option value="COMMERCIAL">Commercial</option>
                <option value="RESIDENTIAL">Residential</option>
              </select>
            </div>
            <div className="form-group">
              <label>Contract Type</label>
              <select
                value={formData.contract_type}
                onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
              >
                <option value="UNIT_PRICE">Unit Price</option>
                <option value="LUMP_SUM">Lump Sum</option>
                <option value="COST_PLUS">Cost Plus</option>
                <option value="TIME_MATERIALS">Time & Materials</option>
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Contract Value ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.original_contract_value}
                onChange={(e) =>
                  setFormData({ ...formData, original_contract_value: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>Working Days</label>
              <input
                type="number"
                value={formData.original_working_days}
                onChange={(e) =>
                  setFormData({ ...formData, original_working_days: e.target.value })
                }
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Notice to Proceed</label>
              <input
                type="date"
                value={formData.notice_to_proceed_date}
                onChange={(e) =>
                  setFormData({ ...formData, notice_to_proceed_date: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>Completion Date</label>
              <input
                type="date"
                value={formData.original_completion_date}
                onChange={(e) =>
                  setFormData({ ...formData, original_completion_date: e.target.value })
                }
              />
            </div>
          </div>

          <div className="form-divider" />

          <div className="form-checkboxes">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.is_federal_aid}
                onChange={(e) => setFormData({ ...formData, is_federal_aid: e.target.checked })}
              />
              <span>Federal Aid Project</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.davis_bacon_required}
                onChange={(e) =>
                  setFormData({ ...formData, davis_bacon_required: e.target.checked })
                }
              />
              <span>Davis-Bacon Required</span>
            </label>
          </div>

          {formData.is_federal_aid && (
            <div className="form-group">
              <label>DBE Goal (%)</label>
              <input
                type="number"
                step="0.1"
                value={formData.dbe_goal_percentage}
                onChange={(e) => setFormData({ ...formData, dbe_goal_percentage: e.target.value })}
                className="small-input"
              />
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectDetailModal({
  project,
  onClose,
  onUpdate: _onUpdate,
}: {
  project: Project;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const workingDaysPercent = project.current_working_days
    ? Math.round(((project.working_days_used || 0) / project.current_working_days) * 100)
    : 0;

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <div>
            <span className="modal-project-number">{project.project_number}</span>
            <h2>{project.name}</h2>
          </div>
          <button onClick={onClose} className="modal-close">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="detail-grid">
          <div className="detail-card">
            <span className="detail-label">Status</span>
            <span className="detail-value">{project.status?.replace(/_/g, ' ')}</span>
          </div>
          <div className="detail-card">
            <span className="detail-label">Contract Value</span>
            <span className="detail-value">
              ${project.current_contract_value?.toLocaleString()}
            </span>
          </div>
          <div className="detail-card">
            <span className="detail-label">Completion Date</span>
            <span className="detail-value">{project.current_completion_date || '-'}</span>
          </div>
          <div className="detail-card">
            <span className="detail-label">Working Days</span>
            <div className="working-days-detail">
              <span className="detail-value">
                {project.working_days_used || 0} / {project.current_working_days || '-'}
              </span>
              <div className="mini-progress">
                <div
                  className={`mini-progress-fill ${workingDaysPercent > 90 ? 'critical' : workingDaysPercent > 75 ? 'warning' : ''
                    }`}
                  style={{ width: `${Math.min(workingDaysPercent, 100)}%` }}
                />
              </div>
            </div>
          </div>
          <div className="detail-card">
            <span className="detail-label">Progress</span>
            <span className="detail-value">{project.percent_complete || 0}%</span>
          </div>
          <div className="detail-card">
            <span className="detail-label">WVDOH District</span>
            <span className="detail-value">
              {project.wvdoh_district ? `District ${project.wvdoh_district}` : '-'}
            </span>
          </div>
        </div>

        <div className="detail-tags">
          {project.is_federal_aid && (
            <span className="detail-tag blue">Federal Aid</span>
          )}
          {project.davis_bacon_required && (
            <span className="detail-tag purple">Davis-Bacon Required</span>
          )}
          {project.dbe_goal_percentage > 0 && (
            <span className="detail-tag green">DBE Goal: {project.dbe_goal_percentage}%</span>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
          <button className="btn-primary">View Details</button>
        </div>
      </div>
    </div>
  );
}

export default ProjectDashboard;
