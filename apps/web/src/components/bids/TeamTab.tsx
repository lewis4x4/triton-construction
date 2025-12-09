import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@triton/supabase-client';
import './TeamTab.css';

interface TeamTabProps {
  projectId: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  can_edit_line_items: boolean;
  can_edit_risks: boolean;
  can_edit_questions: boolean;
  can_run_ai_analysis: boolean;
  can_generate_snapshots: boolean;
  can_upload_documents: boolean;
  created_at: string;
  user_profiles?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

const ROLES = [
  { value: 'PROJECT_MANAGER', label: 'Project Manager', description: 'Full edit access to all bid data' },
  { value: 'ESTIMATOR', label: 'Estimator', description: 'Can edit line items, risks, and questions' },
  { value: 'EXECUTIVE', label: 'Executive', description: 'Read-only with snapshot access' },
  { value: 'VIEWER', label: 'Viewer', description: 'Read-only access' },
];

export function TeamTab({ projectId }: TeamTabProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add member state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('ESTIMATOR');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit member state
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editRole, setEditRole] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Action state
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('bid_project_members')
        .select(`
          id,
          user_id,
          role,
          can_edit_line_items,
          can_edit_risks,
          can_edit_questions,
          can_run_ai_analysis,
          can_generate_snapshots,
          can_upload_documents,
          created_at,
          user_profiles (
            id,
            email,
            first_name,
            last_name
          )
        `)
        .eq('bid_project_id', projectId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setMembers((data || []) as unknown as TeamMember[]);
    } catch (err) {
      console.error('Error fetching team members:', err);
      setError('Failed to load team members');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const fetchAvailableUsers = useCallback(async () => {
    try {
      // Get all users in the organization
      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name')
        .eq('status', 'ACTIVE')
        .order('last_name');

      if (fetchError) throw fetchError;
      setAvailableUsers((data || []) as User[]);
    } catch (err) {
      console.error('Error fetching available users:', err);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
    fetchAvailableUsers();
  }, [fetchMembers, fetchAvailableUsers]);

  const handleAddMember = async () => {
    if (!selectedUserId) return;

    setIsAdding(true);
    setAddError(null);

    try {
      // Check if user is already a member
      const existingMember = members.find(m => m.user_id === selectedUserId);
      if (existingMember) {
        throw new Error('User is already a team member');
      }

      const { error: insertError } = await supabase
        .from('bid_project_members')
        .insert({
          bid_project_id: projectId,
          user_id: selectedUserId,
          role: selectedRole,
        });

      if (insertError) throw insertError;

      setShowAddModal(false);
      setSelectedUserId('');
      setSelectedRole('ESTIMATOR');
      await fetchMembers();
    } catch (err) {
      console.error('Error adding team member:', err);
      setAddError(err instanceof Error ? err.message : 'Failed to add team member');
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingMember || !editRole) return;

    setIsUpdating(true);

    try {
      const { error: updateError } = await supabase
        .from('bid_project_members')
        .update({ role: editRole })
        .eq('id', editingMember.id);

      if (updateError) throw updateError;

      setEditingMember(null);
      setEditRole('');
      await fetchMembers();
    } catch (err) {
      console.error('Error updating role:', err);
      setError('Failed to update role');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;

    setActionInProgress(memberId);

    try {
      const { error: deleteError } = await supabase
        .from('bid_project_members')
        .delete()
        .eq('id', memberId);

      if (deleteError) throw deleteError;
      await fetchMembers();
    } catch (err) {
      console.error('Error removing team member:', err);
      setError('Failed to remove team member');
    } finally {
      setActionInProgress(null);
    }
  };

  const openEditModal = (member: TeamMember) => {
    setEditingMember(member);
    setEditRole(member.role);
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'PROJECT_MANAGER':
        return 'role-badge role-pm';
      case 'ESTIMATOR':
        return 'role-badge role-estimator';
      case 'EXECUTIVE':
        return 'role-badge role-executive';
      case 'VIEWER':
        return 'role-badge role-viewer';
      default:
        return 'role-badge';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Filter out users who are already members
  const usersNotOnTeam = availableUsers.filter(
    user => !members.some(member => member.user_id === user.id)
  );

  if (isLoading) {
    return (
      <div className="team-tab">
        <div className="team-loading">
          <div className="loading-spinner" />
          <span>Loading team members...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="team-tab">
      {/* Header */}
      <div className="team-header">
        <div className="team-stats">
          <div className="stat-item">
            <span className="stat-value">{members.length}</span>
            <span className="stat-label">Team Members</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">
              {members.filter(m => m.role === 'PROJECT_MANAGER').length}
            </span>
            <span className="stat-label">Managers</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">
              {members.filter(m => m.role === 'ESTIMATOR').length}
            </span>
            <span className="stat-label">Estimators</span>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="btn-add-member"
            onClick={() => setShowAddModal(true)}
          >
            + Add Team Member
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Team Members List */}
      {members.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">👥</span>
          <h4>No Team Members</h4>
          <p>Add team members to collaborate on this bid project.</p>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            Add First Member
          </button>
        </div>
      ) : (
        <div className="members-list">
          {members.map((member) => (
            <div key={member.id} className="member-card">
              <div className="member-info">
                <div className="member-avatar">
                  {member.user_profiles?.first_name?.[0] || '?'}
                  {member.user_profiles?.last_name?.[0] || '?'}
                </div>
                <div className="member-details">
                  <h4 className="member-name">
                    {member.user_profiles?.first_name} {member.user_profiles?.last_name}
                  </h4>
                  <span className="member-email">{member.user_profiles?.email}</span>
                </div>
              </div>

              <div className="member-role">
                <span className={getRoleBadgeClass(member.role)}>
                  {ROLES.find(r => r.value === member.role)?.label || member.role}
                </span>
              </div>

              <div className="member-permissions">
                <span className="permissions-label">Permissions:</span>
                <div className="permission-tags">
                  {member.can_edit_line_items && <span className="permission-tag">Line Items</span>}
                  {member.can_edit_risks && <span className="permission-tag">Risks</span>}
                  {member.can_edit_questions && <span className="permission-tag">Questions</span>}
                  {member.can_run_ai_analysis && <span className="permission-tag">AI Analysis</span>}
                  {member.can_generate_snapshots && <span className="permission-tag">Snapshots</span>}
                  {member.can_upload_documents && <span className="permission-tag">Documents</span>}
                  {!member.can_edit_line_items && !member.can_edit_risks && !member.can_edit_questions &&
                   !member.can_run_ai_analysis && !member.can_generate_snapshots && !member.can_upload_documents && (
                    <span className="permission-tag readonly">Read Only</span>
                  )}
                </div>
              </div>

              <div className="member-meta">
                <span className="joined-date">Added {formatDate(member.created_at)}</span>
              </div>

              <div className="member-actions">
                <button
                  className="action-btn edit"
                  onClick={() => openEditModal(member)}
                  disabled={actionInProgress === member.id}
                  title="Edit Role"
                >
                  Edit
                </button>
                <button
                  className="action-btn remove"
                  onClick={() => handleRemoveMember(member.id)}
                  disabled={actionInProgress === member.id}
                  title="Remove from Team"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Team Member</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              {addError && <div className="form-error">{addError}</div>}

              <div className="form-group">
                <label>Select User</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="form-select"
                >
                  <option value="">Choose a user...</option>
                  {usersNotOnTeam.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email})
                    </option>
                  ))}
                </select>
                {usersNotOnTeam.length === 0 && (
                  <span className="form-hint">All users are already on this team</span>
                )}
              </div>

              <div className="form-group">
                <label>Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="form-select"
                >
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <span className="form-hint">
                  {ROLES.find(r => r.value === selectedRole)?.description}
                </span>
              </div>

              <div className="role-permissions-preview">
                <h5>Role Permissions</h5>
                <div className="permissions-grid">
                  <div className={`permission-item ${selectedRole === 'PROJECT_MANAGER' || selectedRole === 'ESTIMATOR' ? 'granted' : ''}`}>
                    <span className="permission-icon">{selectedRole === 'PROJECT_MANAGER' || selectedRole === 'ESTIMATOR' ? '✓' : '✕'}</span>
                    Edit Line Items
                  </div>
                  <div className={`permission-item ${selectedRole === 'PROJECT_MANAGER' || selectedRole === 'ESTIMATOR' ? 'granted' : ''}`}>
                    <span className="permission-icon">{selectedRole === 'PROJECT_MANAGER' || selectedRole === 'ESTIMATOR' ? '✓' : '✕'}</span>
                    Edit Risks
                  </div>
                  <div className={`permission-item ${selectedRole === 'PROJECT_MANAGER' || selectedRole === 'ESTIMATOR' ? 'granted' : ''}`}>
                    <span className="permission-icon">{selectedRole === 'PROJECT_MANAGER' || selectedRole === 'ESTIMATOR' ? '✓' : '✕'}</span>
                    Edit Questions
                  </div>
                  <div className={`permission-item ${selectedRole === 'PROJECT_MANAGER' || selectedRole === 'ESTIMATOR' ? 'granted' : ''}`}>
                    <span className="permission-icon">{selectedRole === 'PROJECT_MANAGER' || selectedRole === 'ESTIMATOR' ? '✓' : '✕'}</span>
                    Run AI Analysis
                  </div>
                  <div className={`permission-item ${selectedRole === 'PROJECT_MANAGER' || selectedRole === 'EXECUTIVE' ? 'granted' : ''}`}>
                    <span className="permission-icon">{selectedRole === 'PROJECT_MANAGER' || selectedRole === 'EXECUTIVE' ? '✓' : '✕'}</span>
                    Generate Snapshots
                  </div>
                  <div className={`permission-item ${selectedRole === 'PROJECT_MANAGER' || selectedRole === 'ESTIMATOR' ? 'granted' : ''}`}>
                    <span className="permission-icon">{selectedRole === 'PROJECT_MANAGER' || selectedRole === 'ESTIMATOR' ? '✓' : '✕'}</span>
                    Upload Documents
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowAddModal(false)}
                disabled={isAdding}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddMember}
                disabled={!selectedUserId || isAdding}
              >
                {isAdding ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editingMember && (
        <div className="modal-overlay" onClick={() => setEditingMember(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Role</h3>
              <button className="modal-close" onClick={() => setEditingMember(null)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="edit-member-info">
                <div className="member-avatar large">
                  {editingMember.user_profiles?.first_name?.[0] || '?'}
                  {editingMember.user_profiles?.last_name?.[0] || '?'}
                </div>
                <div>
                  <h4>{editingMember.user_profiles?.first_name} {editingMember.user_profiles?.last_name}</h4>
                  <span className="member-email">{editingMember.user_profiles?.email}</span>
                </div>
              </div>

              <div className="form-group">
                <label>Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="form-select"
                >
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <span className="form-hint">
                  {ROLES.find(r => r.value === editRole)?.description}
                </span>
              </div>

              <div className="role-permissions-preview">
                <h5>Updated Permissions</h5>
                <div className="permissions-grid">
                  <div className={`permission-item ${editRole === 'PROJECT_MANAGER' || editRole === 'ESTIMATOR' ? 'granted' : ''}`}>
                    <span className="permission-icon">{editRole === 'PROJECT_MANAGER' || editRole === 'ESTIMATOR' ? '✓' : '✕'}</span>
                    Edit Line Items
                  </div>
                  <div className={`permission-item ${editRole === 'PROJECT_MANAGER' || editRole === 'ESTIMATOR' ? 'granted' : ''}`}>
                    <span className="permission-icon">{editRole === 'PROJECT_MANAGER' || editRole === 'ESTIMATOR' ? '✓' : '✕'}</span>
                    Edit Risks
                  </div>
                  <div className={`permission-item ${editRole === 'PROJECT_MANAGER' || editRole === 'ESTIMATOR' ? 'granted' : ''}`}>
                    <span className="permission-icon">{editRole === 'PROJECT_MANAGER' || editRole === 'ESTIMATOR' ? '✓' : '✕'}</span>
                    Edit Questions
                  </div>
                  <div className={`permission-item ${editRole === 'PROJECT_MANAGER' || editRole === 'ESTIMATOR' ? 'granted' : ''}`}>
                    <span className="permission-icon">{editRole === 'PROJECT_MANAGER' || editRole === 'ESTIMATOR' ? '✓' : '✕'}</span>
                    Run AI Analysis
                  </div>
                  <div className={`permission-item ${editRole === 'PROJECT_MANAGER' || editRole === 'EXECUTIVE' ? 'granted' : ''}`}>
                    <span className="permission-icon">{editRole === 'PROJECT_MANAGER' || editRole === 'EXECUTIVE' ? '✓' : '✕'}</span>
                    Generate Snapshots
                  </div>
                  <div className={`permission-item ${editRole === 'PROJECT_MANAGER' || editRole === 'ESTIMATOR' ? 'granted' : ''}`}>
                    <span className="permission-icon">{editRole === 'PROJECT_MANAGER' || editRole === 'ESTIMATOR' ? '✓' : '✕'}</span>
                    Upload Documents
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setEditingMember(null)}
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleUpdateRole}
                disabled={isUpdating || editRole === editingMember.role}
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
