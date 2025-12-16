import { useState } from 'react';
import { User, Mail, Phone, MapPin, AlertCircle } from 'lucide-react';
import type { DriverApplication, WizardStepProps } from './types';
import { US_STATES } from './types';
import './PersonalInfoStep.css';

interface PersonalInfoStepProps extends WizardStepProps {
  isCDL?: boolean;
}

export function PersonalInfoStep({
  application,
  onUpdate,
  onNext,
  isLoading,
  isCDL = false,
}: PersonalInfoStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!application.first_name?.trim()) {
      newErrors.first_name = 'First name is required';
    }
    if (!application.last_name?.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    if (!application.date_of_birth) {
      newErrors.date_of_birth = 'Date of birth is required';
    } else {
      // Validate age (must be 21+)
      const dob = new Date(application.date_of_birth);
      const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 21) {
        newErrors.date_of_birth = 'Driver must be at least 21 years old';
      }
    }
    if (!application.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(application.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!application.phone?.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateForm()) {
      onNext();
    }
  };

  const handleChange = (field: keyof DriverApplication, value: string | null) => {
    onUpdate({ [field]: value });
    // Clear error when field is modified
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="personal-info-step">
      <div className="step-header">
        <div className="step-icon">
          <User size={24} />
        </div>
        <div className="step-title">
          <h2>Personal Information</h2>
          <p>Please provide your personal details</p>
        </div>
      </div>

      <div className="form-sections">
        {/* Name Section */}
        <div className="form-section">
          <h3>Full Legal Name</h3>
          <div className="form-row three-col">
            <div className="form-group">
              <label htmlFor="first_name">
                First Name <span className="required">*</span>
              </label>
              <input
                id="first_name"
                type="text"
                value={application.first_name || ''}
                onChange={(e) => handleChange('first_name', e.target.value)}
                className={errors.first_name ? 'error' : ''}
                placeholder="First name"
              />
              {errors.first_name && (
                <span className="error-message">
                  <AlertCircle size={12} /> {errors.first_name}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="middle_name">Middle Name</label>
              <input
                id="middle_name"
                type="text"
                value={application.middle_name || ''}
                onChange={(e) => handleChange('middle_name', e.target.value || null)}
                placeholder="Middle name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="last_name">
                Last Name <span className="required">*</span>
              </label>
              <input
                id="last_name"
                type="text"
                value={application.last_name || ''}
                onChange={(e) => handleChange('last_name', e.target.value)}
                className={errors.last_name ? 'error' : ''}
                placeholder="Last name"
              />
              {errors.last_name && (
                <span className="error-message">
                  <AlertCircle size={12} /> {errors.last_name}
                </span>
              )}
            </div>
          </div>

          <div className="form-row two-col">
            <div className="form-group">
              <label htmlFor="suffix">Suffix</label>
              <select
                id="suffix"
                value={application.suffix || ''}
                onChange={(e) => handleChange('suffix', e.target.value || null)}
              >
                <option value="">None</option>
                <option value="Jr">Jr.</option>
                <option value="Sr">Sr.</option>
                <option value="II">II</option>
                <option value="III">III</option>
                <option value="IV">IV</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="date_of_birth">
                Date of Birth <span className="required">*</span>
              </label>
              <input
                id="date_of_birth"
                type="date"
                value={application.date_of_birth || ''}
                onChange={(e) => handleChange('date_of_birth', e.target.value)}
                className={errors.date_of_birth ? 'error' : ''}
                max={new Date(Date.now() - 21 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              />
              {errors.date_of_birth && (
                <span className="error-message">
                  <AlertCircle size={12} /> {errors.date_of_birth}
                </span>
              )}
            </div>
          </div>

          {isCDL && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="ssn_last_four">
                  Last 4 digits of SSN <span className="required">*</span>
                </label>
                <input
                  id="ssn_last_four"
                  type="text"
                  maxLength={4}
                  value={application.ssn_last_four || ''}
                  onChange={(e) => handleChange('ssn_last_four', e.target.value.replace(/\D/g, ''))}
                  placeholder="XXXX"
                  className="ssn-input"
                />
                <span className="form-hint">Required for DOT compliance verification</span>
              </div>
            </div>
          )}
        </div>

        {/* Contact Section */}
        <div className="form-section">
          <h3>
            <Mail size={18} />
            Contact Information
          </h3>
          <div className="form-row two-col">
            <div className="form-group">
              <label htmlFor="email">
                Email Address <span className="required">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={application.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                className={errors.email ? 'error' : ''}
                placeholder="email@example.com"
              />
              {errors.email && (
                <span className="error-message">
                  <AlertCircle size={12} /> {errors.email}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="phone">
                Phone Number <span className="required">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                value={application.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                className={errors.phone ? 'error' : ''}
                placeholder="(555) 555-5555"
              />
              {errors.phone && (
                <span className="error-message">
                  <AlertCircle size={12} /> {errors.phone}
                </span>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="alternate_phone">Alternate Phone</label>
              <input
                id="alternate_phone"
                type="tel"
                value={application.alternate_phone || ''}
                onChange={(e) => handleChange('alternate_phone', e.target.value || null)}
                placeholder="(555) 555-5555"
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="form-section">
          <h3>
            <Phone size={18} />
            Emergency Contact
          </h3>
          <div className="form-row three-col">
            <div className="form-group">
              <label htmlFor="emergency_contact_name">Contact Name</label>
              <input
                id="emergency_contact_name"
                type="text"
                value={application.emergency_contact_name || ''}
                onChange={(e) => handleChange('emergency_contact_name', e.target.value || null)}
                placeholder="Full name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="emergency_contact_phone">Contact Phone</label>
              <input
                id="emergency_contact_phone"
                type="tel"
                value={application.emergency_contact_phone || ''}
                onChange={(e) => handleChange('emergency_contact_phone', e.target.value || null)}
                placeholder="(555) 555-5555"
              />
            </div>

            <div className="form-group">
              <label htmlFor="emergency_contact_relationship">Relationship</label>
              <select
                id="emergency_contact_relationship"
                value={application.emergency_contact_relationship || ''}
                onChange={(e) => handleChange('emergency_contact_relationship', e.target.value || null)}
              >
                <option value="">Select...</option>
                <option value="Spouse">Spouse</option>
                <option value="Parent">Parent</option>
                <option value="Sibling">Sibling</option>
                <option value="Child">Child</option>
                <option value="Friend">Friend</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Non-CDL Job Assignment */}
        {!isCDL && (
          <div className="form-section">
            <h3>
              <MapPin size={18} />
              Job Assignment
            </h3>
            <div className="form-row two-col">
              <div className="form-group">
                <label htmlFor="job_number">Job Number</label>
                <input
                  id="job_number"
                  type="text"
                  value={application.job_number || ''}
                  onChange={(e) => handleChange('job_number', e.target.value || null)}
                  placeholder="e.g., J-2025-001"
                />
              </div>

              <div className="form-group">
                <label htmlFor="job_assignment">Assignment/Position</label>
                <input
                  id="job_assignment"
                  type="text"
                  value={application.job_assignment || ''}
                  onChange={(e) => handleChange('job_assignment', e.target.value || null)}
                  placeholder="e.g., Foreman, Laborer"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="step-actions">
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
