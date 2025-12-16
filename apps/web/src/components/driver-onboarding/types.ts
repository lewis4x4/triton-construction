// Driver Onboarding Types

export type ApplicationType = 'CDL' | 'NON_CDL';

export type ApplicationStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'PENDING_DOCUMENTS'
  | 'PENDING_VERIFICATION'
  | 'APPROVED'
  | 'REJECTED'
  | 'WITHDRAWN';

export type CDLClass = 'A' | 'B' | 'C';

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  from_date: string;
  to_date: string | null;
  is_current: boolean;
}

export interface DrivingExperience {
  equipment_type: string;
  class_required: CDLClass | null;
  years_experience: number;
  approximate_miles: number;
}

export interface Accident {
  date: string;
  nature_of_accident: string;
  fatalities: number;
  injuries: number;
  location: string;
}

export interface Conviction {
  date: string;
  location: string;
  charge: string;
  penalty: string;
}

export interface Employment {
  employer_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  from_date: string;
  to_date: string | null;
  position: string;
  reason_left: string;
  subject_to_fmcsr: boolean;
  drug_alcohol_testing: boolean;
}

export interface DriverApplication {
  id: string;
  organization_id: string;
  application_type: ApplicationType;
  status: ApplicationStatus;
  application_number: string | null;

  // Personal Info
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  ssn_last_four: string | null;
  date_of_birth: string;
  email: string | null;
  phone: string | null;
  alternate_phone: string | null;

  // Addresses
  addresses: Address[];

  // Emergency Contact
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;

  // License
  license_number: string;
  license_state: string;
  license_expiration: string;
  license_class: CDLClass | null;
  endorsements: string[];
  restrictions: string[];

  // CDL-specific
  driving_experience: DrivingExperience[];
  accidents: Accident[];
  has_accidents_last_3_years: boolean;
  convictions: Conviction[];
  has_convictions_last_3_years: boolean;
  employment_history: Employment[];

  // Education
  highest_education: string | null;
  school_name: string | null;
  graduation_date: string | null;

  // Non-CDL specific
  job_number: string | null;
  job_assignment: string | null;

  // Policy acknowledgments
  fleet_policy_acknowledged_at: string | null;
  cmv_policy_acknowledged_at: string | null;
  cmv_policy_initials: Record<string, boolean>;

  // Authorizations
  drug_test_authorized_at: string | null;
  mvr_authorized_at: string | null;
  clearinghouse_authorized_at: string | null;

  // Certification
  certified_accurate_at: string | null;
  applicant_signature: string | null;

  // Progress
  current_step: number;
  completed_steps: number[];
  last_saved_at: string | null;

  // Verification
  mvr_status: string | null;
  clearinghouse_status: string | null;
  medical_card_expiration: string | null;

  // Approval
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  rejection_reason: string | null;

  // Links
  dqf_id: string | null;
  employee_id: string | null;
  crew_member_id: string | null;

  // Audit
  created_at: string;
  updated_at: string;
}

export interface ESignatureData {
  signature_data: string; // Base64 encoded image
  signer_name: string;
  document_type: string;
  document_hash?: string;
}

export interface WizardStepProps {
  application: Partial<DriverApplication>;
  onUpdate: (updates: Partial<DriverApplication>) => void;
  onNext: () => void;
  onPrev: () => void;
  isLoading?: boolean;
}

// CDL Policy Manual sections that require initials
export const CMV_POLICY_SECTIONS = [
  { id: 'section_1', title: 'Driver Responsibilities', description: 'Vehicle inspection, maintenance, and safe operation' },
  { id: 'section_2', title: 'DOT Vehicle Restrictions', description: 'Restrictions on personal use and unauthorized drivers' },
  { id: 'section_3', title: 'CDL Requirements', description: 'License maintenance and endorsement requirements' },
  { id: 'section_4', title: 'Driver Eligibility', description: 'MVR checks and disqualifying offenses' },
  { id: 'section_5', title: 'Distracted Driving', description: 'Cell phone and electronic device policies' },
  { id: 'section_6', title: 'Fatigue, Drugs & Alcohol', description: 'Hours of service and substance abuse policies' },
  { id: 'section_7', title: 'Vehicle Inspections', description: 'Pre-trip, post-trip, and DOT inspection requirements' },
  { id: 'section_8', title: 'Accidents & Reporting', description: 'Accident procedures and reporting requirements' },
] as const;

// Equipment types for driving experience
export const EQUIPMENT_TYPES = [
  { value: 'STRAIGHT_TRUCK', label: 'Straight Truck', class: null },
  { value: 'TRACTOR_SEMITRAILER', label: 'Tractor-Semitrailer', class: 'A' as CDLClass },
  { value: 'TRACTOR_TWO_TRAILERS', label: 'Tractor - Two Trailers', class: 'A' as CDLClass },
  { value: 'TRACTOR_THREE_TRAILERS', label: 'Tractor - Three Trailers', class: 'A' as CDLClass },
  { value: 'MOTORCOACH', label: 'Motorcoach (more than 8 passengers)', class: 'B' as CDLClass },
  { value: 'SCHOOL_BUS', label: 'School Bus (more than 8 passengers)', class: 'B' as CDLClass },
] as const;

// CDL Endorsements
export const CDL_ENDORSEMENTS = [
  { value: 'H', label: 'H - Hazardous Materials' },
  { value: 'N', label: 'N - Tank Vehicles' },
  { value: 'P', label: 'P - Passenger Vehicles' },
  { value: 'S', label: 'S - School Bus' },
  { value: 'T', label: 'T - Double/Triple Trailers' },
  { value: 'X', label: 'X - Combination Tank/Hazmat' },
] as const;

// US States for dropdowns
export const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
] as const;
