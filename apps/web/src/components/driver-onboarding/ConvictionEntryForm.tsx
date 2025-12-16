import { useState } from 'react';
import { Scale, X, Check } from 'lucide-react';
import type { Conviction } from './types';
import './ConvictionEntryForm.css';

interface ConvictionEntryFormProps {
  initialData?: Conviction;
  onSave: (conviction: Conviction) => void;
  onCancel: () => void;
}

const EMPTY_CONVICTION: Conviction = {
  date: '',
  charge: '',
  location: '',
  penalty: '',
};

export function ConvictionEntryForm({ initialData, onSave, onCancel }: ConvictionEntryFormProps) {
  const [conviction, setConviction] = useState<Conviction>(initialData || EMPTY_CONVICTION);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof Conviction, value: string) => {
    setConviction((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!conviction.date) {
      newErrors.date = 'Date is required';
    }
    if (!conviction.charge.trim()) {
      newErrors.charge = 'Charge/Violation is required';
    }
    if (!conviction.location.trim()) {
      newErrors.location = 'Location is required';
    }
    if (!conviction.penalty.trim()) {
      newErrors.penalty = 'Penalty is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSave(conviction);
    }
  };

  return (
    <div className="conviction-entry-form">
      <div className="form-header">
        <div className="form-header-icon">
          <Scale size={18} />
        </div>
        <h4>{initialData ? 'Edit Conviction Record' : 'Add Conviction Record'}</h4>
        <button type="button" className="btn-close" onClick={onCancel}>
          <X size={18} />
        </button>
      </div>

      <div className="form-body">
        <div className="form-row two-col">
          <div className="form-group">
            <label htmlFor="conviction_date">
              Date of Conviction <span className="required">*</span>
            </label>
            <input
              id="conviction_date"
              type="date"
              value={conviction.date}
              onChange={(e) => handleChange('date', e.target.value)}
              className={errors.date ? 'error' : ''}
            />
            {errors.date && <span className="error-message">{errors.date}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="conviction_location">
              Location (City, State) <span className="required">*</span>
            </label>
            <input
              id="conviction_location"
              type="text"
              value={conviction.location}
              onChange={(e) => handleChange('location', e.target.value)}
              className={errors.location ? 'error' : ''}
              placeholder="e.g., Charleston, WV"
            />
            {errors.location && <span className="error-message">{errors.location}</span>}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="charge">
            Charge/Violation <span className="required">*</span>
          </label>
          <textarea
            id="charge"
            value={conviction.charge}
            onChange={(e) => handleChange('charge', e.target.value)}
            className={errors.charge ? 'error' : ''}
            placeholder="Describe the charge or violation (e.g., speeding 15 mph over limit, failure to yield, etc.)"
            rows={2}
          />
          {errors.charge && <span className="error-message">{errors.charge}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="penalty">
            Penalty/Fine <span className="required">*</span>
          </label>
          <input
            id="penalty"
            type="text"
            value={conviction.penalty}
            onChange={(e) => handleChange('penalty', e.target.value)}
            className={errors.penalty ? 'error' : ''}
            placeholder="e.g., $150 fine, 2 points, traffic school"
          />
          {errors.penalty && <span className="error-message">{errors.penalty}</span>}
        </div>

        <div className="form-note">
          <p>
            <strong>Note:</strong> Disclose all traffic convictions and bond forfeitures from the
            last 3 years, excluding parking violations. This includes violations in personal vehicles.
          </p>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSubmit}>
          <Check size={16} />
          {initialData ? 'Update' : 'Add'} Record
        </button>
      </div>
    </div>
  );
}
