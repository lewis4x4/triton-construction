import { useState } from 'react';
import { Briefcase, X, Check } from 'lucide-react';
import type { Employment } from './types';
import { US_STATES } from './types';
import './EmploymentEntryForm.css';

interface EmploymentEntryFormProps {
  initialData?: Employment;
  onSave: (employment: Employment) => void;
  onCancel: () => void;
}

const EMPTY_EMPLOYMENT: Employment = {
  employer_name: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  phone: '',
  from_date: '',
  to_date: null,
  position: '',
  reason_left: '',
  subject_to_fmcsr: false,
  drug_alcohol_testing: false,
};

export function EmploymentEntryForm({ initialData, onSave, onCancel }: EmploymentEntryFormProps) {
  const [employment, setEmployment] = useState<Employment>(initialData || EMPTY_EMPLOYMENT);
  const [isCurrentEmployer, setIsCurrentEmployer] = useState(!initialData?.to_date);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof Employment, value: string | boolean | null) => {
    setEmployment((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleCurrentToggle = (isCurrent: boolean) => {
    setIsCurrentEmployer(isCurrent);
    if (isCurrent) {
      setEmployment((prev) => ({ ...prev, to_date: null, reason_left: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!employment.employer_name.trim()) {
      newErrors.employer_name = 'Employer name is required';
    }
    if (!employment.address.trim()) {
      newErrors.address = 'Address is required';
    }
    if (!employment.city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!employment.state) {
      newErrors.state = 'State is required';
    }
    if (!employment.zip.trim()) {
      newErrors.zip = 'ZIP code is required';
    }
    if (!employment.phone.trim()) {
      newErrors.phone = 'Phone is required';
    }
    if (!employment.from_date) {
      newErrors.from_date = 'Start date is required';
    }
    if (!isCurrentEmployer && !employment.to_date) {
      newErrors.to_date = 'End date is required';
    }
    if (!employment.position.trim()) {
      newErrors.position = 'Position is required';
    }
    if (!isCurrentEmployer && !employment.reason_left.trim()) {
      newErrors.reason_left = 'Reason for leaving is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSave({
        ...employment,
        to_date: isCurrentEmployer ? null : employment.to_date,
        reason_left: isCurrentEmployer ? '' : employment.reason_left,
      });
    }
  };

  return (
    <div className="employment-entry-form">
      <div className="form-header">
        <div className="form-header-icon">
          <Briefcase size={18} />
        </div>
        <h4>{initialData ? 'Edit Employer' : 'Add Employer'}</h4>
        <button type="button" className="btn-close" onClick={onCancel}>
          <X size={18} />
        </button>
      </div>

      <div className="form-body">
        {/* Employer Information */}
        <div className="form-group">
          <label htmlFor="employer_name">
            Employer Name <span className="required">*</span>
          </label>
          <input
            id="employer_name"
            type="text"
            value={employment.employer_name}
            onChange={(e) => handleChange('employer_name', e.target.value)}
            className={errors.employer_name ? 'error' : ''}
            placeholder="Company name"
          />
          {errors.employer_name && <span className="error-message">{errors.employer_name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="address">
            Street Address <span className="required">*</span>
          </label>
          <input
            id="address"
            type="text"
            value={employment.address}
            onChange={(e) => handleChange('address', e.target.value)}
            className={errors.address ? 'error' : ''}
            placeholder="123 Main St"
          />
          {errors.address && <span className="error-message">{errors.address}</span>}
        </div>

        <div className="form-row three-col">
          <div className="form-group">
            <label htmlFor="city">
              City <span className="required">*</span>
            </label>
            <input
              id="city"
              type="text"
              value={employment.city}
              onChange={(e) => handleChange('city', e.target.value)}
              className={errors.city ? 'error' : ''}
              placeholder="City"
            />
            {errors.city && <span className="error-message">{errors.city}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="state">
              State <span className="required">*</span>
            </label>
            <select
              id="state"
              value={employment.state}
              onChange={(e) => handleChange('state', e.target.value)}
              className={errors.state ? 'error' : ''}
            >
              <option value="">Select</option>
              {US_STATES.map((state) => (
                <option key={state.value} value={state.value}>
                  {state.value}
                </option>
              ))}
            </select>
            {errors.state && <span className="error-message">{errors.state}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="zip">
              ZIP <span className="required">*</span>
            </label>
            <input
              id="zip"
              type="text"
              value={employment.zip}
              onChange={(e) => handleChange('zip', e.target.value)}
              className={errors.zip ? 'error' : ''}
              placeholder="12345"
              maxLength={10}
            />
            {errors.zip && <span className="error-message">{errors.zip}</span>}
          </div>
        </div>

        <div className="form-row two-col">
          <div className="form-group">
            <label htmlFor="phone">
              Phone <span className="required">*</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={employment.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className={errors.phone ? 'error' : ''}
              placeholder="(555) 123-4567"
            />
            {errors.phone && <span className="error-message">{errors.phone}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="position">
              Position Held <span className="required">*</span>
            </label>
            <input
              id="position"
              type="text"
              value={employment.position}
              onChange={(e) => handleChange('position', e.target.value)}
              className={errors.position ? 'error' : ''}
              placeholder="Driver, Equipment Operator, etc."
            />
            {errors.position && <span className="error-message">{errors.position}</span>}
          </div>
        </div>

        {/* Employment Dates */}
        <div className="form-section-title">Employment Period</div>

        <div className="form-row three-col">
          <div className="form-group">
            <label htmlFor="from_date">
              Start Date <span className="required">*</span>
            </label>
            <input
              id="from_date"
              type="date"
              value={employment.from_date}
              onChange={(e) => handleChange('from_date', e.target.value)}
              className={errors.from_date ? 'error' : ''}
            />
            {errors.from_date && <span className="error-message">{errors.from_date}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="to_date">
              End Date {!isCurrentEmployer && <span className="required">*</span>}
            </label>
            <input
              id="to_date"
              type="date"
              value={employment.to_date || ''}
              onChange={(e) => handleChange('to_date', e.target.value || null)}
              className={errors.to_date ? 'error' : ''}
              disabled={isCurrentEmployer}
            />
            {errors.to_date && <span className="error-message">{errors.to_date}</span>}
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isCurrentEmployer}
                onChange={(e) => handleCurrentToggle(e.target.checked)}
              />
              <span className="checkbox-custom" />
              <span>Current Employer</span>
            </label>
          </div>
        </div>

        {!isCurrentEmployer && (
          <div className="form-group">
            <label htmlFor="reason_left">
              Reason for Leaving <span className="required">*</span>
            </label>
            <input
              id="reason_left"
              type="text"
              value={employment.reason_left}
              onChange={(e) => handleChange('reason_left', e.target.value)}
              className={errors.reason_left ? 'error' : ''}
              placeholder="e.g., Better opportunity, Relocation, Layoff"
            />
            {errors.reason_left && <span className="error-message">{errors.reason_left}</span>}
          </div>
        )}

        {/* DOT Questions */}
        <div className="form-section-title">DOT Questions</div>
        <div className="dot-questions">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={employment.subject_to_fmcsr}
              onChange={(e) => handleChange('subject_to_fmcsr', e.target.checked)}
            />
            <span className="checkbox-custom" />
            <span>Was this position subject to FMCSRs? (Federal Motor Carrier Safety Regulations)</span>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={employment.drug_alcohol_testing}
              onChange={(e) => handleChange('drug_alcohol_testing', e.target.checked)}
            />
            <span className="checkbox-custom" />
            <span>Was this position subject to DOT drug and alcohol testing?</span>
          </label>
        </div>

        <div className="form-note">
          <p>
            <strong>Note:</strong> Per DOT regulations (49 CFR 391.21), you must provide a complete
            employment history for the past 3 years, and driving employment for the past 10 years.
          </p>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSubmit}>
          <Check size={16} />
          {initialData ? 'Update' : 'Add'} Employer
        </button>
      </div>
    </div>
  );
}
