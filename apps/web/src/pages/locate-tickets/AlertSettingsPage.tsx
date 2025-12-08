import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Clock,
  AlertTriangle,
  CheckCircle,
  Save,
  Loader2,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import { useAuth } from '../../hooks/useAuth';
import './AlertSettingsPage.css';

interface AlertSubscription {
  id: string;
  user_id: string;
  organization_id: string;
  scope_type: string;
  project_id: string | null;
  alert_48_hour: boolean;
  alert_24_hour: boolean;
  alert_same_day: boolean;
  alert_overdue: boolean;
  alert_response_received: boolean;
  alert_conflict: boolean;
  alert_new_ticket: boolean;
  channel_email: boolean;
  channel_sms: boolean;
  channel_push: boolean;
  channel_in_app: boolean;
  email_address: string | null;
  phone_number: string | null;
  is_active: boolean;
}

export function AlertSettingsPage() {
  const { user, profile } = useAuth();
  const [subscription, setSubscription] = useState<AlertSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    // Alert types
    alert_48_hour: true,
    alert_24_hour: true,
    alert_same_day: true,
    alert_overdue: true,
    alert_response_received: true,
    alert_conflict: true,
    alert_new_ticket: true,
    // Channels
    channel_email: true,
    channel_sms: false,
    channel_push: true,
    channel_in_app: true,
    // Contact info
    email_address: '',
    phone_number: '',
    // Status
    is_active: true,
  });

  const fetchSubscription = useCallback(async () => {
    if (!user?.id || !profile?.organization_id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('wv811_alert_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', profile.organization_id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setSubscription(data as AlertSubscription);
        setFormData({
          alert_48_hour: data.alert_48_hour ?? true,
          alert_24_hour: data.alert_24_hour ?? true,
          alert_same_day: data.alert_same_day ?? true,
          alert_overdue: data.alert_overdue ?? true,
          alert_response_received: data.alert_response_received ?? true,
          alert_conflict: data.alert_conflict ?? true,
          alert_new_ticket: data.alert_new_ticket ?? true,
          channel_email: data.channel_email ?? true,
          channel_sms: data.channel_sms ?? false,
          channel_push: data.channel_push ?? true,
          channel_in_app: data.channel_in_app ?? true,
          email_address: data.email_address || user.email || '',
          phone_number: data.phone_number || '',
          is_active: data.is_active ?? true,
        });
      } else {
        // No subscription exists, use defaults with user email
        setFormData(prev => ({
          ...prev,
          email_address: user.email || '',
        }));
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError('Failed to load alert settings');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.email, profile?.organization_id]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const handleToggle = (field: keyof typeof formData) => {
    setFormData(prev => ({ ...prev, [field]: !prev[field] }));
    setHasChanges(true);
    setSuccess(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setHasChanges(true);
    setSuccess(null);
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, phone_number: formatted }));
    setHasChanges(true);
    setSuccess(null);
  };

  const handleSave = async () => {
    if (!user?.id || !profile?.organization_id) {
      setError('You must be logged in to save settings');
      return;
    }

    // Validate phone if SMS is enabled
    if (formData.channel_sms && !formData.phone_number) {
      setError('Phone number is required when SMS notifications are enabled');
      return;
    }

    // Validate email if email is enabled
    if (formData.channel_email && !formData.email_address) {
      setError('Email address is required when email notifications are enabled');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const subscriptionData = {
        user_id: user.id,
        organization_id: profile.organization_id,
        scope_type: 'ALL',
        ...formData,
        email_address: formData.email_address || null,
        phone_number: formData.phone_number ? formData.phone_number.replace(/\D/g, '') : null,
      };

      if (subscription?.id) {
        // Update existing
        const { error: updateError } = await supabase
          .from('wv811_alert_subscriptions')
          .update(subscriptionData)
          .eq('id', subscription.id);

        if (updateError) throw updateError;
      } else {
        // Insert new
        const { data: newSub, error: insertError } = await supabase
          .from('wv811_alert_subscriptions')
          .insert(subscriptionData)
          .select()
          .single();

        if (insertError) throw insertError;
        setSubscription(newSub as AlertSubscription);
      }

      setSuccess('Alert settings saved successfully');
      setHasChanges(false);
    } catch (err: unknown) {
      console.error('Error saving subscription:', err);
      const errorMessage = err instanceof Error ? err.message :
        (err as { message?: string })?.message || 'Unknown error';
      setError(`Failed to save alert settings: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <span>Loading alert settings...</span>
      </div>
    );
  }

  return (
    <div className="alert-settings-page">
      <div className="page-header">
        <div className="page-header-content">
          <Link to="/locate-tickets" className="back-link">
            <ArrowLeft size={18} />
            Back to Tickets
          </Link>
          <h1>
            <Bell size={24} />
            Alert Settings
          </h1>
          <p>Configure how and when you receive notifications about locate tickets</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="settings-container">
        {/* Master Toggle */}
        <div className="settings-section">
          <div className="section-header">
            <h2>Notifications</h2>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={() => handleToggle('is_active')}
              />
              <span className="toggle-slider" />
              <span className="toggle-label">
                {formData.is_active ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
          <p className="section-description">
            {formData.is_active
              ? 'You will receive notifications based on your preferences below'
              : 'All notifications are currently disabled'}
          </p>
        </div>

        {/* Alert Types */}
        <div className={`settings-section ${!formData.is_active ? 'disabled' : ''}`}>
          <h2>
            <Clock size={20} />
            Alert Types
          </h2>
          <p className="section-description">Choose which events trigger notifications</p>

          <div className="toggle-group">
            <div className="toggle-item">
              <div className="toggle-info">
                <span className="toggle-title">48-Hour Warning</span>
                <span className="toggle-desc">Alert 2 days before legal dig date</span>
              </div>
              <div className="toggle-control">
                <span className={`toggle-status ${formData.alert_48_hour ? 'on' : 'off'}`}>
                  {formData.alert_48_hour ? 'ON' : 'OFF'}
                </span>
                <label className="toggle-switch small">
                  <input
                    type="checkbox"
                    checked={formData.alert_48_hour}
                    onChange={() => handleToggle('alert_48_hour')}
                    disabled={!formData.is_active}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>

            <div className="toggle-item">
              <div className="toggle-info">
                <span className="toggle-title">24-Hour Warning</span>
                <span className="toggle-desc">Alert 1 day before legal dig date</span>
              </div>
              <div className="toggle-control">
                <span className={`toggle-status ${formData.alert_24_hour ? 'on' : 'off'}`}>
                  {formData.alert_24_hour ? 'ON' : 'OFF'}
                </span>
                <label className="toggle-switch small">
                  <input
                    type="checkbox"
                    checked={formData.alert_24_hour}
                    onChange={() => handleToggle('alert_24_hour')}
                    disabled={!formData.is_active}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>

            <div className="toggle-item">
              <div className="toggle-info">
                <span className="toggle-title">Same-Day Alert</span>
                <span className="toggle-desc">Alert on the legal dig date</span>
              </div>
              <div className="toggle-control">
                <span className={`toggle-status ${formData.alert_same_day ? 'on' : 'off'}`}>
                  {formData.alert_same_day ? 'ON' : 'OFF'}
                </span>
                <label className="toggle-switch small">
                  <input
                    type="checkbox"
                    checked={formData.alert_same_day}
                    onChange={() => handleToggle('alert_same_day')}
                    disabled={!formData.is_active}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>

            <div className="toggle-item highlight-warning">
              <div className="toggle-info">
                <span className="toggle-title">
                  <AlertTriangle size={16} className="icon-warning" />
                  Overdue Alert
                </span>
                <span className="toggle-desc">Alert when ticket expires</span>
              </div>
              <div className="toggle-control">
                <span className={`toggle-status ${formData.alert_overdue ? 'on' : 'off'}`}>
                  {formData.alert_overdue ? 'ON' : 'OFF'}
                </span>
                <label className="toggle-switch small">
                  <input
                    type="checkbox"
                    checked={formData.alert_overdue}
                    onChange={() => handleToggle('alert_overdue')}
                    disabled={!formData.is_active}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>

            <div className="toggle-item">
              <div className="toggle-info">
                <span className="toggle-title">
                  <CheckCircle size={16} className="icon-success" />
                  Response Received
                </span>
                <span className="toggle-desc">Alert when a utility responds</span>
              </div>
              <div className="toggle-control">
                <span className={`toggle-status ${formData.alert_response_received ? 'on' : 'off'}`}>
                  {formData.alert_response_received ? 'ON' : 'OFF'}
                </span>
                <label className="toggle-switch small">
                  <input
                    type="checkbox"
                    checked={formData.alert_response_received}
                    onChange={() => handleToggle('alert_response_received')}
                    disabled={!formData.is_active}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>

            <div className="toggle-item highlight-danger">
              <div className="toggle-info">
                <span className="toggle-title">
                  <AlertTriangle size={16} className="icon-danger" />
                  Conflict Alert
                </span>
                <span className="toggle-desc">Alert when a utility reports a conflict</span>
              </div>
              <div className="toggle-control">
                <span className={`toggle-status ${formData.alert_conflict ? 'on' : 'off'}`}>
                  {formData.alert_conflict ? 'ON' : 'OFF'}
                </span>
                <label className="toggle-switch small">
                  <input
                    type="checkbox"
                    checked={formData.alert_conflict}
                    onChange={() => handleToggle('alert_conflict')}
                    disabled={!formData.is_active}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>

            <div className="toggle-item">
              <div className="toggle-info">
                <span className="toggle-title">New Ticket</span>
                <span className="toggle-desc">Alert when a new ticket is created</span>
              </div>
              <div className="toggle-control">
                <span className={`toggle-status ${formData.alert_new_ticket ? 'on' : 'off'}`}>
                  {formData.alert_new_ticket ? 'ON' : 'OFF'}
                </span>
                <label className="toggle-switch small">
                  <input
                    type="checkbox"
                    checked={formData.alert_new_ticket}
                    onChange={() => handleToggle('alert_new_ticket')}
                    disabled={!formData.is_active}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Channels */}
        <div className={`settings-section ${!formData.is_active ? 'disabled' : ''}`}>
          <h2>
            <Smartphone size={20} />
            Notification Channels
          </h2>
          <p className="section-description">Choose how you want to receive notifications</p>

          <div className="toggle-group">
            <div className="toggle-item">
              <div className="toggle-info">
                <span className="toggle-title">
                  <Mail size={16} />
                  Email
                </span>
                <span className="toggle-desc">Receive alerts via email</span>
              </div>
              <div className="toggle-control">
                <span className={`toggle-status ${formData.channel_email ? 'on' : 'off'}`}>
                  {formData.channel_email ? 'ON' : 'OFF'}
                </span>
                <label className="toggle-switch small">
                  <input
                    type="checkbox"
                    checked={formData.channel_email}
                    onChange={() => handleToggle('channel_email')}
                    disabled={!formData.is_active}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>

            <div className="toggle-item">
              <div className="toggle-info">
                <span className="toggle-title">
                  <MessageSquare size={16} />
                  SMS Text Message
                </span>
                <span className="toggle-desc">Receive alerts via text (requires phone)</span>
              </div>
              <div className="toggle-control">
                <span className={`toggle-status ${formData.channel_sms ? 'on' : 'off'}`}>
                  {formData.channel_sms ? 'ON' : 'OFF'}
                </span>
                <label className="toggle-switch small">
                  <input
                    type="checkbox"
                    checked={formData.channel_sms}
                    onChange={() => handleToggle('channel_sms')}
                    disabled={!formData.is_active}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>

            <div className="toggle-item">
              <div className="toggle-info">
                <span className="toggle-title">
                  <Smartphone size={16} />
                  Push Notifications
                </span>
                <span className="toggle-desc">Browser/mobile push notifications</span>
              </div>
              <div className="toggle-control">
                <span className={`toggle-status ${formData.channel_push ? 'on' : 'off'}`}>
                  {formData.channel_push ? 'ON' : 'OFF'}
                </span>
                <label className="toggle-switch small">
                  <input
                    type="checkbox"
                    checked={formData.channel_push}
                    onChange={() => handleToggle('channel_push')}
                    disabled={!formData.is_active}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>

            <div className="toggle-item">
              <div className="toggle-info">
                <span className="toggle-title">
                  <Bell size={16} />
                  In-App Notifications
                </span>
                <span className="toggle-desc">Notifications within the app</span>
              </div>
              <div className="toggle-control">
                <span className={`toggle-status ${formData.channel_in_app ? 'on' : 'off'}`}>
                  {formData.channel_in_app ? 'ON' : 'OFF'}
                </span>
                <label className="toggle-switch small">
                  <input
                    type="checkbox"
                    checked={formData.channel_in_app}
                    onChange={() => handleToggle('channel_in_app')}
                    disabled={!formData.is_active}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className={`settings-section ${!formData.is_active ? 'disabled' : ''}`}>
          <h2>Contact Information</h2>
          <p className="section-description">Where should we send your notifications?</p>

          <div className="form-group">
            <label htmlFor="email_address">
              <Mail size={16} />
              Email Address
              {formData.channel_email && <span className="required">*</span>}
            </label>
            <input
              type="email"
              id="email_address"
              name="email_address"
              value={formData.email_address}
              onChange={handleInputChange}
              placeholder="your@email.com"
              disabled={!formData.is_active}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone_number">
              <MessageSquare size={16} />
              Phone Number (for SMS)
              {formData.channel_sms && <span className="required">*</span>}
            </label>
            <input
              type="tel"
              id="phone_number"
              name="phone_number"
              value={formData.phone_number}
              onChange={handlePhoneChange}
              placeholder="(304) 555-1234"
              disabled={!formData.is_active}
            />
            <span className="input-hint">Standard messaging rates may apply</span>
          </div>
        </div>

        {/* Save Button */}
        <div className="settings-actions">
          <button
            className="btn btn-primary btn-lg"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className="spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Settings
              </>
            )}
          </button>
          {hasChanges && (
            <span className="unsaved-notice">You have unsaved changes</span>
          )}
        </div>
      </div>
    </div>
  );
}
