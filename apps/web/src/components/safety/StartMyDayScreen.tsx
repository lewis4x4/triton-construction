// =============================================================================
// Component: StartMyDayScreen
// Purpose: Mobile-first supervisor entry point for daily operations
// Part of Safety Compliance Enforcement System - "The Gatekeeper"
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  Sun,
  Shield,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  Camera,
  AlertOctagon,
  Phone,
  ClipboardCheck,
  HardHat,
  Wrench,
  Calendar,
  MapPin,
  RefreshCw,
  Play,
  Award,
  FileText,
  Loader2,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import { DailySafetyBriefForm } from './DailySafetyBriefForm';
import './StartMyDayScreen.css';

interface StartMyDayScreenProps {
  projectId: string;
  projectName: string;
  onNavigate?: (route: string) => void;
}

interface CrewMember {
  id: string;
  name: string;
  status: 'ready' | 'warning' | 'blocked';
  issues: string[];
}

interface BlockingIssue {
  id: string;
  type: 'certification' | 'orientation' | 'coi' | 'competent_person' | 'equipment';
  severity: 'critical' | 'warning';
  message: string;
  entityName: string;
}

interface TodayStats {
  crewTotal: number;
  crewReady: number;
  crewWarnings: number;
  crewBlocked: number;
  briefCompleted: boolean;
  briefTime?: string;
  toolboxTalkScheduled?: string;
  weatherCondition: string;
  temperature?: number;
}

