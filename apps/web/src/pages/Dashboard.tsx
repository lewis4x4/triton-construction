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

export function Dashboard() {
  const { profile } = useAuth();

  const stats = [
    {
      label: 'Active Projects',
      value: '0',
      icon: <FolderKanban size={20} strokeWidth={1.5} />,
      change: null,
      color: 'blue',
    },
    {
      label: 'Daily Reports',
      value: '0',
      icon: <ClipboardList size={20} strokeWidth={1.5} />,
      change: 'This week',
      color: 'green',
    },
    {
      label: 'Hours Logged',
      value: '0',
      icon: <Clock size={20} strokeWidth={1.5} />,
      change: 'This week',
      color: 'purple',
    },
    {
      label: 'Pending Approvals',
      value: '0',
      icon: <AlertCircle size={20} strokeWidth={1.5} />,
      change: 'Needs attention',
      color: 'yellow',
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
          <div key={stat.label} className={`stat-card stat-${stat.color}`}>
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-content">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
              {stat.change && <span className="stat-change">{stat.change}</span>}
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

      <style>{`
        .dashboard-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-4);
          margin-bottom: var(--space-6);
        }

        @media (max-width: 1200px) {
          .dashboard-stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .dashboard-stats {
            grid-template-columns: 1fr;
          }
        }

        .stat-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: var(--space-5);
          display: flex;
          align-items: flex-start;
          gap: var(--space-4);
          transition: all var(--duration-normal) var(--ease-out);
        }

        .stat-card:hover {
          border-color: var(--border-default);
        }

        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .stat-blue .stat-icon {
          background: var(--accent-subtle);
          color: var(--accent-primary);
        }

        .stat-green .stat-icon {
          background: var(--success-subtle);
          color: var(--success-text);
        }

        .stat-purple .stat-icon {
          background: rgba(139, 92, 246, 0.1);
          color: #a78bfa;
        }

        .stat-yellow .stat-icon {
          background: var(--warning-subtle);
          color: var(--warning-text);
        }

        .stat-content {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1;
        }

        .stat-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-top: var(--space-1);
        }

        .stat-change {
          font-size: 0.75rem;
          color: var(--text-tertiary);
          margin-top: var(--space-1);
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-5);
        }

        @media (max-width: 900px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }

        .dashboard-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .dashboard-card.span-2 {
          grid-column: span 2;
        }

        @media (max-width: 900px) {
          .dashboard-card.span-2 {
            grid-column: span 1;
          }
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-4) var(--space-5);
          border-bottom: 1px solid var(--border-subtle);
        }

        .card-header h3 {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .card-badge {
          font-size: 0.75rem;
          padding: var(--space-1) var(--space-2);
          background: var(--bg-tertiary);
          border-radius: var(--radius-full);
          color: var(--text-secondary);
        }

        .card-link {
          font-size: 0.8125rem;
          color: var(--accent-primary);
          font-weight: 500;
        }

        .card-link:hover {
          color: var(--accent-hover);
        }

        .quick-actions {
          padding: var(--space-2);
        }

        .quick-action-btn {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3) var(--space-4);
          color: var(--text-secondary);
          text-decoration: none;
          border-radius: var(--radius-md);
          transition: all var(--duration-fast);
        }

        .quick-action-btn:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .quick-action-btn span {
          flex: 1;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .quick-action-btn .arrow {
          opacity: 0;
          transform: translateX(-4px);
          transition: all var(--duration-fast);
          color: var(--text-tertiary);
        }

        .quick-action-btn:hover .arrow {
          opacity: 1;
          transform: translateX(0);
        }

        .checklist {
          padding: var(--space-2);
        }

        .checklist-item {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3) var(--space-4);
          color: var(--text-secondary);
          text-decoration: none;
          border-radius: var(--radius-md);
          transition: all var(--duration-fast);
        }

        .checklist-item:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .check-icon {
          width: 24px;
          height: 24px;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          flex-shrink: 0;
        }

        .check-icon.done {
          background: var(--success-subtle);
          border-color: var(--success);
          color: var(--success-text);
        }

        .check-number {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-tertiary);
        }

        .check-label {
          flex: 1;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .checklist-item .arrow {
          opacity: 0;
          transform: translateX(-4px);
          transition: all var(--duration-fast);
          color: var(--text-tertiary);
        }

        .checklist-item:hover .arrow {
          opacity: 1;
          transform: translateX(0);
        }

        .empty-state-inline {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-10);
          text-align: center;
        }

        .empty-state-inline .empty-icon {
          color: var(--text-muted);
          margin-bottom: var(--space-3);
        }

        .empty-state-inline p {
          color: var(--text-secondary);
          font-size: 0.9375rem;
          margin: 0;
        }

        .empty-state-inline .empty-hint {
          color: var(--text-tertiary);
          font-size: 0.8125rem;
          margin-top: var(--space-1);
        }
      `}</style>
    </>
  );
}
