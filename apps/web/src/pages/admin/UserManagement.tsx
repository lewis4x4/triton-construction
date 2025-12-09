import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import './UserManagement.css';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  status: string;
  created_at: string;
  last_sign_in: string | null;
}

interface Role {
  id: string;
  name: string;
  code: string;
  description: string;
  level: number;
}

interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  project_id: string | null;
  roles?: Role;
  projects?: { name: string; project_number: string };
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else {
      loadRoles();
    }
  }, [activeTab]);

  async function loadUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('last_name');

    if (!error && data) {
      setUsers(data as any);
    }
    setLoading(false);
  }

  async function loadRoles() {
    setLoading(true);
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('level');

    if (!error && data) {
      setRoles(data as any);
    }
    setLoading(false);
  }

  const filteredUsers = users.filter(u =>
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'status-badge active';
      case 'INACTIVE': return 'status-badge inactive';
      case 'PENDING': return 'status-badge pending';
      case 'SUSPENDED': return 'status-badge suspended';
      default: return 'status-badge inactive';
    }
  };

  const getRoleLevelClass = (level: number) => {
    if (level === 1) return 'level-1'; // Admin
    if (level <= 10) return 'level-2'; // Manager
    if (level <= 20) return 'level-3'; // Supervisor
    if (level <= 30) return 'level-4'; // Standard
    if (level <= 40) return 'level-5'; // Limited
    return 'level-default';
  };

  return (
    <div className="user-management-page">
      <div className="page-header">
        <div className="page-header-content">
          <div>
            <h1>User Management</h1>
            <p>Manage system users, roles, and permissions</p>
          </div>
        </div>
        <div className="page-header-actions">
          <button
            onClick={() => setShowInviteForm(true)}
            className="btn btn-primary"
          >
            + Invite User
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{users.length}</div>
        </div>
        <div className="stat-card active-users">
          <div className="stat-label">Active Users</div>
          <div className="stat-value">
            {users.filter(u => u.status === 'ACTIVE').length}
          </div>
        </div>
        <div className="stat-card pending-users">
          <div className="stat-label">Pending Invites</div>
          <div className="stat-value">
            {users.filter(u => u.status === 'PENDING').length}
          </div>
        </div>
        <div className="stat-card total-roles">
          <div className="stat-label">Total Roles</div>
          <div className="stat-value">{roles.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <nav className="tabs-nav">
          <button
            onClick={() => setActiveTab('users')}
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
          >
            Roles & Permissions
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span>Loading data...</span>
        </div>
      ) : (
        <>
          {activeTab === 'users' && (
            <>
              <div className="filters-bar">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th style={{ width: '30%' }}>User</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Last Login</th>
                      <th style={{ width: '10%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                          No users found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <div className="user-cell">
                              <div className="user-avatar">
                                {user.first_name?.[0]}{user.last_name?.[0]}
                              </div>
                              <div className="user-info">
                                <span className="user-name">
                                  {user.first_name} {user.last_name}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>{user.email}</td>
                          <td>{user.phone || '-'}</td>
                          <td>
                            <span className={getStatusBadgeClass(user.status)}>
                              {user.status}
                            </span>
                          </td>
                          <td>
                            {user.last_sign_in
                              ? new Date(user.last_sign_in).toLocaleDateString()
                              : 'Never'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => setSelectedUser(user)}
                              className="btn-link"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'roles' && (
            <div className="roles-grid">
              {roles.map((role) => (
                <div key={role.id} className="role-card">
                  <div className="role-header">
                    <span className={`role-badge ${getRoleLevelClass(role.level)}`}>
                      Level {role.level}
                    </span>
                  </div>
                  <h3 className="role-name">{role.name}</h3>
                  <p className="role-description">{role.description}</p>
                  <div className="role-code">
                    Code: {role.code}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showInviteForm && (
        <InviteUserModal
          onClose={() => setShowInviteForm(false)}
          onSave={() => {
            setShowInviteForm(false);
            loadUsers();
          }}
        />
      )}

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          roles={roles}
          onClose={() => setSelectedUser(null)}
          onUpdate={() => {
            setSelectedUser(null);
            loadUsers();
          }}
        />
      )}
    </div>
  );
}

function InviteUserModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    role_id: '',
  });
  const [roles, setRoles] = useState<Role[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRoles();
  }, []);

  async function loadRoles() {
    const { data } = await supabase
      .from('roles')
      .select('*')
      .order('level');
    if (data) setRoles(data as any);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    // In a real app, this would send an invite email
    // For now, we'll just create the user profile
    const { error } = await supabase.from('user_profiles').insert([{
      email: formData.email,
      first_name: formData.first_name,
      last_name: formData.last_name,
      phone: formData.phone || null,
      status: 'PENDING' as any,
    }] as any);

    if (!error) {
      onSave();
    }
    setSaving(false);
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Invite User</h2>
          <button onClick={onClose} className="modal-close-btn">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body modal-form">
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="form-input"
              required
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Initial Role</label>
            <select
              value={formData.role_id}
              onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
              className="form-select"
            >
              <option value="">Select role...</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserDetailModal({
  user,
  roles,
  onClose,
  onUpdate,
}: {
  user: User;
  roles: Role[];
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; project_number: string }[]>([]);
  const [newRoleId, setNewRoleId] = useState('');
  const [newProjectId, setNewProjectId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserRoles();
    loadProjects();
  }, []);

  async function loadUserRoles() {
    const { data } = await supabase
      .from('user_roles')
      .select(`
        *,
        roles(*),
        projects(name, project_number)
      `)
      .eq('user_id', user.id);

    if (data) {
      setUserRoles(data as any);
    }
    setLoading(false);
  }

  async function loadProjects() {
    const { data } = await supabase
      .from('projects')
      .select('id, name, project_number')
      .eq('status', 'ACTIVE')
      .order('name');

    if (data) {
      setProjects(data);
    }
  }

  async function addRole() {
    if (!newRoleId) return;

    const { error } = await supabase.from('user_roles').insert({
      user_id: user.id,
      role_id: newRoleId,
      project_id: newProjectId || null,
    });

    if (!error) {
      loadUserRoles();
      setNewRoleId('');
      setNewProjectId('');
    }
  }

  async function removeRole(roleAssignmentId: string) {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', roleAssignmentId);

    if (!error) {
      loadUserRoles();
    }
  }

  async function updateStatus(newStatus: string) {
    const { error } = await supabase
      .from('user_profiles')
      .update({ status: newStatus })
      .eq('id', user.id);

    if (!error) {
      onUpdate();
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="user-avatar" style={{ width: '40px', height: '40px' }}>
              {user.first_name?.[0]}{user.last_name?.[0]}
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1rem' }}>
                {user.first_name} {user.last_name}
              </h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Status Actions */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
            {user.status !== 'ACTIVE' && (
              <button
                onClick={() => updateStatus('ACTIVE')}
                className="btn btn-secondary"
                style={{ color: 'var(--neon-green)', borderColor: 'var(--neon-green)' }}
              >
                Activate
              </button>
            )}
            {user.status !== 'SUSPENDED' && (
              <button
                onClick={() => updateStatus('SUSPENDED')}
                className="btn btn-secondary"
                style={{ color: 'var(--neon-red)', borderColor: 'var(--neon-red)' }}
              >
                Suspend
              </button>
            )}
            {user.status !== 'INACTIVE' && (
              <button
                onClick={() => updateStatus('INACTIVE')}
                className="btn btn-secondary"
              >
                Deactivate
              </button>
            )}
          </div>

          {/* User Roles */}
          <div className="form-group">
            <h3 className="form-label" style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>Assigned Roles</h3>
            {loading ? (
              <div className="loading-spinner"></div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
                  {userRoles.length === 0 ? (
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No roles assigned</div>
                  ) : (
                    userRoles.map((ur) => (
                      <div key={ur.id} className="list-item">
                        <div>
                          <span className="list-item-title">{ur.roles?.name}</span>
                          {ur.project_id && (
                            <span className="list-item-subtitle">
                              ({ur.projects?.project_number})
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => removeRole(ur.id)}
                          className="btn-remove"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Role */}
                <div className="add-role-row">
                  <select
                    value={newRoleId}
                    onChange={(e) => setNewRoleId(e.target.value)}
                    className="form-select"
                    style={{ flex: 1 }}
                  >
                    <option value="">Select role...</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newProjectId}
                    onChange={(e) => setNewProjectId(e.target.value)}
                    className="form-select"
                    style={{ flex: 1 }}
                  >
                    <option value="">All projects</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.project_number}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={addRole}
                    disabled={!newRoleId}
                    className="btn btn-primary"
                    style={{ padding: '0.625rem 1rem' }}
                  >
                    Add
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserManagement;