export const StartMyDayScreen: React.FC<StartMyDayScreenProps> = ({
  projectId,
  projectName,
  onNavigate,
}) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TodayStats | null>(null);
  const [blockingIssues, setBlockingIssues] = useState<BlockingIssue[]>([]);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [showBriefForm, setShowBriefForm] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadDayData();

    // Update clock every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, [projectId]);

  const loadDayData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCrewStatus(),
        loadBriefStatus(),
        loadBlockingIssues(),
      ]);
    } catch (error) {
      console.error('Error loading day data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCrewStatus = async () => {
    // Get today's crew assignment
    const today = new Date().toISOString().split('T')[0];

    const { data: assignment } = await supabase
      .from('crew_assignments')
      .select(`
        id,
        crew_assignment_members (
          employee_id,
          employees (
            id, first_name, last_name, display_name, compliance_status,
            employee_certifications (
              certification_type, expires_at, status
            )
          )
        )
      `)
      .eq('project_id', projectId)
      .eq('work_date', today)
      .single();

    if (assignment?.crew_assignment_members) {
      const members: CrewMember[] = assignment.crew_assignment_members.map((m: any) => {
        const emp = m.employees;
        const issues: string[] = [];
        let status: 'ready' | 'warning' | 'blocked' = 'ready';

        // Check compliance status
        if (emp.compliance_status === 'non_compliant') {
          status = 'blocked';
          issues.push('Non-compliant');
        } else if (emp.compliance_status !== 'compliant') {
          status = 'warning';
          issues.push(`Status: ${emp.compliance_status}`);
        }

        // Check expiring certs
        const now = new Date();
        const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        emp.employee_certifications?.forEach((cert: any) => {
          if (cert.status === 'active' && cert.expires_at) {
            const expDate = new Date(cert.expires_at);
            if (expDate < now) {
              status = 'blocked';
              issues.push(`${cert.certification_type} expired`);
            } else if (expDate < sevenDays) {
              if (status !== 'blocked') status = 'warning';
              issues.push(`${cert.certification_type} expires soon`);
            }
          }
        });

        return {
          id: emp.id,
          name: emp.display_name || `${emp.first_name} ${emp.last_name}`,
          status,
          issues,
        };
      });

      setCrewMembers(members);
      setStats(prev => ({
        ...prev!,
        crewTotal: members.length,
        crewReady: members.filter(m => m.status === 'ready').length,
        crewWarnings: members.filter(m => m.status === 'warning').length,
        crewBlocked: members.filter(m => m.status === 'blocked').length,
        briefCompleted: prev?.briefCompleted || false,
        weatherCondition: prev?.weatherCondition || 'clear',
      }));
    } else {
      setStats({
        crewTotal: 0,
        crewReady: 0,
        crewWarnings: 0,
        crewBlocked: 0,
        briefCompleted: false,
        weatherCondition: 'clear',
      });
    }
  };

  const loadBriefStatus = async () => {
    const today = new Date().toISOString().split('T')[0];

    const { data: brief } = await supabase
      .from('daily_safety_briefs')
      .select('id, completed_at, all_required_complete')
      .eq('project_id', projectId)
      .eq('brief_date', today)
      .single();

    if (brief) {
      setStats(prev => ({
        ...prev!,
        briefCompleted: brief.all_required_complete,
        briefTime: brief.completed_at
          ? new Date(brief.completed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : undefined,
      }));
    }
  };

  const loadBlockingIssues = async () => {
    const issues: BlockingIssue[] = [];
    const today = new Date().toISOString().split('T')[0];

    // Check for expired/missing certifications for today's crew
    const { data: assignment } = await supabase
      .from('crew_assignments')
      .select(`
        work_type,
        crew_assignment_members (
          employee_id,
          employees (first_name, last_name, display_name)
        )
      `)
      .eq('project_id', projectId)
      .eq('work_date', today)
      .single();

    if (assignment) {
      // Check competent person for work type
      const { data: rules } = await supabase
        .from('assignment_validation_rules')
        .select('*')
        .contains('work_type', [assignment.work_type || ''])
        .eq('is_active', true)
        .eq('blocking_behavior', 'block');

      if (rules && rules.length > 0) {
        for (const rule of rules) {
          if (rule.required_competent_person_types?.length > 0) {
            const { count } = await supabase
              .from('competent_person_designations')
              .select('*', { count: 'exact', head: true })
              .eq('project_id', projectId)
              .in('competency_type', rule.required_competent_person_types)
              .gte('designation_end_date', today);

            if (!count || count === 0) {
              issues.push({
                id: `cp-${rule.id}`,
                type: 'competent_person',
                severity: 'critical',
                message: `No competent person designated for ${rule.required_competent_person_types.join(', ')}`,
                entityName: rule.rule_name,
              });
            }
          }
        }
      }
    }

    // Check expiring COIs for active subs
    const { data: subs } = await supabase
      .from('subcontractors')
      .select('id, company_name, general_liability_exp, workers_comp_exp')
      .is('deleted_at', null);

    subs?.forEach(sub => {
      const today = new Date();
      if (sub.general_liability_exp && new Date(sub.general_liability_exp) < today) {
        issues.push({
          id: `coi-gl-${sub.id}`,
          type: 'coi',
          severity: 'critical',
          message: 'General Liability insurance expired',
          entityName: sub.company_name,
        });
      }
      if (sub.workers_comp_exp && new Date(sub.workers_comp_exp) < today) {
        issues.push({
          id: `coi-wc-${sub.id}`,
          type: 'coi',
          severity: 'critical',
          message: 'Workers Comp insurance expired',
          entityName: sub.company_name,
        });
      }
    });

    setBlockingIssues(issues);
  };

  const handleBriefComplete = (briefId: string) => {
    setShowBriefForm(false);
    loadDayData();
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getReadinessColor = () => {
    if (!stats) return 'gray';
    if (stats.crewBlocked > 0) return 'red';
    if (stats.crewWarnings > 0) return 'yellow';
    return 'green';
  };

  if (showBriefForm) {
    return (
      <DailySafetyBriefForm
        projectId={projectId}
        projectName={projectName}
        onComplete={handleBriefComplete}
        onCancel={() => setShowBriefForm(false)}
      />
    );
  }

  if (loading) {
    return (
      <div className="smd-screen loading">
        <Loader2 className="spinner" size={40} />
        <p>Loading your day...</p>
      </div>
    );
  }

  return (
    <div className="smd-screen">
      {/* Header */}
      <header className="smd-header">
        <div className="header-greeting">
          <Sun size={24} />
          <div>
            <h1>{getGreeting()}</h1>
            <p>{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
        <div className="header-time">
          {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </div>
      </header>

      {/* Project Info */}
      <div className="project-bar">
        <MapPin size={16} />
        <span>{projectName}</span>
      </div>

      {/* Crew Readiness */}
      <div className={`readiness-card ${getReadinessColor()}`}>
        <div className="readiness-header">
          <h2>Crew Readiness</h2>
          <button className="refresh-btn" onClick={loadDayData}>
            <RefreshCw size={18} />
          </button>
        </div>
        <div className="readiness-visual">
          <div className={`readiness-ring ${getReadinessColor()}`}>
            <span className="ring-number">{stats?.crewReady || 0}</span>
            <span className="ring-label">Ready</span>
          </div>
          {(stats?.crewWarnings || 0) > 0 && (
            <div className="issue-badge warning">
              <AlertTriangle size={16} />
              {stats?.crewWarnings} warnings
            </div>
          )}
          {(stats?.crewBlocked || 0) > 0 && (
            <div className="issue-badge blocked">
              <XCircle size={16} />
              {stats?.crewBlocked} blocked
            </div>
          )}
        </div>
        <div className="crew-total">
          {stats?.crewTotal || 0} crew members assigned today
        </div>
      </div>

      {/* Blocking Issues */}
      {blockingIssues.length > 0 && (
        <div className="blocking-issues">
          <h3>
            <AlertOctagon size={18} />
            Blocking Issues ({blockingIssues.length})
          </h3>
          <div className="issues-list">
            {blockingIssues.slice(0, 3).map(issue => (
              <div key={issue.id} className={`issue-item ${issue.severity}`}>
                <div className="issue-icon">
                  {issue.type === 'certification' && <Award size={18} />}
                  {issue.type === 'coi' && <Shield size={18} />}
                  {issue.type === 'competent_person' && <HardHat size={18} />}
                  {issue.type === 'orientation' && <ClipboardCheck size={18} />}
                </div>
                <div className="issue-content">
                  <div className="issue-entity">{issue.entityName}</div>
                  <div className="issue-message">{issue.message}</div>
                </div>
              </div>
            ))}
            {blockingIssues.length > 3 && (
              <button className="see-all-btn">
                See all {blockingIssues.length} issues
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Daily Brief CTA */}
      <div className="brief-cta">
        {stats?.briefCompleted ? (
          <div className="brief-completed">
            <CheckCircle size={24} />
            <div>
              <div className="brief-status">Daily Brief Completed</div>
              <div className="brief-time">{stats.briefTime}</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowBriefForm(true)}>
              Update
            </button>
          </div>
        ) : (
          <button
            className="btn btn-brief"
            onClick={() => setShowBriefForm(true)}
          >
            <Play size={20} />
            <div>
              <div className="brief-cta-title">Run Daily Brief</div>
              <div className="brief-cta-sub">30-second safety checklist</div>
            </div>
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      {/* Today's Toolbox Talk */}
      {stats?.toolboxTalkScheduled && (
        <div className="toolbox-reminder">
          <Calendar size={18} />
          <div>
            <div className="reminder-title">Toolbox Talk Scheduled</div>
            <div className="reminder-time">{stats.toolboxTalkScheduled}</div>
          </div>
          <ChevronRight size={18} />
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          <button className="action-btn" onClick={() => onNavigate?.('/workforce/incident-report')}>
            <AlertOctagon size={22} />
            <span>Report Incident</span>
          </button>
          <button className="action-btn" onClick={() => onNavigate?.('/workforce/toolbox-talk')}>
            <ClipboardCheck size={22} />
            <span>Toolbox Talk</span>
          </button>
          <button className="action-btn" onClick={() => onNavigate?.('/workforce/crew-builder')}>
            <Users size={22} />
            <span>Crew Builder</span>
          </button>
          <button className="action-btn">
            <Camera size={22} />
            <span>Safety Photo</span>
          </button>
        </div>
      </div>

      {/* Crew List (Collapsed by default) */}
      {crewMembers.length > 0 && (
        <details className="crew-list">
          <summary>
            <Users size={18} />
            Today's Crew ({crewMembers.length})
            <ChevronRight className="chevron" size={18} />
          </summary>
          <div className="crew-items">
            {crewMembers.map(member => (
              <div key={member.id} className={`crew-item ${member.status}`}>
                <div className="crew-status">
                  {member.status === 'ready' && <CheckCircle size={16} />}
                  {member.status === 'warning' && <AlertTriangle size={16} />}
                  {member.status === 'blocked' && <XCircle size={16} />}
                </div>
                <div className="crew-info">
                  <div className="crew-name">{member.name}</div>
                  {member.issues.length > 0 && (
                    <div className="crew-issues">{member.issues.join(', ')}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Emergency Contact */}
      <a href="tel:911" className="emergency-btn">
        <Phone size={18} />
        Emergency: 911
      </a>
    </div>
  );
};

export default StartMyDayScreen;
