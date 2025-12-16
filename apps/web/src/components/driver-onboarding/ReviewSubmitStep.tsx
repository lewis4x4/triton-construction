import { useState } from 'react';
import {
  CheckSquare,
  ChevronLeft,
  AlertCircle,
  User,
  CreditCard,
  Briefcase,
  FileText,
  Upload,
  Shield,
  Check,
  Edit2,
  Send,
} from 'lucide-react';
import type { WizardStepProps, Address, Employment, DrivingExperience, Accident, Conviction } from './types';
import { ESignaturePad } from './ESignaturePad';
import { US_STATES, CDL_ENDORSEMENTS, EQUIPMENT_TYPES } from './types';
import './ReviewSubmitStep.css';

interface ReviewSection {
  id: string;
  title: string;
  icon: React.ElementType;
  step: number;
}

const REVIEW_SECTIONS: ReviewSection[] = [
  { id: 'personal', title: 'Personal Information', icon: User, step: 1 },
  { id: 'license', title: 'License & Experience', icon: CreditCard, step: 2 },
  { id: 'employment', title: 'Employment History', icon: Briefcase, step: 3 },
  { id: 'policies', title: 'Policy Acknowledgments', icon: FileText, step: 4 },
  { id: 'documents', title: 'Documents', icon: Upload, step: 5 },
  { id: 'authorizations', title: 'Authorizations', icon: Shield, step: 6 },
];

