import { useState, useRef, useEffect } from 'react';
import { Check, X, Edit2 } from 'lucide-react';
import './DigitalInitials.css';

interface DigitalInitialsProps {
  sectionId: string;
  sectionTitle: string;
  sectionDescription?: string;
  isCompleted?: boolean;
  initials?: string;
  onInitial: (sectionId: string, initials: string) => void;
  disabled?: boolean;
}

export function DigitalInitials({
  sectionId,
  sectionTitle,
  sectionDescription,
  isCompleted = false,
  initials = '',
  onInitial,
  disabled = false,
}: DigitalInitialsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentInitials, setCurrentInitials] = useState(initials);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (!disabled) {
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setCurrentInitials(initials);
    setIsEditing(false);
  };

  const handleConfirm = () => {
    if (currentInitials.trim().length >= 2) {
      onInitial(sectionId, currentInitials.trim().toUpperCase());
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className={`digital-initials ${isCompleted ? 'completed' : ''} ${disabled ? 'disabled' : ''}`}>
      <div className="initials-content">
        <div className="section-info">
          <h4 className="section-title">{sectionTitle}</h4>
          {sectionDescription && (
            <p className="section-description">{sectionDescription}</p>
          )}
        </div>

        <div className="initials-box">
          {isEditing ? (
            <div className="initials-editor">
              <input
                ref={inputRef}
                type="text"
                value={currentInitials}
                onChange={(e) => setCurrentInitials(e.target.value.slice(0, 3))}
                onKeyDown={handleKeyDown}
                placeholder="XX"
                maxLength={3}
                className="initials-input"
              />
              <div className="editor-actions">
                <button
                  type="button"
                  className="btn-icon btn-confirm"
                  onClick={handleConfirm}
                  disabled={currentInitials.trim().length < 2}
                  title="Confirm initials"
                >
                  <Check size={14} />
                </button>
                <button
                  type="button"
                  className="btn-icon btn-cancel"
                  onClick={handleCancel}
                  title="Cancel"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : isCompleted && initials ? (
            <div className="initials-display completed" onClick={handleStartEdit}>
              <span className="initials-text">{initials}</span>
              {!disabled && (
                <button type="button" className="btn-icon btn-edit" title="Edit initials">
                  <Edit2 size={12} />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="initials-button"
              onClick={handleStartEdit}
              disabled={disabled}
            >
              <span>Initial Here</span>
            </button>
          )}
        </div>
      </div>

      {isCompleted && initials && (
        <div className="initials-status">
          <Check size={14} />
          <span>Initialed</span>
        </div>
      )}
    </div>
  );
}

// Component to display all initials for a list of sections
interface InitialsSectionListProps {
  sections: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
  initials: Record<string, string>;
  onInitial: (sectionId: string, initials: string) => void;
  disabled?: boolean;
}

export function InitialsSectionList({
  sections,
  initials,
  onInitial,
  disabled = false,
}: InitialsSectionListProps) {
  const completedCount = Object.keys(initials).length;
  const totalCount = sections.length;
  const allComplete = completedCount === totalCount;

  return (
    <div className="initials-section-list">
      <div className="list-header">
        <h3>Section Acknowledgments</h3>
        <div className={`progress-indicator ${allComplete ? 'complete' : ''}`}>
          <span>{completedCount} of {totalCount}</span>
          {allComplete && <Check size={14} />}
        </div>
      </div>

      <div className="sections-list">
        {sections.map((section, index) => (
          <DigitalInitials
            key={section.id}
            sectionId={section.id}
            sectionTitle={`${index + 1}. ${section.title}`}
            sectionDescription={section.description}
            isCompleted={!!initials[section.id]}
            initials={initials[section.id] || ''}
            onInitial={onInitial}
            disabled={disabled}
          />
        ))}
      </div>

      {!allComplete && (
        <div className="list-note">
          Please initial each section to confirm you have read and understand the policy
        </div>
      )}
    </div>
  );
}
