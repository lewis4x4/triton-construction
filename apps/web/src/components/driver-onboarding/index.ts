// Driver Onboarding Components

// Core Components
export { ESignaturePad } from './ESignaturePad';
export { PolicyViewer, SP030_POLICY_SECTIONS } from './PolicyViewer';
export { ApplicationStatusBadge } from './ApplicationStatusBadge';

// Step Components
export { OnboardingTypeSelector } from './OnboardingTypeSelector';
export { PersonalInfoStep } from './PersonalInfoStep';
export { LicenseInfoStep } from './LicenseInfoStep';

// CDL-Specific Components
export { LicenseExperienceStep } from './LicenseExperienceStep';
export { DrivingExperienceTable } from './DrivingExperienceTable';
export { AccidentEntryForm } from './AccidentEntryForm';
export { ConvictionEntryForm } from './ConvictionEntryForm';
export { EmploymentHistoryStep } from './EmploymentHistoryStep';
export { EmploymentEntryForm } from './EmploymentEntryForm';
export { AddressHistoryForm } from './AddressHistoryForm';

// Policy & Authorization Components
export { PolicyAcknowledgmentStep } from './PolicyAcknowledgmentStep';
export { DigitalInitials, InitialsSectionList } from './DigitalInitials';
export { DocumentUploadStep } from './DocumentUploadStep';
export { AuthorizationsStep } from './AuthorizationsStep';
export { ReviewSubmitStep } from './ReviewSubmitStep';

// Types
export type { DriverApplication, ESignatureData, Address, Employment } from './types';
export type { ApplicationStatus, ApplicationType } from './types';
