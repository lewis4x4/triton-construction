import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  User,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Plus,
  ChevronRight,
  ChevronLeft,
  Shield,
  Clock,
  Upload,
  Download,
  Eye,
  Award,
  Calendar,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  HardHat,
  Wrench,
  Settings,
  Bell,
  Edit,
  Printer,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  FileText,
  Star,
  Activity,
  Target,
  Building,
  Truck,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './EnhancedCrewRoster.css';

// ============================================================================
// INTERFACES
// ============================================================================

interface CrewKPI {
  label: string;
  value: string | number;
  change?: number;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  subtitle?: string;
  color: string;
  trend?: 'up' | 'down' | 'flat';
}

interface CrewMember {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  tradeClassification: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR' | 'SEASONAL';
  status: 'active' | 'on_leave' | 'terminated' | 'suspended';
  hireDate: string;
  yearsOfService: number;
  hourlyRate?: number;
  currentProject?: string;
  currentProjectId?: string;
  supervisor?: string;
  department: string;
  union?: string;
  unionLocal?: string;
  skills: string[];
  certifications: Certification[];
  complianceScore: number;
  hoursThisWeek: number;
  hoursThisMonth: number;
  overtimeHours: number;
  safetyIncidents: number;
  lastActivityDate: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

interface Certification {
  id: string;
  name: string;
  type: string;
  issueDate: string;
  expiryDate: string;
  status: 'valid' | 'expiring' | 'expired';
  verified: boolean;
  documentUrl?: string;
}

interface TradeBreakdown {
  trade: string;
  count: number;
  percentage: number;
  color: string;
}

interface ProjectAssignment {
  projectId: string;
  projectName: string;
  crewCount: number;
  superintendent: string;
}

interface SkillMatrix {
  skill: string;
  level1: number;
  level2: number;
  level3: number;
  expert: number;
  total: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EnhancedCrewRoster() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'roster' | 'certifications' | 'skills' | 'projects'>('overview');
  const [kpis, setKpis] = useState<CrewKPI[]>([]);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [tradeBreakdown, setTradeBreakdown] = useState<TradeBreakdown[]>([]);
  const [projectAssignments, setProjectAssignments] = useState<ProjectAssignment[]>([]);
  const [skillMatrix, setSkillMatrix] = useState<SkillMatrix[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tradeFilter, setTradeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<CrewMember | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  useEffect(() => {
    loadCrewData();
  }, []);

  const loadCrewData = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('crew_members')
        .select('*')
        .eq('status', 'active')
        .order('last_name');

      if (error) throw error;

      if (data && data.length > 0) {
        processRealData(data);
      } else {
        loadDemoData();
      }
    } catch (error) {
      console.error('Error loading crew data:', error);
      loadDemoData();
    } finally {
      setLoading(false);
    }
  };

  const processRealData = (_data: any[]) => {
    loadDemoData();
  };

