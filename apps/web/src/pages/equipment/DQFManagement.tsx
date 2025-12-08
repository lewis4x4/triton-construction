import { useState, useEffect } from 'react';
import {
  FileText,
  User,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Plus,
  ChevronRight,
  Shield,
  Clock,
  Upload,
  Download,
  Eye,
  AlertOctagon,
  Award,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './DQFManagement.css';

interface DriverQualificationFile {
  id: string;
  driver_id: string;
  driver_name: string;
  employee_number: string;
  cdl_number: string;
  cdl_state: string;
  cdl_class: string;
  cdl_endorsements: string[];
  cdl_restrictions: string[];
  cdl_expiry: string;
  medical_card_expiry: string;
  medical_examiner_name: string;
  medical_examiner_number: string;
  mvr_date: string;
  mvr_status: string;
  annual_review_date: string;
  road_test_date: string;
  road_test_examiner: string;
  employment_verification_complete: boolean;
  previous_employer_count: number;
  drug_test_status: string;
  last_drug_test_date: string;
  dqf_status: string;
  status_reason: string;
  created_at: string;
  updated_at: string;
}

interface DQFDocument {
  id: string;
  dqf_id: string;
  document_type: string;
  document_name: string;
  expiry_date: string;
  issue_date: string;
  document_url: string;
  verified: boolean;
  verified_by: string;
  verified_at: string;
}

interface DQFStats {
  total: number;
  compliant: number;
  expiring: number;
  nonCompliant: number;
  medicalExpiring: number;
  mvrDue: number;
}

export function DQFManagement() {
  const [dqfRecords, setDqfRecords] = useState<DriverQualificationFile[]>([]);
  const [stats, setStats] = useState<DQFStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expiringFilter, setExpiringFilter] = useState<string>('all');
  const [selectedDQF, setSelectedDQF] = useState<DriverQualificationFile | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<DQFDocument[]>([]);

  useEffect(() => {
    loadDQFData();
  }, []);

  const loadDQFData = async () => {
    setIsLoading(true);
    try {
      // Load DQF records from the view
      const { data: dqfData, error: dqfError } = await (supabase as any)
        .from('v_dqf_compliance')
        .select('*')
        .order('driver_name');

      if (dqfError) throw dqfError;

      const dqfList: DriverQualificationFile[] = (dqfData || []).map((d: any) => ({
        id: d.id,
        driver_id: d.driver_id,
        driver_name: d.driver_name || 'Unknown',
        employee_number: d.employee_number,
        cdl_number: d.cdl_number,
        cdl_state: d.cdl_state,
        cdl_class: d.cdl_class,
        cdl_endorsements: d.cdl_endorsements || [],
        cdl_restrictions: d.cdl_restrictions || [],
        cdl_expiry: d.cdl_expiry,
        medical_card_expiry: d.medical_card_expiry,
        medical_examiner_name: d.medical_examiner_name,
        medical_examiner_number: d.medical_examiner_number,
        mvr_date: d.mvr_date,
        mvr_status: d.mvr_status,
        annual_review_date: d.annual_review_date,
        road_test_date: d.road_test_date,
        road_test_examiner: d.road_test_examiner,
        employment_verification_complete: d.employment_verification_complete,
        previous_employer_count: d.previous_employer_count,
        drug_test_status: d.drug_test_status,
        last_drug_test_date: d.last_drug_test_date,
        dqf_status: d.dqf_status || d.status,
        status_reason: d.status_reason,
        created_at: d.created_at,
        updated_at: d.updated_at,
      }));

      setDqfRecords(dqfList);

      // Calculate stats
      const now = new Date();
      const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const compliant = dqfList.filter(d => d.dqf_status === 'compliant').length;
      const nonCompliant = dqfList.filter(d => d.dqf_status === 'non_compliant' || d.dqf_status === 'expired').length;
      const expiring = dqfList.filter(d => d.dqf_status === 'expiring_soon').length;

      const medicalExpiring = dqfList.filter(d => {
        if (!d.medical_card_expiry) return false;
        const exp = new Date(d.medical_card_expiry);
        return exp > now && exp <= thirtyDays;
      }).length;

      const mvrDue = dqfList.filter(d => {
        if (!d.mvr_date) return true; // Never done
        const lastMvr = new Date(d.mvr_date);
        const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        return lastMvr < oneYearAgo;
      }).length;

      setStats({
        total: dqfList.length,
        compliant,
        expiring,
        nonCompliant,
        medicalExpiring,
        mvrDue,
      });
    } catch (err) {
      console.error('Error loading DQF data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDocuments = async (dqfId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('dqf_documents')
        .select('*')
        .eq('dqf_id', dqfId)
        .order('expiry_date');

      if (error) throw error;

      setSelectedDocs((data || []) as DQFDocument[]);
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  };

  const handleSelectDQF = async (dqf: DriverQualificationFile) => {
    setSelectedDQF(dqf);
    await loadDocuments(dqf.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'status-compliant';
      case 'expiring_soon': return 'status-expiring';
      case 'non_compliant': return 'status-non-compliant';
      case 'expired': return 'status-expired';
      default: return 'status-unknown';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  const isExpiringSoon = (dateStr: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return date > now && date <= thirtyDays;
  };

  const isExpired = (dateStr: string) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'cdl_copy': 'CDL Copy',
      'medical_card': 'Medical Card',
      'mvr': 'Motor Vehicle Record',
      'road_test': 'Road Test Certificate',
      'employment_app': 'Employment Application',
      'previous_employer': 'Previous Employer Verification',
      'drug_test': 'Drug Test Results',
      'annual_review': 'Annual Review',
      'training_cert': 'Training Certificate',
    };
    return labels[type] || type;
  };

  const filteredRecords = dqfRecords.filter(d => {
    const matchesSearch = searchTerm === '' ||
      d.driver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.cdl_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.employee_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || d.dqf_status === statusFilter;

    let matchesExpiring = true;
    if (expiringFilter === 'medical') {
      matchesExpiring = isExpiringSoon(d.medical_card_expiry) || isExpired(d.medical_card_expiry);
    } else if (expiringFilter === 'cdl') {
      matchesExpiring = isExpiringSoon(d.cdl_expiry) || isExpired(d.cdl_expiry);
    } else if (expiringFilter === 'mvr') {
      if (!d.mvr_date) matchesExpiring = true;
      else {
        const oneYearAgo = new Date(new Date().getTime() - 365 * 24 * 60 * 60 * 1000);
        matchesExpiring = new Date(d.mvr_date) < oneYearAgo;
      }
    }

    return matchesSearch && matchesStatus && matchesExpiring;
  });

  return (
    <div className="dqf-management-page">
      <div className="page-header">
        <div className="header-content">
          <h1><FileText size={28} /> Driver Qualification Files</h1>
          <p>Manage CDL credentials, medical cards, MVRs, and compliance documents</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={loadDQFData}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn btn-primary">
            <Plus size={16} /> New DQF
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon total"><User size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Total Drivers</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon compliant"><CheckCircle size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.compliant}</span>
              <span className="stat-label">Compliant</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon expiring"><Clock size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.expiring}</span>
              <span className="stat-label">Expiring Soon</span>
            </div>
          </div>
          <div className={`stat-card ${stats.nonCompliant > 0 ? 'alert' : ''}`}>
            <div className="stat-icon non-compliant"><XCircle size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.nonCompliant}</span>
              <span className="stat-label">Non-Compliant</span>
            </div>
          </div>
          <div className={`stat-card ${stats.mvrDue > 0 ? 'warning' : ''}`}>
            <div className="stat-icon mvr"><FileText size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.mvrDue}</span>
              <span className="stat-label">MVR Due</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by driver name, CDL #, employee #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={16} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="compliant">Compliant</option>
            <option value="expiring_soon">Expiring Soon</option>
            <option value="non_compliant">Non-Compliant</option>
            <option value="expired">Expired</option>
          </select>
          <select value={expiringFilter} onChange={(e) => setExpiringFilter(e.target.value)}>
            <option value="all">All Items</option>
            <option value="medical">Medical Expiring</option>
            <option value="cdl">CDL Expiring</option>
            <option value="mvr">MVR Due</option>
          </select>
        </div>
      </div>

      {/* DQF List */}
      <div className="dqf-list">
        {isLoading ? (
          <div className="loading-state">
            <RefreshCw className="spinning" size={32} />
            <p>Loading driver files...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <p>No driver qualification files found</p>
          </div>
        ) : (
          filteredRecords.map(dqf => (
            <div
              key={dqf.id}
              className={`dqf-card ${selectedDQF?.id === dqf.id ? 'selected' : ''}`}
              onClick={() => handleSelectDQF(dqf)}
            >
              <div className="dqf-header">
                <div className="dqf-identity">
                  <div className="driver-avatar">
                    <User size={20} />
                  </div>
                  <div className="driver-info">
                    <span className="driver-name">{dqf.driver_name}</span>
                    <span className="employee-number">{dqf.employee_number}</span>
                  </div>
                  <span className={`status-badge ${getStatusColor(dqf.dqf_status)}`}>
                    {dqf.dqf_status === 'compliant' && <CheckCircle size={14} />}
                    {dqf.dqf_status === 'expiring_soon' && <Clock size={14} />}
                    {(dqf.dqf_status === 'non_compliant' || dqf.dqf_status === 'expired') && <XCircle size={14} />}
                    {dqf.dqf_status?.replace('_', ' ')}
                  </span>
                </div>
                <ChevronRight size={20} className="chevron" />
              </div>

              <div className="dqf-credentials">
                <div className="credential-item">
                  <Award size={14} />
                  <span className="credential-label">CDL</span>
                  <span className="credential-value">
                    {dqf.cdl_class} - {dqf.cdl_state}
                  </span>
                  <span className={`exp-date ${isExpired(dqf.cdl_expiry) ? 'expired' : isExpiringSoon(dqf.cdl_expiry) ? 'expiring' : ''}`}>
                    Exp: {formatDate(dqf.cdl_expiry)}
                  </span>
                </div>
                <div className="credential-item">
                  <Shield size={14} />
                  <span className="credential-label">Medical</span>
                  <span className={`exp-date ${isExpired(dqf.medical_card_expiry) ? 'expired' : isExpiringSoon(dqf.medical_card_expiry) ? 'expiring' : ''}`}>
                    Exp: {formatDate(dqf.medical_card_expiry)}
                  </span>
                </div>
                <div className="credential-item">
                  <FileText size={14} />
                  <span className="credential-label">MVR</span>
                  <span className="credential-value">
                    {formatDate(dqf.mvr_date)}
                  </span>
                </div>
              </div>

              {dqf.cdl_endorsements && dqf.cdl_endorsements.length > 0 && (
                <div className="endorsements">
                  {dqf.cdl_endorsements.map((e: string, i: number) => (
                    <span key={i} className="endorsement-tag">{e}</span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Detail Panel */}
      {selectedDQF && (
        <div className="detail-panel">
          <div className="panel-header">
            <h2>{selectedDQF.driver_name}</h2>
            <button className="close-btn" onClick={() => setSelectedDQF(null)}>&times;</button>
          </div>
          <div className="panel-content">
            <div className="driver-status-banner">
              <div className={`status-indicator ${getStatusColor(selectedDQF.dqf_status)}`}>
                {selectedDQF.dqf_status === 'compliant' && <CheckCircle size={20} />}
                {selectedDQF.dqf_status === 'expiring_soon' && <Clock size={20} />}
                {(selectedDQF.dqf_status === 'non_compliant' || selectedDQF.dqf_status === 'expired') && <XCircle size={20} />}
                <span>{selectedDQF.dqf_status?.replace('_', ' ')}</span>
              </div>
              {selectedDQF.status_reason && (
                <p className="status-reason">{selectedDQF.status_reason}</p>
              )}
            </div>

            <div className="detail-section">
              <h3>CDL Information</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>CDL Number</label>
                  <span>{selectedDQF.cdl_number || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>State</label>
                  <span>{selectedDQF.cdl_state || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Class</label>
                  <span>{selectedDQF.cdl_class || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Expiry</label>
                  <span className={isExpired(selectedDQF.cdl_expiry) ? 'expired-text' : ''}>
                    {formatDate(selectedDQF.cdl_expiry)}
                  </span>
                </div>
                {selectedDQF.cdl_endorsements && selectedDQF.cdl_endorsements.length > 0 && (
                  <div className="detail-item full">
                    <label>Endorsements</label>
                    <div className="tag-list">
                      {selectedDQF.cdl_endorsements.map((e: string, i: number) => (
                        <span key={i} className="tag">{e}</span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedDQF.cdl_restrictions && selectedDQF.cdl_restrictions.length > 0 && (
                  <div className="detail-item full">
                    <label>Restrictions</label>
                    <div className="tag-list warning">
                      {selectedDQF.cdl_restrictions.map((r: string, i: number) => (
                        <span key={i} className="tag warning">{r}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="detail-section">
              <h3>Medical Certification</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Card Expiry</label>
                  <span className={isExpired(selectedDQF.medical_card_expiry) ? 'expired-text' : ''}>
                    {formatDate(selectedDQF.medical_card_expiry)}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Examiner</label>
                  <span>{selectedDQF.medical_examiner_name || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>National Registry #</label>
                  <span>{selectedDQF.medical_examiner_number || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3>Compliance Items</h3>
              <div className="compliance-checklist">
                <div className={`checklist-item ${selectedDQF.mvr_date ? 'complete' : 'incomplete'}`}>
                  {selectedDQF.mvr_date ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  <span>MVR on file ({formatDate(selectedDQF.mvr_date)})</span>
                </div>
                <div className={`checklist-item ${selectedDQF.road_test_date ? 'complete' : 'incomplete'}`}>
                  {selectedDQF.road_test_date ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  <span>Road test completed ({formatDate(selectedDQF.road_test_date)})</span>
                </div>
                <div className={`checklist-item ${selectedDQF.employment_verification_complete ? 'complete' : 'incomplete'}`}>
                  {selectedDQF.employment_verification_complete ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  <span>Employment verification complete</span>
                </div>
                <div className={`checklist-item ${selectedDQF.annual_review_date ? 'complete' : 'incomplete'}`}>
                  {selectedDQF.annual_review_date ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  <span>Annual review ({formatDate(selectedDQF.annual_review_date)})</span>
                </div>
                <div className={`checklist-item ${selectedDQF.drug_test_status === 'negative' ? 'complete' : 'incomplete'}`}>
                  {selectedDQF.drug_test_status === 'negative' ? <CheckCircle size={16} /> : <AlertOctagon size={16} />}
                  <span>Drug test: {selectedDQF.drug_test_status || 'Pending'}</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3>Documents ({selectedDocs.length})</h3>
              {selectedDocs.length === 0 ? (
                <p className="no-docs">No documents uploaded yet</p>
              ) : (
                <div className="documents-list">
                  {selectedDocs.map(doc => (
                    <div key={doc.id} className="document-item">
                      <FileText size={16} />
                      <div className="doc-info">
                        <span className="doc-type">{getDocumentTypeLabel(doc.document_type)}</span>
                        {doc.expiry_date && (
                          <span className={`doc-expiry ${isExpired(doc.expiry_date) ? 'expired' : ''}`}>
                            Exp: {formatDate(doc.expiry_date)}
                          </span>
                        )}
                      </div>
                      {doc.verified && (
                        <span className="verified-badge"><CheckCircle size={12} /> Verified</span>
                      )}
                      <button className="btn-icon"><Eye size={16} /></button>
                    </div>
                  ))}
                </div>
              )}
              <button className="btn btn-secondary upload-btn">
                <Upload size={16} /> Upload Document
              </button>
            </div>
          </div>
          <div className="panel-actions">
            <button className="btn btn-secondary">
              <Download size={16} /> Export DQF
            </button>
            <button className="btn btn-primary">Edit DQF</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DQFManagement;
