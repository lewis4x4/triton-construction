import { useState } from 'react';
import { CreditCard, AlertCircle, ArrowLeft } from 'lucide-react';
import type { DriverApplication, WizardStepProps } from './types';
import { US_STATES } from './types';
import './LicenseInfoStep.css';

export function LicenseInfoStep({
  application,
  onUpdate,
  onNext,
  onPrev,
  isLoading,
}: WizardStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!application.license_number?.trim()) {
      newErrors.license_number = 'License number is required';
    }
    if (!application.license_state) {
      newErrors.license_state = 'State is required';
    }
    if (!application.license_expiration) {
      newErrors.license_expiration = 'Expiration date is required';
    } else {
      const expDate = new Date(application.license_expiration);
      if (expDate < new Date()) {
        newErrors.license_expiration = 'License is expired';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateForm()) {
      onNext();
    }
  };

  const handleChange = (field: keyof DriverApplication, value: string | string[] | null) => {
    onUpdate({ [field]: value });
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Calculate days until expiration
  const getDaysUntilExpiration = () => {
    if (!application.license_expiration) return null;
    const expDate = new Date(application.license_expiration);
    const today = new Date();
    const diff = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const daysUntilExpiration = getDaysUntilExpiration();

  return (
    <div className="license-info-step">
      <div className="step-header">
        <div className="step-icon">
          <CreditCard size={24} />
        </div>
        <div className="step-title">
          <h2>Driver's License</h2>
          <p>Enter your current driver's license information</p>
        </div>
      </div>

      <div className="form-sections">
        <div className="form-section">
          <h3>License Details</h3>

          <div className="form-row two-col">
            <div className="form-group">
              <label htmlFor="license_number">
                License Number <span className="required">*</span>
              </label>
              <input
                id="license_number"
                type="text"
                value={application.license_number || ''}
                onChange={(e) => handleChange('license_number', e.target.value)}
                className={errors.license_number ? 'error' : ''}
                placeholder="Enter license number"
              />
              {errors.license_number && (
                <span className="error-message">
                  <AlertCircle size={12} /> {errors.license_number}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="license_state">
                State <span className="required">*</span>
              </label>
              <select
                id="license_state"
                value={application.license_state || ''}
                onChange={(e) => handleChange('license_state', e.target.value)}
                className={errors.license_state ? 'error' : ''}
              >
                <option value="">Select state...</option>
                {US_STATES.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
              {errors.license_state && (
                <span className="error-message">
                  <AlertCircle size={12} /> {errors.license_state}
                </span>
              )}
            </div>
          </div>

          <div className="form-row two-col">
            <div className="form-group">
              <label htmlFor="license_expiration">
                Expiration Date <span className="required">*</span>
              </label>
              <input
                id="license_expiration"
                type="date"
                value={application.license_expiration || ''}
                onChange={(e) => handleChange('license_expiration', e.target.value)}
                className={errors.license_expiration ? 'error' : ''}
              />
              {errors.license_expiration && (
                <span className="error-message">
                  <AlertCircle size={12} /> {errors.license_expiration}
                </span>
              )}
              {daysUntilExpiration !== null && daysUntilExpiration > 0 && daysUntilExpiration <= 30 && (
                <span className="warning-message">
                  <AlertCircle size={12} /> License expires in {daysUntilExpiration} days
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="restrictions">Restrictions (if any)</label>
              <input
                id="restrictions"
                type="text"
                value={(application.restrictions || []).join(', ')}
                onChange={(e) =>
                  handleChange(
                    'restrictions',
                    e.target.value ? e.target.value.split(',').map((s) => s.trim()) : []
                  )
                }
                placeholder="e.g., Corrective lenses"
              />
              <span className="form-hint">Separate multiple restrictions with commas</span>
            </div>
          </div>
        </div>

        {/* Eligibility Requirements */}
        <div className="form-section eligibility-section">
          <h3>Eligibility Requirements</h3>
          <p className="section-intro">
            Per company policy SP-030, drivers must meet the following requirements:
          </p>

          <div className="requirements-list">
            <div className="requirement-item">
              <div className="requirement-checkbox">
                <input type="checkbox" id="req_age" checked readOnly />
                <label htmlFor="req_age">Must be 21 years of age or older</label>
              </div>
            </div>

            <div className="requirement-item">
              <div className="requirement-checkbox">
                <input type="checkbox" id="req_license" checked readOnly />
                <label htmlFor="req_license">Must have a valid driver's license</label>
              </div>
            </div>

            <div className="requirement-item">
              <div className="requirement-checkbox">
                <input type="checkbox" id="req_suspension" defaultChecked={false} />
                <label htmlFor="req_suspension">
                  No license suspensions within the last 3 years
                </label>
              </div>
            </div>

            <div className="requirement-item">
              <div className="requirement-checkbox">
                <input type="checkbox" id="req_dui" defaultChecked={false} />
                <label htmlFor="req_dui">No DUI/DWI convictions within the last 5 years</label>
              </div>
            </div>
          </div>

          <div className="major-violations-notice">
            <h4>Major Violations That Result in Suspension of Driving Privileges:</h4>
            <ul>
              <li>Driving under the influence of alcohol or drugs</li>
              <li>Failure to stop and report an accident</li>
              <li>Reckless driving</li>
              <li>Operating while license is suspended, expired, or revoked</li>
              <li>Making a fraudulent application for a license</li>
              <li>Any felony involving the use of a motor vehicle</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="step-actions">
        <button type="button" className="btn btn-secondary" onClick={onPrev} disabled={isLoading}>
          <ArrowLeft size={18} />
          Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleContinue}
          disabled={isLoading}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
