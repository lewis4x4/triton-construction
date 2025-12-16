import { useState } from 'react';
import {
  FileText,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { WizardStepProps } from './types';
import { CMV_POLICY_SECTIONS } from './types';
import { PolicyViewer, SP030_POLICY_SECTIONS } from './PolicyViewer';
import { InitialsSectionList } from './DigitalInitials';
import './PolicyAcknowledgmentStep.css';

// CMV Driver Policy Manual Content
const CMV_POLICY_CONTENT = [
  {
    id: 'section_1',
    title: 'Driver Responsibilities',
    description: 'Vehicle inspection, maintenance, and safe operation',
    content: `
      <h4>1. Driver Responsibilities</h4>
      <p>As a CDL driver for Triton Construction, you are responsible for:</p>
      <ul>
        <li>Conducting thorough pre-trip and post-trip vehicle inspections</li>
        <li>Reporting all vehicle defects, damage, and maintenance needs immediately</li>
        <li>Maintaining the vehicle in a clean and professional condition</li>
        <li>Operating the vehicle in a safe manner at all times</li>
        <li>Following all company policies and procedures</li>
        <li>Securing all loads properly according to FMCSA regulations</li>
        <li>Maintaining all required documentation in the vehicle</li>
      </ul>
      <p>Failure to maintain these responsibilities may result in disciplinary action.</p>
    `,
  },
  {
    id: 'section_2',
    title: 'DOT Vehicle Restrictions',
    description: 'Restrictions on personal use and unauthorized drivers',
    content: `
      <h4>2. DOT Vehicle Restrictions</h4>
      <p>Company DOT-regulated vehicles are subject to the following restrictions:</p>
      <ul>
        <li>No personal use of company vehicles without prior written authorization</li>
        <li>No unauthorized passengers in company vehicles</li>
        <li>No use of vehicles for any illegal purposes</li>
        <li>No modifications to vehicles without approval</li>
        <li>Vehicles must be parked in designated areas when not in use</li>
        <li>Only authorized and qualified drivers may operate company vehicles</li>
      </ul>
      <p>Violation of these restrictions may result in immediate termination.</p>
    `,
  },
  {
    id: 'section_3',
    title: 'CDL Requirements',
    description: 'License maintenance and endorsement requirements',
    content: `
      <h4>3. CDL Requirements</h4>
      <p>All CDL drivers must:</p>
      <ul>
        <li>Maintain a valid CDL appropriate for the vehicle class being operated</li>
        <li>Possess all required endorsements for the cargo being transported</li>
        <li>Report any changes to license status within 24 hours</li>
        <li>Report any traffic violations within 30 days</li>
        <li>Submit to annual MVR review</li>
        <li>Maintain medical certification as required by FMCSA</li>
        <li>Complete all required training and certifications</li>
      </ul>
      <p>Operating without proper credentials is a violation of federal law and company policy.</p>
    `,
  },
  {
    id: 'section_4',
    title: 'Driver Eligibility',
    description: 'MVR checks and disqualifying offenses',
    content: `
      <h4>4. Driver Eligibility</h4>
      <p>Driver eligibility is determined by:</p>
      <ul>
        <li>Valid CDL with appropriate class and endorsements</li>
        <li>Acceptable Motor Vehicle Record (MVR)</li>
        <li>No disqualifying convictions as defined by FMCSA</li>
        <li>Current medical certification</li>
        <li>Clear FMCSA Clearinghouse status</li>
      </ul>
      <p><strong>Disqualifying offenses include:</strong></p>
      <ul>
        <li>DUI/DWI within the last 5 years</li>
        <li>License suspension or revocation within the last 3 years</li>
        <li>Leaving the scene of an accident</li>
        <li>Vehicular homicide or manslaughter</li>
        <li>Using a vehicle in the commission of a felony</li>
        <li>Positive drug or alcohol test</li>
      </ul>
    `,
  },
  {
    id: 'section_5',
    title: 'Distracted Driving',
    description: 'Cell phone and electronic device policies',
    content: `
      <h4>5. Distracted Driving Policy</h4>
      <p>The use of electronic devices while operating a commercial motor vehicle is strictly regulated:</p>
      <ul>
        <li>Handheld cell phones are PROHIBITED while driving</li>
        <li>Texting while driving is PROHIBITED (including stopped at traffic lights)</li>
        <li>Hands-free devices may only be used when legal and safe to do so</li>
        <li>All calls should be made when safely parked</li>
        <li>GPS devices must be programmed before driving</li>
        <li>No reading, writing, or other activities that take attention from driving</li>
      </ul>
      <p>Violation of this policy will result in disciplinary action up to and including termination.</p>
    `,
  },
  {
    id: 'section_6',
    title: 'Fatigue, Drugs & Alcohol',
    description: 'Hours of service and substance abuse policies',
    content: `
      <h4>6. Fatigue, Drugs & Alcohol Policy</h4>
      <p><strong>Hours of Service:</strong></p>
      <ul>
        <li>Drivers must comply with all FMCSA Hours of Service regulations</li>
        <li>Accurate logs must be maintained at all times</li>
        <li>No driving while fatigued or ill</li>
        <li>Required rest breaks must be taken</li>
      </ul>
      <p><strong>Drugs & Alcohol:</strong></p>
      <ul>
        <li>No alcohol consumption within 4 hours of driving</li>
        <li>Blood alcohol content must be below 0.04%</li>
        <li>No illegal drugs or controlled substances</li>
        <li>Prescription medications must be reported if they affect driving ability</li>
        <li>Random drug and alcohol testing will be conducted</li>
        <li>Refusal to test is treated as a positive result</li>
      </ul>
    `,
  },
  {
    id: 'section_7',
    title: 'Vehicle Inspections',
    description: 'Pre-trip, post-trip, and DOT inspection requirements',
    content: `
      <h4>7. Vehicle Inspections</h4>
      <p><strong>Pre-Trip Inspections:</strong></p>
      <ul>
        <li>Required before operating any commercial vehicle</li>
        <li>Must include all items on the company inspection checklist</li>
        <li>Any defects must be reported and corrected before operation</li>
        <li>Documentation must be completed and signed</li>
      </ul>
      <p><strong>Post-Trip Inspections:</strong></p>
      <ul>
        <li>Required at the end of each trip or workday</li>
        <li>Report any defects discovered during operation</li>
        <li>Complete and sign the post-trip inspection report</li>
      </ul>
      <p><strong>DOT Inspections:</strong></p>
      <ul>
        <li>Cooperate fully with DOT officers during inspections</li>
        <li>Report all inspection results to management immediately</li>
        <li>Any out-of-service violations must be corrected before operation</li>
      </ul>
    `,
  },
  {
    id: 'section_8',
    title: 'Accidents & Reporting',
    description: 'Accident procedures and reporting requirements',
    content: `
      <h4>8. Accidents & Reporting</h4>
      <p>In the event of any accident, you must:</p>
      <ol>
        <li>Stop immediately and ensure the safety of all parties</li>
        <li>Call 911 if there are injuries or significant damage</li>
        <li>Do NOT admit fault or make statements about the accident</li>
        <li>Exchange information with other parties</li>
        <li>Document the scene (photos, witness information)</li>
        <li>Contact your supervisor immediately</li>
        <li>Complete a company accident report within 24 hours</li>
        <li>Cooperate fully with any investigation</li>
      </ol>
      <p><strong>Reportable accidents include:</strong></p>
      <ul>
        <li>Any accident involving injury</li>
        <li>Any accident involving property damage</li>
        <li>Any accident requiring vehicle towing</li>
        <li>Any accident involving hazardous materials</li>
      </ul>
      <p>Failure to report an accident is grounds for immediate termination.</p>
    `,
  },
];

export function PolicyAcknowledgmentStep({
  application,
  onUpdate,
  onNext,
  onPrev,
  isLoading,
}: WizardStepProps) {
  const [expandedPolicy, setExpandedPolicy] = useState<'sp030' | 'cmv' | null>('sp030');
  const [errors, setErrors] = useState<string[]>([]);

  const fleetPolicyAcknowledged = !!application.fleet_policy_acknowledged_at;
  const cmvPolicyInitials = application.cmv_policy_initials || {};
  const allCmvSectionsInitialed = CMV_POLICY_SECTIONS.every(
    (section) => cmvPolicyInitials[section.id]
  );

  const handleFleetPolicyAcknowledge = (acknowledged: boolean) => {
    onUpdate({
      fleet_policy_acknowledged_at: acknowledged ? new Date().toISOString() : null,
    });
  };

  const handleCmvInitial = (sectionId: string, initials: string) => {
    const newInitials = {
      ...cmvPolicyInitials,
      [sectionId]: initials,
    };
    onUpdate({ cmv_policy_initials: newInitials });

    // If all sections are initialed, set the CMV policy acknowledged timestamp
    const allInitialed = CMV_POLICY_SECTIONS.every((section) => newInitials[section.id]);
    if (allInitialed && !application.cmv_policy_acknowledged_at) {
      onUpdate({ cmv_policy_acknowledged_at: new Date().toISOString() });
    }
  };

  const validateStep = (): boolean => {
    const newErrors: string[] = [];

    if (!fleetPolicyAcknowledged) {
      newErrors.push('You must acknowledge the SP-030 Fleet Policy');
    }

    if (!allCmvSectionsInitialed) {
      newErrors.push('You must initial all sections of the CMV Driver Policy Manual');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      onNext();
    }
  };

  const togglePolicy = (policy: 'sp030' | 'cmv') => {
    setExpandedPolicy(expandedPolicy === policy ? null : policy);
  };

  return (
    <div className="policy-step">
      <div className="step-header">
        <div className="step-icon">
          <FileText size={24} />
        </div>
        <div className="step-title-content">
          <h2>Policy Acknowledgments</h2>
          <p>
            Please read and acknowledge the following policies. You must initial each section of
            the CMV Driver Policy Manual to confirm your understanding.
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

      {/* Progress Summary */}
      <div className="acknowledgment-progress">
        <div className={`progress-item ${fleetPolicyAcknowledged ? 'complete' : ''}`}>
          <div className="progress-icon">
            {fleetPolicyAcknowledged ? <Check size={16} /> : <span>1</span>}
          </div>
          <span>SP-030 Fleet Policy</span>
        </div>
        <div className="progress-connector" />
        <div className={`progress-item ${allCmvSectionsInitialed ? 'complete' : ''}`}>
          <div className="progress-icon">
            {allCmvSectionsInitialed ? <Check size={16} /> : <span>2</span>}
          </div>
          <span>CMV Driver Policy Manual ({Object.keys(cmvPolicyInitials).length}/8 initialed)</span>
        </div>
      </div>

      {/* SP-030 Fleet Policy Section */}
      <div className="policy-section">
        <div
          className={`policy-section-header ${expandedPolicy === 'sp030' ? 'expanded' : ''}`}
          onClick={() => togglePolicy('sp030')}
        >
          <div className="policy-section-info">
            <h3>SP-030 Fleet Policy</h3>
            <span className={`status-badge ${fleetPolicyAcknowledged ? 'complete' : 'pending'}`}>
              {fleetPolicyAcknowledged ? (
                <>
                  <Check size={14} />
                  Acknowledged
                </>
              ) : (
                'Pending'
              )}
            </span>
          </div>
          <button type="button" className="btn-expand">
            {expandedPolicy === 'sp030' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {expandedPolicy === 'sp030' && (
          <div className="policy-section-content">
            <PolicyViewer
              title="Fleet Safety Policy (SP-030)"
              sections={SP030_POLICY_SECTIONS}
              requireFullScroll={true}
              acknowledged={fleetPolicyAcknowledged}
              onAcknowledge={handleFleetPolicyAcknowledge}
            />
          </div>
        )}
      </div>

      {/* CMV Driver Policy Manual Section */}
      <div className="policy-section">
        <div
          className={`policy-section-header ${expandedPolicy === 'cmv' ? 'expanded' : ''}`}
          onClick={() => togglePolicy('cmv')}
        >
          <div className="policy-section-info">
            <h3>CMV Driver Policy Manual</h3>
            <span className={`status-badge ${allCmvSectionsInitialed ? 'complete' : 'pending'}`}>
              {allCmvSectionsInitialed ? (
                <>
                  <Check size={14} />
                  All Sections Initialed
                </>
              ) : (
                `${Object.keys(cmvPolicyInitials).length} of 8 initialed`
              )}
            </span>
          </div>
          <button type="button" className="btn-expand">
            {expandedPolicy === 'cmv' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {expandedPolicy === 'cmv' && (
          <div className="policy-section-content">
            <div className="cmv-policy-viewer">
              <div className="cmv-instructions">
                <AlertCircle size={16} />
                <p>
                  Read each section carefully, then click "Initial Here" next to each section to
                  confirm you have read and understand the policy. Enter your initials (2-3 characters).
                </p>
              </div>

              <div className="cmv-sections">
                {CMV_POLICY_CONTENT.map((section) => (
                  <div key={section.id} className="cmv-section">
                    <div
                      className="cmv-section-content"
                      dangerouslySetInnerHTML={{ __html: section.content }}
                    />
                    <div className="cmv-section-initial">
                      <InitialsSectionList
                        sections={[{
                          id: section.id,
                          title: section.title,
                          description: section.description,
                        }]}
                        initials={cmvPolicyInitials}
                        onInitial={handleCmvInitial}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
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
