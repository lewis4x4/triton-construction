import { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Moon,
  Calendar,
  Save,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import type { Database } from '../../types/database';

type UserAlertPreferences = Database['public']['Tables']['platform_user_alert_preferences']['Row'];
type AlertCategory = Database['public']['Enums']['platform_alert_category'];

const categories: { value: AlertCategory; label: string }[] = [
  { value: 'SAFETY', label: 'Safety' },
  { value: 'COMPLIANCE', label: 'Compliance' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'OPERATIONAL', label: 'Operations' },
  { value: 'FINANCIAL', label: 'Financial' },
  { value: 'ADMINISTRATIVE', label: 'Administrative' },
];

const severityLevels = [
  { key: 'critical', label: 'Critical', description: 'Immediate action required', color: 'text-red-600' },
  { key: 'high', label: 'High', description: 'Action within 24 hours', color: 'text-orange-600' },
  { key: 'medium', label: 'Medium', description: 'Action within 7 days', color: 'text-yellow-600' },
  { key: 'low', label: 'Low', description: 'Action at convenience', color: 'text-blue-600' },
  { key: 'info', label: 'Info', description: 'No action required', color: 'text-gray-600' },
];

const deliveryChannels = [
  { key: 'in_app', label: 'In-App', icon: Bell, description: 'Notifications in the app' },
  { key: 'email', label: 'Email', icon: Mail, description: 'Email notifications' },
  { key: 'sms', label: 'SMS', icon: MessageSquare, description: 'Text messages' },
  { key: 'push', label: 'Push', icon: Smartphone, description: 'Mobile push notifications' },
];

export function AlertPreferences() {
  const [preferences, setPreferences] = useState<Partial<UserAlertPreferences>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from('platform_user_alert_preferences')
        .select('*')
        .eq('user_id', userData.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences(data);
      } else {
        // Set defaults
        setPreferences({
          critical_in_app: true,
          critical_email: true,
          critical_sms: true,
          critical_push: true,
          high_in_app: true,
          high_email: true,
          high_sms: false,
          high_push: true,
          medium_in_app: true,
          medium_email: false,
          medium_sms: false,
          medium_push: false,
          low_in_app: true,
          low_email: false,
          low_sms: false,
          low_push: false,
          info_in_app: true,
          info_email: false,
          info_sms: false,
          info_push: false,
          daily_digest_enabled: true,
          daily_digest_time: '07:00',
          weekly_digest_enabled: false,
          weekly_digest_day: 1,
          quiet_hours_enabled: false,
          quiet_hours_start: '22:00',
          quiet_hours_end: '06:00',
          quiet_hours_allow_critical: true,
          vacation_mode: false,
          categories_subscribed: ['SAFETY', 'COMPLIANCE'],
        });
      }
    } catch (err) {
      console.error('Error fetching preferences:', err);
      setMessage({ type: 'error', text: 'Failed to load preferences' });
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Get org id
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', userData.user.id)
        .single();

      if (!profileData?.organization_id) {
        throw new Error('Organization not found');
      }

      const prefsToSave = {
        ...preferences,
        user_id: userData.user.id,
        organization_id: profileData.organization_id,
      };

      const { error } = await supabase
        .from('platform_user_alert_preferences')
        .upsert(prefsToSave, { onConflict: 'user_id' });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Preferences saved successfully' });
    } catch (err) {
      console.error('Error saving preferences:', err);
      setMessage({ type: 'error', text: 'Failed to save preferences' });
    } finally {
      setIsSaving(false);
    }
  };

  const updatePreference = (key: string, value: any) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const toggleCategory = (category: AlertCategory) => {
    const current = (preferences.categories_subscribed as AlertCategory[]) || [];
    const updated = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];
    updatePreference('categories_subscribed', updated);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="animate-pulse">Loading preferences...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Alert Preferences</h2>
          </div>
          <button
            onClick={savePreferences}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {message && (
          <div
            className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            {message.text}
          </div>
        )}
      </div>

      <div className="p-6 space-y-8">
        {/* Delivery Matrix */}
        <section>
          <h3 className="text-base font-semibold text-gray-900 mb-4">Notification Delivery by Severity</h3>
          <p className="text-sm text-gray-600 mb-4">
            Choose how you want to receive notifications for each severity level.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Severity</th>
                  {deliveryChannels.map((channel) => (
                    <th key={channel.key} className="text-center py-3 px-4 text-sm font-medium text-gray-600">
                      <div className="flex flex-col items-center gap-1">
                        <channel.icon className="w-4 h-4" />
                        {channel.label}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {severityLevels.map((severity) => (
                  <tr key={severity.key} className="border-b">
                    <td className="py-3 px-4">
                      <div className={`font-medium ${severity.color}`}>{severity.label}</div>
                      <div className="text-xs text-gray-500">{severity.description}</div>
                    </td>
                    {deliveryChannels.map((channel) => {
                      const prefKey = `${severity.key}_${channel.key}` as keyof UserAlertPreferences;
                      return (
                        <td key={channel.key} className="text-center py-3 px-4">
                          <input
                            type="checkbox"
                            checked={Boolean(preferences[prefKey])}
                            onChange={(e) => updatePreference(prefKey, e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Category Subscriptions */}
        <section>
          <h3 className="text-base font-semibold text-gray-900 mb-4">Alert Categories</h3>
          <p className="text-sm text-gray-600 mb-4">
            Select which categories of alerts you want to receive. Leave empty to receive all.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((category) => {
              const isSelected = ((preferences.categories_subscribed as AlertCategory[]) || []).includes(
                category.value
              );
              return (
                <button
                  key={category.value}
                  onClick={() => toggleCategory(category.value)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300"
                    />
                    <span className="font-medium">{category.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Digest Settings */}
        <section>
          <h3 className="text-base font-semibold text-gray-900 mb-4">Digest Settings</h3>

          <div className="space-y-4">
            {/* Daily Digest */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium text-gray-900">Daily Digest</div>
                <div className="text-sm text-gray-500">Receive a summary of all alerts once a day</div>
              </div>
              <div className="flex items-center gap-3">
                {preferences.daily_digest_enabled && (
                  <input
                    type="time"
                    value={preferences.daily_digest_time || '07:00'}
                    onChange={(e) => updatePreference('daily_digest_time', e.target.value)}
                    className="px-3 py-1.5 border rounded-lg text-sm"
                  />
                )}
                <input
                  type="checkbox"
                  checked={Boolean(preferences.daily_digest_enabled)}
                  onChange={(e) => updatePreference('daily_digest_enabled', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300"
                />
              </div>
            </div>

            {/* Weekly Digest */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium text-gray-900">Weekly Digest</div>
                <div className="text-sm text-gray-500">Receive a weekly summary</div>
              </div>
              <div className="flex items-center gap-3">
                {preferences.weekly_digest_enabled && (
                  <select
                    value={preferences.weekly_digest_day || 1}
                    onChange={(e) => updatePreference('weekly_digest_day', parseInt(e.target.value))}
                    className="px-3 py-1.5 border rounded-lg text-sm"
                  >
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                    <option value={0}>Sunday</option>
                  </select>
                )}
                <input
                  type="checkbox"
                  checked={Boolean(preferences.weekly_digest_enabled)}
                  onChange={(e) => updatePreference('weekly_digest_enabled', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Quiet Hours */}
        <section>
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Moon className="w-5 h-5" />
            Quiet Hours
          </h3>

          <div className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Enable Quiet Hours</div>
                <div className="text-sm text-gray-500">Silence non-critical notifications during specified hours</div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(preferences.quiet_hours_enabled)}
                onChange={(e) => updatePreference('quiet_hours_enabled', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded border-gray-300"
              />
            </div>

            {preferences.quiet_hours_enabled && (
              <>
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                    <input
                      type="time"
                      value={preferences.quiet_hours_start || '22:00'}
                      onChange={(e) => updatePreference('quiet_hours_start', e.target.value)}
                      className="px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                    <input
                      type="time"
                      value={preferences.quiet_hours_end || '06:00'}
                      onChange={(e) => updatePreference('quiet_hours_end', e.target.value)}
                      className="px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allow-critical"
                    checked={Boolean(preferences.quiet_hours_allow_critical)}
                    onChange={(e) => updatePreference('quiet_hours_allow_critical', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300"
                  />
                  <label htmlFor="allow-critical" className="text-sm text-gray-700">
                    Allow critical alerts during quiet hours
                  </label>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Vacation Mode */}
        <section>
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Vacation Mode
          </h3>

          <div className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Enable Vacation Mode</div>
                <div className="text-sm text-gray-500">Pause all notifications while you're away</div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(preferences.vacation_mode)}
                onChange={(e) => updatePreference('vacation_mode', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded border-gray-300"
              />
            </div>

            {preferences.vacation_mode && (
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={preferences.vacation_start || ''}
                    onChange={(e) => updatePreference('vacation_start', e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={preferences.vacation_end || ''}
                    onChange={(e) => updatePreference('vacation_end', e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Contact Override */}
        <section>
          <h3 className="text-base font-semibold text-gray-900 mb-4">Contact Information</h3>
          <p className="text-sm text-gray-600 mb-4">
            Override your default contact information for alert notifications.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={preferences.email_override || ''}
                onChange={(e) => updatePreference('email_override', e.target.value || null)}
                placeholder="Use default from profile"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={preferences.phone_override || ''}
                onChange={(e) => updatePreference('phone_override', e.target.value || null)}
                placeholder="Use default from profile"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default AlertPreferences;
