import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import {
  FileText,
  Folder,
  FolderOpen,
  Upload,
  Search,
  Filter,
  Download,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Grid,
  List,
  MoreVertical,
  Star,
  Share2,
  Trash2,
  Edit,
  Copy,
  History,
  Tag,
  Brain,
  HardDrive,
  FileImage,
  FileSpreadsheet,
  FileCode,
  File,
  ArrowUpRight,
  RefreshCw,
  Lock,
  X,
  Plus,
  Send
} from 'lucide-react';
import './EnhancedDocumentCenter.css';

interface Document {
  id: string;
  document_number: string;
  title: string;
  document_type: string;
  category: string;
  status: string;
  version: number;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  created_by_name: string;
  folder_id: string | null;
  project_id: string;
  project_name: string;
  tags: string[];
  ai_category: string | null;
  ai_confidence: number | null;
  is_starred: boolean;
  is_locked: boolean;
  locked_by: string | null;
  review_status: string | null;
  reviewer_id: string | null;
  reviewed_at: string | null;
  expiration_date: string | null;
  retention_period: number | null;
  access_count: number;
  last_accessed_at: string | null;
}

interface FolderItem {
  id: string;
  name: string;
  parent_folder_id: string | null;
  path: string;
  document_count: number;
  subfolder_count: number;
  total_size: number;
  created_at: string;
  color: string;
  icon: string;
}

interface Submittal {
  id: string;
  submittal_number: string;
  title: string;
  spec_section: string;
  status: string;
  submitted_date: string;
  required_date: string;
  ball_in_court: string;
  priority: string;
  revision: number;
  days_open: number;
}

interface Transmittal {
  id: string;
  transmittal_number: string;
  subject: string;
  to_company: string;
  to_contact: string;
  sent_date: string;
  document_count: number;
  status: string;
  delivery_method: string;
}

interface ActivityItem {
  id: string;
  action: string;
  document_title: string;
  user_name: string;
  user_avatar: string;
  timestamp: string;
  details: string;
}

interface StorageStats {
  total_storage: number;
  used_storage: number;
  document_count: number;
  folder_count: number;
  by_type: { type: string; count: number; size: number }[];
}

type ViewMode = 'grid' | 'list';
type TabType = 'all' | 'drawings' | 'specifications' | 'submittals' | 'transmittals' | 'contracts' | 'photos' | 'meetings';

