import { useState, useRef, useEffect } from 'react';
import {
  Camera,
  X,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Image,
  RotateCcw,
  Send,
  CloudOff,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './PhotoVerificationPrompt.css';

interface PhotoVerificationPromptProps {
  ticketId: string;
  ticketNumber: string;
  utilityResponseId?: string;
  utilityName?: string;
  utilityCode?: string;
  onComplete?: (photoId: string) => void;
  onDismiss?: () => void;
  onException?: (reason: string) => void;
}

interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

type VerificationType = 'UTILITY_MARKS' | 'NO_MARKS_VISIBLE' | 'OBSTRUCTION';
type ExceptionReason = 'RAIN' | 'EQUIPMENT_BLOCKING' | 'DARK' | 'UNSAFE' | 'OTHER';

const _VERIFICATION_TYPES: { value: VerificationType; label: string; description: string }[] = [
  { value: 'UTILITY_MARKS', label: 'Marks Visible', description: 'Utility marks are visible on site' },
  { value: 'NO_MARKS_VISIBLE', label: 'No Marks Found', description: 'No utility markings visible in area' },
  { value: 'OBSTRUCTION', label: 'View Obstructed', description: 'Cannot verify due to obstructions' },
];

const _EXCEPTION_REASONS: { value: ExceptionReason; label: string }[] = [
  { value: 'RAIN', label: 'Rain/Weather' },
  { value: 'EQUIPMENT_BLOCKING', label: 'Equipment blocking view' },
  { value: 'DARK', label: 'Too dark' },
  { value: 'UNSAFE', label: 'Unsafe conditions' },
  { value: 'OTHER', label: 'Other reason' },
];

export function PhotoVerificationPrompt({
  ticketId,
  ticketNumber,
  utilityResponseId,
  utilityName,
  utilityCode,
  onComplete,
  onDismiss,
  onException,
}: PhotoVerificationPromptProps) {
  const [step, setStep] = useState<'prompt' | 'capture' | 'review' | 'exception' | 'uploading' | 'done'>('prompt');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [location, setLocation] = useState<GPSLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [verificationType, setVerificationType] = useState<VerificationType>('UTILITY_MARKS');
  const [notes, setNotes] = useState('');
  const [exceptionReason, setExceptionReason] = useState<ExceptionReason | null>(null);
  const [exceptionNotes, setExceptionNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Get GPS location on mount
  useEffect(() => {
    getLocation();
    return () => {
      // Cleanup camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const getLocation = () => {
    setIsLocating(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setIsLocating(false);
      },
      (err) => {
        setLocationError(err.message);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStep('capture');
    } catch (err) {
      console.error('Camera error:', err);
      // Fallback to file input
      fileInputRef.current?.click();
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `verification_${Date.now()}.jpg`, { type: 'image/jpeg' });
          setCapturedFile(file);
          setCapturedImage(canvas.toDataURL('image/jpeg'));
          setStep('review');
        }
      },
      'image/jpeg',
      0.85
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCapturedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedImage(event.target?.result as string);
      setStep('review');
    };
    reader.readAsDataURL(file);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setCapturedFile(null);
    setStep('prompt');
  };

  const submitVerification = async () => {
    if (!capturedFile) {
      setError('No photo captured');
      return;
    }

    setStep('uploading');
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Get organization ID
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', userData.user.id)
        .single();

      if (!userProfile?.organization_id) throw new Error('Organization not found');

      // Upload to storage
      const fileName = `${ticketId}/${Date.now()}_${capturedFile.name}`;
      setUploadProgress(30);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('wv811-photos')
        .upload(fileName, capturedFile);

      if (uploadError) throw uploadError;
      setUploadProgress(70);

      // Create verification record
      const { data: verification, error: insertError } = await supabase
        .from('wv811_photo_verifications')
        .insert({
          organization_id: userProfile.organization_id,
          ticket_id: ticketId,
          utility_response_id: utilityResponseId || null,
          storage_path: uploadData.path,
          file_name: capturedFile.name,
          file_size_bytes: capturedFile.size,
          mime_type: capturedFile.type,
          captured_at: new Date().toISOString(),
          captured_by: userData.user.id,
          latitude: location?.latitude || null,
          longitude: location?.longitude || null,
          gps_accuracy_meters: location?.accuracy || null,
          verification_type: verificationType,
          notes: notes || null,
          is_exception: false,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      setUploadProgress(100);

      // If utility response ID provided, update it with the photo link
      if (utilityResponseId && verification) {
        await supabase
          .from('wv811_utility_responses')
          .update({
            verification_photo_id: verification.id,
            verified_by: userData.user.id,
            verified_at: new Date().toISOString(),
            verification_notes: notes || null,
            response_status: 'VERIFIED_ON_SITE',
          })
          .eq('id', utilityResponseId);
      }

      setStep('done');
      onComplete?.(verification.id);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
      setStep('review');
    }
  };

  const submitException = async () => {
    if (!exceptionReason) {
      setError('Please select a reason');
      return;
    }

    setStep('uploading');
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', userData.user.id)
        .single();

      if (!userProfile?.organization_id) throw new Error('Organization not found');

      // Create exception record
      const { error: insertError } = await supabase
        .from('wv811_photo_verifications')
        .insert({
          organization_id: userProfile.organization_id,
          ticket_id: ticketId,
          utility_response_id: utilityResponseId || null,
          storage_path: '', // No file for exceptions
          file_name: 'exception',
          captured_at: new Date().toISOString(),
          captured_by: userData.user.id,
          latitude: location?.latitude || null,
          longitude: location?.longitude || null,
          gps_accuracy_meters: location?.accuracy || null,
          verification_type: 'OBSTRUCTION',
          notes: exceptionNotes || null,
          is_exception: true,
          exception_reason: exceptionReason,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setStep('done');
      onException?.(exceptionReason);
    } catch (err) {
      console.error('Exception error:', err);
      setError(err instanceof Error ? err.message : 'Failed to log exception');
      setStep('exception');
    }
  };

  const renderPromptStep = () => (
    <div className="photo-verification-content">
      <div className="verification-header">
        <Camera size={32} className="header-icon" />
        <h2>Verify Utility Marks</h2>
        <p>Take a photo to document utility marks before digging</p>
      </div>

      <div className="ticket-context">
        <span className="ticket-label">Ticket #{ticketNumber}</span>
        {utilityName && (
          <span className="utility-label">
            {utilityName} ({utilityCode})
          </span>
        )}
      </div>

      <div className="location-status">
        <MapPin size={16} />
        {isLocating ? (
          <span className="locating">
            <Loader2 size={14} className="spin" /> Getting location...
          </span>
        ) : location ? (
          <span className="located">
            <CheckCircle size={14} /> GPS captured ({location.accuracy.toFixed(0)}m accuracy)
          </span>
        ) : (
          <span className="location-error">
            <AlertTriangle size={14} /> {locationError || 'Location unavailable'}
          </span>
        )}
      </div>

      <div className="verification-actions">
        <button className="btn btn-primary btn-lg" onClick={startCamera}>
          <Camera size={20} />
          Take Photo
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
          <Image size={18} />
          Choose from Gallery
        </button>
      </div>

      <div className="exception-link">
        <button className="text-btn" onClick={() => setStep('exception')}>
          <CloudOff size={14} />
          Can't take photo right now
        </button>
      </div>

      {onDismiss && (
        <button className="dismiss-btn" onClick={onDismiss}>
          Remind me later
        </button>
      )}
    </div>
  );

  const renderCaptureStep = () => (
    <div className="photo-verification-content capture-mode">
      <video ref={videoRef} autoPlay playsInline className="camera-preview" />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div className="capture-overlay">
        <div className="capture-hint">Point at utility marks and tap to capture</div>
        <button className="capture-btn" onClick={capturePhoto}>
          <div className="capture-btn-inner" />
        </button>
        <button className="cancel-capture" onClick={() => setStep('prompt')}>
          <X size={24} />
        </button>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="photo-verification-content">
      <div className="review-header">
        <h2>Review Photo</h2>
      </div>

      {capturedImage && <img src={capturedImage} alt="Captured verification" className="review-image" />}

      <div className="verification-type-select">
        <label>What did you capture?</label>
        <div className="type-options">
          {_VERIFICATION_TYPES.map((type) => (
            <button
              key={type.value}
              className={`type-option ${verificationType === type.value ? 'selected' : ''}`}
              onClick={() => setVerificationType(type.value)}
            >
              <span className="type-label">{type.label}</span>
              <span className="type-desc">{type.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="notes-input">
        <label>Notes (optional)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional observations..."
        />
      </div>

      {/* Location and timestamp */}
      <div className="capture-metadata">
        <div className="metadata-item">
          <Clock size={14} />
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
        {location && (
          <div className="metadata-item">
            <MapPin size={14} />
            <span>
              {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            </span>
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="review-actions">
        <button className="btn btn-secondary" onClick={retakePhoto}>
          <RotateCcw size={18} />
          Retake
        </button>
        <button className="btn btn-primary" onClick={submitVerification}>
          <Send size={18} />
          Submit
        </button>
      </div>
    </div>
  );

  const renderExceptionStep = () => (
    <div className="photo-verification-content">
      <div className="exception-header">
        <AlertTriangle size={32} className="warning-icon" />
        <h2>Log Exception</h2>
        <p>Why can't you take a verification photo?</p>
      </div>

      <div className="exception-reasons">
        {_EXCEPTION_REASONS.map((reason) => (
          <button
            key={reason.value}
            className={`exception-reason ${exceptionReason === reason.value ? 'selected' : ''}`}
            onClick={() => setExceptionReason(reason.value)}
          >
            {reason.label}
          </button>
        ))}
      </div>

      <div className="notes-input">
        <label>Additional details</label>
        <textarea
          value={exceptionNotes}
          onChange={(e) => setExceptionNotes(e.target.value)}
          placeholder="Describe the situation..."
          rows={2}
        />
      </div>

      <div className="exception-warning">
        <AlertTriangle size={14} />
        <span>This exception will be flagged for supervisor review</span>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="exception-actions">
        <button className="btn btn-secondary" onClick={() => setStep('prompt')}>
          Back
        </button>
        <button className="btn btn-warning" onClick={submitException} disabled={!exceptionReason}>
          Log Exception
        </button>
      </div>
    </div>
  );

  const renderUploadingStep = () => (
    <div className="photo-verification-content uploading">
      <Loader2 size={48} className="spin" />
      <h2>Uploading...</h2>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
      </div>
      <p>{uploadProgress < 50 ? 'Uploading photo...' : 'Saving verification...'}</p>
    </div>
  );

  const renderDoneStep = () => (
    <div className="photo-verification-content done">
      <CheckCircle size={64} className="success-icon" />
      <h2>Verification Complete</h2>
      <p>Photo has been documented for ticket #{ticketNumber}</p>
      {onDismiss && (
        <button className="btn btn-primary" onClick={onDismiss}>
          Done
        </button>
      )}
    </div>
  );

  return (
    <div className="photo-verification-modal-overlay">
      <div className={`photo-verification-modal ${step}`}>
        {step !== 'capture' && step !== 'uploading' && (
          <button className="modal-close" onClick={onDismiss}>
            <X size={24} />
          </button>
        )}

        {step === 'prompt' && renderPromptStep()}
        {step === 'capture' && renderCaptureStep()}
        {step === 'review' && renderReviewStep()}
        {step === 'exception' && renderExceptionStep()}
        {step === 'uploading' && renderUploadingStep()}
        {step === 'done' && renderDoneStep()}
      </div>
    </div>
  );
}

// Compact inline version for utility response rows
export function PhotoVerificationButton({
  ticketId,
  ticketNumber,
  utilityResponseId,
  utilityName,
  utilityCode,
  hasPhoto,
  onVerified,
}: {
  ticketId: string;
  ticketNumber: string;
  utilityResponseId: string;
  utilityName: string;
  utilityCode: string;
  hasPhoto: boolean;
  onVerified?: () => void;
}) {
  const [showModal, setShowModal] = useState(false);

  if (hasPhoto) {
    return (
      <span className="photo-verified-badge">
        <CheckCircle size={14} />
        Verified
      </span>
    );
  }

  return (
    <>
      <button className="btn btn-sm btn-outline-primary" onClick={() => setShowModal(true)}>
        <Camera size={14} />
        Verify
      </button>

      {showModal && (
        <PhotoVerificationPrompt
          ticketId={ticketId}
          ticketNumber={ticketNumber}
          utilityResponseId={utilityResponseId}
          utilityName={utilityName}
          utilityCode={utilityCode}
          onComplete={() => {
            setShowModal(false);
            onVerified?.();
          }}
          onDismiss={() => setShowModal(false)}
          onException={() => {
            setShowModal(false);
            onVerified?.();
          }}
        />
      )}
    </>
  );
}
