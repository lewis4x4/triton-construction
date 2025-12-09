import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@triton/supabase-client';
import { useAuth } from '../../hooks/useAuth';
import './OrganizationSettings.css';

interface Organization {
  id: string;
  name: string;
  slug: string;
  legal_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  tax_id: string | null;
  wv_contractor_license: string | null;
  dbe_certified: boolean | null;
  dbe_certification_number: string | null;
  dbe_expiration_date: string | null;
}

const US_STATES = [
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' }, { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' }, { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' }, { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' }, { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' }, { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' }, { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' }, { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' }, { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' }, { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' }, { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' }, { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' }, { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' },
];

export function OrganizationSettings() {
  const { profile } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
    website: '',
    tax_id: '',
    wv_contractor_license: '',
    dbe_certified: false,
    dbe_certification_number: '',
    dbe_expiration_date: '',
  });

  const fetchOrganization = useCallback(async () => {
    if (!profile?.organization_id) {
      setIsLoading(false);
      setError('No organization associated with your account');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();

      if (fetchError) throw fetchError;

      setOrganization(data);
      setFormData({
        name: data.name || '',
        legal_name: data.legal_name || '',
        address_line1: data.address_line1 || '',
        address_line2: data.address_line2 || '',
        city: data.city || '',
        state: data.state || '',
        zip_code: data.zip_code || '',
        phone: data.phone || '',
        email: data.email || '',
        website: data.website || '',
        tax_id: data.tax_id || '',
        wv_contractor_license: data.wv_contractor_license || '',
        dbe_certified: data.dbe_certified || false,
        dbe_certification_number: data.dbe_certification_number || '',
        dbe_expiration_date: data.dbe_expiration_date || '',
      });
    } catch (err) {
      console.error('Error fetching organization:', err);
      setError('Failed to load organization data');
    } finally {
      setIsLoading(false);
    }
  }, [profile?.organization_id]);

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    setFormData(prev => ({ ...prev, [name]: newValue }));
    setHasChanges(true);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organization) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          name: formData.name,
          legal_name: formData.legal_name || null,
          address_line1: formData.address_line1 || null,
          address_line2: formData.address_line2 || null,
          city: formData.city || null,
          state: formData.state || null,
          zip_code: formData.zip_code || null,
          phone: formData.phone || null,
          email: formData.email || null,
          website: formData.website || null,
          tax_id: formData.tax_id || null,
          wv_contractor_license: formData.wv_contractor_license || null,
          dbe_certified: formData.dbe_certified,
          dbe_certification_number: formData.dbe_certification_number || null,
          dbe_expiration_date: formData.dbe_expiration_date || null,
        })
        .eq('id', organization.id);

      if (updateError) throw updateError;

      setSuccess('Organization settings saved successfully');
      setHasChanges(false);
    } catch (err) {
      console.error('Error updating organization:', err);
      setError('Failed to save organization settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <span>Loading organization settings...</span>
      </div>
    );
  }

  if (!organization && !isLoading) {
    return (
      <>
        <div className="page-header">
          <div className="page-header-content">
            <h1>Organization Settings</h1>
            <p>Configure your organization details</p>
          </div>
        </div>
        <div className="error-state">
          <h3>No Organization Found</h3>
          <p>Your account is not associated with an organization. Please contact support.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-content">
          <h1>Organization Settings</h1>
          <p>Configure your organization details and compliance information</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Getting Started Checklist */}
      <div className="getting-started-section">
        <div className="section-header">
          <h2>Getting Started</h2>
          <span className="checklist-progress">0/4 Complete</span>
        </div>
        <div className="checklist-grid">
          {[
            { label: 'Complete organization setup', done: false },
            { label: 'Create your first project', done: false },
            { label: 'Add crew members', done: false },
            { label: 'Submit your first daily report', done: false },
          ].map((step, index) => (
            <div key={index} className="checklist-item-row">
              <span className={`check-icon-circle ${step.done ? 'done' : ''}`}>
                {step.done ? (
                  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="step-number">{index + 1}</span>
                )}
              </span>
              <span className="step-label">{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="settings-form">
        {/* Company Information */}
        <div className="form-section">
          <h2>Company Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name">Company Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="legal_name">Legal Name</label>
              <input
                type="text"
                id="legal_name"
                name="legal_name"
                value={formData.legal_name}
                onChange={handleChange}
                placeholder="As registered with the state"
              />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="(304) 555-1234"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="contact@company.com"
              />
            </div>
            <div className="form-group full-width">
              <label htmlFor="website">Website</label>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://www.company.com"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="form-section">
          <h2>Address</h2>
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="address_line1">Street Address</label>
              <input
                type="text"
                id="address_line1"
                name="address_line1"
                value={formData.address_line1}
                onChange={handleChange}
              />
            </div>
            <div className="form-group full-width">
              <label htmlFor="address_line2">Address Line 2</label>
              <input
                type="text"
                id="address_line2"
                name="address_line2"
                value={formData.address_line2}
                onChange={handleChange}
                placeholder="Suite, Unit, Building, Floor, etc."
              />
            </div>
            <div className="form-group">
              <label htmlFor="city">City</label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="state">State</label>
              <select
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
              >
                <option value="">Select State</option>
                {US_STATES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="zip_code">ZIP Code</label>
              <input
                type="text"
                id="zip_code"
                name="zip_code"
                value={formData.zip_code}
                onChange={handleChange}
                placeholder="25177"
              />
            </div>
          </div>
        </div>

        {/* Licensing & Compliance */}
        <div className="form-section">
          <h2>Licensing & Compliance</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="tax_id">Tax ID (EIN)</label>
              <input
                type="text"
                id="tax_id"
                name="tax_id"
                value={formData.tax_id}
                onChange={handleChange}
                placeholder="XX-XXXXXXX"
              />
            </div>
            <div className="form-group">
              <label htmlFor="wv_contractor_license">WV Contractor License</label>
              <input
                type="text"
                id="wv_contractor_license"
                name="wv_contractor_license"
                value={formData.wv_contractor_license}
                onChange={handleChange}
                placeholder="WV-12345"
              />
            </div>
          </div>
        </div>

        {/* DBE Certification */}
        <div className="form-section">
          <h2>DBE Certification</h2>
          <div className="form-grid">
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="dbe_certified"
                  checked={formData.dbe_certified}
                  onChange={handleChange}
                />
                <span>DBE Certified</span>
              </label>
            </div>
            {formData.dbe_certified && (
              <>
                <div className="form-group">
                  <label htmlFor="dbe_certification_number">Certification Number</label>
                  <input
                    type="text"
                    id="dbe_certification_number"
                    name="dbe_certification_number"
                    value={formData.dbe_certification_number}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="dbe_expiration_date">Expiration Date</label>
                  <input
                    type="date"
                    id="dbe_expiration_date"
                    name="dbe_expiration_date"
                    value={formData.dbe_expiration_date}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          {hasChanges && (
            <span className="unsaved-notice">You have unsaved changes</span>
          )}
        </div>
      </form>
    </>
  );
}