export function EnhancedDocumentCenter() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [submittals, setSubmittals] = useState<Submittal[]>([]);
  const [transmittals, setTransmittals] = useState<Transmittal[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [_folderPath, _setFolderPath] = useState<FolderItem[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; project_number: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    dateRange: 'all',
    starred: false
  });

  useEffect(() => {
    loadProjects();
    loadStorageStats();
    loadActivities();
  }, []);

  useEffect(() => {
    loadDocuments();
    loadFolders();
    if (activeTab === 'submittals') {
      loadSubmittals();
    } else if (activeTab === 'transmittals') {
      loadTransmittals();
    }
  }, [selectedProjectId, activeTab, currentFolder, filters, searchQuery]);

  async function loadProjects() {
    const { data } = await (supabase as any)
      .from('projects')
      .select('id, name, project_number')
      .eq('status', 'ACTIVE')
      .order('name');

    if (data && data.length > 0) {
      setProjects(data);
    } else {
      setProjects([
        { id: 'proj-1', name: 'Corridor H Section 12', project_number: '2024-001' },
        { id: 'proj-2', name: 'I-64 Bridge Rehabilitation', project_number: '2024-002' },
        { id: 'proj-3', name: 'Route 9 Widening Phase 2', project_number: '2024-003' }
      ]);
    }
    setLoading(false);
  }

  async function loadStorageStats() {
    // Demo storage stats
    setStorageStats({
      total_storage: 50 * 1024 * 1024 * 1024, // 50 GB
      used_storage: 18.7 * 1024 * 1024 * 1024, // 18.7 GB
      document_count: 12847,
      folder_count: 342,
      by_type: [
        { type: 'Drawings', count: 3421, size: 8.2 * 1024 * 1024 * 1024 },
        { type: 'Photos', count: 5234, size: 5.1 * 1024 * 1024 * 1024 },
        { type: 'Specifications', count: 892, size: 2.3 * 1024 * 1024 * 1024 },
        { type: 'Contracts', count: 156, size: 1.8 * 1024 * 1024 * 1024 },
        { type: 'Other', count: 3144, size: 1.3 * 1024 * 1024 * 1024 }
      ]
    });
  }

  async function loadActivities() {
    setActivities([
      { id: '1', action: 'uploaded', document_title: 'Shop Drawing - Steel Beams Rev B', user_name: 'Mike Johnson', user_avatar: 'MJ', timestamp: '10 minutes ago', details: 'New version uploaded' },
      { id: '2', action: 'approved', document_title: 'Submittal #045 - Concrete Mix Design', user_name: 'Sarah Chen', user_avatar: 'SC', timestamp: '25 minutes ago', details: 'Approved with comments' },
      { id: '3', action: 'commented', document_title: 'RFI-089 Response', user_name: 'David Miller', user_avatar: 'DM', timestamp: '1 hour ago', details: '3 new comments added' },
      { id: '4', action: 'shared', document_title: 'Geotechnical Report - Phase 2', user_name: 'Lisa Anderson', user_avatar: 'LA', timestamp: '2 hours ago', details: 'Shared with WVDOH' },
      { id: '5', action: 'reviewed', document_title: 'Change Order #12 Documentation', user_name: 'Tom Wilson', user_avatar: 'TW', timestamp: '3 hours ago', details: 'Under review' }
    ]);
  }

  async function loadDocuments() {
    setLoading(true);

    // Demo documents data
    const demoDocuments: Document[] = [
      {
        id: 'doc-1', document_number: 'DWG-2024-001', title: 'Structural Plans - Bridge Deck', document_type: 'DRAWING',
        category: 'Structural', status: 'APPROVED', version: 3, file_path: '/docs/dwg-001.pdf', file_name: 'bridge_deck_structural.pdf',
        file_size: 15.2 * 1024 * 1024, mime_type: 'application/pdf', created_at: '2024-11-15T10:30:00Z', updated_at: '2024-12-01T14:20:00Z',
        created_by: 'user-1', created_by_name: 'John Smith', folder_id: null, project_id: 'proj-1', project_name: 'Corridor H Section 12',
        tags: ['structural', 'bridge', 'deck'], ai_category: 'Structural Drawing', ai_confidence: 0.94, is_starred: true, is_locked: false,
        locked_by: null, review_status: 'APPROVED', reviewer_id: 'user-2', reviewed_at: '2024-12-01T14:20:00Z', expiration_date: null,
        retention_period: 7, access_count: 145, last_accessed_at: '2024-12-07T09:15:00Z'
      },
      {
        id: 'doc-2', document_number: 'SPEC-2024-012', title: 'Division 03 - Concrete Specifications', document_type: 'SPECIFICATION',
        category: 'Technical', status: 'CURRENT', version: 2, file_path: '/docs/spec-012.pdf', file_name: 'div_03_concrete.pdf',
        file_size: 8.5 * 1024 * 1024, mime_type: 'application/pdf', created_at: '2024-10-20T08:00:00Z', updated_at: '2024-11-28T11:45:00Z',
        created_by: 'user-3', created_by_name: 'Emily Davis', folder_id: null, project_id: 'proj-1', project_name: 'Corridor H Section 12',
        tags: ['concrete', 'specifications', 'division-03'], ai_category: 'Technical Specification', ai_confidence: 0.97, is_starred: false,
        is_locked: true, locked_by: 'Emily Davis', review_status: 'APPROVED', reviewer_id: 'user-2', reviewed_at: '2024-11-28T11:45:00Z',
        expiration_date: null, retention_period: 10, access_count: 89, last_accessed_at: '2024-12-06T16:30:00Z'
      },
      {
        id: 'doc-3', document_number: 'CONTRACT-001', title: 'Prime Contract - WVDOH Agreement', document_type: 'CONTRACT',
        category: 'Legal', status: 'EXECUTED', version: 1, file_path: '/docs/contract-001.pdf', file_name: 'prime_contract.pdf',
        file_size: 4.2 * 1024 * 1024, mime_type: 'application/pdf', created_at: '2024-09-01T09:00:00Z', updated_at: '2024-09-01T09:00:00Z',
        created_by: 'user-1', created_by_name: 'John Smith', folder_id: null, project_id: 'proj-1', project_name: 'Corridor H Section 12',
        tags: ['contract', 'wvdoh', 'legal'], ai_category: 'Legal Contract', ai_confidence: 0.99, is_starred: true, is_locked: true,
        locked_by: 'System', review_status: null, reviewer_id: null, reviewed_at: null, expiration_date: '2026-09-01',
        retention_period: 10, access_count: 234, last_accessed_at: '2024-12-07T08:00:00Z'
      },
      {
        id: 'doc-4', document_number: 'PHOTO-2024-1547', title: 'Progress Photo - Pier Construction Day 45', document_type: 'PHOTO',
        category: 'Field Documentation', status: 'FILED', version: 1, file_path: '/docs/photo-1547.jpg', file_name: 'pier_day45.jpg',
        file_size: 5.8 * 1024 * 1024, mime_type: 'image/jpeg', created_at: '2024-12-05T14:30:00Z', updated_at: '2024-12-05T14:30:00Z',
        created_by: 'user-4', created_by_name: 'Mike Johnson', folder_id: null, project_id: 'proj-1', project_name: 'Corridor H Section 12',
        tags: ['progress', 'pier', 'construction'], ai_category: 'Construction Progress Photo', ai_confidence: 0.91, is_starred: false,
        is_locked: false, locked_by: null, review_status: null, reviewer_id: null, reviewed_at: null, expiration_date: null,
        retention_period: 7, access_count: 12, last_accessed_at: '2024-12-06T10:00:00Z'
      },
      {
        id: 'doc-5', document_number: 'RPT-2024-089', title: 'Geotechnical Investigation Report', document_type: 'REPORT',
        category: 'Engineering', status: 'PENDING_REVIEW', version: 1, file_path: '/docs/rpt-089.pdf', file_name: 'geotech_report.pdf',
        file_size: 22.4 * 1024 * 1024, mime_type: 'application/pdf', created_at: '2024-12-04T09:00:00Z', updated_at: '2024-12-04T09:00:00Z',
        created_by: 'user-5', created_by_name: 'Lisa Anderson', folder_id: null, project_id: 'proj-2', project_name: 'I-64 Bridge Rehabilitation',
        tags: ['geotechnical', 'investigation', 'soil'], ai_category: 'Engineering Report', ai_confidence: 0.88, is_starred: false,
        is_locked: false, locked_by: null, review_status: 'PENDING', reviewer_id: 'user-2', reviewed_at: null, expiration_date: null,
        retention_period: 10, access_count: 8, last_accessed_at: '2024-12-06T11:30:00Z'
      },
      {
        id: 'doc-6', document_number: 'DWG-2024-045', title: 'Traffic Control Plan - Phase 1', document_type: 'DRAWING',
        category: 'Traffic', status: 'SUPERSEDED', version: 4, file_path: '/docs/dwg-045.pdf', file_name: 'tcp_phase1_v4.pdf',
        file_size: 3.1 * 1024 * 1024, mime_type: 'application/pdf', created_at: '2024-11-01T10:00:00Z', updated_at: '2024-12-02T16:00:00Z',
        created_by: 'user-3', created_by_name: 'Emily Davis', folder_id: null, project_id: 'proj-1', project_name: 'Corridor H Section 12',
        tags: ['traffic', 'control', 'phase-1'], ai_category: 'Traffic Control Drawing', ai_confidence: 0.93, is_starred: false,
        is_locked: false, locked_by: null, review_status: 'APPROVED', reviewer_id: 'user-6', reviewed_at: '2024-12-02T16:00:00Z',
        expiration_date: null, retention_period: 7, access_count: 67, last_accessed_at: '2024-12-05T14:00:00Z'
      }
    ];

    let filtered = demoDocuments;

    if (selectedProjectId !== 'all') {
      filtered = filtered.filter(d => d.project_id === selectedProjectId);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d.title.toLowerCase().includes(query) ||
        d.document_number.toLowerCase().includes(query) ||
        d.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    if (activeTab !== 'all') {
      const typeMap: Record<string, string[]> = {
        drawings: ['DRAWING'],
        specifications: ['SPECIFICATION'],
        contracts: ['CONTRACT'],
        photos: ['PHOTO'],
        meetings: ['MEETING_MINUTES']
      };
      if (typeMap[activeTab]) {
        filtered = filtered.filter(d => typeMap[activeTab]!.includes(d.document_type));
      }
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(d => d.status === filters.status);
    }

    if (filters.starred) {
      filtered = filtered.filter(d => d.is_starred);
    }

    setDocuments(filtered);
    setLoading(false);
  }

  async function loadFolders() {
    const demoFolders: FolderItem[] = [
      { id: 'folder-1', name: 'Drawings', parent_folder_id: null, path: '/Drawings', document_count: 3421, subfolder_count: 12, total_size: 8.2 * 1024 * 1024 * 1024, created_at: '2024-01-15', color: '#3b82f6', icon: 'drafting-compass' },
      { id: 'folder-2', name: 'Specifications', parent_folder_id: null, path: '/Specifications', document_count: 892, subfolder_count: 8, total_size: 2.3 * 1024 * 1024 * 1024, created_at: '2024-01-15', color: '#10b981', icon: 'file-text' },
      { id: 'folder-3', name: 'Contracts', parent_folder_id: null, path: '/Contracts', document_count: 156, subfolder_count: 4, total_size: 1.8 * 1024 * 1024 * 1024, created_at: '2024-01-15', color: '#f59e0b', icon: 'file-contract' },
      { id: 'folder-4', name: 'Submittals', parent_folder_id: null, path: '/Submittals', document_count: 1245, subfolder_count: 6, total_size: 3.2 * 1024 * 1024 * 1024, created_at: '2024-01-15', color: '#8b5cf6', icon: 'inbox' },
      { id: 'folder-5', name: 'RFIs', parent_folder_id: null, path: '/RFIs', document_count: 234, subfolder_count: 2, total_size: 0.8 * 1024 * 1024 * 1024, created_at: '2024-01-15', color: '#ef4444', icon: 'help-circle' },
      { id: 'folder-6', name: 'Photos', parent_folder_id: null, path: '/Photos', document_count: 5234, subfolder_count: 15, total_size: 5.1 * 1024 * 1024 * 1024, created_at: '2024-01-15', color: '#ec4899', icon: 'camera' }
    ];
    setFolders(demoFolders);
  }

  async function loadSubmittals() {
    const demoSubmittals: Submittal[] = [
      { id: 'sub-1', submittal_number: 'SUB-045', title: 'Concrete Mix Design - 4000 PSI', spec_section: '03 30 00', status: 'APPROVED', submitted_date: '2024-11-20', required_date: '2024-12-01', ball_in_court: 'Triton', priority: 'HIGH', revision: 2, days_open: 0 },
      { id: 'sub-2', submittal_number: 'SUB-046', title: 'Structural Steel Shop Drawings', spec_section: '05 12 00', status: 'UNDER_REVIEW', submitted_date: '2024-11-28', required_date: '2024-12-15', ball_in_court: 'Engineer', priority: 'HIGH', revision: 1, days_open: 10 },
      { id: 'sub-3', submittal_number: 'SUB-047', title: 'Reinforcing Steel Material Certification', spec_section: '03 20 00', status: 'PENDING', submitted_date: '2024-12-01', required_date: '2024-12-20', ball_in_court: 'Subcontractor', priority: 'MEDIUM', revision: 0, days_open: 7 },
      { id: 'sub-4', submittal_number: 'SUB-048', title: 'Expansion Joint System', spec_section: '07 95 00', status: 'REJECTED', submitted_date: '2024-11-15', required_date: '2024-11-30', ball_in_court: 'Contractor', priority: 'CRITICAL', revision: 1, days_open: 23 },
      { id: 'sub-5', submittal_number: 'SUB-049', title: 'Bearing Pads - Elastomeric', spec_section: '05 50 00', status: 'APPROVED_AS_NOTED', submitted_date: '2024-11-25', required_date: '2024-12-10', ball_in_court: 'Triton', priority: 'MEDIUM', revision: 1, days_open: 0 }
    ];
    setSubmittals(demoSubmittals);
  }

  async function loadTransmittals() {
    const demoTransmittals: Transmittal[] = [
      { id: 'trans-1', transmittal_number: 'TR-2024-089', subject: 'Monthly Progress Report - November 2024', to_company: 'WVDOH', to_contact: 'James Wilson', sent_date: '2024-12-01', document_count: 5, status: 'DELIVERED', delivery_method: 'Email' },
      { id: 'trans-2', transmittal_number: 'TR-2024-090', subject: 'Submittal Package - Structural Steel', to_company: 'Thompson Engineering', to_contact: 'Sarah Miller', sent_date: '2024-12-03', document_count: 12, status: 'PENDING', delivery_method: 'Portal' },
      { id: 'trans-3', transmittal_number: 'TR-2024-091', subject: 'Change Order Documentation #12', to_company: 'WVDOH', to_contact: 'Robert Davis', sent_date: '2024-12-05', document_count: 8, status: 'OPENED', delivery_method: 'Email' }
    ];
    setTransmittals(demoTransmittals);
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const getDocumentIcon = (type: string, mime: string) => {
    if (mime?.startsWith('image/')) return <FileImage size={20} />;
    if (mime?.includes('spreadsheet') || mime?.includes('excel')) return <FileSpreadsheet size={20} />;
    if (type === 'DRAWING') return <FileCode size={20} />;
    if (type === 'CONTRACT') return <FileText size={20} />;
    return <File size={20} />;
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; icon: any; label: string }> = {
      APPROVED: { color: 'green', icon: CheckCircle, label: 'Approved' },
      PENDING_REVIEW: { color: 'yellow', icon: Clock, label: 'Pending Review' },
      REJECTED: { color: 'red', icon: XCircle, label: 'Rejected' },
      CURRENT: { color: 'blue', icon: CheckCircle, label: 'Current' },
      SUPERSEDED: { color: 'gray', icon: History, label: 'Superseded' },
      DRAFT: { color: 'gray', icon: Edit, label: 'Draft' },
      EXECUTED: { color: 'green', icon: CheckCircle, label: 'Executed' },
      FILED: { color: 'blue', icon: FileText, label: 'Filed' },
      UNDER_REVIEW: { color: 'yellow', icon: Clock, label: 'Under Review' },
      PENDING: { color: 'yellow', icon: Clock, label: 'Pending' },
      APPROVED_AS_NOTED: { color: 'green', icon: CheckCircle, label: 'Approved as Noted' }
    };
    return configs[status] || { color: 'gray', icon: File, label: status };
  };

  const tabs = [
    { id: 'all', label: 'All Documents', count: documents.length },
    { id: 'drawings', label: 'Drawings', count: 3421 },
    { id: 'specifications', label: 'Specifications', count: 892 },
    { id: 'submittals', label: 'Submittals', count: submittals.length || 48 },
    { id: 'transmittals', label: 'Transmittals', count: transmittals.length || 23 },
    { id: 'contracts', label: 'Contracts', count: 156 },
    { id: 'photos', label: 'Photos', count: 5234 },
    { id: 'meetings', label: 'Meetings', count: 67 }
  ];

  const pendingReviews = documents.filter(d => d.review_status === 'PENDING').length + 12;
  const recentUploads = 47;
  const storagePercent = storageStats ? (storageStats.used_storage / storageStats.total_storage) * 100 : 0;

  return (
    <div className="enhanced-document-center">
      {/* Header */}
      <div className="document-header">
        <div className="header-left">
          <h1>Document Center</h1>
          <p className="header-subtitle">Enterprise Document Management with AI-Powered Organization</p>
        </div>
        <div className="header-actions">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="project-select"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_number} - {p.name}
              </option>
            ))}
          </select>
          <button className="btn-secondary" onClick={() => setShowFilters(!showFilters)}>
            <Filter size={18} />
            Filters
          </button>
          <button className="btn-primary" onClick={() => setShowUploadModal(true)}>
            <Upload size={18} />
            Upload
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="document-kpis">
        <div className="kpi-card">
          <div className="kpi-icon blue">
            <FileText size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{storageStats?.document_count.toLocaleString() || '12,847'}</span>
            <span className="kpi-label">Total Documents</span>
            <div className="kpi-trend positive">
              <ArrowUpRight size={14} />
              <span>+{recentUploads} this week</span>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon yellow">
            <Clock size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{pendingReviews}</span>
            <span className="kpi-label">Pending Reviews</span>
            <div className="kpi-trend warning">
              <AlertTriangle size={14} />
              <span>5 overdue</span>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon green">
            <CheckCircle size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">98.2%</span>
            <span className="kpi-label">AI Classification Rate</span>
            <div className="kpi-trend positive">
              <Brain size={14} />
              <span>Auto-categorized</span>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon purple">
            <HardDrive size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{formatFileSize(storageStats?.used_storage || 0)}</span>
            <span className="kpi-label">Storage Used</span>
            <div className="storage-bar">
              <div className="storage-fill" style={{ width: `${storagePercent}%` }}></div>
            </div>
            <span className="storage-text">{storagePercent.toFixed(1)}% of {formatFileSize(storageStats?.total_storage || 0)}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="document-content">
        {/* Sidebar */}
        <div className="document-sidebar">
          {/* Quick Actions */}
          <div className="sidebar-section">
            <h3>Quick Actions</h3>
            <div className="quick-actions">
              <button className="quick-action-btn">
                <Upload size={18} />
                Upload Files
              </button>
              <button className="quick-action-btn">
                <FolderOpen size={18} />
                New Folder
              </button>
              <button className="quick-action-btn">
                <Send size={18} />
                New Transmittal
              </button>
              <button className="quick-action-btn">
                <FileText size={18} />
                New Submittal
              </button>
            </div>
          </div>

          {/* Folder Tree */}
          <div className="sidebar-section">
            <h3>Folders</h3>
            <div className="folder-tree">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  className={`folder-item ${currentFolder === folder.id ? 'active' : ''}`}
                  onClick={() => setCurrentFolder(folder.id === currentFolder ? null : folder.id)}
                >
                  <Folder size={18} style={{ color: folder.color }} />
                  <span className="folder-name">{folder.name}</span>
                  <span className="folder-count">{folder.document_count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Storage by Type */}
          <div className="sidebar-section">
            <h3>Storage by Type</h3>
            <div className="storage-breakdown">
              {storageStats?.by_type.map((item) => (
                <div key={item.type} className="storage-type-item">
                  <div className="storage-type-header">
                    <span className="storage-type-name">{item.type}</span>
                    <span className="storage-type-size">{formatFileSize(item.size)}</span>
                  </div>
                  <div className="storage-type-bar">
                    <div
                      className="storage-type-fill"
                      style={{ width: `${(item.size / (storageStats?.used_storage || 1)) * 100}%` }}
                    ></div>
                  </div>
                  <span className="storage-type-count">{item.count.toLocaleString()} files</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="sidebar-section">
            <h3>Recent Activity</h3>
            <div className="activity-feed">
              {activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-avatar">{activity.user_avatar}</div>
                  <div className="activity-content">
                    <p className="activity-text">
                      <strong>{activity.user_name}</strong> {activity.action}{' '}
                      <span className="activity-doc">{activity.document_title}</span>
                    </p>
                    <span className="activity-time">{activity.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Panel */}
        <div className="document-main">
          {/* Tabs */}
          <div className="document-tabs">
            <div className="tabs-list">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id as TabType)}
                >
                  {tab.label}
                  <span className="tab-count">{tab.count}</span>
                </button>
              ))}
            </div>
            <div className="tabs-actions">
              <div className="search-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="view-toggle">
                <button
                  className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                >
                  <List size={18} />
                </button>
                <button
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                >
                  <Grid size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          {showFilters && (
            <div className="filter-bar">
              <div className="filter-group">
                <label>Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="all">All Statuses</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PENDING_REVIEW">Pending Review</option>
                  <option value="DRAFT">Draft</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="SUPERSEDED">Superseded</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                >
                  <option value="all">All Types</option>
                  <option value="DRAWING">Drawings</option>
                  <option value="SPECIFICATION">Specifications</option>
                  <option value="CONTRACT">Contracts</option>
                  <option value="PHOTO">Photos</option>
                  <option value="REPORT">Reports</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Date Range</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="quarter">This Quarter</option>
                </select>
              </div>
              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filters.starred}
                  onChange={(e) => setFilters({ ...filters, starred: e.target.checked })}
                />
                <Star size={16} />
                Starred Only
              </label>
              <button
                className="filter-clear"
                onClick={() => setFilters({ status: 'all', type: 'all', dateRange: 'all', starred: false })}
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="loading-state">
              <RefreshCw className="spin" size={32} />
              <span>Loading documents...</span>
            </div>
          ) : activeTab === 'submittals' ? (
            <SubmittalsTable submittals={submittals} getStatusConfig={getStatusConfig} />
          ) : activeTab === 'transmittals' ? (
            <TransmittalsTable transmittals={transmittals} getStatusConfig={getStatusConfig} />
          ) : viewMode === 'list' ? (
            <DocumentsTable
              documents={documents}
              selectedDocuments={selectedDocuments}
              setSelectedDocuments={setSelectedDocuments}
              onDocumentClick={setSelectedDocument}
              getDocumentIcon={getDocumentIcon}
              getStatusConfig={getStatusConfig}
              formatFileSize={formatFileSize}
            />
          ) : (
            <DocumentsGrid
              documents={documents}
              onDocumentClick={setSelectedDocument}
              getDocumentIcon={getDocumentIcon}
              getStatusConfig={getStatusConfig}
              formatFileSize={formatFileSize}
            />
          )}
        </div>

        {/* Document Detail Panel */}
        {selectedDocument && (
          <DocumentDetailPanel
            document={selectedDocument}
            onClose={() => setSelectedDocument(null)}
            getStatusConfig={getStatusConfig}
            formatFileSize={formatFileSize}
          />
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          projectId={selectedProjectId}
          folders={folders}
          onClose={() => setShowUploadModal(false)}
          onUpload={() => {
            setShowUploadModal(false);
            loadDocuments();
          }}
        />
      )}
    </div>
  );
}

