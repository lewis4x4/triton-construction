import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@triton/supabase-client';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  FolderOpen,
  Building2,
  Calendar,
} from 'lucide-react';
import './PayEstimateUpload.css';

interface Project {
  id: string;
  name: string;
  contract_number: string | null;
  organization_id: string;
}

interface UploadResult {
  success: boolean;
  pay_period_id?: string;
  validation?: 'passed' | 'failed_math' | 'failed_missing_data';
  line_items_count?: number;
  errors?: string[];
  warnings?: string[];
  message?: string;
}

type EstimateType = 'preliminary' | 'final';

export function PayEstimateUpload() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [estimateType, setEstimateType] = useState<EstimateType>('preliminary');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user's projects
  useEffect(() => {
    async function loadProjects() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', userData.user.id)
        .single();

      if (!profile) return;

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name, contract_number, organization_id')
        .eq('organization_id', profile.organization_id)
        .in('status', ['ACTIVE', 'MOBILIZATION', 'SUBSTANTIAL_COMPLETION'])
        .order('name');

      if (!projectError && projectData) {
        setProjects(projectData);
      }
    }

    loadProjects();
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        setError(null);
        setResult(null);
      } else {
        setError('Please upload a PDF file');
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setError(null);
        setResult(null);
      } else {
        setError('Please upload a PDF file');
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedProject) {
      setError('Please select a project and upload a PDF');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const project = projects.find(p => p.id === selectedProject);
      if (!project) throw new Error('Project not found');

      // 1. Upload PDF to storage
      const timestamp = Date.now();
      const fileName = `${project.organization_id}/${selectedProject}/${estimateType}_${timestamp}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('pay-estimates')
        .upload(fileName, file, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // 2. Get signed URL for the edge function
      const { data: urlData, error: urlError } = await supabase.storage
        .from('pay-estimates')
        .createSignedUrl(fileName, 3600); // 1 hour expiry

      if (urlError || !urlData) {
        throw new Error('Failed to get signed URL');
      }

      // 3. Call edge function to process PDF
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'pay-period-ingest',
        {
          body: {
            project_id: selectedProject,
            pdf_url: urlData.signedUrl,
            estimate_type: estimateType as string,
          },
        }
      );

      if (fnError) {
        throw new Error(`Processing failed: ${fnError.message}`);
      }

      setResult(fnData as UploadResult);

      // Reset file after successful processing
      if (fnData?.success) {
        setFile(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  return (
    <div className="pay-estimate-upload">
      <div className="upload-header">
        <h1>Upload Pay Estimate</h1>
        <p>Upload WVDOH pay estimate PDFs for automatic parsing and validation</p>
      </div>

      <div className="upload-form">
        {/* Project Selection */}
        <div className="form-section">
          <label className="form-label">
            <Building2 size={16} />
            Select Project
          </label>
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            className="form-select"
            disabled={uploading}
          >
            <option value="">-- Select a project --</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name} ({project.contract_number})
              </option>
            ))}
          </select>
        </div>

        {/* Estimate Type Selection */}
        <div className="form-section">
          <label className="form-label">
            <Calendar size={16} />
            Estimate Type
          </label>
          <div className="estimate-type-buttons">
            <button
              type="button"
              className={`type-button ${estimateType === 'preliminary' ? 'active' : ''}`}
              onClick={() => setEstimateType('preliminary')}
              disabled={uploading}
            >
              Preliminary
            </button>
            <button
              type="button"
              className={`type-button ${estimateType === 'final' ? 'active' : ''}`}
              onClick={() => setEstimateType('final')}
              disabled={uploading}
            >
              Final
            </button>
          </div>
        </div>

        {/* File Upload Zone */}
        <div className="form-section">
          <label className="form-label">
            <FileText size={16} />
            Pay Estimate PDF
          </label>
          <div
            className={`drop-zone ${dragActive ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="file-preview">
                <FileText size={32} />
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                <button
                  type="button"
                  className="remove-file"
                  onClick={() => setFile(null)}
                  disabled={uploading}
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <Upload size={40} className="upload-icon" />
                <p>Drag and drop a PDF here, or click to select</p>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="file-input"
                  disabled={uploading}
                />
              </>
            )}
          </div>
        </div>

        {/* Selected Project Summary */}
        {selectedProjectData && (
          <div className="project-summary">
            <FolderOpen size={16} />
            <span>
              Uploading to: <strong>{selectedProjectData.name}</strong> (
              {selectedProjectData.contract_number})
            </span>
          </div>
        )}

        {/* Upload Button */}
        <button
          type="button"
          className="upload-button"
          onClick={handleUpload}
          disabled={uploading || !file || !selectedProject}
        >
          {uploading ? (
            <>
              <Loader2 size={20} className="spinning" />
              Processing...
            </>
          ) : (
            <>
              <Upload size={20} />
              Upload & Process
            </>
          )}
        </button>

        {/* Error Display */}
        {error && (
          <div className="result-card error">
            <XCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className={`result-card ${result.success ? 'success' : 'warning'}`}>
            {result.success ? (
              <>
                <CheckCircle size={20} />
                <div className="result-content">
                  <strong>Pay estimate processed successfully!</strong>
                  <p>
                    {result.line_items_count} line items extracted and validated.
                  </p>
                  {result.warnings && result.warnings.length > 0 && (
                    <div className="result-warnings">
                      <AlertTriangle size={16} />
                      <span>Warnings: {result.warnings.join(', ')}</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <AlertTriangle size={20} />
                <div className="result-content">
                  <strong>Validation failed - Flagged for review</strong>
                  <p>{result.message}</p>
                  {result.errors && result.errors.length > 0 && (
                    <ul className="result-errors">
                      {result.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Processing Info */}
      <div className="processing-info">
        <h3>How it works</h3>
        <ol>
          <li>Upload a WVDOH pay estimate PDF</li>
          <li>Claude AI extracts all line items and summary data</li>
          <li>
            Automatic validation checks:
            <ul>
              <li>Line item sums match posted item pay (±$0.02)</li>
              <li>Qty × Price = Amount for each line (±$0.01)</li>
              <li>Cumulative totals are consistent</li>
            </ul>
          </li>
          <li>Passed estimates are written to database</li>
          <li>Failed estimates are flagged for manual review</li>
        </ol>
      </div>
    </div>
  );
}
