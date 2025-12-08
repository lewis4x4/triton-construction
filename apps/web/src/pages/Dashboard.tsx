import { useAuth } from '../hooks/useAuth';
import {
  FolderKanban,
  ClipboardList,
  Clock,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import './Dashboard.css';

export function Dashboard() {
  const { profile } = useAuth();

  const stats = [
    {
      label: 'Active Projects',
      value: '3',
      icon: <FolderKanban size={24} strokeWidth={1.5} />,
      trend: '+1 this month',
      trendDirection: 'up',
      isPrimary: true,
    },
    {
      label: 'Daily Reports',
      value: '12',
      icon: <ClipboardList size={20} strokeWidth={1.5} />,
      trend: '8% vs last week',
      trendDirection: 'up',
    },
    {
      label: 'Hours Logged',
      value: '847',
      icon: <Clock size={20} strokeWidth={1.5} />,
      trend: '12% vs last week',
      trendDirection: 'up',
    },
    {
      label: 'Pending Approvals',
      value: '5',
      icon: <AlertCircle size={20} strokeWidth={1.5} />,
      trend: 'Needs attention',
      trendDirection: 'warning',
    },
  ];

  const quickActions = [
    { label: 'Create Bid Package', path: '/bids/create', icon: <FolderKanban size={18} /> },
    { label: 'View Specifications', path: '/specs', icon: <ClipboardList size={18} /> },
    { label: 'Time Entry', path: '/time', icon: <Clock size={18} /> },
  ];

  const nextSteps = [
    { label: 'Complete organization setup', path: '/settings', done: false },
    { label: 'Create your first project', path: '/projects', done: false },
    { label: 'Add crew members', path: '/crew', done: false },
    { label: 'Submit your first daily report', path: '/reports', done: false },
  ];

  return (
    <>
      <div className="page-header">
        <div className="page-header-content">
          <h1>
            {profile?.first_name ? `Welcome back, ${profile.first_name}` : 'Dashboard'}
          </h1>
          <p>Here's an overview of your construction operations</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="dashboard-stats">
        {stats.map((stat) => (
          <div key={stat.label} className={`stat-card ${stat.isPrimary ? 'stat-card-primary' : ''}`}>
            {stat.isPrimary && <div className="stat-accent-bar" />}
            <div className="stat-header">
              <div className={`stat-icon ${stat.isPrimary ? 'stat-icon-primary' : ''}`}>
                {stat.icon}
              </div>
              {stat.trendDirection === 'up' && (
                <span className="stat-trend stat-trend-up">
                  <TrendingUp size={14} />
                  {stat.trend}
                </span>
              )}
              {stat.trendDirection === 'warning' && (
                <span className="stat-trend stat-trend-warning">
                  {stat.trend}
                </span>
              )}
            </div>
            <div className="stat-content">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Quick Actions */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Quick Actions</h3>
          </div>
          <div className="quick-actions">
            {quickActions.map((action) => (
              <Link key={action.path} to={action.path} className="quick-action-btn">
                {action.icon}
                <span>{action.label}</span>
                <ArrowRight size={16} className="arrow" />
              </Link>
            ))}
          </div>
        </div>

        {/* Getting Started */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Getting Started</h3>
            <span className="card-badge">0/4 Complete</span>
          </div>
          <div className="checklist">
            {nextSteps.map((step, index) => (
              <Link key={index} to={step.path} className="checklist-item">
                <span className={`check-icon ${step.done ? 'done' : ''}`}>
                  {step.done ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    <span className="check-number">{index + 1}</span>
                  )}
                </span>
                <span className="check-label">{step.label}</span>
                <ArrowRight size={16} className="arrow" />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity Placeholder */}
        <div className="dashboard-card span-2">
          <div className="card-header">
            <h3>Recent Activity</h3>
            <Link to="/reports" className="card-link">View all</Link>
          </div>
          <div className="empty-state-inline">
            <TrendingUp size={32} className="empty-icon" />
            <p>No recent activity yet</p>
            <span className="empty-hint">Your recent reports and actions will appear here</span>
          </div>
        </div>
      </div>

    </>
  );
}
