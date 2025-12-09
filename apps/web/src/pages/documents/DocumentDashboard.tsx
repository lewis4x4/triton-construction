import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';

interface Document {
  id: string;
  document_number: string;
  title: string;
  document_type: string;
  status: string;
  version: number;
  file_path: string;
  file_size: number;
  created_at: string;
  created_by_name: string;
  folder_id: string | null;
}

interface Folder {
  id: string;
  name: string;
  parent_folder_id: string | null;
  document_count: number;
}

interface Submittal {
  id: string;
  submittal_number: string;
  title: string;
  spec_section: string;
  status: string;
  submitted_date: string;
  required_date: string;
  priority: string;
}

export function DocumentDashboard() {
  const [activeTab, setActiveTab] = useState<'documents' | 'submittals' | 'transmittals' | 'meetings'>('documents');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [submittals, setSubmittals] = useState<Submittal[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [projects, setProjects] = useState<{ id: string; name: string; project_number: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      if (activeTab === 'documents') {
        loadDocuments();
        loadFolders();
      } else if (activeTab === 'submittals') {
        loadSubmittals();
      }
    }
  }, [selectedProjectId, activeTab, currentFolder]);

  async function loadProjects() {
    const { data } = await supabase
      .from('projects')
      .select('id, name, project_number')
      .eq('status', 'ACTIVE')
      .order('name');

    if (data) {
      setProjects(data);
      if (data.length > 0 && data[0]) {
        setSelectedProjectId(data[0]!.id);
      }
    }
    setLoading(false);
  }

  async function loadDocuments() {
    setLoading(true);
    let query = supabase
      .from('documents')
      .select('*')
      .eq('project_id', selectedProjectId)
      .order('created_at', { ascending: false });

    if (currentFolder) {
      query = query.eq('folder_id', currentFolder);
    } else {
      query = query.is('folder_id', null);
    }

    const { data, error } = await query.limit(100);

    if (!error && data) {
      setDocuments(data as unknown as Document[]);
    }
    setLoading(false);
  }

  async function loadFolders() {
    let query = supabase
      .from('document_folders')
      .select('*')
      .eq('project_id', selectedProjectId)
      .order('name');

    if (currentFolder) {
      query = query.eq('parent_folder_id', currentFolder);
    } else {
      query = query.is('parent_folder_id', null);
    }

    const { data, error } = await query;

    if (!error && data) {
      setFolders(data as unknown as Folder[]);
    }
  }

  async function loadSubmittals() {
    setLoading(true);
    const { data, error } = await supabase
      .from('submittals')
      .select('*')
      .eq('project_id', selectedProjectId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSubmittals(data as unknown as Submittal[]);
    }
    setLoading(false);
  }

  const getDocTypeIcon = (type: string) => {
    switch (type) {
      case 'PDF':
        return '📄';
      case 'DRAWING':
        return '📐';
      case 'SPECIFICATION':
        return '📋';
      case 'CONTRACT':
        return '📝';
      case 'PHOTO':
        return '📷';
      default:
        return '📁';
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-white/10 text-gray-400 border-white/10',
      PENDING_REVIEW: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      APPROVED: 'bg-green-500/10 text-green-500 border-green-500/20',
      REJECTED: 'bg-red-500/10 text-red-500 border-red-500/20',
      SUPERSEDED: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    };
    return colors[status] || 'bg-white/10 text-gray-400 border-white/10';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Document Management</h1>
            <p className="text-gray-400 font-mono text-sm uppercase tracking-wider">Project Documentation Center</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-[var(--neon-cyan)]"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900">
                  {p.project_number} - {p.name}
                </option>
              ))}
            </select>
            {activeTab === 'documents' && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-[var(--neon-cyan)]/10 border border-[var(--neon-cyan)]/50 text-[var(--neon-cyan)] rounded-lg hover:bg-[var(--neon-cyan)]/20 transition-all font-medium flex items-center gap-2 shadow-[0_0_15px_rgba(46,196,182,0.1)]"
              >
                Upload Document
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="gravity-card p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50"></div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Total Documents</div>
          <div className="text-3xl font-bold text-white font-mono group-hover:text-blue-400 transition-colors">{documents.length}</div>
        </div>
        <div className="gravity-card p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500/50"></div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pending Submittals</div>
          <div className="text-3xl font-bold text-white font-mono group-hover:text-yellow-400 transition-colors">
            {submittals.filter(s => s.status === 'PENDING' || s.status === 'UNDER_REVIEW').length}
          </div>
        </div>
        <div className="gravity-card p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-green-500/50"></div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Approved</div>
          <div className="text-3xl font-bold text-white font-mono group-hover:text-green-400 transition-colors">
            {submittals.filter(s => s.status === 'APPROVED').length}
          </div>
        </div>
        <div className="gravity-card p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50"></div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Rejected</div>
          <div className="text-3xl font-bold text-white font-mono group-hover:text-red-400 transition-colors">
            {submittals.filter(s => s.status === 'REJECTED').length}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8 overflow-x-auto">
        <nav className="flex space-x-2 border-b border-white/10 pb-1">
          {[
            { id: 'documents', label: 'Documents' },
            { id: 'submittals', label: 'Submittals' },
            { id: 'transmittals', label: 'Transmittals' },
            { id: 'meetings', label: 'Meeting Minutes' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`py-3 px-6 rounded-t-lg font-medium text-sm transition-all relative ${activeTab === tab.id
                  ? 'text-[var(--neon-cyan)] bg-white/5 border-t border-x border-white/10'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[var(--neon-cyan)] shadow-[0_0_10px_var(--neon-cyan)]" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--neon-cyan)] shadow-[0_0_15px_rgba(46,196,182,0.3)]"></div>
        </div>
      ) : (
        <div className="gravity-card bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-6 min-h-[500px]">
          {activeTab === 'documents' && (
            <DocumentsPanel
              documents={documents}
              folders={folders}
              currentFolder={currentFolder}
              onFolderClick={setCurrentFolder}
              getDocTypeIcon={getDocTypeIcon}
              getStatusBadge={getStatusBadge}
              formatFileSize={formatFileSize}
            />
          )}
          {activeTab === 'submittals' && (
            <SubmittalsPanel submittals={submittals} getStatusBadge={getStatusBadge} />
          )}
          {activeTab === 'transmittals' && <TransmittalsPanel />}
          {activeTab === 'meetings' && <MeetingMinutesPanel />}
        </div>
      )}

      {showUploadModal && (
        <UploadDocumentModal
          projectId={selectedProjectId}
          folderId={currentFolder}
          onClose={() => setShowUploadModal(false)}
          onSave={() => {
            setShowUploadModal(false);
            loadDocuments();
          }}
        />
      )}
    </div>
  );
}

function DocumentsPanel({
  documents,
  folders,
  currentFolder,
  onFolderClick,
  getDocTypeIcon,
  getStatusBadge,
  formatFileSize,
}: {
  documents: Document[];
  folders: Folder[];
  currentFolder: string | null;
  onFolderClick: (id: string | null) => void;
  getDocTypeIcon: (type: string) => string;
  getStatusBadge: (status: string) => string;
  formatFileSize: (bytes: number) => string;
}) {
  return (
    <div>
      {/* Breadcrumb */}
      {currentFolder && (
        <div className="mb-6">
          <button
            onClick={() => onFolderClick(null)}
            className="text-[var(--neon-cyan)] hover:text-white text-sm flex items-center gap-2 font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Root
          </button>
        </div>
      )}

      {/* Folders */}
      {folders.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => onFolderClick(folder.id)}
              className="bg-white/5 p-4 rounded-xl border border-white/5 hover:border-[var(--neon-cyan)]/50 hover:bg-white/10 hover:-translate-y-1 hover:shadow-lg transition-all text-left group"
            >
              <div className="text-3xl mb-3 grayscale group-hover:grayscale-0 transition-all">📁</div>
              <div className="font-medium text-white truncate mb-1">{folder.name}</div>
              <div className="text-xs text-gray-500 font-mono">{folder.document_count || 0} items</div>
            </button>
          ))}
        </div>
      )}

      {/* Documents Table */}
      <div className="rounded-lg border border-white/10 overflow-hidden">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-black/20">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                Document
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                Version
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                Size
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                Uploaded
              </th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {documents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500 text-lg">
                  No documents in this folder
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getDocTypeIcon(doc.document_type)}</span>
                      <div>
                        <div className="font-medium text-white group-hover:text-[var(--neon-cyan)] transition-colors">{doc.title}</div>
                        <div className="text-xs text-gray-500 font-mono mt-1">{doc.document_number}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {doc.document_type?.replace(/_/g, ' ')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400 font-mono">v{doc.version}</td>
                  <td className="px-6 py-4 text-sm text-gray-400 font-mono">
                    {formatFileSize(doc.file_size || 0)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${getStatusBadge(
                        doc.status
                      )}`}
                    >
                      {doc.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-gray-400 hover:text-[var(--neon-cyan)] text-sm mr-4 transition-colors">
                      Download
                    </button>
                    <button className="text-gray-400 hover:text-white text-sm transition-colors">
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubmittalsPanel({
  submittals,
  getStatusBadge,
}: {
  submittals: Submittal[];
  getStatusBadge: (status: string) => string;
}) {
  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      LOW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      MEDIUM: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      HIGH: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      CRITICAL: 'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
    };
    return colors[priority] || 'bg-white/10 text-gray-400 border-white/10';
  };

  return (
    <div className="rounded-lg border border-white/10 overflow-hidden">
      <table className="min-w-full divide-y divide-white/10">
        <thead className="bg-black/20">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
              Submittal #
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
              Title
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
              Spec Section
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
              Priority
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
              Required Date
            </th>
            <th className="px-6 py-4"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {submittals.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-gray-500 text-lg">
                No submittals found
              </td>
            </tr>
          ) : (
            submittals.map((submittal) => (
              <tr key={submittal.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 text-sm font-bold text-[var(--neon-cyan)] font-mono">
                  {submittal.submittal_number}
                </td>
                <td className="px-6 py-4 text-sm text-white">{submittal.title}</td>
                <td className="px-6 py-4 text-sm text-gray-400 font-mono">{submittal.spec_section}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${getPriorityBadge(
                      submittal.priority
                    )}`}
                  >
                    {submittal.priority}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${getStatusBadge(
                      submittal.status
                    )}`}
                  >
                    {submittal.status?.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-400 font-mono">{submittal.required_date}</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-[var(--neon-cyan)] hover:text-white text-sm font-medium transition-colors">View</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function TransmittalsPanel() {
  return (
    <div className="p-12 text-center">
      <div className="w-20 h-20 mx-auto bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
        <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-white mb-2">Transmittals</h3>
      <p className="text-gray-400 max-w-md mx-auto">Create and track document transmittals to external parties. This module is currently under development.</p>
    </div>
  );
}

function MeetingMinutesPanel() {
  return (
    <div className="p-12 text-center">
      <div className="w-20 h-20 mx-auto bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
        <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-white mb-2">Meeting Minutes</h3>
      <p className="text-gray-400 max-w-md mx-auto">Record and distribute meeting minutes with action items. This module is currently under development.</p>
    </div>
  );
}

function UploadDocumentModal({
  projectId,
  folderId,
  onClose,
  onSave,
}: {
  projectId: string;
  folderId: string | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    title: '',
    document_type: 'GENERAL',
    description: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setUploading(true);

    try {
      // Upload file to storage
      const fileName = `${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(`${projectId}/${fileName}`, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { error } = await supabase.from('documents').insert([{
        project_id: projectId,
        folder_id: folderId,
        title: formData.title,
        document_type: formData.document_type,
        description: formData.description || null,
        file_path: uploadData.path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        version: 1,
        status: 'DRAFT',
      }] as any);

      if (!error) {
        onSave();
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload document');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a2332] border border-white/10 rounded-2xl p-8 w-full max-w-md relative shadow-2xl">
        <div className="absolute top-4 right-4 text-gray-500 hover:text-white cursor-pointer" onClick={onClose}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <span className="text-[var(--neon-cyan)]">📄</span> Upload Document
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              File *
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-[var(--neon-cyan)] transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--neon-cyan)]/10 file:text-[var(--neon-cyan)] hover:file:bg-[var(--neon-cyan)]/20"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-[var(--neon-cyan)] transition-colors"
              placeholder="Enter document title"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Document Type
            </label>
            <select
              value={formData.document_type}
              onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--neon-cyan)] transition-colors"
            >
              <option value="GENERAL">General</option>
              <option value="CONTRACT">Contract</option>
              <option value="DRAWING">Drawing</option>
              <option value="SPECIFICATION">Specification</option>
              <option value="SUBMITTAL">Submittal</option>
              <option value="RFI">RFI</option>
              <option value="CHANGE_ORDER">Change Order</option>
              <option value="PHOTO">Photo</option>
              <option value="REPORT">Report</option>
              <option value="CORRESPONDENCE">Correspondence</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-[var(--neon-cyan)] transition-colors"
              rows={3}
              placeholder="Optional description..."
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="flex-1 px-4 py-3 bg-[var(--neon-cyan)]/20 border border-[var(--neon-cyan)] text-[var(--neon-cyan)] rounded-lg hover:bg-[var(--neon-cyan)]/30 hover:shadow-[0_0_20px_rgba(46,196,182,0.3)] transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload File'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DocumentDashboard;
