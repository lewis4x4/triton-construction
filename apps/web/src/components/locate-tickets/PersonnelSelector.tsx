import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Building2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Search,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './PersonnelSelector.css';

interface CrewMember {
  id: string;
  first_name: string;
  last_name: string;
  trade_classification: string | null;
  employee_id: string | null;
  default_project_id: string | null;
  certStatus?: 'valid' | 'expiring' | 'expired' | 'missing' | 'unknown';
  certMessage?: string;
}

interface SubcontractorWorker {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string;
  subcontractor_id: string;
  has_osha_10: boolean;
  osha_10_exp: string | null;
  has_osha_30: boolean;
  osha_30_exp: string | null;
  is_competent_person: boolean;
  competent_person_types: string[] | null;
  certStatus?: 'valid' | 'expiring' | 'expired' | 'missing';
  certMessage?: string;
}

interface PersonnelSelectorProps {
  organizationId: string;
  projectId: string | null;
  checkDate: string;
  selectedCrewMembers: string[];
  selectedSubWorkers: string[];
  onCrewMembersChange: (ids: string[]) => void;
  onSubWorkersChange: (ids: string[]) => void;
}

export function PersonnelSelector({
  organizationId,
  projectId,
  checkDate,
  selectedCrewMembers,
  selectedSubWorkers,
  onCrewMembersChange,
  onSubWorkersChange,
}: PersonnelSelectorProps) {
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [subWorkers, setSubWorkers] = useState<SubcontractorWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllCrew, setShowAllCrew] = useState(false);
  const [showAllSubs, setShowAllSubs] = useState(false);
  const [crewSearch, setCrewSearch] = useState('');
  const [subSearch, setSubSearch] = useState('');
  const [crewExpanded, setCrewExpanded] = useState(true);
  const [subExpanded, setSubExpanded] = useState(true);

  // Load crew members
  useEffect(() => {
    async function loadCrewMembers() {
      try {
        let query = supabase
          .from('crew_members')
          .select('id, first_name, last_name, trade_classification, employee_id, default_project_id')
          .eq('organization_id', organizationId)
          .eq('is_active', true);

        // If project is selected and not showing all, filter by project
        if (projectId && !showAllCrew) {
          query = query.eq('default_project_id', projectId);
        }

        const { data, error } = await query.order('last_name');

        if (error) throw error;

        // Compute cert status for each crew member
        const membersWithStatus = await Promise.all(
          (data || []).map(async (member) => {
            if (!member.employee_id) {
              return {
                ...member,
                certStatus: 'unknown' as const,
                certMessage: 'No employee record linked',
              };
            }

            // Check certifications
            const { data: certs } = await supabase
              .from('employee_certifications')
              .select('certification_type, expiration_date, status')
              .eq('employee_id', member.employee_id)
              .in('certification_type', ['OSHA_10', 'OSHA_30', 'EXCAVATION_SAFETY'])
              .eq('status', 'active');

            if (!certs || certs.length === 0) {
              return {
                ...member,
                certStatus: 'missing' as const,
                certMessage: 'Missing OSHA certification',
              };
            }

            const checkDateObj = new Date(checkDate);
            const warningDate = new Date(checkDate);
            warningDate.setDate(warningDate.getDate() + 7);

            // Check for OSHA cert
            const oshaCert = certs.find(
              (c) => c.certification_type === 'OSHA_30' || c.certification_type === 'OSHA_10'
            );

            if (!oshaCert) {
              return {
                ...member,
                certStatus: 'missing' as const,
                certMessage: 'Missing OSHA 10/30',
              };
            }

            if (oshaCert.expiration_date) {
              const expDate = new Date(oshaCert.expiration_date);
              if (expDate < checkDateObj) {
                return {
                  ...member,
                  certStatus: 'expired' as const,
                  certMessage: `${oshaCert.certification_type} expired`,
                };
              }
              if (expDate < warningDate) {
                return {
                  ...member,
                  certStatus: 'expiring' as const,
                  certMessage: `${oshaCert.certification_type} expiring soon`,
                };
              }
            }

            return {
              ...member,
              certStatus: 'valid' as const,
              certMessage: 'Certifications valid',
            };
          })
        );

        setCrewMembers(membersWithStatus);
      } catch (err) {
        console.error('Error loading crew members:', err);
      }
    }

    if (organizationId) {
      loadCrewMembers();
    }
  }, [organizationId, projectId, showAllCrew, checkDate]);

  // Load subcontractor workers
  useEffect(() => {
    async function loadSubWorkers() {
      try {
        const { data, error } = await supabase
          .from('subcontractor_workers')
          .select(`
            id, first_name, last_name,
            has_osha_10, osha_10_exp,
            has_osha_30, osha_30_exp,
            is_competent_person, competent_person_types,
            subcontractor_id,
            subcontractors!inner(company_name, organization_id)
          `)
          .eq('subcontractors.organization_id', organizationId)
          .eq('is_active', true)
          .order('last_name');

        if (error) throw error;

        const checkDateObj = new Date(checkDate);
        const warningDate = new Date(checkDate);
        warningDate.setDate(warningDate.getDate() + 7);

        const workersWithStatus = (data || []).map((worker: any) => {
          let certStatus: 'valid' | 'expiring' | 'expired' | 'missing' = 'missing';
          let certMessage = 'Missing OSHA certification';

          const hasOsha = worker.has_osha_10 || worker.has_osha_30;

          if (hasOsha) {
            // Check expiration
            const oshaExp = worker.has_osha_30 ? worker.osha_30_exp : worker.osha_10_exp;
            const oshaType = worker.has_osha_30 ? 'OSHA 30' : 'OSHA 10';

            if (oshaExp) {
              const expDate = new Date(oshaExp);
              if (expDate < checkDateObj) {
                certStatus = 'expired';
                certMessage = `${oshaType} expired`;
              } else if (expDate < warningDate) {
                certStatus = 'expiring';
                certMessage = `${oshaType} expiring soon`;
              } else {
                certStatus = 'valid';
                certMessage = 'Certifications valid';
              }
            } else {
              // No expiration date means it's valid indefinitely
              certStatus = 'valid';
              certMessage = 'Certifications valid';
            }
          }

          return {
            id: worker.id,
            first_name: worker.first_name,
            last_name: worker.last_name,
            company_name: worker.subcontractors?.company_name || 'Unknown',
            subcontractor_id: worker.subcontractor_id,
            has_osha_10: worker.has_osha_10,
            osha_10_exp: worker.osha_10_exp,
            has_osha_30: worker.has_osha_30,
            osha_30_exp: worker.osha_30_exp,
            is_competent_person: worker.is_competent_person,
            competent_person_types: worker.competent_person_types,
            certStatus,
            certMessage,
          };
        });

        setSubWorkers(workersWithStatus);
      } catch (err) {
        console.error('Error loading sub workers:', err);
      } finally {
        setLoading(false);
      }
    }

    if (organizationId) {
      loadSubWorkers();
    }
  }, [organizationId, showAllSubs, checkDate]);

  // Filtered lists
  const filteredCrew = useMemo(() => {
    if (!crewSearch) return crewMembers;
    const search = crewSearch.toLowerCase();
    return crewMembers.filter(
      (m) =>
        m.first_name.toLowerCase().includes(search) ||
        m.last_name.toLowerCase().includes(search) ||
        m.trade_classification?.toLowerCase().includes(search)
    );
  }, [crewMembers, crewSearch]);

  const filteredSubs = useMemo(() => {
    if (!subSearch) return subWorkers;
    const search = subSearch.toLowerCase();
    return subWorkers.filter(
      (w) =>
        w.first_name.toLowerCase().includes(search) ||
        w.last_name.toLowerCase().includes(search) ||
        w.company_name.toLowerCase().includes(search)
    );
  }, [subWorkers, subSearch]);

  const toggleCrewMember = (id: string) => {
    if (selectedCrewMembers.includes(id)) {
      onCrewMembersChange(selectedCrewMembers.filter((i) => i !== id));
    } else {
      onCrewMembersChange([...selectedCrewMembers, id]);
    }
  };

  const toggleSubWorker = (id: string) => {
    if (selectedSubWorkers.includes(id)) {
      onSubWorkersChange(selectedSubWorkers.filter((i) => i !== id));
    } else {
      onSubWorkersChange([...selectedSubWorkers, id]);
    }
  };

  const selectAllCrew = () => {
    onCrewMembersChange(filteredCrew.map((m) => m.id));
  };

  const selectAllSubs = () => {
    onSubWorkersChange(filteredSubs.map((w) => w.id));
  };

  const getCertIcon = (status: string | undefined) => {
    switch (status) {
      case 'valid':
        return <CheckCircle size={14} className="cert-icon valid" />;
      case 'expiring':
        return <AlertTriangle size={14} className="cert-icon expiring" />;
      case 'expired':
      case 'missing':
        return <XCircle size={14} className="cert-icon invalid" />;
      default:
        return <AlertTriangle size={14} className="cert-icon unknown" />;
    }
  };

  const getTradeLabel = (trade: string | null) => {
    if (!trade) return '';
    return trade
      .replace(/_/g, ' ')
      .replace(/heo/gi, 'HEO')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  if (loading) {
    return (
      <div className="personnel-selector loading">
        <div className="loading-spinner" />
        <span>Loading personnel...</span>
      </div>
    );
  }

  return (
    <div className="personnel-selector">
      <div className="personnel-header">
        <h3>
          <UserCheck size={18} />
          Who Will Be Digging?
        </h3>
        <p className="personnel-subtitle">
          Select crew members and subcontractor workers to verify their certifications
        </p>
      </div>

      {/* Crew Members Section */}
      <div className="personnel-section">
        <div
          className="section-header"
          onClick={() => setCrewExpanded(!crewExpanded)}
        >
          <div className="section-title">
            <Users size={16} />
            <span>Crew Members</span>
            <span className="count-badge">
              {selectedCrewMembers.length}/{crewMembers.length}
            </span>
          </div>
          {crewExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>

        {crewExpanded && (
          <div className="section-content">
            <div className="section-controls">
              <div className="search-input">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Search crew..."
                  value={crewSearch}
                  onChange={(e) => setCrewSearch(e.target.value)}
                />
              </div>
              <div className="control-buttons">
                <button
                  className="control-btn"
                  onClick={selectAllCrew}
                  type="button"
                >
                  Select All
                </button>
                {projectId && (
                  <label className="show-all-toggle">
                    <input
                      type="checkbox"
                      checked={showAllCrew}
                      onChange={(e) => setShowAllCrew(e.target.checked)}
                    />
                    <span>Show All</span>
                  </label>
                )}
              </div>
            </div>

            {filteredCrew.length === 0 ? (
              <div className="empty-state">
                {projectId && !showAllCrew
                  ? 'No crew assigned to this project. Toggle "Show All" to see all crew.'
                  : 'No crew members found.'}
              </div>
            ) : (
              <div className="personnel-list">
                {filteredCrew.map((member) => (
                  <label
                    key={member.id}
                    className={`personnel-item ${selectedCrewMembers.includes(member.id) ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCrewMembers.includes(member.id)}
                      onChange={() => toggleCrewMember(member.id)}
                    />
                    <div className="personnel-info">
                      <span className="personnel-name">
                        {member.first_name} {member.last_name}
                      </span>
                      {member.trade_classification && (
                        <span className="personnel-role">
                          {getTradeLabel(member.trade_classification)}
                        </span>
                      )}
                    </div>
                    <div className={`cert-badge ${member.certStatus}`} title={member.certMessage}>
                      {getCertIcon(member.certStatus)}
                      <span>{member.certStatus === 'valid' ? 'OK' : member.certStatus}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Subcontractor Workers Section */}
      <div className="personnel-section">
        <div
          className="section-header"
          onClick={() => setSubExpanded(!subExpanded)}
        >
          <div className="section-title">
            <Building2 size={16} />
            <span>Subcontractor Workers</span>
            <span className="count-badge">
              {selectedSubWorkers.length}/{subWorkers.length}
            </span>
          </div>
          {subExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>

        {subExpanded && (
          <div className="section-content">
            <div className="section-controls">
              <div className="search-input">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Search workers..."
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                />
              </div>
              <div className="control-buttons">
                <button
                  className="control-btn"
                  onClick={selectAllSubs}
                  type="button"
                >
                  Select All
                </button>
              </div>
            </div>

            {filteredSubs.length === 0 ? (
              <div className="empty-state">No subcontractor workers found.</div>
            ) : (
              <div className="personnel-list">
                {filteredSubs.map((worker) => (
                  <label
                    key={worker.id}
                    className={`personnel-item ${selectedSubWorkers.includes(worker.id) ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSubWorkers.includes(worker.id)}
                      onChange={() => toggleSubWorker(worker.id)}
                    />
                    <div className="personnel-info">
                      <span className="personnel-name">
                        {worker.first_name} {worker.last_name}
                      </span>
                      <span className="personnel-role">{worker.company_name}</span>
                    </div>
                    <div className="personnel-badges">
                      {worker.is_competent_person && (
                        <span className="competent-badge" title="Competent Person">
                          <ShieldCheck size={12} />
                          CP
                        </span>
                      )}
                      <div className={`cert-badge ${worker.certStatus}`} title={worker.certMessage}>
                        {getCertIcon(worker.certStatus)}
                        <span>{worker.certStatus === 'valid' ? 'OK' : worker.certStatus}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selection Summary */}
      {(selectedCrewMembers.length > 0 || selectedSubWorkers.length > 0) && (
        <div className="selection-summary">
          <span className="summary-label">Selected:</span>
          <span className="summary-value">
            {selectedCrewMembers.length} crew, {selectedSubWorkers.length} sub workers
          </span>
        </div>
      )}
    </div>
  );
}
