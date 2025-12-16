import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  User,
  CreditCard,
  Briefcase,
  FileText,
  Upload,
  Shield,
  CheckSquare,
  Check,
  ChevronLeft,
  Save,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  PersonalInfoStep,
  LicenseExperienceStep,
  EmploymentHistoryStep,
  PolicyAcknowledgmentStep,
  DocumentUploadStep,
  AuthorizationsStep,
  ReviewSubmitStep,
  ApplicationStatusBadge,
} from '../../components/driver-onboarding';
import type { DriverApplication } from '../../components/driver-onboarding/types';
import './CDLOnboardingWizard.css';

// CDL Wizard has 7 steps
const WIZARD_STEPS = [
  { id: 1, title: 'Personal Info', icon: User },
  { id: 2, title: 'License & Experience', icon: CreditCard },
  { id: 3, title: 'Employment History', icon: Briefcase },
  { id: 4, title: 'Policy Acknowledgments', icon: FileText },
  { id: 5, title: 'Documents', icon: Upload },
  { id: 6, title: 'Authorizations', icon: Shield },
  { id: 7, title: 'Review & Submit', icon: CheckSquare },
];

const INITIAL_APPLICATION: Partial<DriverApplication> = {
  application_type: 'CDL',
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

export default function CDLOnboardingWizard() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { organizationId } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [application, setApplication] = useState<Partial<DriverApplication>>(INITIAL_APPLICATION);
  const [applicationId, setApplicationId] = useState<string | null>(id || null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing application or create new one
  useEffect(() => {
    const initializeApplication = async () => {
      if (!organizationId) return;

      setIsLoading(true);
      try {
        if (applicationId && applicationId !== 'new') {
          // Load existing application
          const { data, error: fetchError } = await supabase
            .from('driver_applications')
            .select('*')
            .eq('id', applicationId)
            .single();

          if (fetchError) throw fetchError;
          if (data) {
            setApplication(data);
            setCurrentStep(data.current_step || 1);
          }
        } else {
          // Check for existing draft or create new
          const { data: existingDraft, error: draftError } = await supabase
            .from('driver_applications')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('application_type', 'CDL')
            .eq('status', 'DRAFT')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (existingDraft && !draftError) {
            setApplication(existingDraft);
            setApplicationId(existingDraft.id);
            setCurrentStep(existingDraft.current_step || 1);
          } else {
            // Create new application
            const { data: newApp, error: createError } = await supabase
              .from('driver_applications')
              .insert({
                organization_id: organizationId,
                application_type: 'CDL',
                status: 'DRAFT',
                current_step: 1,
                completed_steps: [],
                first_name: '',
                last_name: '',
                date_of_birth: '',
                license_number: '',
                license_state: '',
                license_expiration: '',
                addresses: [],
                driving_experience: [],
                accidents: [],
                convictions: [],
                employment_history: [],
                endorsements: [],
                restrictions: [],
                cmv_policy_initials: {},
              })
              .select()
              .single();

            if (createError) throw createError;
            if (newApp) {
              setApplication(newApp);
              setApplicationId(newApp.id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to initialize application:', err);
        setError('Failed to load application. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    initializeApplication();
  }, [organizationId, applicationId]);

  // Save application updates
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

    const nextStep = Math.min(currentStep + 1, WIZARD_STEPS.length);
    setCurrentStep(nextStep);
    handleUpdate({
      current_step: nextStep,
      completed_steps: newCompletedSteps,
    });
  }, [currentStep, application.completed_steps, handleUpdate]);

  const handlePrevStep = useCallback(() => {
    const prevStep = Math.max(currentStep - 1, 1);
    setCurrentStep(prevStep);
    handleUpdate({ current_step: prevStep });
  }, [currentStep, handleUpdate]);

  const handleStepClick = (stepId: number) => {
    // Only allow navigating to completed steps or current step
    if ((application.completed_steps || []).includes(stepId) || stepId <= currentStep) {
      setCurrentStep(stepId);
      handleUpdate({ current_step: stepId });
    }
  };

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
          <LicenseExperienceStep
            application={application}
            onUpdate={handleUpdate}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            isLoading={isLoading}
          />
        );
      case 3:
        return (
          <EmploymentHistoryStep
            application={application}
            onUpdate={handleUpdate}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            isLoading={isLoading}
          />
        );
      case 4:
        return (
          <PolicyAcknowledgmentStep
            application={application}
            onUpdate={handleUpdate}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            isLoading={isLoading}
          />
        );
      case 5:
        return (
          <DocumentUploadStep
            application={application}
            onUpdate={handleUpdate}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            isLoading={isLoading}
          />
        );
      case 6:
        return (
          <AuthorizationsStep
            application={application}
            onUpdate={handleUpdate}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            isLoading={isLoading}
          />
        );
      case 7:
        return (
          <ReviewSubmitStep
            application={application}
            onUpdate={handleUpdate}
            onNext={() => navigate('/fleet/driver-onboarding')}
            onPrev={handlePrevStep}
            isLoading={isLoading}
          />
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
    <div className="cdl-wizard">
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
            <h1>CDL Driver Application</h1>
            {application.status && (
              <ApplicationStatusBadge status={application.status as any} size="md" />
            )}
          </div>
          <p className="wizard-subtitle">
            Complete the DOT-compliant driver application (49 CFR Part 391)
          </p>
        </div>

        {isSaving && (
          <div className="auto-save-indicator">
            <Save size={14} />
            Saving...
          </div>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      <div className="wizard-progress">
        {WIZARD_STEPS.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = (application.completed_steps || []).includes(step.id);
          const isCurrent = currentStep === step.id;
          const isClickable = isCompleted || step.id <= currentStep;

          return (
            <div
              key={step.id}
              className={`progress-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isClickable ? 'clickable' : ''}`}
              onClick={() => isClickable && handleStepClick(step.id)}
            >
              <div className="step-indicator">
                {isCompleted ? <Check size={14} /> : <span>{step.id}</span>}
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

      <div className="wizard-footer">
        <p className="estimated-time">
          Estimated completion time: ~30 minutes
        </p>
        {application.last_saved_at && (
          <p className="last-saved">
            Last saved: {new Date(application.last_saved_at).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