export function ReviewSubmitStep({
  application,
  onUpdate,
  onNext,
  onPrev,
  isLoading,
}: WizardStepProps) {
  const [errors, setErrors] = useState<string[]>([]);
  const [showSignature, setShowSignature] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [certificationChecked, setCertificationChecked] = useState(false);

  const getStateName = (code: string): string => {
    return US_STATES.find(s => s.value === code)?.label || code;
  };

  const getEndorsementLabel = (code: string): string => {
    return CDL_ENDORSEMENTS.find(e => e.value === code)?.label || code;
  };

  const getEquipmentLabel = (type: string): string => {
    return EQUIPMENT_TYPES.find(e => e.value === type)?.label || type;
  };

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'Not provided';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatAddress = (addr: Address): string => {
    return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`;
  };

  const renderPersonalInfo = () => (
    <div className="review-details">
      <div className="detail-row">
        <span className="label">Full Name</span>
        <span className="value">
          {application.first_name} {application.middle_name} {application.last_name}
          {application.suffix && `, ${application.suffix}`}
        </span>
      </div>
      <div className="detail-row">
        <span className="label">Date of Birth</span>
        <span className="value">{formatDate(application.date_of_birth)}</span>
      </div>
      <div className="detail-row">
        <span className="label">Email</span>
        <span className="value">{application.email || 'Not provided'}</span>
      </div>
      <div className="detail-row">
        <span className="label">Phone</span>
        <span className="value">{application.phone || 'Not provided'}</span>
      </div>
      {application.emergency_contact_name && (
        <div className="detail-row">
          <span className="label">Emergency Contact</span>
          <span className="value">
            {application.emergency_contact_name} ({application.emergency_contact_relationship})
            - {application.emergency_contact_phone}
          </span>
        </div>
      )}
      {application.addresses && application.addresses.length > 0 && (
        <div className="detail-row full-width">
          <span className="label">Address History</span>
          <div className="address-list">
            {(application.addresses as Address[]).map((addr, idx) => (
              <div key={idx} className="address-item">
                <span className="address-text">{formatAddress(addr)}</span>
                <span className="address-dates">
                  {formatDate(addr.from_date)} - {addr.is_current ? 'Present' : formatDate(addr.to_date)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderLicenseInfo = () => (
    <div className="review-details">
      <div className="detail-row">
        <span className="label">License Number</span>
        <span className="value">{application.license_number}</span>
      </div>
      <div className="detail-row">
        <span className="label">State</span>
        <span className="value">{getStateName(application.license_state || '')}</span>
      </div>
      <div className="detail-row">
        <span className="label">Expiration</span>
        <span className="value">{formatDate(application.license_expiration)}</span>
      </div>
      {application.license_class && (
        <div className="detail-row">
          <span className="label">CDL Class</span>
          <span className="value">Class {application.license_class}</span>
        </div>
      )}
      {application.endorsements && application.endorsements.length > 0 && (
        <div className="detail-row">
          <span className="label">Endorsements</span>
          <span className="value">
            {application.endorsements.map(e => getEndorsementLabel(e)).join(', ')}
          </span>
        </div>
      )}
      {application.driving_experience && (application.driving_experience as DrivingExperience[]).length > 0 && (
        <div className="detail-row full-width">
          <span className="label">Driving Experience</span>
          <div className="experience-list">
            {(application.driving_experience as DrivingExperience[]).map((exp, idx) => (
              <div key={idx} className="experience-item">
                <span>{getEquipmentLabel(exp.equipment_type)}</span>
                <span>{exp.years_experience} years / {exp.approximate_miles.toLocaleString()} miles</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {application.has_accidents_last_3_years && application.accidents && (
        <div className="detail-row full-width">
          <span className="label">Accidents (Last 3 Years)</span>
          <span className="value warning">
            {(application.accidents as Accident[]).length} accident(s) reported
          </span>
        </div>
      )}
      {application.has_convictions_last_3_years && application.convictions && (
        <div className="detail-row full-width">
          <span className="label">Convictions (Last 3 Years)</span>
          <span className="value warning">
            {(application.convictions as Conviction[]).length} conviction(s) reported
          </span>
        </div>
      )}
    </div>
  );

  const renderEmploymentInfo = () => (
    <div className="review-details">
      {application.employment_history && (application.employment_history as Employment[]).length > 0 ? (
        <div className="employment-list">
          {(application.employment_history as Employment[]).map((emp, idx) => (
            <div key={idx} className="employment-item">
              <div className="employer-name">{emp.employer_name}</div>
              <div className="employer-details">
                <span>{emp.position}</span>
                <span>{formatDate(emp.from_date)} - {emp.to_date ? formatDate(emp.to_date) : 'Present'}</span>
              </div>
              <div className="employer-badges">
                {emp.subject_to_fmcsr && (
                  <span className="badge fmcsr">Subject to FMCSR</span>
                )}
                {emp.drug_alcohol_testing && (
                  <span className="badge testing">D&A Testing</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="no-data">No employment history provided</p>
      )}
    </div>
  );

  const renderPoliciesInfo = () => (
    <div className="review-details">
      <div className="detail-row">
        <span className="label">SP-030 Fleet Policy</span>
        <span className={`value ${application.fleet_policy_acknowledged_at ? 'complete' : 'pending'}`}>
          {application.fleet_policy_acknowledged_at ? (
            <><Check size={14} /> Acknowledged on {formatDate(application.fleet_policy_acknowledged_at)}</>
          ) : 'Not acknowledged'}
        </span>
      </div>
      <div className="detail-row">
        <span className="label">CMV Driver Policy Manual</span>
        <span className={`value ${application.cmv_policy_acknowledged_at ? 'complete' : 'pending'}`}>
          {application.cmv_policy_acknowledged_at ? (
            <><Check size={14} /> All sections initialed on {formatDate(application.cmv_policy_acknowledged_at)}</>
          ) : 'Not completed'}
        </span>
      </div>
    </div>
  );

  const renderDocumentsInfo = () => (
    <div className="review-details">
      <div className="detail-row">
        <span className="label">Medical Card Expiration</span>
        <span className={`value ${application.medical_card_expiration ? 'complete' : 'pending'}`}>
          {application.medical_card_expiration
            ? formatDate(application.medical_card_expiration)
            : 'Not uploaded'}
        </span>
      </div>
      <p className="note">
        Documents will be verified by our compliance team after submission.
      </p>
    </div>
  );

  const renderAuthorizationsInfo = () => (
    <div className="review-details">
      <div className="detail-row">
        <span className="label">Drug & Alcohol Testing</span>
        <span className={`value ${application.drug_test_authorized_at ? 'complete' : 'pending'}`}>
          {application.drug_test_authorized_at ? (
            <><Check size={14} /> Signed on {formatDate(application.drug_test_authorized_at)}</>
          ) : 'Not signed'}
        </span>
      </div>
      <div className="detail-row">
        <span className="label">MVR Authorization</span>
        <span className={`value ${application.mvr_authorized_at ? 'complete' : 'pending'}`}>
          {application.mvr_authorized_at ? (
            <><Check size={14} /> Signed on {formatDate(application.mvr_authorized_at)}</>
          ) : 'Not signed'}
        </span>
      </div>
      <div className="detail-row">
        <span className="label">FMCSA Clearinghouse Consent</span>
        <span className={`value ${application.clearinghouse_authorized_at ? 'complete' : 'pending'}`}>
          {application.clearinghouse_authorized_at ? (
            <><Check size={14} /> Signed on {formatDate(application.clearinghouse_authorized_at)}</>
          ) : 'Not signed'}
        </span>
      </div>
    </div>
  );

  const renderSectionContent = (sectionId: string) => {
    switch (sectionId) {
      case 'personal':
        return renderPersonalInfo();
      case 'license':
        return renderLicenseInfo();
      case 'employment':
        return renderEmploymentInfo();
      case 'policies':
        return renderPoliciesInfo();
      case 'documents':
        return renderDocumentsInfo();
      case 'authorizations':
        return renderAuthorizationsInfo();
      default:
        return null;
    }
  };

  const validateSubmission = (): boolean => {
    const newErrors: string[] = [];

    if (!certificationChecked) {
      newErrors.push('You must certify that all information is accurate');
    }

    // Check all authorizations are signed
    if (!application.drug_test_authorized_at) {
      newErrors.push('Drug & Alcohol Testing authorization is required');
    }
    if (!application.mvr_authorized_at) {
      newErrors.push('MVR Authorization is required');
    }
    if (!application.clearinghouse_authorized_at) {
      newErrors.push('FMCSA Clearinghouse consent is required');
    }

    // Check policies are acknowledged
    if (!application.fleet_policy_acknowledged_at) {
      newErrors.push('SP-030 Fleet Policy acknowledgment is required');
    }
    if (!application.cmv_policy_acknowledged_at) {
      newErrors.push('CMV Driver Policy Manual must be fully initialed');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmitClick = () => {
    if (validateSubmission()) {
      setShowSignature(true);
    }
  };

  const handleSignatureSubmit = async (signatureData: { signature_data: string }) => {
    setIsSubmitting(true);
    try {
      // Update application with certification
      onUpdate({
        certified_accurate_at: new Date().toISOString(),
        applicant_signature: signatureData.signature_data,
        submitted_at: new Date().toISOString(),
        status: 'PENDING_VERIFICATION' as any,
      });

      // Move to next (which will likely show a success message)
      onNext();
    } catch (err) {
      console.error('Submission failed:', err);
      setErrors(['Failed to submit application. Please try again.']);
    } finally {
      setIsSubmitting(false);
      setShowSignature(false);
    }
  };

  return (
    <div className="review-step">
      <div className="step-header">
        <div className="step-icon">
          <CheckSquare size={24} />
        </div>
        <div className="step-title-content">
          <h2>Review & Submit</h2>
          <p>
            Please review all the information you've provided. By submitting, you certify
            that all statements are true and complete to the best of your knowledge.
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

      {/* Review Sections */}
      <div className="review-sections">
        {REVIEW_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.id} className="review-section">
              <div className="section-header">
                <div className="section-title">
                  <Icon size={18} />
                  <h3>{section.title}</h3>
                </div>
                <button
                  type="button"
                  className="btn-edit"
                  onClick={() => onUpdate({ current_step: section.step })}
                >
                  <Edit2 size={14} />
                  Edit
                </button>
              </div>
              {renderSectionContent(section.id)}
            </div>
          );
        })}
      </div>

      {/* Certification */}
      <div className="certification-section">
        <h3>Applicant Certification</h3>
        <div className="certification-text">
          <p>
            This certifies that the application was completed by me and that all entries on
            it and information in it are true and complete to the best of my knowledge.
          </p>
          <p>
            I understand that any misrepresentation or omission of facts may result in
            disqualification from employment or, if I am employed, dismissal.
          </p>
          <p>
            I authorize Triton Construction, Inc. to make such investigations and inquiries
            of my personal, employment, financial or medical history and other related
            matters as may be necessary in arriving at an employment decision.
          </p>
        </div>
        <label className="certification-checkbox">
          <input
            type="checkbox"
            checked={certificationChecked}
            onChange={(e) => setCertificationChecked(e.target.checked)}
          />
          <span>
            I certify that all information provided in this application is true and complete,
            and I understand that falsification may be grounds for termination.
          </span>
        </label>
      </div>

      {/* Signature Modal */}
      {showSignature && (
        <div className="signature-overlay">
          <div className="signature-modal">
            <h3>Final Certification Signature</h3>
            <p>
              Sign below to certify that all information in this application is accurate
              and complete.
            </p>
            <ESignaturePad
              onSave={handleSignatureSubmit}
              onCancel={() => setShowSignature(false)}
              documentType="CDL Driver Application Certification"
            />
          </div>
        </div>
      )}

      <div className="step-navigation">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onPrev}
          disabled={isLoading || isSubmitting}
        >
          <ChevronLeft size={18} />
          Previous
        </button>
        <button
          type="button"
          className="btn btn-submit"
          onClick={handleSubmitClick}
          disabled={isLoading || isSubmitting}
        >
          <Send size={18} />
          {isSubmitting ? 'Submitting...' : 'Submit Application'}
        </button>
      </div>
    </div>
  );
}
