import { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  FolderKanban,
  ClipboardList,
  Clock,
  Users,
  Settings,
  Shield,
  LogOut,
  MapPin,
  DollarSign,
  Bell,
  Map,
  BarChart3,
  HardHat,
  CheckSquare,
  GraduationCap,
  Building2,
  FileStack,
  FilePlus2,
  MessageSquareMore,
  Sparkles,
  TrendingUp,
  Fuel,
  Wrench,
  UserCheck,
  Car,
  Receipt,
  Package,
  AlertTriangle,
  FileBarChart,
  Gauge,
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} strokeWidth={1.5} /> },
      { path: '/executive', label: 'Executive View', icon: <BarChart3 size={20} strokeWidth={1.5} /> },
      { path: '/ai', label: 'AI Assistant', icon: <Sparkles size={20} strokeWidth={1.5} /> },
    ],
  },
  {
    label: 'Bidding',
    items: [
      { path: '/bids', label: 'Bid Packages', icon: <FileText size={20} strokeWidth={1.5} /> },
      { path: '/specs', label: 'Specifications', icon: <BookOpen size={20} strokeWidth={1.5} /> },
    ],
  },
  {
    label: 'Field Operations',
    items: [
      { path: '/projects', label: 'Projects', icon: <FolderKanban size={20} strokeWidth={1.5} /> },
      { path: '/locate-tickets', label: 'Locate Tickets', icon: <MapPin size={20} strokeWidth={1.5} /> },
      { path: '/daily-reports/voice', label: 'Daily Reports', icon: <ClipboardList size={20} strokeWidth={1.5} /> },
      { path: '/self-perform', label: 'Self-Perform', icon: <Wrench size={20} strokeWidth={1.5} /> },
    ],
  },
  {
    label: 'Safety & Quality',
    items: [
      { path: '/safety', label: 'Safety Dashboard', icon: <AlertTriangle size={20} strokeWidth={1.5} /> },
      { path: '/workforce', label: 'Workforce Compliance', icon: <HardHat size={20} strokeWidth={1.5} /> },
      { path: '/quality-control', label: 'Quality Control', icon: <CheckSquare size={20} strokeWidth={1.5} /> },
      { path: '/training', label: 'Training', icon: <GraduationCap size={20} strokeWidth={1.5} /> },
    ],
  },
  {
    label: 'Fleet Management',
    items: [
      { path: '/equipment', label: 'Fleet Analytics', icon: <Gauge size={20} strokeWidth={1.5} /> },
      { path: '/equipment/vehicles', label: 'Vehicle Details', icon: <Car size={20} strokeWidth={1.5} /> },
      { path: '/equipment/maintenance', label: 'Maintenance', icon: <Wrench size={20} strokeWidth={1.5} /> },
      { path: '/equipment/fuel', label: 'Fuel Management', icon: <Fuel size={20} strokeWidth={1.5} /> },
      { path: '/equipment/inspections', label: 'Inspections', icon: <ClipboardList size={20} strokeWidth={1.5} /> },
      { path: '/equipment/reports', label: 'Fleet Reports', icon: <FileBarChart size={20} strokeWidth={1.5} /> },
      { path: '/equipment/dqf', label: 'Driver Files (DQF)', icon: <UserCheck size={20} strokeWidth={1.5} /> },
      { path: '/equipment/ifta', label: 'IFTA Reports', icon: <Receipt size={20} strokeWidth={1.5} /> },
    ],
  },
  {
    label: 'Resources',
    items: [
      { path: '/equipment/crew', label: 'Crew Roster', icon: <Users size={20} strokeWidth={1.5} /> },
      { path: '/materials', label: 'Materials', icon: <Package size={20} strokeWidth={1.5} /> },
      { path: '/subcontractors', label: 'Subcontractors', icon: <Building2 size={20} strokeWidth={1.5} /> },
    ],
  },
  {
    label: 'Documents',
    items: [
      { path: '/documents', label: 'Document Center', icon: <FileStack size={20} strokeWidth={1.5} /> },
      { path: '/change-orders', label: 'Change Orders', icon: <FilePlus2 size={20} strokeWidth={1.5} /> },
      { path: '/rfis', label: 'RFIs', icon: <MessageSquareMore size={20} strokeWidth={1.5} /> },
    ],
  },
  {
    label: 'Financial',
    items: [
      { path: '/pay-estimates', label: 'Pay Estimates', icon: <DollarSign size={20} strokeWidth={1.5} /> },
      { path: '/workforce', label: 'Time & Payroll', icon: <Clock size={20} strokeWidth={1.5} /> },
    ],
  },
  {
    label: 'Platform',
    items: [
      { path: '/alerts', label: 'Alerts', icon: <Bell size={20} strokeWidth={1.5} /> },
      { path: '/geofences', label: 'Geofences', icon: <Map size={20} strokeWidth={1.5} /> },
      { path: '/analytics', label: 'Analytics', icon: <TrendingUp size={20} strokeWidth={1.5} /> },
    ],
  },
  {
    label: 'Admin',
    items: [
      { path: '/admin', label: 'Admin Center', icon: <Shield size={20} strokeWidth={1.5} /> },
      { path: '/settings', label: 'Settings', icon: <Settings size={20} strokeWidth={1.5} /> },
    ],
  },
];

export function Layout({ children }: LayoutProps) {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const getUserInitials = () => {
    if (profile?.first_name) {
      return `${profile.first_name.charAt(0)}${profile.last_name?.charAt(0) || ''}`;
    }
    return user?.email?.charAt(0).toUpperCase() || '?';
  };

  const getUserDisplayName = () => {
    if (profile?.first_name) {
      return `${profile.first_name} ${profile.last_name || ''}`.trim();
    }
    return user?.email || 'User';
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-logo">T</div>
            <div>
              <h1>Triton</h1>
              <span className="sidebar-subtitle">Construction AI</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navGroups.map((group) => (
            <div key={group.label} className="nav-group">
              <div className="nav-group-label">{group.label}</div>
              {group.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {getUserInitials()}
            </div>
            <div className="user-details">
              <span className="user-name">{getUserDisplayName()}</span>
              <button onClick={signOut} className="sign-out-link">
                Sign Out
              </button>
            </div>
            <button onClick={signOut} className="btn btn-ghost btn-icon" title="Sign Out">
              <LogOut size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
