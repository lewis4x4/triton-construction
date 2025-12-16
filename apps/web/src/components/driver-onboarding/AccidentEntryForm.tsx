import { useState } from 'react';
import { AlertTriangle, X, Check } from 'lucide-react';
import type { Accident } from './types';
import './AccidentEntryForm.css';

interface AccidentEntryFormProps {
  initialData?: Accident;
  onSave: (accident: Accident) => void;
  onCancel: () => void;
}

const EMPTY_ACCIDENT: Accident = {
  date: '',
  nature_of_accident: '',
  fatalities: 0,
  injuries: 0,
  location: '',
};

export function AccidentEntryForm({ initialData, onSave, onCancel }: AccidentEntryFormProps) {
  const [accident, setAccident] = useState<Accident>(initialData || EMPTY_ACCIDENT);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof Accident, value: string | number) => {
    setAccident((prev) => ({ ...prev, [field]: value }));
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

    if (!accident.date) {
      newErrors.date = 'Date is required';
    }
    if (!accident.nature_of_accident.trim()) {
      newErrors.nature_of_accident = 'Description is required';
    }
    if (!accident.location.trim()) {
      newErrors.location = 'Location is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSave(accident);
    }
  };

  return (
    <div className="accident-entry-form">
      <div className="form-header">
        <div className="form-header-icon">
          <AlertTriangle size={18} />
        </div>
        <h4>{initialData ? 'Edit Accident Record' : 'Add Accident Record'}</h4>
        <button type="button" className="btn-close" onClick={onCancel}>
          <X size={18} />
        </button>
      </div>

      <div className="form-body">
        <div className="form-row two-col">
          <div className="form-group">
            <label htmlFor="accident_date">
              Date of Accident <span className="required">*</span>
            </label>
            <input
              id="accident_date"
              type="date"
              value={accident.date}
              onChange={(e) => handleChange('date', e.target.value)}
              className={errors.date ? 'error' : ''}
            />
            {errors.date && <span className="error-message">{errors.date}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="accident_location">
              Location (City, State) <span className="required">*</span>
            </label>
            <input
              id="accident_location"
              type="text"
              value={accident.location}
              onChange={(e) => handleChange('location', e.target.value)}
              className={errors.location ? 'error' : ''}
              placeholder="e.g., Charleston, WV"
            />
            {errors.location && <span className="error-message">{errors.location}</span>}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="nature_of_accident">
            Nature of Accident <span className="required">*</span>
          </label>
          <textarea
            id="nature_of_accident"
            value={accident.nature_of_accident}
            onChange={(e) => handleChange('nature_of_accident', e.target.value)}
            className={errors.nature_of_accident ? 'error' : ''}
            placeholder="Describe the accident (e.g., rear-end collision, rollover, etc.)"
            rows={3}
          />
          {errors.nature_of_accident && (
            <span className="error-message">{errors.nature_of_accident}</span>
          )}
        </div>

        <div className="form-row two-col">
          <div className="form-group">
            <label htmlFor="fatalities">Number of Fatalities</label>
            <input
              id="fatalities"
              type="number"
              min="0"
              value={accident.fatalities}
              onChange={(e) => handleChange('fatalities', parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="injuries">Number of Injuries</label>
            <input
              id="injuries"
              type="number"
              min="0"
              value={accident.injuries}
              onChange={(e) => handleChange('injuries', parseInt(e.target.value) || 0)}
            />
          </div>
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
