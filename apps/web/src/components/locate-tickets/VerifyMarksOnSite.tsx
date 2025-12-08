import { useState, useRef, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  Camera,
  MapPin,
  Clock,
  AlertTriangle,
  X,
  Loader2,
  Eye,
  Flag,
  HelpCircle,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './VerifyMarksOnSite.css';

interface VerifyMarksProps {
  utilityResponseId: string;
  utilityName: string;
  utilityCode: string;
  utilityType?: string;
  ticketId: string;
  ticketNumber: string;
  currentStatus: string;
  onVerified?: () => void;
  onConflict?: () => void;
}

type VerificationStatus = 'MARKS_PRESENT' | 'NO_MARKS_FOUND' | 'PARTIAL_MARKS' | 'MARKS_UNCLEAR';

interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

const VERIFICATION_OPTIONS: { value: VerificationStatus; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'MARKS_PRESENT',
    label: 'Marks Present',
    description: 'All utility marks are visible and clear',
    icon: <CheckCircle size={20} className="status-icon verified" />,
  },
  {
    value: 'PARTIAL_MARKS',
    label: 'Partial Marks',
    description: 'Some marks visible, but incomplete coverage',
    icon: <Flag size={20} className="status-icon partial" />,
  },
  {
    value: 'MARKS_UNCLEAR',
    label: 'Marks Unclear',
    description: 'Marks faded, damaged, or hard to read',
    icon: <HelpCircle size={20} className="status-icon unclear" />,
  },
  {
    value: 'NO_MARKS_FOUND',
    label: 'No Marks Found',
    description: 'No visible utility marks in the dig area',
    icon: <XCircle size={20} className="status-icon missing" />,
  },
];

