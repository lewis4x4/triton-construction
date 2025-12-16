import { useState } from 'react';
import {
  Briefcase,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Check,
  Building,
  AlertCircle,
} from 'lucide-react';
import type { WizardStepProps, Employment, Address } from './types';
import { EmploymentEntryForm } from './EmploymentEntryForm';
import { AddressHistoryForm } from './AddressHistoryForm';
import './EmploymentHistoryStep.css';

export function EmploymentHistoryStep({
  application,
  onUpdate,
  onNext,
  onPrev,
  isLoading,
}: WizardStepProps) {
  const [showEmploymentForm, setShowEmploymentForm] = useState(false);
  const [editingEmploymentIndex, setEditingEmploymentIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const employmentHistory = application.employment_history || [];
  const addresses = application.addresses || [];

  // Calculate total employment years
  const calculateEmploymentYears = (): number => {
    let totalMonths = 0;
    employmentHistory.forEach((emp) => {
      if (emp.from_date) {
        const from = new Date(emp.from_date);
        const to = emp.to_date ? new Date(emp.to_date) : new Date();
        const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
        totalMonths += Math.max(0, months);
      }
    });
    return totalMonths / 12;
  };

  const totalEmploymentYears = calculateEmploymentYears();
  const hasMinimumEmployment = totalEmploymentYears >= 3;

  const handleAddEmployment = () => {
    setEditingEmploymentIndex(null);
    setShowEmploymentForm(true);
  };

  const handleEditEmployment = (index: number) => {
    setEditingEmploymentIndex(index);
    setShowEmploymentForm(true);
  };

  const handleDeleteEmployment = (index: number) => {
    const newHistory = employmentHistory.filter((_, i) => i !== index);
    onUpdate({ employment_history: newHistory });
  };

  const handleSaveEmployment = (employment: Employment) => {
    let newHistory: Employment[];

    if (editingEmploymentIndex !== null) {
      newHistory = [...employmentHistory];
      newHistory[editingEmploymentIndex] = employment;
    } else {
      newHistory = [...employmentHistory, employment];
    }

    // Sort by date (most recent first)
    newHistory.sort((a, b) => {
      const dateA = a.to_date || new Date().toISOString();
      const dateB = b.to_date || new Date().toISOString();
      return dateB.localeCompare(dateA);
    });

    onUpdate({ employment_history: newHistory });
    setShowEmploymentForm(false);
    setEditingEmploymentIndex(null);
  };

  const handleAddressChange = (newAddresses: Address[]) => {
    onUpdate({ addresses: newAddresses });
  };

  const validateStep = (): boolean => {
    const newErrors: string[] = [];

    if (employmentHistory.length === 0) {
      newErrors.push('At least one employer is required');
    }

    if (!hasMinimumEmployment) {
      newErrors.push('Employment history must cover at least 3 years');
    }

    // Check for address history
    const addressYears = addresses.reduce((total, addr) => {
      if (addr.from_date) {
        const from = new Date(addr.from_date);
        const to = addr.to_date ? new Date(addr.to_date) : new Date();
        const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
        return total + Math.max(0, months) / 12;
      }
      return total;
    }, 0);

    if (addressYears < 3) {
      newErrors.push('Address history must cover at least 3 years');
    }

    if (!addresses.some((a) => a.is_current)) {
      newErrors.push('Current address is required');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      onNext();
    }
  };

  const formatDateRange = (fromDate: string, toDate: string | null): string => {
    const from = new Date(fromDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    if (!toDate) return `${from} - Present`;
    const to = new Date(toDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return `${from} - ${to}`;
  };

  if (showEmploymentForm) {
    return (
      <div className="employment-step">
        <EmploymentEntryForm
          initialData={editingEmploymentIndex !== null ? employmentHistory[editingEmploymentIndex] : undefined}
          onSave={handleSaveEmployment}
          onCancel={() => {
            setShowEmploymentForm(false);
            setEditingEmploymentIndex(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="employment-step">
      <div className="step-header">
        <div className="step-icon">
          <Briefcase size={24} />
        </div>
        <div className="step-title-content">
          <h2>Employment & Address History</h2>
          <p>
            Per DOT regulations (49 CFR 391.21), you must provide a complete employment history for
            the past 3 years, and all addresses for the past 3 years.
          </p>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="validation-errors">
          <AlertCircle size={16} />
          <div className="error-list">
            {errors.map((error, index) => (
              <span key={index}>{error}</span>
            ))}
          </div>
        </div>
      )}

      {/* Employment History Section */}
      <div className="section-container">
        <div className="section-header">
          <div className="section-title">
            <Building size={18} />
            <h3>Employment History</h3>
          </div>
          <div className="section-meta">
            <span className={`years-badge ${hasMinimumEmployment ? 'complete' : ''}`}>
              {totalEmploymentYears.toFixed(1)} years documented
              {hasMinimumEmployment && <Check size={14} />}
            </span>
            <button type="button" className="btn btn-sm btn-primary" onClick={handleAddEmployment}>
              <Plus size={14} />
              Add Employer
            </button>
          </div>
        </div>

        {employmentHistory.length === 0 ? (
          <div className="empty-state">
            <Briefcase size={32} />
            <p>No employment history added</p>
            <button type="button" className="btn btn-primary" onClick={handleAddEmployment}>
              <Plus size={16} />
              Add Your First Employer
            </button>
          </div>
        ) : (
          <div className="employment-list">
            {employmentHistory.map((employment, index) => (
              <div key={index} className="employment-card">
                <div className="employment-info">
                  <div className="employer-name">
                    {!employment.to_date && <span className="current-badge">Current</span>}
                    {employment.employer_name}
                  </div>
                  <div className="employer-details">
                    <span className="position">{employment.position}</span>
                    <span className="location">
                      {employment.city}, {employment.state}
                    </span>
                    <span className="dates">
                      {formatDateRange(employment.from_date, employment.to_date)}
                    </span>
                  </div>
                  {employment.subject_to_fmcsr && (
                    <div className="dot-indicators">
                      <span className="dot-badge">FMCSR</span>
                      {employment.drug_alcohol_testing && <span className="dot-badge">D&A Testing</span>}
                    </div>
                  )}
                </div>
                <div className="employment-actions">
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => handleEditEmployment(index)}
                    title="Edit employer"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn-icon btn-delete"
                    onClick={() => handleDeleteEmployment(index)}
                    title="Delete employer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Address History Section */}
      <div className="section-container">
        <AddressHistoryForm addresses={addresses} onChange={handleAddressChange} minYears={3} />
      </div>

      <div className="form-note">
        <AlertCircle size={16} />
        <p>
          <strong>Important:</strong> All previous employers may be contacted to verify your
          employment and obtain Safety Performance History information. Please ensure all contact
          information is accurate and current.
        </p>
      </div>

      <div className="step-navigation">
        <button type="button" className="btn btn-secondary" onClick={onPrev} disabled={isLoading}>
          <ChevronLeft size={18} />
          Previous
        </button>
        <button type="button" className="btn btn-primary" onClick={handleNext} disabled={isLoading}>
          Continue
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
