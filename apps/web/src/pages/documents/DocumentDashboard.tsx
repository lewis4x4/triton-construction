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
      DRAFT: 'bg-gray-100 text-gray-800',
      PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      SUPERSEDED: 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Document Management</h1>
          <div className="flex gap-3">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_number} - {p.name}
                </option>
              ))}
            </select>
            {activeTab === 'documents' && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Upload Document
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Total Documents</div>
          <div className="text-2xl font-bold text-gray-900">{documents.length}</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="text-sm text-yellow-600">Pending Submittals</div>
          <div className="text-2xl font-bold text-yellow-700">
            {submittals.filter(s => s.status === 'PENDING' || s.status === 'UNDER_REVIEW').length}
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-sm text-green-600">Approved</div>
          <div className="text-2xl font-bold text-green-700">
            {submittals.filter(s => s.status === 'APPROVED').length}
          </div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="text-sm text-red-600">Rejected</div>
          <div className="text-2xl font-bold text-red-700">
            {submittals.filter(s => s.status === 'REJECTED').length}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'documents', label: 'Documents' },
            { id: 'submittals', label: 'Submittals' },
            { id: 'transmittals', label: 'Transmittals' },
            { id: 'meetings', label: 'Meeting Minutes' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
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
        </>
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
        <div className="mb-4">
          <button
            onClick={() => onFolderClick(null)}
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => onFolderClick(folder.id)}
              className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left"
            >
              <div className="text-3xl mb-2">📁</div>
              <div className="font-medium text-gray-900 truncate">{folder.name}</div>
              <div className="text-sm text-gray-500">{folder.document_count || 0} items</div>
            </button>
          ))}
        </div>
      )}

      {/* Documents Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Document
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Version
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Size
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Uploaded
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {documents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No documents in this folder
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getDocTypeIcon(doc.document_type)}</span>
                      <div>
                        <div className="font-medium text-gray-900">{doc.title}</div>
                        <div className="text-sm text-gray-500">{doc.document_number}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {doc.document_type?.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">v{doc.version}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatFileSize(doc.file_size || 0)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                        doc.status
                      )}`}
                    >
                      {doc.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-blue-600 hover:text-blue-800 text-sm mr-2">
                      Download
                    </button>
                    <button className="text-blue-600 hover:text-blue-800 text-sm">
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
      LOW: 'bg-gray-100 text-gray-800',
      MEDIUM: 'bg-blue-100 text-blue-800',
      HIGH: 'bg-orange-100 text-orange-800',
      CRITICAL: 'bg-red-100 text-red-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Submittal #
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Title
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Spec Section
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Priority
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Required Date
            </th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {submittals.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                No submittals found
              </td>
            </tr>
          ) : (
            submittals.map((submittal) => (
              <tr key={submittal.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-blue-600">
                  {submittal.submittal_number}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{submittal.title}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{submittal.spec_section}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityBadge(
                      submittal.priority
                    )}`}
                  >
                    {submittal.priority}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                      submittal.status
                    )}`}
                  >
                    {submittal.status?.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{submittal.required_date}</td>
                <td className="px-4 py-3 text-right">
                  <button className="text-blue-600 hover:text-blue-800 text-sm">View</button>
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
    <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
      <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Transmittals</h3>
      <p className="text-gray-500">Create and track document transmittals to external parties</p>
    </div>
  );
}

function MeetingMinutesPanel() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
      <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Meeting Minutes</h3>
      <p className="text-gray-500">Record and distribute meeting minutes with action items</p>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Upload Document</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File *
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Type
            </label>
            <select
              value={formData.document_type}
              onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DocumentDashboard;