export function VerifyMarksOnSite({
  utilityResponseId,
  utilityName,
  utilityCode,
  utilityType,
  ticketId,
  ticketNumber,
  currentStatus,
  onVerified,
  onConflict,
}: VerifyMarksProps) {
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<'verify' | 'photo' | 'submitting' | 'done'>('verify');
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [notes, setNotes] = useState('');
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [location, setLocation] = useState<GPSLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Get GPS on modal open
  useEffect(() => {
    if (showModal) {
      getLocation();
    }
    return () => {
      stopCamera();
    };
  }, [showModal]);

  const getLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
          setIsLocating(false);
        },
        () => {
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setIsLocating(false);
    }
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
      setStep('photo');
    } catch (err) {
      console.error('Camera error:', err);
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhotoData(dataUrl);
        stopCamera();
        setStep('verify');
      }
    }
  };

  const handleSubmit = async () => {
    if (!verificationStatus) {
      setError('Please select a verification status');
      return;
    }

    // For NO_MARKS_FOUND or MARKS_UNCLEAR, suggest logging a conflict
    if (verificationStatus === 'NO_MARKS_FOUND' || verificationStatus === 'MARKS_UNCLEAR') {
      if (!notes.trim()) {
        setError('Please add notes explaining the situation');
        return;
      }
    }

    setStep('submitting');
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Determine the new response status based on verification
      let newStatus: string;
      if (verificationStatus === 'MARKS_PRESENT') {
        newStatus = 'VERIFIED_ON_SITE';
      } else if (verificationStatus === 'PARTIAL_MARKS') {
        newStatus = 'VERIFIED_ON_SITE'; // Still verified, but with notes
      } else {
        // NO_MARKS_FOUND or MARKS_UNCLEAR - keep as is but add verification note
        newStatus = currentStatus;
      }

      // Upload photo if captured
      let photoUrl: string | null = null;
      if (photoData) {
        const base64Data = photoData.split(',')[1]!;
        const fileName = `verifications/${ticketId}/${utilityResponseId}_${Date.now()}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('report-photos')
          .upload(fileName, decode(base64Data), {
            contentType: 'image/jpeg',
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('report-photos')
          .getPublicUrl(fileName!);

        photoUrl = urlData.publicUrl;
      }

      // Update the utility response with verification
      const updateData: Record<string, unknown> = {
        verified_by: userData.user.id,
        verified_at: new Date().toISOString(),
        verification_status: verificationStatus,
        verification_notes: notes || null,
        verification_photo_url: photoUrl,
        verification_latitude: location?.latitude || null,
        verification_longitude: location?.longitude || null,
        verification_gps_accuracy: location?.accuracy || null,
      };

      // Only update response_status if marks are verified
      if (verificationStatus === 'MARKS_PRESENT' || verificationStatus === 'PARTIAL_MARKS') {
        updateData.response_status = newStatus;
      }

      const { error: updateError } = await supabase
        .from('wv811_utility_responses')
        .update(updateData)
        .eq('id', utilityResponseId);

      if (updateError) throw updateError;

      // Add a ticket note for audit trail
      const verificationLabel = VERIFICATION_OPTIONS.find(o => o.value === verificationStatus)?.label;
      await supabase.from('wv811_ticket_notes').insert({
        ticket_id: ticketId,
        user_id: userData.user.id,
        note_type: 'FIELD_VERIFICATION',
        content: `Field verification for ${utilityName} (${utilityCode}).\n\nStatus: ${verificationLabel}\n${notes ? `Notes: ${notes}` : ''}\n${location ? `GPS: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} (±${location.accuracy.toFixed(0)}m)` : ''}`,
      });

      setStep('done');

      // Trigger appropriate callback
      if (verificationStatus === 'NO_MARKS_FOUND' || verificationStatus === 'MARKS_UNCLEAR') {
        onConflict?.();
      } else {
        onVerified?.();
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save verification');
      setStep('verify');
    }
  };

  const handleClose = () => {
    stopCamera();
    setShowModal(false);
    setStep('verify');
    setVerificationStatus(null);
    setNotes('');
    setPhotoData(null);
    setError(null);
  };

  // Check if this utility can be verified (must be in certain states)
  const canVerify = ['PENDING', 'MARKED', 'CLEAR', 'UNVERIFIED'].includes(currentStatus);

  if (!canVerify) {
    return null;
  }

  return (
    <>
      <button className="verify-marks-btn" onClick={() => setShowModal(true)}>
        <Eye size={14} />
        Verify On-Site
      </button>

      {showModal && (
        <div className="verify-marks-modal-overlay">
          <div className="verify-marks-modal">
            <button className="modal-close" onClick={handleClose}>
              <X size={24} />
            </button>
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {step === 'verify' && (
              <div className="verify-marks-content">
                <div className="verify-header">
                  <Eye size={32} className="header-icon" />
                  <h2>Field Verification</h2>
                  <p>Verify utility marks are present on site before digging</p>
                </div>

                <div className="utility-info-card">
                  <div className="utility-details">
                    <span className="utility-name">{utilityName}</span>
                    <span className="utility-code">{utilityCode}</span>
                    {utilityType && <span className="utility-type">{utilityType}</span>}
                  </div>
                  <div className="ticket-ref">Ticket #{ticketNumber}</div>
                </div>

                {/* Location Status */}
                <div className="location-status">
                  <MapPin size={16} />
                  {isLocating ? (
                    <span className="locating">
                      <Loader2 size={14} className="spin" /> Getting location...
                    </span>
                  ) : location ? (
                    <span className="located">
                      <CheckCircle size={14} /> Location captured
                    </span>
                  ) : (
                    <span className="no-location">Location unavailable</span>
                  )}
                </div>

                {/* Photo Preview */}
                {photoData && (
                  <div className="photo-preview">
                    <img src={photoData} alt="Verification" />
                    <button className="remove-photo" onClick={() => setPhotoData(null)}>
                      <X size={16} />
                    </button>
                  </div>
                )}

                {/* Verification Status Selection */}
                <div className="form-group">
                  <label>What do you see?</label>
                  <div className="verification-options">
                    {VERIFICATION_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        className={`verification-option ${verificationStatus === option.value ? 'selected' : ''}`}
                        onClick={() => setVerificationStatus(option.value)}
                      >
                        {option.icon}
                        <div className="option-text">
                          <span className="option-label">{option.label}</span>
                          <span className="option-desc">{option.description}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Warning for problematic statuses */}
                {(verificationStatus === 'NO_MARKS_FOUND' || verificationStatus === 'MARKS_UNCLEAR') && (
                  <div className="verification-warning">
                    <AlertTriangle size={18} />
                    <div>
                      <strong>Consider logging a conflict</strong> if marks are missing or unclear.
                      This protects the company from liability.
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="form-group">
                  <label>
                    Notes {(verificationStatus === 'NO_MARKS_FOUND' || verificationStatus === 'MARKS_UNCLEAR') && (
                      <span className="required">*</span>
                    )}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describe what you observed (mark colors, locations, condition)..."
                    rows={3}
                  />
                </div>

                {/* Photo Button */}
                {!photoData && (
                  <button className="btn btn-secondary btn-photo" onClick={startCamera}>
                    <Camera size={18} />
                    Take Photo of Marks
                  </button>
                )}

                {error && <div className="error-message">{error}</div>}

                <div className="verify-actions">
                  <button className="btn btn-secondary" onClick={handleClose}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    disabled={!verificationStatus}
                  >
                    <CheckCircle size={18} />
                    Confirm Verification
                  </button>
                </div>
              </div>
            )}

            {step === 'photo' && (
              <div className="verify-marks-content capture-mode">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="camera-preview"
                />
                <div className="capture-overlay">
                  <p className="capture-hint">Position the utility marks in frame</p>
                  <button className="capture-btn" onClick={capturePhoto}>
                    <div className="capture-btn-inner" />
                  </button>
                </div>
                <button className="cancel-capture" onClick={() => { stopCamera(); setStep('verify'); }}>
                  <X size={24} />
                </button>
              </div>
            )}

            {step === 'submitting' && (
              <div className="verify-marks-content submitting">
                <Loader2 size={48} className="spin" />
                <h2>Saving Verification...</h2>
                <p>Recording your field observation</p>
              </div>
            )}

            {step === 'done' && (
              <div className="verify-marks-content done">
                <CheckCircle size={64} className="success-icon" />
                <h2>Verification Recorded</h2>
                <p>
                  {verificationStatus === 'MARKS_PRESENT' || verificationStatus === 'PARTIAL_MARKS'
                    ? `${utilityName} marks have been verified on site.`
                    : `Your observation has been recorded. Consider logging a conflict if needed.`}
                </p>
                <div className="verification-meta">
                  <div className="meta-item">
                    <Clock size={14} />
                    <span>{new Date().toLocaleTimeString()}</span>
                  </div>
                  {location && (
                    <div className="meta-item">
                      <MapPin size={14} />
                      <span>GPS recorded</span>
                    </div>
                  )}
                  {photoData && (
                    <div className="meta-item">
                      <Camera size={14} />
                      <span>Photo saved</span>
                    </div>
                  )}
                </div>
                <button className="btn btn-primary" onClick={handleClose}>
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Helper to decode base64
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Verified Badge component for display in utility table
export function VerifiedBadge({
  verifiedAt,
  verifiedBy: _verifiedBy,
  verificationStatus,
}: {
  verifiedAt: string;
  verifiedBy?: string;
  verificationStatus?: string;
}) {
  const statusLabel = verificationStatus === 'PARTIAL_MARKS' ? 'Partial' : 'Verified';

  return (
    <div className="verified-badge">
      <CheckCircle size={14} />
      <span>{statusLabel}</span>
      <span className="verified-time">
        {new Date(verifiedAt).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })}
      </span>
    </div>
  );
}
