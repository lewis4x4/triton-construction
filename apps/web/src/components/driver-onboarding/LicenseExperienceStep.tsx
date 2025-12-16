import { useState } from 'react';
import { CreditCard, AlertCircle, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import type { DriverApplication, WizardStepProps, CDLClass, Accident, Conviction } from './types';
import { US_STATES, CDL_ENDORSEMENTS, EQUIPMENT_TYPES } from './types';
import { DrivingExperienceTable } from './DrivingExperienceTable';
import { AccidentEntryForm } from './AccidentEntryForm';
import { ConvictionEntryForm } from './ConvictionEntryForm';
import './LicenseExperienceStep.css';

export function LicenseExperienceStep({
  application,
  onUpdate,
  onNext,
  onPrev,
  isLoading,
}: WizardStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAccidentForm, setShowAccidentForm] = useState(false);
  const [showConvictionForm, setShowConvictionForm] = useState(false);
  const [editingAccident, setEditingAccident] = useState<number | null>(null);
  const [editingConviction, setEditingConviction] = useState<number | null>(null);

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
    if (!application.license_class) {
      newErrors.license_class = 'CDL class is required';
    }

    // Validate driving experience
    if (!application.driving_experience || application.driving_experience.length === 0) {
      newErrors.driving_experience = 'At least one equipment type experience is required';
    }

    // Validate accident disclosure
    if (application.has_accidents_last_3_years && (!application.accidents || application.accidents.length === 0)) {
      newErrors.accidents = 'Please provide accident details';
    }

    // Validate conviction disclosure
    if (application.has_convictions_last_3_years && (!application.convictions || application.convictions.length === 0)) {
      newErrors.convictions = 'Please provide conviction details';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateForm()) {
      onNext();
    }
  };

  const handleChange = (field: keyof DriverApplication, value: any) => {
    onUpdate({ [field]: value });
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleEndorsementToggle = (endorsement: string) => {
    const current = application.endorsements || [];
    const updated = current.includes(endorsement)
      ? current.filter((e) => e !== endorsement)
      : [...current, endorsement];
    handleChange('endorsements', updated);
  };

  const handleAddAccident = (accident: Accident) => {
    const accidents = [...(application.accidents || [])];
    if (editingAccident !== null) {
      accidents[editingAccident] = accident;
    } else {
      accidents.push(accident);
    }
    handleChange('accidents', accidents);
    setShowAccidentForm(false);
    setEditingAccident(null);
  };

  const handleDeleteAccident = (index: number) => {
    const accidents = [...(application.accidents || [])];
    accidents.splice(index, 1);
    handleChange('accidents', accidents);
  };

  const handleAddConviction = (conviction: Conviction) => {
    const convictions = [...(application.convictions || [])];
    if (editingConviction !== null) {
      convictions[editingConviction] = conviction;
    } else {
      convictions.push(conviction);
    }
    handleChange('convictions', convictions);
    setShowConvictionForm(false);
    setEditingConviction(null);
  };

  const handleDeleteConviction = (index: number) => {
    const convictions = [...(application.convictions || [])];
    convictions.splice(index, 1);
    handleChange('convictions', convictions);
  };

  return (
    <div className="license-experience-step">
      <div className="step-header">
        <div className="step-icon">
          <CreditCard size={24} />
        </div>
        <div className="step-title">
          <h2>CDL License & Driving Experience</h2>
          <p>Enter your CDL information and driving experience details</p>
        </div>
      </div>

      <div className="form-sections">
        {/* CDL License Information */}
        <div className="form-section">
          <h3>CDL License Information</h3>

          <div className="form-row three-col">
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
                placeholder="Enter CDL number"
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

            <div className="form-group">
              <label htmlFor="license_class">
                CDL Class <span className="required">*</span>
              </label>
              <select
                id="license_class"
                value={application.license_class || ''}
                onChange={(e) => handleChange('license_class', e.target.value as CDLClass)}
                className={errors.license_class ? 'error' : ''}
              >
                <option value="">Select class...</option>
                <option value="A">Class A</option>
                <option value="B">Class B</option>
                <option value="C">Class C</option>
              </select>
              {errors.license_class && (
                <span className="error-message">
                  <AlertCircle size={12} /> {errors.license_class}
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
                placeholder="e.g., K - Intrastate only"
              />
              <span className="form-hint">Separate multiple restrictions with commas</span>
            </div>
          </div>

          {/* Endorsements */}
          <div className="form-group">
            <label>Endorsements</label>
            <div className="endorsements-grid">
              {CDL_ENDORSEMENTS.map((endorsement) => (
                <label key={endorsement.value} className="endorsement-checkbox">
                  <input
                    type="checkbox"
                    checked={(application.endorsements || []).includes(endorsement.value)}
                    onChange={() => handleEndorsementToggle(endorsement.value)}
                  />
                  <span className="checkbox-label">{endorsement.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Driving Experience Table */}
        <div className="form-section">
          <h3>Driving Experience</h3>
          <p className="section-intro">
            List your driving experience by equipment type for the past 10 years.
          </p>

          <DrivingExperienceTable
            experience={application.driving_experience || []}
            onChange={(experience) => handleChange('driving_experience', experience)}
          />
          {errors.driving_experience && (
            <span className="error-message section-error">
              <AlertCircle size={12} /> {errors.driving_experience}
            </span>
          )}
        </div>

        {/* Accident History */}
        <div className="form-section">
          <h3>Accident History</h3>

          <div className="disclosure-question">
            <label className="disclosure-label">
              Have you been involved in any accidents in the last 3 years?
            </label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="has_accidents"
                  checked={application.has_accidents_last_3_years === true}
                  onChange={() => handleChange('has_accidents_last_3_years', true)}
                />
                <span>Yes</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="has_accidents"
                  checked={application.has_accidents_last_3_years === false}
                  onChange={() => handleChange('has_accidents_last_3_years', false)}
                />
                <span>No</span>
              </label>
            </div>
          </div>

          {application.has_accidents_last_3_years && (
            <div className="records-section">
              {(application.accidents || []).length > 0 && (
                <div className="records-list">
                  {application.accidents!.map((accident, index) => (
                    <div key={index} className="record-card">
                      <div className="record-info">
                        <strong>{new Date(accident.date).toLocaleDateString()}</strong>
                        <span>{accident.location}</span>
                        <span>{accident.nature_of_accident}</span>
                      </div>
                      <div className="record-actions">
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => {
                            setEditingAccident(index);
                            setShowAccidentForm(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-icon danger"
                          onClick={() => handleDeleteAccident(index)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!showAccidentForm && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowAccidentForm(true)}
                >
                  <Plus size={16} />
                  Add Accident Record
                </button>
              )}

              {showAccidentForm && (
                <AccidentEntryForm
                  initialData={editingAccident !== null ? application.accidents![editingAccident] : undefined}
                  onSave={handleAddAccident}
                  onCancel={() => {
                    setShowAccidentForm(false);
                    setEditingAccident(null);
                  }}
                />
              )}

              {errors.accidents && (
                <span className="error-message section-error">
                  <AlertCircle size={12} /> {errors.accidents}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Traffic Convictions */}
        <div className="form-section">
          <h3>Traffic Convictions</h3>

          <div className="disclosure-question">
            <label className="disclosure-label">
              Have you had any traffic convictions or forfeitures in the last 3 years?
            </label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="has_convictions"
                  checked={application.has_convictions_last_3_years === true}
                  onChange={() => handleChange('has_convictions_last_3_years', true)}
                />
                <span>Yes</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="has_convictions"
                  checked={application.has_convictions_last_3_years === false}
                  onChange={() => handleChange('has_convictions_last_3_years', false)}
                />
                <span>No</span>
              </label>
            </div>
            <span className="form-hint">
              (Other than parking violations)
            </span>
          </div>

          {application.has_convictions_last_3_years && (
            <div className="records-section">
              {(application.convictions || []).length > 0 && (
                <div className="records-list">
                  {application.convictions!.map((conviction, index) => (
                    <div key={index} className="record-card">
                      <div className="record-info">
                        <strong>{new Date(conviction.date).toLocaleDateString()}</strong>
                        <span>{conviction.location}</span>
                        <span>{conviction.charge}</span>
                      </div>
                      <div className="record-actions">
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => {
                            setEditingConviction(index);
                            setShowConvictionForm(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-icon danger"
                          onClick={() => handleDeleteConviction(index)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!showConvictionForm && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowConvictionForm(true)}
                >
                  <Plus size={16} />
                  Add Conviction Record
                </button>
              )}

              {showConvictionForm && (
                <ConvictionEntryForm
                  initialData={editingConviction !== null ? application.convictions![editingConviction] : undefined}
                  onSave={handleAddConviction}
                  onCancel={() => {
                    setShowConvictionForm(false);
                    setEditingConviction(null);
                  }}
                />
              )}

              {errors.convictions && (
                <span className="error-message section-error">
                  <AlertCircle size={12} /> {errors.convictions}
                </span>
              )}
            </div>
          )}
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