  const loadDemoData = () => {
    // KPIs
    setKpis([
      {
        label: 'Total Crew',
        value: 248,
        change: 12,
        changeType: 'positive',
        icon: <Users size={24} />,
        trend: 'up',
        subtitle: '235 active, 13 on leave',
        color: '#3b82f6',
      },
      {
        label: 'Certification Rate',
        value: '96.4%',
        change: 2.1,
        changeType: 'positive',
        icon: <Award size={24} />,
        trend: 'up',
        subtitle: 'All required certs current',
        color: '#10b981',
      },
      {
        label: 'Expiring Soon',
        value: 18,
        change: -5,
        changeType: 'positive',
        icon: <Clock size={24} />,
        trend: 'down',
        subtitle: 'Within 30 days',
        color: '#f59e0b',
      },
      {
        label: 'Avg Hours/Week',
        value: '42.3',
        changeType: 'neutral',
        icon: <Activity size={24} />,
        subtitle: 'This pay period',
        color: '#8b5cf6',
      },
      {
        label: 'Safety Score',
        value: '98.2%',
        change: 0.8,
        changeType: 'positive',
        icon: <Shield size={24} />,
        trend: 'up',
        subtitle: '2 incidents YTD',
        color: '#10b981',
      },
      {
        label: 'Open Positions',
        value: 8,
        changeType: 'neutral',
        icon: <Briefcase size={24} />,
        subtitle: 'Actively hiring',
        color: '#06b6d4',
      },
    ]);

    // Crew Members
    const trades = ['Laborer', 'Operator', 'Carpenter', 'Ironworker', 'Electrician', 'Pipefitter', 'Concrete Finisher', 'Surveyor'];
    const projects = ['Corridor H Section 12', 'I-64 Bridge Rehabilitation', 'Route 50 Widening', 'Municipal Water Plant'];
    const members: CrewMember[] = [];

    const sampleNames = [
      { first: 'James', last: 'Wilson' },
      { first: 'Robert', last: 'Martinez' },
      { first: 'Michael', last: 'Johnson' },
      { first: 'David', last: 'Thompson' },
      { first: 'William', last: 'Brown' },
      { first: 'Richard', last: 'Davis' },
      { first: 'Joseph', last: 'Garcia' },
      { first: 'Thomas', last: 'Miller' },
      { first: 'Christopher', last: 'Anderson' },
      { first: 'Daniel', last: 'Taylor' },
      { first: 'Matthew', last: 'Moore' },
      { first: 'Anthony', last: 'Jackson' },
      { first: 'Mark', last: 'White' },
      { first: 'Donald', last: 'Harris' },
      { first: 'Steven', last: 'Martin' },
    ];

    sampleNames.forEach((name, i) => {
      const trade = trades[i % trades.length];
      const project = projects[Math.floor(Math.random() * projects.length)];
      const yearsOfService = 1 + Math.floor(Math.random() * 20);
      const complianceScore = 85 + Math.floor(Math.random() * 15);

      const certs: Certification[] = [
        {
          id: `cert-${i}-1`,
          name: 'OSHA 10-Hour',
          type: 'safety',
          issueDate: '2023-01-15',
          expiryDate: '2028-01-15',
          status: 'valid',
          verified: true,
        },
        {
          id: `cert-${i}-2`,
          name: 'First Aid/CPR',
          type: 'safety',
          issueDate: '2024-03-10',
          expiryDate: '2026-03-10',
          status: 'valid',
          verified: true,
        },
      ];

      if (trade === 'Operator') {
        certs.push({
          id: `cert-${i}-3`,
          name: 'CDL Class A',
          type: 'license',
          issueDate: '2022-06-01',
          expiryDate: '2026-06-01',
          status: 'valid',
          verified: true,
        });
      }

      if (Math.random() > 0.7) {
        certs.push({
          id: `cert-${i}-4`,
          name: 'Confined Space Entry',
          type: 'safety',
          issueDate: '2024-06-15',
          expiryDate: '2025-01-15',
          status: 'expiring',
          verified: true,
        });
      }

      members.push({
        id: (i + 1).toString(),
        employeeId: `EMP-${String(1000 + i).padStart(4, '0')}`,
        firstName: name.first,
        lastName: name.last,
        displayName: `${name.first} ${name.last}`,
        email: `${name.first.toLowerCase()}.${name.last.toLowerCase()}@triton.com`,
        phone: `304-555-${String(1000 + i).slice(-4)}`,
        tradeClassification: trade,
        employmentType: Math.random() > 0.1 ? 'FULL_TIME' : 'PART_TIME',
        status: 'active',
        hireDate: `20${String(10 + Math.floor(Math.random() * 14)).padStart(2, '0')}-${String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')}-${String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')}`,
        yearsOfService,
        hourlyRate: 28 + Math.floor(Math.random() * 25),
        currentProject: project,
        currentProjectId: `proj-${Math.floor(Math.random() * 4) + 1}`,
        supervisor: i < 5 ? undefined : sampleNames[Math.floor(i / 5)].last,
        department: trade === 'Operator' ? 'Equipment' : 'Field',
        union: Math.random() > 0.5 ? 'Laborers International' : undefined,
        unionLocal: Math.random() > 0.5 ? 'Local 1353' : undefined,
        skills: ['Reading Blueprints', 'Safety Protocols', trade === 'Operator' ? 'Heavy Equipment' : 'Hand Tools'],
        certifications: certs,
        complianceScore,
        hoursThisWeek: 35 + Math.floor(Math.random() * 15),
        hoursThisMonth: 140 + Math.floor(Math.random() * 40),
        overtimeHours: Math.floor(Math.random() * 15),
        safetyIncidents: Math.random() > 0.9 ? 1 : 0,
        lastActivityDate: '2024-12-08',
        emergencyContact: {
          name: `${['Sarah', 'Mary', 'Jennifer', 'Linda'][Math.floor(Math.random() * 4)]} ${name.last}`,
          phone: `304-555-${String(2000 + i).slice(-4)}`,
          relationship: ['Spouse', 'Parent', 'Sibling'][Math.floor(Math.random() * 3)],
        },
      });
    });

    // Add more crew members
    for (let i = 15; i < 30; i++) {
      const trade = trades[Math.floor(Math.random() * trades.length)];
      members.push({
        id: (i + 1).toString(),
        employeeId: `EMP-${String(1000 + i).padStart(4, '0')}`,
        firstName: `Worker`,
        lastName: `${i + 1}`,
        displayName: `Worker ${i + 1}`,
        email: `worker${i + 1}@triton.com`,
        phone: `304-555-${String(1000 + i).slice(-4)}`,
        tradeClassification: trade,
        employmentType: 'FULL_TIME',
        status: 'active',
        hireDate: '2022-01-15',
        yearsOfService: 2,
        hourlyRate: 30,
        currentProject: projects[Math.floor(Math.random() * projects.length)],
        department: 'Field',
        skills: [],
        certifications: [
          { id: `cert-${i}-1`, name: 'OSHA 10-Hour', type: 'safety', issueDate: '2023-01-15', expiryDate: '2028-01-15', status: 'valid', verified: true },
        ],
        complianceScore: 90 + Math.floor(Math.random() * 10),
        hoursThisWeek: 40 + Math.floor(Math.random() * 10),
        hoursThisMonth: 160,
        overtimeHours: Math.floor(Math.random() * 10),
        safetyIncidents: 0,
        lastActivityDate: '2024-12-08',
      });
    }

    setCrewMembers(members);

    // Trade Breakdown
    const tradeColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
    const tradeCounts: Record<string, number> = {};
    members.forEach(m => {
      tradeCounts[m.tradeClassification] = (tradeCounts[m.tradeClassification] || 0) + 1;
    });

    const breakdown: TradeBreakdown[] = Object.entries(tradeCounts)
      .map(([trade, count], index) => ({
        trade,
        count,
        percentage: (count / members.length) * 100,
        color: tradeColors[index % tradeColors.length],
      }))
      .sort((a, b) => b.count - a.count);

    setTradeBreakdown(breakdown);

    // Project Assignments
    setProjectAssignments([
      { projectId: 'proj-1', projectName: 'Corridor H Section 12', crewCount: 45, superintendent: 'James Wilson' },
      { projectId: 'proj-2', projectName: 'I-64 Bridge Rehabilitation', crewCount: 32, superintendent: 'Robert Martinez' },
      { projectId: 'proj-3', projectName: 'Route 50 Widening', crewCount: 28, superintendent: 'Michael Johnson' },
      { projectId: 'proj-4', projectName: 'Municipal Water Plant', crewCount: 18, superintendent: 'David Thompson' },
    ]);

    // Skill Matrix
    setSkillMatrix([
      { skill: 'Heavy Equipment Operation', level1: 15, level2: 25, level3: 18, expert: 8, total: 66 },
      { skill: 'Concrete Work', level1: 20, level2: 35, level3: 22, expert: 12, total: 89 },
      { skill: 'Structural Steel', level1: 8, level2: 15, level3: 10, expert: 5, total: 38 },
      { skill: 'Safety Leadership', level1: 30, level2: 45, level3: 25, expert: 15, total: 115 },
      { skill: 'Blueprint Reading', level1: 25, level2: 40, level3: 30, expert: 20, total: 115 },
      { skill: 'Welding', level1: 12, level2: 18, level3: 8, expert: 4, total: 42 },
    ]);
  };