function DocumentsTable({
  documents,
  selectedDocuments,
  setSelectedDocuments,
  onDocumentClick,
  getDocumentIcon,
  getStatusConfig,
  formatFileSize
}: {
  documents: Document[];
  selectedDocuments: string[];
  setSelectedDocuments: (ids: string[]) => void;
  onDocumentClick: (doc: Document) => void;
  getDocumentIcon: (type: string, mime: string) => any;
  getStatusConfig: (status: string) => { color: string; icon: any; label: string };
  formatFileSize: (bytes: number) => string;
}) {
  const toggleSelect = (id: string) => {
    if (selectedDocuments.includes(id)) {
      setSelectedDocuments(selectedDocuments.filter(d => d !== id));
    } else {
      setSelectedDocuments([...selectedDocuments, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedDocuments.length === documents.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(documents.map(d => d.id));
    }
  };

  return (
    <div className="documents-table-container">
      {selectedDocuments.length > 0 && (
        <div className="bulk-actions-bar">
          <span>{selectedDocuments.length} selected</span>
          <div className="bulk-actions">
            <button><Download size={16} /> Download</button>
            <button><Share2 size={16} /> Share</button>
            <button><Copy size={16} /> Copy</button>
            <button className="danger"><Trash2 size={16} /> Delete</button>
          </div>
        </div>
      )}
      <table className="documents-table">
        <thead>
          <tr>
            <th className="checkbox-col">
              <input
                type="checkbox"
                checked={selectedDocuments.length === documents.length && documents.length > 0}
                onChange={toggleSelectAll}
              />
            </th>
            <th>Document</th>
            <th>AI Category</th>
            <th>Version</th>
            <th>Size</th>
            <th>Status</th>
            <th>Modified</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.length === 0 ? (
            <tr>
              <td colSpan={8} className="empty-state">
                <FileText size={48} />
                <h3>No documents found</h3>
                <p>Upload documents or adjust your filters</p>
              </td>
            </tr>
          ) : (
            documents.map((doc) => {
              const statusConfig = getStatusConfig(doc.status);
              const StatusIcon = statusConfig.icon;
              return (
                <tr
                  key={doc.id}
                  className={selectedDocuments.includes(doc.id) ? 'selected' : ''}
                  onClick={() => onDocumentClick(doc)}
                >
                  <td className="checkbox-col" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedDocuments.includes(doc.id)}
                      onChange={() => toggleSelect(doc.id)}
                    />
                  </td>
                  <td className="document-cell">
                    <div className="document-info">
                      <div className="document-icon">
                        {getDocumentIcon(doc.document_type, doc.mime_type)}
                      </div>
                      <div className="document-details">
                        <div className="document-title">
                          {doc.is_starred && <Star size={14} className="starred" />}
                          {doc.is_locked && <Lock size={14} className="locked" />}
                          {doc.title}
                        </div>
                        <div className="document-meta">
                          <span className="document-number">{doc.document_number}</span>
                          <span className="document-project">{doc.project_name}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {doc.ai_category && (
                      <div className="ai-category">
                        <Brain size={14} />
                        <span>{doc.ai_category}</span>
                        <span className="ai-confidence">{((doc.ai_confidence || 0) * 100).toFixed(0)}%</span>
                      </div>
                    )}
                  </td>
                  <td>v{doc.version}</td>
                  <td>{formatFileSize(doc.file_size)}</td>
                  <td>
                    <span className={`status-badge ${statusConfig.color}`}>
                      <StatusIcon size={14} />
                      {statusConfig.label}
                    </span>
                  </td>
                  <td>
                    <div className="modified-info">
                      <span>{new Date(doc.updated_at).toLocaleDateString()}</span>
                      <span className="modified-by">{doc.created_by_name}</span>
                    </div>
                  </td>
                  <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                    <button className="action-btn" title="Download">
                      <Download size={16} />
                    </button>
                    <button className="action-btn" title="Share">
                      <Share2 size={16} />
                    </button>
                    <button className="action-btn" title="More">
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function DocumentsGrid({
  documents,
  onDocumentClick,
  getDocumentIcon,
  getStatusConfig,
  formatFileSize
}: {
  documents: Document[];
  onDocumentClick: (doc: Document) => void;
  getDocumentIcon: (type: string, mime: string) => any;
  getStatusConfig: (status: string) => { color: string; icon: any; label: string };
  formatFileSize: (bytes: number) => string;
}) {
  return (
    <div className="documents-grid">
      {documents.map((doc) => {
        const statusConfig = getStatusConfig(doc.status);
        const StatusIcon = statusConfig.icon;
        return (
          <div key={doc.id} className="document-card" onClick={() => onDocumentClick(doc)}>
            <div className="card-header">
              <div className="card-icon">
                {getDocumentIcon(doc.document_type, doc.mime_type)}
              </div>
              <div className="card-badges">
                {doc.is_starred && <Star size={14} className="starred" />}
                {doc.is_locked && <Lock size={14} className="locked" />}
              </div>
            </div>
            <div className="card-body">
              <h4 className="card-title">{doc.title}</h4>
              <p className="card-number">{doc.document_number}</p>
              {doc.ai_category && (
                <div className="card-ai">
                  <Brain size={12} />
                  <span>{doc.ai_category}</span>
                </div>
              )}
            </div>
            <div className="card-footer">
              <span className={`status-badge small ${statusConfig.color}`}>
                <StatusIcon size={12} />
                {statusConfig.label}
              </span>
              <span className="card-size">{formatFileSize(doc.file_size)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SubmittalsTable({
  submittals,
  getStatusConfig
}: {
  submittals: Submittal[];
  getStatusConfig: (status: string) => { color: string; icon: any; label: string };
}) {
  const getPriorityClass = (priority: string) => {
    const classes: Record<string, string> = {
      LOW: 'gray',
      MEDIUM: 'blue',
      HIGH: 'orange',
      CRITICAL: 'red'
    };
    return classes[priority] || 'gray';
  };

  return (
    <div className="submittals-table-container">
      <table className="submittals-table">
        <thead>
          <tr>
            <th>Submittal #</th>
            <th>Title</th>
            <th>Spec Section</th>
            <th>Revision</th>
            <th>Ball In Court</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Days Open</th>
            <th>Required Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {submittals.map((sub) => {
            const statusConfig = getStatusConfig(sub.status);
            const StatusIcon = statusConfig.icon;
            const isOverdue = sub.days_open > 0 && new Date(sub.required_date) < new Date();
            return (
              <tr key={sub.id} className={isOverdue ? 'overdue' : ''}>
                <td className="submittal-number">{sub.submittal_number}</td>
                <td className="submittal-title">{sub.title}</td>
                <td>{sub.spec_section}</td>
                <td>Rev {sub.revision}</td>
                <td>
                  <span className="ball-in-court">{sub.ball_in_court}</span>
                </td>
                <td>
                  <span className={`priority-badge ${getPriorityClass(sub.priority)}`}>
                    {sub.priority}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${statusConfig.color}`}>
                    <StatusIcon size={14} />
                    {statusConfig.label}
                  </span>
                </td>
                <td className={sub.days_open > 14 ? 'overdue-days' : ''}>
                  {sub.days_open > 0 ? `${sub.days_open} days` : '-'}
                </td>
                <td className={isOverdue ? 'overdue-date' : ''}>
                  {new Date(sub.required_date).toLocaleDateString()}
                </td>
                <td className="actions-cell">
                  <button className="action-btn" title="View">
                    <Eye size={16} />
                  </button>
                  <button className="action-btn" title="Edit">
                    <Edit size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TransmittalsTable({
  transmittals,
  getStatusConfig: _getStatusConfig
}: {
  transmittals: Transmittal[];
  getStatusConfig: (status: string) => { color: string; icon: any; label: string };
}) {
  const getDeliveryIcon = (method: string) => {
    switch (method) {
      case 'Email': return <Send size={14} />;
      case 'Portal': return <Share2 size={14} />;
      default: return <FileText size={14} />;
    }
  };

  return (
    <div className="transmittals-table-container">
      <table className="transmittals-table">
        <thead>
          <tr>
            <th>Transmittal #</th>
            <th>Subject</th>
            <th>To</th>
            <th>Documents</th>
            <th>Delivery</th>
            <th>Status</th>
            <th>Sent Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {transmittals.map((trans) => (
            <tr key={trans.id}>
              <td className="transmittal-number">{trans.transmittal_number}</td>
              <td className="transmittal-subject">{trans.subject}</td>
              <td>
                <div className="recipient-info">
                  <span className="recipient-company">{trans.to_company}</span>
                  <span className="recipient-contact">{trans.to_contact}</span>
                </div>
              </td>
              <td>
                <span className="doc-count">{trans.document_count} files</span>
              </td>
              <td>
                <span className="delivery-method">
                  {getDeliveryIcon(trans.delivery_method)}
                  {trans.delivery_method}
                </span>
              </td>
              <td>
                <span className={`status-badge ${trans.status === 'DELIVERED' ? 'green' : trans.status === 'OPENED' ? 'blue' : 'yellow'}`}>
                  {trans.status === 'DELIVERED' && <CheckCircle size={14} />}
                  {trans.status === 'OPENED' && <Eye size={14} />}
                  {trans.status === 'PENDING' && <Clock size={14} />}
                  {trans.status}
                </span>
              </td>
              <td>{new Date(trans.sent_date).toLocaleDateString()}</td>
              <td className="actions-cell">
                <button className="action-btn" title="View">
                  <Eye size={16} />
                </button>
                <button className="action-btn" title="Resend">
                  <RefreshCw size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DocumentDetailPanel({
  document,
  onClose,
  getStatusConfig,
  formatFileSize
}: {
  document: Document;
  onClose: () => void;
  getStatusConfig: (status: string) => { color: string; icon: any; label: string };
  formatFileSize: (bytes: number) => string;
}) {
  const statusConfig = getStatusConfig(document.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="document-detail-panel">
      <div className="panel-header">
        <h2>Document Details</h2>
        <button className="close-btn" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className="panel-content">
        {/* Preview */}
        <div className="document-preview">
          <div className="preview-placeholder">
            <FileText size={64} />
            <span>Preview</span>
          </div>
        </div>

        {/* Info */}
        <div className="document-info-section">
          <h3>{document.title}</h3>
          <p className="document-number">{document.document_number}</p>

          <div className="info-badges">
            <span className={`status-badge ${statusConfig.color}`}>
              <StatusIcon size={14} />
              {statusConfig.label}
            </span>
            <span className="version-badge">v{document.version}</span>
            {document.is_locked && (
              <span className="locked-badge">
                <Lock size={14} />
                Locked
              </span>
            )}
          </div>

          {document.ai_category && (
            <div className="ai-classification">
              <div className="ai-header">
                <Brain size={16} />
                <span>AI Classification</span>
              </div>
              <p className="ai-category-name">{document.ai_category}</p>
              <div className="ai-confidence-bar">
                <div
                  className="confidence-fill"
                  style={{ width: `${(document.ai_confidence || 0) * 100}%` }}
                ></div>
              </div>
              <span className="confidence-text">{((document.ai_confidence || 0) * 100).toFixed(0)}% confidence</span>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="metadata-section">
          <h4>Details</h4>
          <div className="metadata-grid">
            <div className="metadata-item">
              <label>Project</label>
              <span>{document.project_name}</span>
            </div>
            <div className="metadata-item">
              <label>Category</label>
              <span>{document.category}</span>
            </div>
            <div className="metadata-item">
              <label>File Size</label>
              <span>{formatFileSize(document.file_size)}</span>
            </div>
            <div className="metadata-item">
              <label>File Type</label>
              <span>{document.mime_type}</span>
            </div>
            <div className="metadata-item">
              <label>Created</label>
              <span>{new Date(document.created_at).toLocaleDateString()}</span>
            </div>
            <div className="metadata-item">
              <label>Created By</label>
              <span>{document.created_by_name}</span>
            </div>
            <div className="metadata-item">
              <label>Last Modified</label>
              <span>{new Date(document.updated_at).toLocaleDateString()}</span>
            </div>
            <div className="metadata-item">
              <label>Access Count</label>
              <span>{document.access_count} views</span>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="tags-section">
          <h4>Tags</h4>
          <div className="tags-list">
            {document.tags.map((tag) => (
              <span key={tag} className="tag">
                <Tag size={12} />
                {tag}
              </span>
            ))}
            <button className="add-tag-btn">
              <Plus size={14} />
              Add Tag
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="panel-actions">
          <button className="btn-primary">
            <Download size={18} />
            Download
          </button>
          <button className="btn-secondary">
            <Share2 size={18} />
            Share
          </button>
          <button className="btn-secondary">
            <History size={18} />
            Version History
          </button>
          <button className="btn-secondary">
            <Edit size={18} />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

function UploadModal({
  projectId: _projectId,
  folders,
  onClose,
  onUpload
}: {
  projectId: string;
  folders: FolderItem[];
  onClose: () => void;
  onUpload: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    folder_id: '',
    document_type: 'GENERAL',
    tags: ''
  });
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles([...files, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    setUploading(true);
    // Simulate upload
    await new Promise(resolve => setTimeout(resolve, 2000));
    setUploading(false);
    onUpload();
  };

  return (
    <div className="modal-overlay">
      <div className="upload-modal">
        <div className="modal-header">
          <h2>Upload Documents</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Drop Zone */}
          <div
            className={`drop-zone ${dragActive ? 'active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload size={48} />
            <h3>Drag & drop files here</h3>
            <p>or click to browse</p>
            <input
              type="file"
              multiple
              onChange={(e) => setFiles([...files, ...Array.from(e.target.files || [])])}
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="file-list">
              {files.map((file, index) => (
                <div key={index} className="file-item">
                  <FileText size={20} />
                  <div className="file-info">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <button
                    type="button"
                    className="remove-file"
                    onClick={() => setFiles(files.filter((_, i) => i !== index))}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Form Fields */}
          <div className="upload-form">
            <div className="form-row">
              <div className="form-group">
                <label>Folder</label>
                <select
                  value={formData.folder_id}
                  onChange={(e) => setFormData({ ...formData, folder_id: e.target.value })}
                >
                  <option value="">Root Folder</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Document Type</label>
                <select
                  value={formData.document_type}
                  onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                >
                  <option value="GENERAL">General</option>
                  <option value="DRAWING">Drawing</option>
                  <option value="SPECIFICATION">Specification</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="SUBMITTAL">Submittal</option>
                  <option value="PHOTO">Photo</option>
                  <option value="REPORT">Report</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Tags (comma separated)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="e.g., structural, phase-1, bridge"
              />
            </div>
          </div>

          {/* AI Notice */}
          <div className="ai-notice">
            <Brain size={20} />
            <div>
              <strong>AI Auto-Classification Enabled</strong>
              <p>Documents will be automatically categorized using AI analysis</p>
            </div>
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={files.length === 0 || uploading}
            >
              {uploading ? (
                <>
                  <RefreshCw className="spin" size={18} />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Upload {files.length} File{files.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EnhancedDocumentCenter;
