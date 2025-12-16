import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  CreditCard,
  FileText,
  Check,
  ChevronLeft,
  Save,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  PersonalInfoStep,
  LicenseInfoStep,
  PolicyViewer,
  ESignaturePad,
  ApplicationStatusBadge,
} from '../../components/driver-onboarding';
import { SP030_POLICY_SECTIONS } from '../../components/driver-onboarding/PolicyViewer';
import type { DriverApplication } from '../../components/driver-onboarding/types';
import './NonCDLOnboardingWizard.css';

const WIZARD_STEPS = [
  { id: 1, title: 'Personal Info', icon: User },
  { id: 2, title: 'License Info', icon: CreditCard },
  { id: 3, title: 'Policy & Signature', icon: FileText },
];

const INITIAL_APPLICATION: Partial<DriverApplication> = {
  application_type: 'NON_CDL',
  status: 'DRAFT',
  current_step: 1,
  completed_steps: [],
  addresses: [],
  driving_experience: [],
  accidents: [],
  convictions: [],
  employment_history: [],
  endorsements: [],
  restrictions: [],
  cmv_policy_initials: {},
  has_accidents_last_3_years: false,
  has_convictions_last_3_years: false,
};

export default function NonCDLOnboardingWizard() {
  const navigate = useNavigate();
  const { user, organizationId } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [application, setApplication] = useState<Partial<DriverApplication>>(INITIAL_APPLICATION);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [policyAcknowledged, setPolicyAcknowledged] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

  // Create or load application
  useEffect(() => {
    const initializeApplication = async () => {
      if (!organizationId) return;

      setIsLoading(true);
      try {
        // Check for existing draft application
        const { data: existingApp, error: fetchError } = await supabase
          .from('driver_applications')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('application_type', 'NON_CDL')
          .eq('status', 'DRAFT')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (existingApp && !fetchError) {
          setApplication(existingApp);
          setApplicationId(existingApp.id);
          setCurrentStep(existingApp.current_step || 1);
          if (existingApp.fleet_policy_acknowledged_at) {
            setPolicyAcknowledged(true);
          }
          if (existingApp.applicant_signature) {
            setSignature(existingApp.applicant_signature);
          }
        } else {
          // Create new application
          const { data: newApp, error: createError } = await supabase
            .from('driver_applications')
            .insert({
              organization_id: organizationId,
              application_type: 'NON_CDL',
              status: 'DRAFT',
              current_step: 1,
              completed_steps: [],
              first_name: '',
              last_name: '',
              date_of_birth: '',
              license_number: '',
              license_state: '',
              license_expiration: '',
            })
            .select()
            .single();

          if (createError) throw createError;
          if (newApp) {
            setApplication(newApp);
            setApplicationId(newApp.id);
          }
        }
      } catch (err) {
        console.error('Failed to initialize application:', err);
        setError('Failed to initialize application. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    initializeApplication();
  }, [organizationId]);

  // Auto-save on application changes
  const saveApplication = useCallback(async (updates: Partial<DriverApplication>) => {
    if (!applicationId) return;

    setIsSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('driver_applications')
        .update({
          ...updates,
          last_saved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId);

      if (updateError) throw updateError;
    } catch (err) {
      console.error('Failed to save application:', err);
    } finally {
      setIsSaving(false);
    }
  }, [applicationId]);

  const handleUpdate = useCallback((updates: Partial<DriverApplication>) => {
    setApplication((prev) => ({ ...prev, ...updates }));
    saveApplication(updates);
  }, [saveApplication]);

  const handleNextStep = useCallback(() => {
    const newCompletedSteps = [...(application.completed_steps || [])];
    if (!newCompletedSteps.includes(currentStep)) {
      newCompletedSteps.push(currentStep);
    }

    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    handleUpdate({
      current_step: nextStep,
      completed_steps: newCompletedSteps,
    });
  }, [currentStep, application.completed_steps, handleUpdate]);

  const handlePrevStep = useCallback(() => {
    const prevStep = currentStep - 1;
    if (prevStep >= 1) {
      setCurrentStep(prevStep);
      handleUpdate({ current_step: prevStep });
    }
  }, [currentStep, handleUpdate]);

  const handlePolicyAcknowledge = (acknowledged: boolean) => {
    setPolicyAcknowledged(acknowledged);
    if (acknowledged) {
      handleUpdate({ fleet_policy_acknowledged_at: new Date().toISOString() });
    } else {
      handleUpdate({ fleet_policy_acknowledged_at: null });
    }
  };

  const handleSignatureChange = (signatureData: string | null) => {
    setSignature(signatureData);
    handleUpdate({ applicant_signature: signatureData });
  };

  const handleSubmit = async () => {
    if (!applicationId || !policyAcknowledged || !signature) return;

    setIsLoading(true);
    setError(null);

    try {
      // Update application to submitted status
      const { error: submitError } = await supabase
        .from('driver_applications')
        .update({
          status: 'PENDING_VERIFICATION',
          certified_accurate_at: new Date().toISOString(),
          submitted_at: new Date().toISOString(),
          current_step: 3,
          completed_steps: [1, 2, 3],
        })
        .eq('id', applicationId);

      if (submitError) throw submitError;

      // Create e-signature record for audit trail
      const { error: sigError } = await supabase
        .from('driver_esignatures')
        .insert({
          driver_application_id: applicationId,
          document_type: 'SP030_FLEET_POLICY',
          signature_data: signature,
          signer_name: `${application.first_name} ${application.last_name}`.trim(),
          signer_ip_address: null, // Would need server-side to capture
          signer_user_agent: navigator.userAgent,
        });

      if (sigError) throw sigError;

      // Navigate to success page or list
      navigate('/fleet/driver-onboarding', {
        state: { success: true, message: 'Application submitted successfully!' },
      });
    } catch (err) {
      console.error('Failed to submit application:', err);
      setError('Failed to submit application. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = policyAcknowledged && signature && application.first_name && application.license_number;

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <PersonalInfoStep
            application={application}
            onUpdate={handleUpdate}
            onNext={handleNextStep}
            onPrev={() => navigate('/fleet/driver-onboarding')}
            isLoading={isLoading}
          />
        );
      case 2:
        return (
          <LicenseInfoStep
            application={application}
            onUpdate={handleUpdate}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            isLoading={isLoading}
          />
        );
      case 3:
        return (
          <div className="policy-signature-step">
            <div className="step-header">
              <div className="step-icon">
                <FileText size={24} />
              </div>
              <div className="step-title">
                <h2>Fleet Policy Acknowledgment</h2>
                <p>Review and acknowledge the SP-030 Fleet Safety Policy</p>
              </div>
            </div>

            <PolicyViewer
              title="SP-030 Fleet Safety Policy"
              sections={SP030_POLICY_SECTIONS}
              requireFullScroll={true}
              onAcknowledge={handlePolicyAcknowledge}
              acknowledged={policyAcknowledged}
              disabled={isLoading}
            />

            <div className="signature-section">
              <ESignaturePad
                onSignatureChange={handleSignatureChange}
                signerName={`${application.first_name || ''} ${application.last_name || ''}`.trim()}
                initialSignature={signature}
                disabled={isLoading || !policyAcknowledged}
                label="Applicant Signature"
                required
              />
            </div>

            {error && (
              <div className="error-banner">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="step-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handlePrevStep}
                disabled={isLoading}
              >
                <ChevronLeft size={18} />
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={isLoading || !canSubmit}
              >
                {isLoading ? 'Submitting...' : 'Submit Application'}
                <Check size={18} />
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (isLoading && !applicationId) {
    return (
      <div className="wizard-loading">
        <div className="loading-spinner" />
        <p>Loading application...</p>
      </div>
    );
  }

  return (
    <div className="non-cdl-wizard">
      <div className="wizard-header">
        <div className="wizard-header-content">
          <button
            type="button"
            className="back-link"
            onClick={() => navigate('/fleet/driver-onboarding')}
          >
            <ChevronLeft size={18} />
            Back to Onboarding
          </button>
          <div className="wizard-title-row">
            <h1>Non-CDL Driver Onboarding</h1>
            {application.status && (
              <ApplicationStatusBadge status={application.status as any} size="md" />
            )}
          </div>
          <p className="wizard-subtitle">
            Complete the SP-030 Fleet Safety Policy acknowledgment
          </p>
        </div>

        {isSaving && (
          <div className="auto-save-indicator">
            <Save size={14} />
            Saving...
          </div>
        )}
      </div>

      <div className="wizard-progress">
        {WIZARD_STEPS.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = (application.completed_steps || []).includes(step.id);
          const isCurrent = currentStep === step.id;

          return (
            <div
              key={step.id}
              className={`progress-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
            >
              <div className="step-indicator">
                {isCompleted ? <Check size={16} /> : <Icon size={16} />}
              </div>
              <span className="step-label">{step.title}</span>
              {index < WIZARD_STEPS.length - 1 && <div className="step-connector" />}
            </div>
          );
        })}
      </div>

      <div className="wizard-content">
        {renderStep()}
      </div>
    </div>
  );
}
