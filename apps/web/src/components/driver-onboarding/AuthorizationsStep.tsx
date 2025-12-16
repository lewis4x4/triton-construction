import { useState } from 'react';
import {
  Shield,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Check,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { WizardStepProps } from './types';
import { ESignaturePad } from './ESignaturePad';
import './AuthorizationsStep.css';

interface Authorization {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  timestampField: keyof typeof TIMESTAMP_FIELDS;
  required: boolean;
}

const TIMESTAMP_FIELDS = {
  drug_test: 'drug_test_authorized_at',
  mvr: 'mvr_authorized_at',
  clearinghouse: 'clearinghouse_authorized_at',
} as const;

const AUTHORIZATIONS: Authorization[] = [
  {
    id: 'drug_test',
    title: 'Drug & Alcohol Testing Authorization',
    subtitle: '49 CFR Part 40 & Part 382',
    content: `
      <p>By signing below, I authorize Triton Construction, Inc. and its designated agents to:</p>
      <ul>
        <li>Conduct pre-employment drug and alcohol testing as required by DOT regulations</li>
        <li>Conduct random, post-accident, reasonable suspicion, return-to-duty, and follow-up drug and alcohol testing</li>
        <li>Release drug and alcohol test results to authorized company personnel and government agencies as required by law</li>
        <li>Query the FMCSA Drug & Alcohol Clearinghouse for any prior violations</li>
      </ul>
      <p>I understand that:</p>
      <ul>
        <li>Refusal to submit to testing is considered equivalent to a positive test result</li>
        <li>A positive test result or refusal to test may result in removal from safety-sensitive functions and potential termination</li>
        <li>I am required to report any DOT drug and alcohol violations to my employer within 24 hours</li>
        <li>All testing will be conducted in accordance with 49 CFR Part 40 procedures</li>
      </ul>
      <p><strong>This authorization remains in effect for the duration of my employment with Triton Construction, Inc.</strong></p>
    `,
    timestampField: 'drug_test',
    required: true,
  },
  {
    id: 'mvr',
    title: 'Motor Vehicle Record (MVR) Authorization',
    subtitle: 'Driver Privacy Protection Act (DPPA)',
    content: `
      <p>By signing below, I authorize Triton Construction, Inc. to:</p>
      <ul>
        <li>Request and obtain my Motor Vehicle Record (MVR) from any state in which I hold or have held a driver's license</li>
        <li>Obtain periodic MVR updates during my employment (at least annually as required by 49 CFR 391.25)</li>
        <li>Share MVR information with insurance carriers, government agencies, and other entities as required by law</li>
      </ul>
      <p>I understand and certify that:</p>
      <ul>
        <li>The information I have provided regarding my driving history is true and complete</li>
        <li>Any falsification of driving records or history is grounds for immediate termination</li>
        <li>I will notify my employer of any license suspensions, revocations, or traffic violations within 30 days</li>
        <li>This authorization complies with the Driver Privacy Protection Act (18 U.S.C. § 2721 et seq.)</li>
      </ul>
      <p><strong>This authorization remains in effect for the duration of my employment and for any period during which I am being considered for employment.</strong></p>
    `,
    timestampField: 'mvr',
    required: true,
  },
  {
    id: 'clearinghouse',
    title: 'FMCSA Clearinghouse Query Consent',
    subtitle: 'FMCSA Drug & Alcohol Clearinghouse',
    content: `
      <p>In accordance with 49 CFR Part 382 Subpart G, I hereby consent to Triton Construction, Inc. conducting:</p>
      <ul>
        <li><strong>Pre-employment query:</strong> A full query of the FMCSA Drug & Alcohol Clearinghouse to determine if any drug and alcohol violations exist</li>
        <li><strong>Annual query:</strong> A limited query each year to verify continued compliance</li>
      </ul>
      <p>I understand that:</p>
      <ul>
        <li>I must register with the FMCSA Clearinghouse at <a href="https://clearinghouse.fmcsa.dot.gov" target="_blank">clearinghouse.fmcsa.dot.gov</a> to grant electronic consent</li>
        <li>Full queries require my electronic consent through the Clearinghouse system</li>
        <li>Limited queries only reveal whether violations exist (yes/no) and do not require electronic consent</li>
        <li>If a violation is found, I will be removed from safety-sensitive duties until return-to-duty requirements are met</li>
      </ul>
      <p><strong>Important:</strong> You must register with the FMCSA Clearinghouse and grant electronic consent within 24 hours of your start date. Failure to do so may delay your onboarding.</p>
      <p><strong>This consent is valid for 1 year from the date of signature. You will be asked to renew annually.</strong></p>
    `,
    timestampField: 'clearinghouse',
    required: true,
  },
];

export function AuthorizationsStep({
  application,
  onUpdate,
  onNext,
  onPrev,
  isLoading,
}: WizardStepProps) {
  const [expandedAuth, setExpandedAuth] = useState<string | null>(AUTHORIZATIONS[0].id);
  const [signingAuth, setSigningAuth] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const getAuthTimestamp = (auth: Authorization): string | null => {
    const field = TIMESTAMP_FIELDS[auth.timestampField];
    return (application as any)[field] || null;
  };

  const isAuthSigned = (auth: Authorization): boolean => {
    return !!getAuthTimestamp(auth);
  };

  const handleSign = (authId: string, signatureData: string) => {
    const auth = AUTHORIZATIONS.find(a => a.id === authId);
    if (!auth) return;

    const field = TIMESTAMP_FIELDS[auth.timestampField];
    onUpdate({
      [field]: new Date().toISOString(),
    } as any);

    setSigningAuth(null);

    // Auto-expand next unsigned authorization
    const currentIndex = AUTHORIZATIONS.findIndex(a => a.id === authId);
    const nextUnsigned = AUTHORIZATIONS.slice(currentIndex + 1).find(a => !isAuthSigned(a));
    if (nextUnsigned) {
      setExpandedAuth(nextUnsigned.id);
    }
  };

  const validateStep = (): boolean => {
    const newErrors: string[] = [];

    AUTHORIZATIONS.forEach(auth => {
      if (auth.required && !isAuthSigned(auth)) {
        newErrors.push(`You must sign the ${auth.title}`);
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      onNext();
    }
  };

  const toggleAuth = (authId: string) => {
    setExpandedAuth(expandedAuth === authId ? null : authId);
  };

  const signedCount = AUTHORIZATIONS.filter(isAuthSigned).length;
  const totalRequired = AUTHORIZATIONS.filter(a => a.required).length;

  return (
    <div className="authorizations-step">
      <div className="step-header">
        <div className="step-icon">
          <Shield size={24} />
        </div>
        <div className="step-title-content">
          <h2>Authorizations & Consents</h2>
          <p>
            Please read and sign each authorization below. These consents are required by
            federal regulations (DOT/FMCSA) for all commercial motor vehicle drivers.
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
      <div className="authorization-progress">
        <div className="progress-text">
          <FileText size={18} />
          <span>
            <strong>{signedCount}</strong> of <strong>{totalRequired}</strong> authorizations signed
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${(signedCount / totalRequired) * 100}%` }}
          />
        </div>
      </div>

      {/* Authorization Cards */}
      <div className="authorization-cards">
        {AUTHORIZATIONS.map((auth, index) => {
          const isSigned = isAuthSigned(auth);
          const isExpanded = expandedAuth === auth.id;
          const isSigning = signingAuth === auth.id;
          const timestamp = getAuthTimestamp(auth);

          return (
            <div
              key={auth.id}
              className={`authorization-card ${isSigned ? 'signed' : ''} ${isExpanded ? 'expanded' : ''}`}
            >
              <div
                className="authorization-header"
                onClick={() => toggleAuth(auth.id)}
              >
                <div className="authorization-number">
                  {isSigned ? <Check size={16} /> : <span>{index + 1}</span>}
                </div>
                <div className="authorization-info">
                  <h3>{auth.title}</h3>
                  <span className="subtitle">{auth.subtitle}</span>
                </div>
                <div className="authorization-status">
                  {isSigned ? (
                    <span className="status-badge signed">
                      <Check size={14} />
                      Signed
                    </span>
                  ) : (
                    <span className="status-badge pending">
                      Pending
                    </span>
                  )}
                  <button type="button" className="btn-expand">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="authorization-content">
                  <div
                    className="authorization-text"
                    dangerouslySetInnerHTML={{ __html: auth.content }}
                  />

                  {isSigned ? (
                    <div className="signed-confirmation">
                      <Check size={20} />
                      <div>
                        <strong>Signed and Acknowledged</strong>
                        <span>
                          {timestamp && `Signed on ${new Date(timestamp).toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                  ) : isSigning ? (
                    <div className="signature-capture">
                      <ESignaturePad
                        onSave={(data) => handleSign(auth.id, data.signature_data)}
                        onCancel={() => setSigningAuth(null)}
                        documentType={auth.title}
                      />
                    </div>
                  ) : (
                    <div className="authorization-actions">
                      <label className="acknowledgment-checkbox">
                        <input type="checkbox" id={`ack_${auth.id}`} />
                        <span>
                          I have read and understand this authorization
                        </span>
                      </label>
                      <button
                        type="button"
                        className="btn btn-sign"
                        onClick={() => setSigningAuth(auth.id)}
                      >
                        <Shield size={16} />
                        Sign Authorization
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Note */}
      <div className="info-note">
        <AlertCircle size={18} />
        <div>
          <strong>Legal Notice</strong>
          <p>
            These authorizations are legally binding documents. By signing electronically,
            you agree that your electronic signature has the same legal effect as a handwritten
            signature under the Electronic Signatures in Global and National Commerce Act (E-SIGN Act).
          </p>
        </div>
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
