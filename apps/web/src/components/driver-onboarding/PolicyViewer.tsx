import { useState, useRef, useEffect, useCallback } from 'react';
import { FileText, Check, AlertTriangle, ChevronDown } from 'lucide-react';
import './PolicyViewer.css';

interface PolicySection {
  id: string;
  title: string;
  content: string | React.ReactNode;
}

interface PolicyViewerProps {
  title: string;
  sections: PolicySection[];
  requireFullScroll?: boolean;
  onAcknowledge?: (acknowledged: boolean) => void;
  acknowledged?: boolean;
  disabled?: boolean;
}

export function PolicyViewer({
  title,
  sections,
  requireFullScroll = true,
  onAcknowledge,
  acknowledged = false,
  disabled = false,
}: PolicyViewerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isAcknowledged, setIsAcknowledged] = useState(acknowledged);

  const handleScroll = useCallback(() => {
    const content = contentRef.current;
    if (!content) return;

    const { scrollTop, scrollHeight, clientHeight } = content;
    const maxScroll = scrollHeight - clientHeight;

    if (maxScroll <= 0) {
      setScrollProgress(100);
      setHasScrolledToBottom(true);
      return;
    }

    const progress = Math.min((scrollTop / maxScroll) * 100, 100);
    setScrollProgress(progress);

    // Consider "scrolled to bottom" if within 20px of the end
    if (scrollTop >= maxScroll - 20) {
      setHasScrolledToBottom(true);
    }
  }, []);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    content.addEventListener('scroll', handleScroll);
    // Initial check in case content is short
    handleScroll();

    return () => content.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const handleAcknowledge = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsAcknowledged(checked);
    onAcknowledge?.(checked);
  };

  const canAcknowledge = !requireFullScroll || hasScrolledToBottom;

  return (
    <div className={`policy-viewer ${disabled ? 'disabled' : ''}`}>
      <div className="policy-header">
        <div className="policy-icon">
          <FileText size={24} />
        </div>
        <div className="policy-title-section">
          <h3>{title}</h3>
          {requireFullScroll && (
            <p className="scroll-requirement">
              Please read the entire policy below before acknowledging
            </p>
          )}
        </div>
      </div>

      {requireFullScroll && (
        <div className="scroll-progress-container">
          <div className="scroll-progress-bar">
            <div
              className="scroll-progress-fill"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>
          <span className="scroll-progress-text">
            {Math.round(scrollProgress)}% read
          </span>
        </div>
      )}

      <div className="policy-content" ref={contentRef}>
        {sections.map((section) => (
          <div key={section.id} className="policy-section">
            <h4 className="section-title">{section.title}</h4>
            <div className="section-content">
              {typeof section.content === 'string' ? (
                <p>{section.content}</p>
              ) : (
                section.content
              )}
            </div>
          </div>
        ))}

        {requireFullScroll && !hasScrolledToBottom && (
          <div className="scroll-indicator">
            <ChevronDown size={20} />
            <span>Continue scrolling to read the full policy</span>
          </div>
        )}
      </div>

      <div className="policy-acknowledgment">
        {!canAcknowledge && (
          <div className="acknowledgment-warning">
            <AlertTriangle size={16} />
            <span>Please scroll through the entire policy before acknowledging</span>
          </div>
        )}

        <label className={`acknowledgment-checkbox ${!canAcknowledge ? 'disabled' : ''}`}>
          <input
            type="checkbox"
            checked={isAcknowledged}
            onChange={handleAcknowledge}
            disabled={disabled || !canAcknowledge}
          />
          <span className="checkbox-custom">
            {isAcknowledged && <Check size={14} />}
          </span>
          <span className="acknowledgment-text">
            I have read, understand, and agree to comply with this policy
          </span>
        </label>

        {isAcknowledged && (
          <div className="acknowledgment-confirmed">
            <Check size={16} />
            <span>Policy acknowledged</span>
          </div>
        )}
      </div>
    </div>
  );
}

