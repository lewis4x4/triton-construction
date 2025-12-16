import { Truck, Car, Clock, FileText, CheckCircle, ArrowRight, X } from 'lucide-react';
import './OnboardingTypeSelector.css';

interface OnboardingTypeSelectorProps {
  onSelect: (type: 'CDL' | 'NON_CDL') => void;
  onCancel?: () => void;
}

export function OnboardingTypeSelector({ onSelect, onCancel }: OnboardingTypeSelectorProps) {
  return (
    <div className="onboarding-type-selector">
      <div className="selector-header">
        <div className="header-title">
          <h2>Driver Onboarding</h2>
          <p>Select the type of driver application to begin</p>
        </div>
        {onCancel && (
          <button className="close-btn" onClick={onCancel} type="button" aria-label="Close">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="type-cards">
        {/* CDL Driver Card */}
        <button
          className="type-card cdl"
          onClick={() => onSelect('CDL')}
        >
          <div className="card-icon">
            <Truck size={40} strokeWidth={1.5} />
          </div>
          <div className="card-content">
            <h3>CDL Driver</h3>
            <p className="card-subtitle">Commercial Driver's License - Full DOT Compliance</p>

            <div className="card-details">
              <div className="detail-item">
                <Clock size={14} />
                <span>~30 minutes to complete</span>
              </div>
              <div className="detail-item">
                <FileText size={14} />
                <span>7-step application process</span>
              </div>
            </div>

            <div className="card-requirements">
              <h4>Requirements:</h4>
              <ul>
                <li><CheckCircle size={12} /> CDL with valid medical card</li>
                <li><CheckCircle size={12} /> 3-10 years employment history</li>
                <li><CheckCircle size={12} /> Drug test & Clearinghouse consent</li>
                <li><CheckCircle size={12} /> Previous employer verification</li>
              </ul>
            </div>
          </div>
          <div className="card-action">
            <span>Start CDL Application</span>
            <ArrowRight size={18} />
          </div>
        </button>

        {/* Non-CDL Driver Card */}
        <button
          className="type-card non-cdl"
          onClick={() => onSelect('NON_CDL')}
        >
          <div className="card-icon">
            <Car size={40} strokeWidth={1.5} />
          </div>
          <div className="card-content">
            <h3>Non-CDL Driver</h3>
            <p className="card-subtitle">Standard Driver's License - Fleet Policy Acknowledgment</p>

            <div className="card-details">
              <div className="detail-item">
                <Clock size={14} />
                <span>~5 minutes to complete</span>
              </div>
              <div className="detail-item">
                <FileText size={14} />
                <span>3-step application process</span>
              </div>
            </div>

            <div className="card-requirements">
              <h4>Requirements:</h4>
              <ul>
                <li><CheckCircle size={12} /> Valid driver's license</li>
                <li><CheckCircle size={12} /> Must be 21+ years old</li>
                <li><CheckCircle size={12} /> No DUI/DWI in last 5 years</li>
                <li><CheckCircle size={12} /> SP-030 Fleet Policy acknowledgment</li>
              </ul>
            </div>
          </div>
          <div className="card-action">
            <span>Start Non-CDL Application</span>
            <ArrowRight size={18} />
          </div>
        </button>
      </div>

      <div className="selector-help">
        <h4>Not sure which to choose?</h4>
        <p>
          <strong>CDL Drivers</strong> operate commercial motor vehicles (CMVs) weighing over 26,001 lbs,
          or vehicles transporting hazardous materials or 16+ passengers. These positions require full
          DOT compliance under 49 CFR Part 391.
        </p>
        <p>
          <strong>Non-CDL Drivers</strong> operate company vehicles like pickup trucks, vans, and cars
          for job site transportation. Only a valid standard driver's license is required.
        </p>
      </div>
    </div>
  );
}
