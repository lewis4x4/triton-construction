import { Link } from 'react-router-dom';
import {
  FileText,
  Shield,
  Users,
  Settings,
  Database,
  Activity,
  BookOpen,
} from 'lucide-react';
import './Admin.css';

interface AdminCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
  disabled?: boolean;
}

const adminCards: AdminCard[] = [
  {
    title: 'Document Management',
    description: 'Upload and manage specification documents, track processing status, and configure document settings.',
    icon: <FileText size={24} />,
    path: '/admin/documents',
  },
  {
    title: 'Role Access Control',
    description: 'Configure which modules are visible to each role. Control dashboard access and permissions.',
    icon: <Shield size={24} />,
    path: '/admin/role-access',
  },
  {
    title: 'User Management',
    description: 'Manage users, assign roles, and configure user permissions across the organization.',
    icon: <Users size={24} />,
    path: '/admin/users',
    badge: 'Coming Soon',
    disabled: true,
  },
  {
    title: 'System Settings',
    description: 'Configure organization settings, integrations, and system-wide preferences.',
    icon: <Settings size={24} />,
    path: '/admin/system',
    badge: 'Coming Soon',
    disabled: true,
  },
  {
    title: 'Database Management',
    description: 'View database statistics, manage migrations, and monitor system health.',
    icon: <Database size={24} />,
    path: '/admin/database',
    badge: 'Coming Soon',
    disabled: true,
  },
  {
    title: 'Audit Logs',
    description: 'View system activity, user actions, and security events across the platform.',
    icon: <Activity size={24} />,
    path: '/admin/audit',
    badge: 'Coming Soon',
    disabled: true,
  },
];

export function AdminDashboard() {
  return (
    <>
      <div className="page-header">
        <div className="page-header-content">
          <h1>Administration</h1>
        </div>
      </div>

      <div className="admin-dashboard">
        <div className="admin-welcome">
          <div className="admin-welcome-icon">
            <BookOpen size={32} />
          </div>
          <div className="admin-welcome-content">
            <h2>Welcome to the Admin Center</h2>
            <p>
              Manage your organization's settings, users, and system configuration from this central hub.
              Only users with administrative privileges can access these features.
            </p>
          </div>
        </div>

        <div className="admin-cards-grid">
          {adminCards.map((card) => (
            <AdminCardComponent key={card.path} card={card} />
          ))}
        </div>
      </div>
    </>
  );
}

function AdminCardComponent({ card }: { card: AdminCard }) {
  const content = (
    <div className={`admin-card ${card.disabled ? 'admin-card-disabled' : ''}`}>
      <div className="admin-card-icon">{card.icon}</div>
      <div className="admin-card-content">
        <h3>
          {card.title}
          {card.badge && <span className="admin-card-badge">{card.badge}</span>}
        </h3>
        <p>{card.description}</p>
      </div>
      <div className="admin-card-arrow">→</div>
    </div>
  );

  if (card.disabled) {
    return content;
  }

  return <Link to={card.path}>{content}</Link>;
}