  const handleSelectMember = (member: CrewMember) => {
    setSelectedMember(member);
    setShowDetailPanel(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'on_leave': return '#f59e0b';
      case 'terminated': return '#ef4444';
      case 'suspended': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'on_leave': return 'On Leave';
      case 'terminated': return 'Terminated';
      case 'suspended': return 'Suspended';
      default: return status;
    }
  };

  const getCertStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return '#10b981';
      case 'expiring': return '#f59e0b';
      case 'expired': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 95) return '#10b981';
    if (score >= 85) return '#f59e0b';
    return '#ef4444';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Filter crew members
  const filteredMembers = crewMembers.filter(m => {
    const matchesSearch = searchTerm === '' ||
      m.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.tradeClassification.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTrade = tradeFilter === 'all' || m.tradeClassification === tradeFilter;
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;

    return matchesSearch && matchesTrade && matchesStatus;
  });

  // Calculate stats
  const expiringCerts = crewMembers.reduce((count, m) =>
    count + m.certifications.filter(c => c.status === 'expiring').length, 0);
  const uniqueTrades = [...new Set(crewMembers.map(m => m.tradeClassification))];

  if (loading) {
    return (
      <div className="enhanced-crew-page">
        <div className="loading-container">
          <RefreshCw className="spinning" size={48} />
          <p>Loading Crew Roster...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="enhanced-crew-page">
      {/* Header */}
      <header className="page-header">
        <div className="header-left">
          <Link to="/equipment" className="back-link">
            <ChevronLeft size={20} />
            <span>Fleet Management</span>
          </Link>
          <div className="header-title">
            <h1>
              <Users size={32} />
              Crew Roster
            </h1>
            <p>Workforce Management & Certification Tracking</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-icon" title="Notifications">
            <Bell size={20} />
            {expiringCerts > 0 && <span className="notification-badge">{expiringCerts}</span>}
          </button>
          <button className="btn-secondary">
            <Download size={18} />
            Export
          </button>
          <button className="btn-secondary">
            <Printer size={18} />
            Print
          </button>
          <button className="btn-primary">
            <Plus size={18} />
            Add Employee
          </button>
        </div>
      </header>

      {/* KPIs */}
      <section className="kpi-section">
        <div className="kpi-grid">
          {kpis.map((kpi, index) => (
            <div key={index} className="kpi-card" style={{ '--accent-color': kpi.color } as React.CSSProperties}>
              <div className="kpi-icon" style={{ backgroundColor: `${kpi.color}20`, color: kpi.color }}>
                {kpi.icon}
              </div>
              <div className="kpi-content">
                <span className="kpi-value">{kpi.value}</span>
                <span className="kpi-label">{kpi.label}</span>
                {kpi.subtitle && <span className="kpi-subtitle">{kpi.subtitle}</span>}
              </div>
              {kpi.change !== undefined && (
                <div className={`kpi-change ${kpi.changeType}`}>
                  {kpi.trend === 'up' && <ArrowUpRight size={16} />}
                  {kpi.trend === 'down' && <ArrowDownRight size={16} />}
                  <span>{kpi.change > 0 ? '+' : ''}{kpi.change}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Alert Banner */}
      {expiringCerts > 0 && (
        <div className="alert-banner warning">
          <AlertTriangle size={20} />
          <span><strong>{expiringCerts} Certifications</strong> expiring within 30 days - action required</span>
          <button className="btn-link" onClick={() => setActiveTab('certifications')}>View Details</button>
        </div>
      )}

      {/* Tabs */}
      <nav className="tabs-nav">
        <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          <BarChart3 size={18} />
          Overview
        </button>
        <button className={`tab ${activeTab === 'roster' ? 'active' : ''}`} onClick={() => setActiveTab('roster')}>
          <Users size={18} />
          Roster ({crewMembers.length})
        </button>
        <button className={`tab ${activeTab === 'certifications' ? 'active' : ''}`} onClick={() => setActiveTab('certifications')}>
          <Award size={18} />
          Certifications
          {expiringCerts > 0 && <span className="tab-badge">{expiringCerts}</span>}
        </button>
        <button className={`tab ${activeTab === 'skills' ? 'active' : ''}`} onClick={() => setActiveTab('skills')}>
          <GraduationCap size={18} />
          Skills Matrix
        </button>
        <button className={`tab ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>
          <Building size={18} />
          Project Assignments
        </button>
      </nav>

      {/* Main Content */}
      <div className="main-content">
        {activeTab === 'overview' && (
          <div className="overview-grid">
            {/* Workforce by Trade */}
            <section className="card trade-breakdown">
              <div className="card-header">
                <h3><HardHat size={20} /> Workforce by Trade</h3>
              </div>
              <div className="card-content">
                <div className="trade-chart">
                  <svg viewBox="0 0 100 100" className="donut-chart">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="12" />
                    {tradeBreakdown.reduce((acc, trade, i) => {
                      const offset = acc.offset;
                      const dashArray = (trade.percentage / 100) * 251.2;
                      acc.circles.push(
                        <circle
                          key={i}
                          cx="50" cy="50" r="40" fill="none"
                          stroke={trade.color} strokeWidth="12"
                          strokeDasharray={`${dashArray} 251.2`}
                          strokeDashoffset={-offset}
                          transform="rotate(-90 50 50)"
                        />
                      );
                      acc.offset += dashArray;
                      return acc;
                    }, { circles: [] as JSX.Element[], offset: 0 }).circles}
                    <text x="50" y="46" textAnchor="middle" className="donut-value">{crewMembers.length}</text>
                    <text x="50" y="58" textAnchor="middle" className="donut-label">Total</text>
                  </svg>
                </div>
                <div className="trade-legend">
                  {tradeBreakdown.slice(0, 6).map((trade, i) => (
                    <div key={i} className="legend-item">
                      <span className="legend-color" style={{ backgroundColor: trade.color }} />
                      <span className="legend-label">{trade.trade}</span>
                      <span className="legend-value">{trade.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Project Assignments */}
            <section className="card project-assignments">
              <div className="card-header">
                <h3><Building size={20} /> Project Assignments</h3>
                <button className="btn-link" onClick={() => setActiveTab('projects')}>View All</button>
              </div>
              <div className="card-content">
                <div className="project-list">
                  {projectAssignments.map((proj) => (
                    <div key={proj.projectId} className="project-item">
                      <div className="project-info">
                        <span className="project-name">{proj.projectName}</span>
                        <span className="project-super">Supt: {proj.superintendent}</span>
                      </div>
                      <div className="project-crew">
                        <Users size={16} />
                        <span>{proj.crewCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Recent Activity */}
            <section className="card recent-activity">
              <div className="card-header">
                <h3><Activity size={20} /> Certification Status</h3>
              </div>
              <div className="card-content">
                <div className="cert-status-breakdown">
                  <div className="cert-stat valid">
                    <CheckCircle size={20} />
                    <div className="cert-stat-content">
                      <span className="cert-stat-value">
                        {crewMembers.reduce((sum, m) => sum + m.certifications.filter(c => c.status === 'valid').length, 0)}
                      </span>
                      <span className="cert-stat-label">Valid</span>
                    </div>
                  </div>
                  <div className="cert-stat expiring">
                    <Clock size={20} />
                    <div className="cert-stat-content">
                      <span className="cert-stat-value">{expiringCerts}</span>
                      <span className="cert-stat-label">Expiring</span>
                    </div>
                  </div>
                  <div className="cert-stat expired">
                    <XCircle size={20} />
                    <div className="cert-stat-content">
                      <span className="cert-stat-value">
                        {crewMembers.reduce((sum, m) => sum + m.certifications.filter(c => c.status === 'expired').length, 0)}
                      </span>
                      <span className="cert-stat-label">Expired</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Top Performers */}
            <section className="card top-performers">
              <div className="card-header">
                <h3><Star size={20} /> Top Compliance Scores</h3>
              </div>
              <div className="card-content">
                <div className="performer-list">
                  {crewMembers
                    .sort((a, b) => b.complianceScore - a.complianceScore)
                    .slice(0, 5)
                    .map((member, i) => (
                      <div key={member.id} className="performer-item" onClick={() => handleSelectMember(member)}>
                        <span className="performer-rank">#{i + 1}</span>
                        <div className="performer-info">
                          <span className="performer-name">{member.displayName}</span>
                          <span className="performer-trade">{member.tradeClassification}</span>
                        </div>
                        <span className="performer-score" style={{ color: getScoreColor(member.complianceScore) }}>
                          {member.complianceScore}%
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'roster' && (
          <div className="roster-section">
            {/* Filters */}
            <div className="filters-bar">
              <div className="search-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search by name, ID, or trade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <Filter size={16} />
                <select value={tradeFilter} onChange={(e) => setTradeFilter(e.target.value)}>
                  <option value="all">All Trades</option>
                  {uniqueTrades.map(trade => (
                    <option key={trade} value={trade}>{trade}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="on_leave">On Leave</option>
                </select>
              </div>
              <div className="results-count">{filteredMembers.length} employees</div>
            </div>

            {/* Roster Grid */}
            <div className="roster-grid">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className={`member-card ${selectedMember?.id === member.id ? 'selected' : ''}`}
                  onClick={() => handleSelectMember(member)}
                >
                  <div className="member-header">
                    <div className="member-avatar">
                      <User size={24} />
                    </div>
                    <div className="member-identity">
                      <span className="member-name">{member.displayName}</span>
                      <span className="member-id">{member.employeeId}</span>
                    </div>
                    <div
                      className="status-badge"
                      style={{
                        backgroundColor: `${getStatusColor(member.status)}20`,
                        color: getStatusColor(member.status)
                      }}
                    >
                      {getStatusLabel(member.status)}
                    </div>
                  </div>

                  <div className="member-trade">
                    <HardHat size={16} />
                    <span>{member.tradeClassification}</span>
                    {member.union && <span className="union-badge">Union</span>}
                  </div>

                  <div className="member-project">
                    <Building size={14} />
                    <span>{member.currentProject || 'Unassigned'}</span>
                  </div>

                  <div className="member-stats">
                    <div className="stat">
                      <span className="stat-value">{member.hoursThisWeek}h</span>
                      <span className="stat-label">This Week</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{member.yearsOfService}y</span>
                      <span className="stat-label">Tenure</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value" style={{ color: getScoreColor(member.complianceScore) }}>
                        {member.complianceScore}%
                      </span>
                      <span className="stat-label">Score</span>
                    </div>
                  </div>

                  <div className="member-certs">
                    {member.certifications.slice(0, 3).map((cert) => (
                      <span
                        key={cert.id}
                        className="cert-tag"
                        style={{
                          backgroundColor: `${getCertStatusColor(cert.status)}20`,
                          color: getCertStatusColor(cert.status)
                        }}
                      >
                        {cert.status === 'valid' && <CheckCircle size={10} />}
                        {cert.status === 'expiring' && <Clock size={10} />}
                        {cert.status === 'expired' && <XCircle size={10} />}
                        {cert.name}
                      </span>
                    ))}
                  </div>

                  <div className="member-footer">
                    <ChevronRight size={18} className="chevron" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'certifications' && (
          <div className="certifications-section">
            <div className="cert-summary-cards">
              <div className="cert-summary-card valid">
                <CheckCircle size={24} />
                <div>
                  <span className="cert-summary-value">
                    {crewMembers.reduce((sum, m) => sum + m.certifications.filter(c => c.status === 'valid').length, 0)}
                  </span>
                  <span className="cert-summary-label">Valid Certifications</span>
                </div>
              </div>
              <div className="cert-summary-card expiring">
                <Clock size={24} />
                <div>
                  <span className="cert-summary-value">{expiringCerts}</span>
                  <span className="cert-summary-label">Expiring (30 days)</span>
                </div>
              </div>
              <div className="cert-summary-card expired">
                <XCircle size={24} />
                <div>
                  <span className="cert-summary-value">
                    {crewMembers.reduce((sum, m) => sum + m.certifications.filter(c => c.status === 'expired').length, 0)}
                  </span>
                  <span className="cert-summary-label">Expired</span>
                </div>
              </div>
            </div>

            <div className="cert-table">
              <div className="table-header">
                <span>Employee</span>
                <span>Certification</span>
                <span>Type</span>
                <span>Issue Date</span>
                <span>Expiry Date</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {crewMembers.flatMap(m =>
                m.certifications.map(c => ({ ...c, member: m }))
              )
                .sort((a, b) => {
                  if (a.status === 'expired' && b.status !== 'expired') return -1;
                  if (a.status === 'expiring' && b.status === 'valid') return -1;
                  return 0;
                })
                .slice(0, 20)
                .map((cert) => (
                  <div key={`${cert.member.id}-${cert.id}`} className={`table-row ${cert.status}`}>
                    <span className="employee-col">
                      <User size={16} />
                      {cert.member.displayName}
                    </span>
                    <span className="cert-name">{cert.name}</span>
                    <span className="cert-type">{cert.type}</span>
                    <span>{formatDate(cert.issueDate)}</span>
                    <span>{formatDate(cert.expiryDate)}</span>
                    <span>
                      <span
                        className="status-pill"
                        style={{
                          backgroundColor: `${getCertStatusColor(cert.status)}20`,
                          color: getCertStatusColor(cert.status)
                        }}
                      >
                        {cert.status === 'valid' && <CheckCircle size={12} />}
                        {cert.status === 'expiring' && <Clock size={12} />}
                        {cert.status === 'expired' && <XCircle size={12} />}
                        {cert.status.charAt(0).toUpperCase() + cert.status.slice(1)}
                      </span>
                    </span>
                    <span className="actions-col">
                      <button className="btn-icon-sm" title="View"><Eye size={14} /></button>
                      <button className="btn-icon-sm" title="Upload"><Upload size={14} /></button>
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="skills-section">
            <div className="skills-header">
              <h3>Workforce Skills Matrix</h3>
              <p>Employee proficiency levels across key competencies</p>
            </div>

            <div className="skills-matrix">
              <div className="matrix-header">
                <span>Skill</span>
                <span>Level 1</span>
                <span>Level 2</span>
                <span>Level 3</span>
                <span>Expert</span>
                <span>Total</span>
              </div>
              {skillMatrix.map((skill, i) => (
                <div key={i} className="matrix-row">
                  <span className="skill-name">{skill.skill}</span>
                  <span className="level level-1">{skill.level1}</span>
                  <span className="level level-2">{skill.level2}</span>
                  <span className="level level-3">{skill.level3}</span>
                  <span className="level level-expert">{skill.expert}</span>
                  <span className="level-total">{skill.total}</span>
                </div>
              ))}
            </div>

            <div className="skills-legend">
              <span className="legend-item"><span className="dot level-1" /> Level 1 - Basic</span>
              <span className="legend-item"><span className="dot level-2" /> Level 2 - Intermediate</span>
              <span className="legend-item"><span className="dot level-3" /> Level 3 - Advanced</span>
              <span className="legend-item"><span className="dot level-expert" /> Expert</span>
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="projects-section">
            <div className="projects-grid">
              {projectAssignments.map((proj) => (
                <div key={proj.projectId} className="project-card">
                  <div className="project-card-header">
                    <Building size={24} />
                    <div>
                      <h3>{proj.projectName}</h3>
                      <span>Superintendent: {proj.superintendent}</span>
                    </div>
                  </div>
                  <div className="project-card-stats">
                    <div className="stat-block">
                      <Users size={20} />
                      <span className="stat-number">{proj.crewCount}</span>
                      <span className="stat-label">Crew Members</span>
                    </div>
                  </div>
                  <div className="project-card-trades">
                    <h4>Trade Breakdown</h4>
                    <div className="mini-trade-list">
                      {tradeBreakdown.slice(0, 4).map((trade, i) => (
                        <div key={i} className="mini-trade-item">
                          <span className="trade-name">{trade.trade}</span>
                          <span className="trade-count">{Math.floor(proj.crewCount * (trade.percentage / 100))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button className="btn-secondary full-width">
                    <Eye size={16} /> View Crew List
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {showDetailPanel && selectedMember && (
        <div className="detail-panel-overlay" onClick={() => setShowDetailPanel(false)}>
          <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
            <div className="panel-header">
              <div className="panel-title">
                <div className="member-avatar large">
                  <User size={32} />
                </div>
                <div>
                  <h2>{selectedMember.displayName}</h2>
                  <span className="panel-subtitle">{selectedMember.employeeId} • {selectedMember.tradeClassification}</span>
                </div>
              </div>
              <button className="close-btn" onClick={() => setShowDetailPanel(false)}>×</button>
            </div>

            <div className="panel-status-bar">
              <div
                className="status-indicator"
                style={{ backgroundColor: getStatusColor(selectedMember.status) }}
              >
                {getStatusLabel(selectedMember.status)}
              </div>
              <div className="compliance-score-large">
                <span className="score-label">Compliance</span>
                <span className="score-number" style={{ color: getScoreColor(selectedMember.complianceScore) }}>
                  {selectedMember.complianceScore}%
                </span>
              </div>
            </div>

            <div className="panel-content">
              <div className="panel-section">
                <h3>Contact Information</h3>
                <div className="contact-info">
                  {selectedMember.email && (
                    <div className="contact-item">
                      <Mail size={16} />
                      <span>{selectedMember.email}</span>
                    </div>
                  )}
                  {selectedMember.phone && (
                    <div className="contact-item">
                      <Phone size={16} />
                      <span>{selectedMember.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="panel-section">
                <h3>Employment Details</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Hire Date</span>
                    <span className="info-value">{formatDate(selectedMember.hireDate)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Years of Service</span>
                    <span className="info-value">{selectedMember.yearsOfService} years</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Employment Type</span>
                    <span className="info-value">{selectedMember.employmentType.replace('_', ' ')}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Department</span>
                    <span className="info-value">{selectedMember.department}</span>
                  </div>
                  {selectedMember.union && (
                    <div className="info-item full">
                      <span className="info-label">Union</span>
                      <span className="info-value">{selectedMember.union} - {selectedMember.unionLocal}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="panel-section">
                <h3>Current Assignment</h3>
                <div className="assignment-card">
                  <Building size={20} />
                  <div>
                    <span className="assignment-project">{selectedMember.currentProject || 'Unassigned'}</span>
                    {selectedMember.supervisor && (
                      <span className="assignment-super">Supervisor: {selectedMember.supervisor}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="panel-section">
                <h3>Hours Summary</h3>
                <div className="hours-grid">
                  <div className="hours-item">
                    <span className="hours-value">{selectedMember.hoursThisWeek}</span>
                    <span className="hours-label">This Week</span>
                  </div>
                  <div className="hours-item">
                    <span className="hours-value">{selectedMember.hoursThisMonth}</span>
                    <span className="hours-label">This Month</span>
                  </div>
                  <div className="hours-item overtime">
                    <span className="hours-value">{selectedMember.overtimeHours}</span>
                    <span className="hours-label">OT Hours</span>
                  </div>
                </div>
              </div>

              <div className="panel-section">
                <h3>Certifications ({selectedMember.certifications.length})</h3>
                <div className="cert-list">
                  {selectedMember.certifications.map((cert) => (
                    <div key={cert.id} className={`cert-item ${cert.status}`}>
                      <div className="cert-item-icon" style={{ color: getCertStatusColor(cert.status) }}>
                        {cert.status === 'valid' && <CheckCircle size={16} />}
                        {cert.status === 'expiring' && <Clock size={16} />}
                        {cert.status === 'expired' && <XCircle size={16} />}
                      </div>
                      <div className="cert-item-info">
                        <span className="cert-item-name">{cert.name}</span>
                        <span className="cert-item-expiry">Expires: {formatDate(cert.expiryDate)}</span>
                      </div>
                      {cert.verified && (
                        <span className="verified-badge">
                          <CheckCircle size={12} /> Verified
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedMember.emergencyContact && (
                <div className="panel-section">
                  <h3>Emergency Contact</h3>
                  <div className="emergency-contact">
                    <span className="contact-name">{selectedMember.emergencyContact.name}</span>
                    <span className="contact-relationship">{selectedMember.emergencyContact.relationship}</span>
                    <span className="contact-phone">{selectedMember.emergencyContact.phone}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="panel-footer">
              <button className="btn-secondary">
                <FileText size={16} /> View History
              </button>
              <button className="btn-secondary">
                <Download size={16} /> Export
              </button>
              <button className="btn-primary">
                <Edit size={16} /> Edit Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EnhancedCrewRoster;