// SP-030 Fleet Policy Content
export const SP030_POLICY_SECTIONS: PolicySection[] = [
  {
    id: 'purpose',
    title: '1. Purpose',
    content: (
      <>
        <p>
          This policy establishes driving guidelines and procedures for all employees who operate
          company-owned, leased, or personal vehicles for company business. The safety of our
          employees, the public, and our reputation depends on the safe operation of all vehicles.
        </p>
      </>
    ),
  },
  {
    id: 'scope',
    title: '2. Scope',
    content: (
      <>
        <p>
          This policy applies to all employees who drive vehicles for company business, including:
        </p>
        <ul>
          <li>Company-owned vehicles</li>
          <li>Leased vehicles</li>
          <li>Personal vehicles used for business purposes</li>
          <li>Rental vehicles</li>
        </ul>
      </>
    ),
  },
  {
    id: 'eligibility',
    title: '3. Driver Eligibility Requirements',
    content: (
      <>
        <p>To be eligible to drive for company business, employees must:</p>
        <ul>
          <li>Be at least 21 years of age</li>
          <li>Possess a valid driver's license appropriate for the vehicle being operated</li>
          <li>Have no license suspensions within the last 3 years</li>
          <li>Have no DUI/DWI convictions within the last 5 years</li>
          <li>Maintain an acceptable Motor Vehicle Record (MVR)</li>
          <li>Complete all required driver training</li>
        </ul>
        <p>
          The company reserves the right to check MVRs at any time and will conduct annual MVR checks
          on all authorized drivers.
        </p>
      </>
    ),
  },
  {
    id: 'major-violations',
    title: '4. Major Violations',
    content: (
      <>
        <p>
          The following violations will result in immediate suspension of driving privileges and
          may result in termination of employment:
        </p>
        <ul>
          <li>Driving under the influence of alcohol or drugs</li>
          <li>Failure to stop and report an accident</li>
          <li>Reckless driving</li>
          <li>Operating a vehicle while license is suspended, expired, or revoked</li>
          <li>Making a fraudulent application for a license</li>
          <li>Any felony involving the use of a motor vehicle</li>
          <li>Vehicular homicide or manslaughter</li>
          <li>Using a vehicle in connection with a felony</li>
        </ul>
      </>
    ),
  },
  {
    id: 'minor-violations',
    title: '5. Minor Violations',
    content: (
      <>
        <p>
          Accumulation of minor violations may affect driving eligibility. Minor violations include
          but are not limited to:
        </p>
        <ul>
          <li>Speeding (less than 15 mph over limit)</li>
          <li>Failure to yield right of way</li>
          <li>Improper lane change</li>
          <li>Following too closely</li>
          <li>Failure to signal</li>
          <li>Equipment violations</li>
        </ul>
        <p>
          Three or more minor violations within a 36-month period may result in driving restrictions
          or suspension of driving privileges.
        </p>
      </>
    ),
  },
  {
    id: 'vehicle-use',
    title: '6. Vehicle Use Guidelines',
    content: (
      <>
        <p>All drivers must:</p>
        <ul>
          <li>Wear seatbelts at all times while the vehicle is in motion</li>
          <li>Obey all traffic laws and posted speed limits</li>
          <li>Never use handheld electronic devices while driving</li>
          <li>Never drive while impaired by alcohol, drugs, or medications</li>
          <li>Report all accidents immediately to their supervisor</li>
          <li>Perform pre-trip and post-trip vehicle inspections</li>
          <li>Report any vehicle defects or maintenance needs promptly</li>
          <li>Secure all loads properly</li>
        </ul>
      </>
    ),
  },
  {
    id: 'personal-vehicles',
    title: '7. Personal Vehicle Use',
    content: (
      <>
        <p>
          Employees who use personal vehicles for company business must:
        </p>
        <ul>
          <li>Maintain valid vehicle registration</li>
          <li>Carry minimum liability insurance of $100,000/$300,000/$50,000</li>
          <li>Ensure the vehicle is in safe operating condition</li>
          <li>Provide proof of insurance upon request</li>
        </ul>
        <p>
          The company is not responsible for damage to personal vehicles used for business
          purposes unless specifically covered by company policy.
        </p>
      </>
    ),
  },
  {
    id: 'accidents',
    title: '8. Accident Reporting',
    content: (
      <>
        <p>In the event of any accident, regardless of severity, employees must:</p>
        <ol>
          <li>Stop immediately and ensure the safety of all parties</li>
          <li>Call 911 if there are injuries or significant damage</li>
          <li>Exchange information with other parties involved</li>
          <li>Document the scene with photos if safe to do so</li>
          <li>Obtain a police report number if police respond</li>
          <li>Report the accident to their supervisor immediately</li>
          <li>Complete a company accident report within 24 hours</li>
          <li>Never admit fault at the scene</li>
        </ol>
        <p>
          Failure to report an accident is a serious violation that may result in disciplinary
          action up to and including termination.
        </p>
      </>
    ),
  },
  {
    id: 'disciplinary',
    title: '9. Disciplinary Action',
    content: (
      <>
        <p>
          Violations of this policy may result in disciplinary action, including but not limited to:
        </p>
        <ul>
          <li>Verbal warning</li>
          <li>Written warning</li>
          <li>Suspension of driving privileges</li>
          <li>Required retraining</li>
          <li>Termination of employment</li>
        </ul>
        <p>
          The severity of disciplinary action will depend on the nature and frequency of
          violations, the employee's driving record, and any aggravating or mitigating circumstances.
        </p>
      </>
    ),
  },
  {
    id: 'acknowledgment',
    title: '10. Employee Acknowledgment',
    content: (
      <>
        <p>
          By acknowledging this policy, I confirm that I have read and understand the Fleet
          Safety Policy (SP-030). I agree to comply with all requirements and guidelines set
          forth in this policy. I understand that violation of this policy may result in
          disciplinary action, including termination of employment.
        </p>
        <p>
          I further acknowledge that I am responsible for maintaining an acceptable driving
          record and must report any changes to my license status, any traffic violations,
          or any accidents to my supervisor within 24 hours.
        </p>
      </>
    ),
  },
];
