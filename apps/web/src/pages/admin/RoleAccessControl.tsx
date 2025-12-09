import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@triton/supabase-client';
import './RoleAccessControl.css';

interface Role {
  id: string;
  code: string;
  name: string;
  level: number;
}

interface AppModule {
  id: string;
  module_key: string;
  module_name: string;
  module_path: string;
  module_icon: string | null;
  module_group: string | null;
  sort_order: number | null;
  is_system: boolean | null;
}


export function RoleAccessControl() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<AppModule[]>([]);
  const [accessMatrix, setAccessMatrix] = useState<Record<string, Record<string, boolean>>>({});
  const [originalMatrix, setOriginalMatrix] = useState<Record<string, Record<string, boolean>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('id, code, name, level')
        .order('level', { ascending: true });

      if (rolesError) throw rolesError;

      // Fetch modules
      const { data: modulesData, error: modulesError } = await supabase
        .from('app_modules')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (modulesError) throw modulesError;

      // Fetch current access settings
      const { data: accessData, error: accessError } = await supabase
        .from('role_module_access')
        .select('role_id, module_id, has_access');

      if (accessError) throw accessError;

      // Build access matrix
      const matrix: Record<string, Record<string, boolean>> = {};
      const rolesList = rolesData ?? [];
      const modulesList = modulesData ?? [];

      for (const role of rolesList) {
        const roleMatrix: Record<string, boolean> = {};
        for (const mod of modulesList) {
          const access = accessData?.find(
            a => a.role_id === role.id && a.module_id === mod.id
          );
          roleMatrix[mod.id] = access?.has_access ?? false;
        }
        matrix[role.id] = roleMatrix;
      }

      setRoles(rolesList);
      setModules(modulesList as AppModule[]);
      setAccessMatrix(matrix);
      setOriginalMatrix(JSON.parse(JSON.stringify(matrix)));
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load role access data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    // Check if there are unsaved changes
    setHasChanges(JSON.stringify(accessMatrix) !== JSON.stringify(originalMatrix));
  }, [accessMatrix, originalMatrix]);

  const toggleAccess = (roleId: string, moduleId: string) => {
    setAccessMatrix(prev => ({
      ...prev,
      [roleId]: {
        ...(prev[roleId] ?? {}),
        [moduleId]: !(prev[roleId]?.[moduleId] ?? false)
      }
    }));
    setSuccess(null);
  };

  const selectAllForRole = (roleId: string) => {
    const allSelected = modules.every(mod => accessMatrix[roleId]?.[mod.id] ?? false);
    setAccessMatrix(prev => ({
      ...prev,
      [roleId]: Object.fromEntries(
        modules.map(mod => [mod.id, !allSelected])
      )
    }));
    setSuccess(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Collect all changes
      const updates: { role_id: string; module_id: string; has_access: boolean }[] = [];

      for (const roleId of Object.keys(accessMatrix)) {
        const roleMatrix = accessMatrix[roleId];
        if (!roleMatrix) continue;

        for (const moduleId of Object.keys(roleMatrix)) {
          const currentAccess = roleMatrix[moduleId] ?? false;
          const originalAccess = originalMatrix[roleId]?.[moduleId] ?? false;

          if (currentAccess !== originalAccess) {
            updates.push({
              role_id: roleId,
              module_id: moduleId,
              has_access: currentAccess
            });
          }
        }
      }

      // Upsert all changes
      if (updates.length > 0) {
        const { error: upsertError } = await supabase
          .from('role_module_access')
          .upsert(updates, { onConflict: 'role_id,module_id' });

        if (upsertError) throw upsertError;
      }

      setOriginalMatrix(JSON.parse(JSON.stringify(accessMatrix)));
      setSuccess('Changes saved successfully! Users will see updates after refreshing.');
    } catch (err) {
      console.error('Error saving changes:', err);
      setError('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Group modules by their group
  const groupedModules = modules.reduce((acc, mod) => {
    const group = mod.module_group ?? 'OTHER';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(mod);
    return acc;
  }, {} as Record<string, AppModule[]>);

  // Sort groups
  const groupOrder = ['MAIN', 'OPERATIONS', 'RESOURCES', 'ADMIN'];
  const sortedGroups = Object.keys(groupedModules).sort((a, b) => {
    const aIndex = groupOrder.indexOf(a);
    const bIndex = groupOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <span>Loading role access settings...</span>
      </div>
    );
  }

  return (
    <div className="role-access-page">
      <div className="page-header">
        <div className="page-header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '2rem' }}>🔐</span>
            <div>
              <h1>Role Access Control</h1>
              <p>Configure which modules are visible on the dashboard for each role.</p>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="error-message">⚠️ {error}</div>}
      {success && <div className="success-message">✅ {success}</div>}

      <div className="role-access-card">
        <div className="role-access-header">
          <div className="role-access-notice">
            <span className="notice-icon">ℹ️</span>
            <span>Changes take effect after users refresh their page.</span>
          </div>
          <button
            className="btn btn-primary save-btn"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? 'Saving...' : '💾 Save Changes'}
          </button>
        </div>

        <div className="role-access-table-container">
          <table className="role-access-table">
            <thead>
              <tr>
                <th className="module-name-col">Module Name</th>
                {roles.map(role => (
                  <th key={role.id} className="role-col">
                    <div className="role-header">
                      <span className="role-name">{role.name}</span>
                      <button
                        className="select-all-btn"
                        onClick={() => selectAllForRole(role.id)}
                      >
                        {modules.every(mod => accessMatrix[role.id]?.[mod.id])
                          ? 'Deselect All'
                          : 'Select All'}
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedGroups.map(group => (
                <>
                  <tr key={`group-${group}`} className="group-row">
                    <td colSpan={roles.length + 1} className="group-label">
                      {group}
                    </td>
                  </tr>
                  {groupedModules[group]?.map(mod => (
                    <tr key={mod.id} className="module-row">
                      <td className="module-name-cell">
                        <span className="module-icon">{mod.module_icon}</span>
                        <span className="module-name">{mod.module_name}</span>
                        {mod.is_system && (
                          <span className="system-badge" title="System module">🔒</span>
                        )}
                      </td>
                      {roles.map(role => (
                        <td key={`${mod.id}-${role.id}`} className="access-cell">
                          <label className="checkbox-wrapper">
                            <input
                              type="checkbox"
                              checked={accessMatrix[role.id]?.[mod.id] ?? false}
                              onChange={() => toggleAccess(role.id, mod.id)}
                              disabled={role.code === 'ADMIN' && mod.module_group === 'ADMIN'}
                            />
                            <span className="custom-checkbox"></span>
                          </label>
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {hasChanges && (
          <div className="unsaved-changes-bar">
            <span>⚠️ You have unsaved changes</span>
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default RoleAccessControl;
