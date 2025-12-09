import { useAuth } from '../hooks/useAuth';
import {
  FolderKanban,
  ClipboardList,
  Clock,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Mic,
  Truck,
  Ticket,
  Users,
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

  /* Expanded Quick Actions List with Corrected Routes */
  const quickActions = [
    { label: 'Create Bid Package', path: '/bids/create', icon: <FolderKanban size={18} /> },
    { label: 'View Specifications', path: '/specs', icon: <ClipboardList size={18} /> },
    { label: 'Time Entry', path: '/time-tracking/entry', icon: <Clock size={18} /> },
    { label: 'Voice Daily Report', path: '/daily-reports/voice', icon: <Mic size={18} /> },
    { label: 'Report Incident', path: '/workforce/incident-report', icon: <AlertCircle size={18} /> },
    { label: 'Vehicle Inspection', path: '/equipment/inspections', icon: <Truck size={18} /> },
    { label: 'Log Material Ticket', path: '/workforce/material-tickets', icon: <Ticket size={18} /> },
    { label: 'Crew Builder', path: '/workforce/crew-builder', icon: <Users size={18} /> },
  ];

  /* Removed nextSteps array as Getting Started is moved */

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
        {/* Quick Actions - Now spanning 2 columns */}
        <div className="dashboard-card span-2">
          <div className="card-header">
            <h3>Quick Actions</h3>
          </div>
          <div className="quick-actions grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link key={action.path} to={action.path} className="quick-action-btn">
                {action.icon}
                <span>{action.label}</span>
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
