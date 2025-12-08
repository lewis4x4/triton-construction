import { useState, useEffect } from 'react';
import {
  MapPin,
  Save,
  X,
  Building,
  Truck,
  Fuel,
  Users,
  ShieldAlert,
  Car,
  Wrench,
  Bell,
  Clock,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import type { Database } from '../../types/database';

type Geofence = Database['public']['Tables']['geofences']['Row'];
type GeofenceType = Database['public']['Enums']['geofence_type'];

interface GeofenceEditorProps {
  geofence?: Geofence | null;
  projectId?: string;
  onSave?: (geofence: Geofence) => void;
  onCancel?: () => void;
}

const geofenceTypes: { value: GeofenceType; label: string; icon: typeof Building; description: string }[] = [
  { value: 'PROJECT_SITE', label: 'Project Site', icon: Building, description: 'Active construction project location' },
  { value: 'COMPANY_YARD', label: 'Company Yard', icon: Truck, description: 'Equipment storage and staging area' },
  { value: 'FUEL_STATION', label: 'Fuel Station', icon: Fuel, description: 'Fuel depot or gas station' },
  { value: 'SUPPLIER', label: 'Supplier', icon: Users, description: 'Material supplier location' },
  { value: 'CUSTOMER', label: 'Customer', icon: Users, description: 'Customer or client site' },
  { value: 'RESTRICTED_AREA', label: 'Restricted Area', icon: ShieldAlert, description: 'No-go or sensitive zone' },
  { value: 'PARKING', label: 'Parking', icon: Car, description: 'Designated parking area' },
  { value: 'MAINTENANCE_SHOP', label: 'Maintenance Shop', icon: Wrench, description: 'Equipment maintenance facility' },
];

interface FormData {
  name: string;
  geofence_type: GeofenceType;
  description: string;
  center_latitude: number | null;
  center_longitude: number | null;
  radius_meters: number;
  project_id: string | null;
  is_active: boolean;
  alert_on_enter: boolean;
  alert_on_exit: boolean;
  alert_on_speeding: boolean;
  speed_limit_mph: number | null;
  dwell_threshold_minutes: number | null;
  color: string;
}

export function GeofenceEditor({
  geofence,
  projectId,
  onSave,
  onCancel,
}: GeofenceEditorProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    geofence_type: 'PROJECT_SITE',
    description: '',
    center_latitude: null,
    center_longitude: null,
    radius_meters: 100,
    project_id: projectId || null,
    is_active: true,
    alert_on_enter: true,
    alert_on_exit: false,
    alert_on_speeding: false,
    speed_limit_mph: null,
    dwell_threshold_minutes: null,
    color: '#3B82F6',
  });
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeolocating, setIsGeolocating] = useState(false);

  useEffect(() => {
    fetchProjects();
    if (geofence) {
      setFormData({
        name: geofence.name,
        geofence_type: geofence.geofence_type as GeofenceType,
        description: geofence.description || '',
        center_latitude: geofence.center_latitude,
        center_longitude: geofence.center_longitude,
        radius_meters: geofence.radius_meters || 100,
        project_id: geofence.project_id,
        is_active: geofence.is_active ?? true,
        alert_on_enter: geofence.alert_on_enter ?? true,
        alert_on_exit: geofence.alert_on_exit ?? false,
        alert_on_speeding: geofence.alert_on_speeding ?? false,
        speed_limit_mph: geofence.speed_limit_mph,
        dwell_threshold_minutes: geofence.dwell_threshold_minutes,
        color: geofence.color || '#3B82F6',
      });
    }
  }, [geofence]);

  const fetchProjects = async () => {
    try {
      const { data } = await supabase
        .from('projects')
        .select('id, name')
        .in('status', ['ACTIVE', 'MOBILIZATION', 'PLANNING'])
        .order('name');

      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const handleGeocodeAddress = async () => {
    if (!formData.description) return;

    setIsGeolocating(true);
    try {
      // Simple geocoding via browser - in production use a proper geocoding API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.description)}`
      );
      const results = await response.json();

      if (results && results.length > 0) {
        setFormData(prev => ({
          ...prev,
          center_latitude: parseFloat(results[0].lat),
          center_longitude: parseFloat(results[0].lon),
        }));
      } else {
        setError('Could not find coordinates for this address');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      setError('Failed to geocode address');
    } finally {
      setIsGeolocating(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        setFormData(prev => ({
          ...prev,
          center_latitude: position.coords.latitude,
          center_longitude: position.coords.longitude,
        }));
        setIsGeolocating(false);
      },
      err => {
        console.error('Geolocation error:', err);
        setError('Failed to get current location');
        setIsGeolocating(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    if (!formData.center_latitude || !formData.center_longitude) {
      setError('Location coordinates are required');
      return;
    }

    setIsSaving(true);

    try {
      // Get organization_id for new geofences
      let organizationId: string | undefined;
      if (!geofence) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('organization_id')
            .eq('id', userData.user.id)
            .single();
          organizationId = profileData?.organization_id ?? undefined;
        }
        if (!organizationId) {
          throw new Error('Organization not found');
        }
      }

      const saveData = {
        name: formData.name.trim(),
        geofence_type: formData.geofence_type,
        description: formData.description || null,
        center_latitude: formData.center_latitude,
        center_longitude: formData.center_longitude,
        radius_meters: formData.radius_meters,
        project_id: formData.project_id || null,
        is_active: formData.is_active,
        alert_on_enter: formData.alert_on_enter,
        alert_on_exit: formData.alert_on_exit,
        alert_on_speeding: formData.alert_on_speeding,
        speed_limit_mph: formData.alert_on_speeding ? formData.speed_limit_mph : null,
        dwell_threshold_minutes: formData.dwell_threshold_minutes,
        color: formData.color,
      };

      let result;
      if (geofence) {
        const { data, error: updateError } = await supabase
          .from('geofences')
          .update(saveData)
          .eq('id', geofence.id)
          .select()
          .single();

        if (updateError) throw updateError;
        result = data;
      } else {
        const { data, error: insertError } = await supabase
          .from('geofences')
          .insert({ ...saveData, organization_id: organizationId! })
          .select()
          .single();

        if (insertError) throw insertError;
        result = data;
      }

      onSave?.(result);
    } catch (err) {
      console.error('Error saving geofence:', err);
      setError('Failed to save geofence');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-3">
          <MapPin className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            {geofence ? 'Edit Geofence' : 'Create Geofence'}
          </h2>
        </div>
        {onCancel && (
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Corridor H Project Site"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {geofenceTypes.map(type => {
                const Icon = type.icon;
                const isSelected = formData.geofence_type === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, geofence_type: type.value }))}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                        {type.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project (optional)
            </label>
            <select
              value={formData.project_id || ''}
              onChange={e => setFormData(prev => ({ ...prev, project_id: e.target.value || null }))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No project assigned</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Location */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Location
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address / Description</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter address to geocode"
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleGeocodeAddress}
                disabled={isGeolocating || !formData.description}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50"
              >
                {isGeolocating ? 'Finding...' : 'Find Location'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Latitude <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                value={formData.center_latitude || ''}
                onChange={e => setFormData(prev => ({ ...prev, center_latitude: parseFloat(e.target.value) || null }))}
                placeholder="e.g., 39.4587"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Longitude <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                value={formData.center_longitude || ''}
                onChange={e => setFormData(prev => ({ ...prev, center_longitude: parseFloat(e.target.value) || null }))}
                placeholder="e.g., -80.1234"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isGeolocating}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Use my current location
          </button>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Radius (meters)
            </label>
            <input
              type="number"
              min="10"
              max="10000"
              value={formData.radius_meters}
              onChange={e => setFormData(prev => ({ ...prev, radius_meters: parseInt(e.target.value) || 100 }))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {(formData.radius_meters * 3.28084).toFixed(0)} feet
            </p>
          </div>
        </div>

        {/* Alert Settings */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Alert Settings
          </h3>

          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.alert_on_enter}
                onChange={e => setFormData(prev => ({ ...prev, alert_on_enter: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Alert when entering this zone</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.alert_on_exit}
                onChange={e => setFormData(prev => ({ ...prev, alert_on_exit: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Alert when exiting this zone</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.alert_on_speeding}
                onChange={e => setFormData(prev => ({ ...prev, alert_on_speeding: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Alert on speeding within zone</span>
            </label>

            {formData.alert_on_speeding && (
              <div className="ml-7">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Speed Limit (mph)
                </label>
                <input
                  type="number"
                  min="5"
                  max="75"
                  value={formData.speed_limit_mph || ''}
                  onChange={e => setFormData(prev => ({ ...prev, speed_limit_mph: parseInt(e.target.value) || null }))}
                  placeholder="e.g., 15"
                  className="w-32 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Dwell Time Threshold (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="480"
                value={formData.dwell_threshold_minutes || ''}
                onChange={e => setFormData(prev => ({ ...prev, dwell_threshold_minutes: parseInt(e.target.value) || null }))}
                placeholder="Optional - alert after this many minutes"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Alert if someone stays in this zone longer than this duration
              </p>
            </div>
          </div>
        </div>

        {/* Display Options */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">Display Options</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color
            </label>
            <input
              type="color"
              value={formData.color}
              onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
              className="w-16 h-10 border rounded-lg cursor-pointer"
            />
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Active (visible and generating alerts)</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Geofence'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default GeofenceEditor;
