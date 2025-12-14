// =============================================================================
// Component: TicketCaptureModal
// Purpose: Capture delivery ticket photos with OCR processing
// Supports camera capture, file upload, batch uploads, and GPS tagging
// =============================================================================

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import {
  X,
  Camera,
  Upload,
  Image,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Trash2,
  MapPin,
  FileText,
  Scan,
  ChevronDown,
  Plus,
  FolderOpen,
} from 'lucide-react';
import './TicketCaptureModal.css';

interface TicketCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  supplierId?: string;
  onUploadComplete: (ticketIds: string[]) => void;
}

interface QueuedFile {
  id: string;
  file: File;
  preview: string;
  documentType: DocumentType;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  ticketId?: string;
  confidence?: number;
  error?: string;
  gpsLocation?: { lat: number; lng: number };
}

type DocumentType = 'DELIVERY_TICKET' | 'BATCH_TICKET' | 'ASPHALT_TICKET' | 'WEIGHT_TICKET';

const DOCUMENT_TYPES: { value: DocumentType; label: string; description: string }[] = [
  { value: 'DELIVERY_TICKET', label: 'Delivery Ticket', description: 'Standard material delivery ticket' },
  { value: 'BATCH_TICKET', label: 'Concrete Batch Ticket', description: 'Ready-mix concrete batch ticket with slump/air data' },
  { value: 'ASPHALT_TICKET', label: 'Asphalt Ticket', description: 'Hot mix asphalt delivery with temperature data' },
  { value: 'WEIGHT_TICKET', label: 'Weight Ticket', description: 'Scale house weight ticket' },
];

export function TicketCaptureModal({
  isOpen,
  onClose,
  projectId,
  supplierId,
  onUploadComplete,
}: TicketCaptureModalProps) {
  const [mode, setMode] = useState<'select' | 'camera' | 'upload'>('select');
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [defaultDocType, setDefaultDocType] = useState<DocumentType>('DELIVERY_TICKET');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Get GPS location on mount
  useEffect(() => {
    if (gpsEnabled && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('GPS location not available:', error.message);
          setGpsEnabled(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [gpsEnabled]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setMode('camera');
    } catch (error) {
      console.error('Camera access denied:', error);
      alert('Unable to access camera. Please grant camera permissions or use file upload.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setMode('select');
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
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
          addFileToQueue(file);
        }
      },
      'image/jpeg',
      0.9
    );
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach(addFileToQueue);
    }
    // Reset input for re-selection of same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addFileToQueue = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      alert('Please select an image or PDF file');
      return;
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      alert('File size must be less than 20MB');
      return;
    }

    const queuedFile: QueuedFile = {
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      documentType: defaultDocType,
      status: 'pending',
      progress: 0,
      gpsLocation: currentLocation || undefined,
    };

    setQueuedFiles(prev => [...prev, queuedFile]);
    setMode('upload');
  };

  const removeFromQueue = (id: string) => {
    setQueuedFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const updateFileDocType = (id: string, docType: DocumentType) => {
    setQueuedFiles(prev =>
      prev.map(f => (f.id === id ? { ...f, documentType: docType } : f))
    );
  };

  const processQueue = async () => {
    if (queuedFiles.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: queuedFiles.length });

    const completedTicketIds: string[] = [];

    for (let i = 0; i < queuedFiles.length; i++) {
      const queuedFile = queuedFiles[i];
      setProcessingProgress({ current: i + 1, total: queuedFiles.length });

      // Update status to uploading
      setQueuedFiles(prev =>
        prev.map(f => (f.id === queuedFile.id ? { ...f, status: 'uploading', progress: 10 } : f))
      );

      try {
        // Upload to Supabase Storage
        const filePath = `tickets/${projectId}/${Date.now()}-${queuedFile.file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('delivery-tickets')
          .upload(filePath, queuedFile.file);

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('delivery-tickets')
          .getPublicUrl(filePath);

        const documentUrl = urlData.publicUrl;

        // Update status to processing
        setQueuedFiles(prev =>
          prev.map(f => (f.id === queuedFile.id ? { ...f, status: 'processing', progress: 50 } : f))
        );

        // Call enhanced OCR function
        const { data: ocrResult, error: ocrError } = await supabase.functions.invoke(
          'ocr-process-enhanced',
          {
            body: {
              document_url: documentUrl,
              document_type: queuedFile.documentType,
              project_id: projectId,
              supplier_id: supplierId,
            },
          }
        );

        if (ocrError) throw new Error(`OCR processing failed: ${ocrError.message}`);

        // Update GPS location on ticket if available
        if (queuedFile.gpsLocation && ocrResult.ticket_id) {
          await supabase
            .from('material_tickets')
            .update({
              capture_latitude: queuedFile.gpsLocation.lat,
              capture_longitude: queuedFile.gpsLocation.lng,
            })
            .eq('id', ocrResult.ticket_id);
        }

        // Update status to complete
        setQueuedFiles(prev =>
          prev.map(f =>
            f.id === queuedFile.id
              ? {
                  ...f,
                  status: 'complete',
                  progress: 100,
                  ticketId: ocrResult.ticket_id,
                  confidence: ocrResult.overall_confidence,
                }
              : f
          )
        );

        completedTicketIds.push(ocrResult.ticket_id);
      } catch (error: any) {
        console.error('Processing error:', error);
        setQueuedFiles(prev =>
          prev.map(f =>
            f.id === queuedFile.id
              ? { ...f, status: 'error', progress: 0, error: error.message }
              : f
          )
        );
      }
    }

    setIsProcessing(false);

    // Notify parent of completed tickets
    if (completedTicketIds.length > 0) {
      onUploadComplete(completedTicketIds);
    }
  };

  const clearCompleted = () => {
    setQueuedFiles(prev => {
      prev.filter(f => f.status === 'complete').forEach(f => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
      return prev.filter(f => f.status !== 'complete');
    });
  };

  const handleClose = () => {
    stopCamera();
    queuedFiles.forEach(f => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setQueuedFiles([]);
    setMode('select');
    onClose();
  };

  if (!isOpen) return null;

  const pendingCount = queuedFiles.filter(f => f.status === 'pending').length;
  const completeCount = queuedFiles.filter(f => f.status === 'complete').length;
  const errorCount = queuedFiles.filter(f => f.status === 'error').length;

  return (
    <div className="ticket-capture-overlay" onClick={handleClose}>
      <div className="ticket-capture-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="capture-modal-header">
          <div className="header-title">
            <Camera size={24} />
            <div>
              <h2>Capture Delivery Tickets</h2>
              <p>Upload or photograph material delivery tickets for OCR processing</p>
            </div>
          </div>
          <button className="close-btn" onClick={handleClose} disabled={isProcessing}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="capture-modal-content">
          {/* Mode Selection */}
          {mode === 'select' && (
            <div className="capture-mode-select">
              <div className="mode-options">
                <button className="mode-option" onClick={startCamera}>
                  <div className="mode-icon">
                    <Camera size={32} />
                  </div>
                  <div className="mode-info">
                    <h3>Use Camera</h3>
                    <p>Take a photo of the ticket with your device camera</p>
                  </div>
                </button>

                <button
                  className="mode-option"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="mode-icon">
                    <Upload size={32} />
                  </div>
                  <div className="mode-info">
                    <h3>Upload Files</h3>
                    <p>Select one or more ticket images from your device</p>
                  </div>
                </button>

                <button
                  className="mode-option"
                  onClick={() => {
                    // Allow multi-select
                    if (fileInputRef.current) {
                      fileInputRef.current.multiple = true;
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <div className="mode-icon">
                    <FolderOpen size={32} />
                  </div>
                  <div className="mode-info">
                    <h3>Batch Upload</h3>
                    <p>Upload multiple tickets at once for batch processing</p>
                  </div>
                </button>
              </div>

              <div className="default-doc-type">
                <label>Default Document Type:</label>
                <select
                  value={defaultDocType}
                  onChange={e => setDefaultDocType(e.target.value as DocumentType)}
                >
                  {DOCUMENT_TYPES.map(dt => (
                    <option key={dt.value} value={dt.value}>
                      {dt.label}
                    </option>
                  ))}
                </select>
              </div>

              {currentLocation && (
                <div className="gps-indicator">
                  <MapPin size={16} />
                  <span>GPS location will be recorded with captures</span>
                </div>
              )}
            </div>
          )}

          {/* Camera View */}
          {mode === 'camera' && (
            <div className="camera-view">
              <video ref={videoRef} autoPlay playsInline className="camera-preview" />
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              <div className="camera-overlay">
                <div className="camera-frame">
                  <span className="frame-corner top-left"></span>
                  <span className="frame-corner top-right"></span>
                  <span className="frame-corner bottom-left"></span>
                  <span className="frame-corner bottom-right"></span>
                </div>
                <p className="camera-hint">Position ticket within frame</p>
              </div>

              <div className="camera-controls">
                <button className="btn-cancel" onClick={stopCamera}>
                  Cancel
                </button>
                <button className="btn-capture" onClick={capturePhoto}>
                  <Camera size={24} />
                  Capture
                </button>
                <button
                  className="btn-switch-mode"
                  onClick={() => {
                    stopCamera();
                    fileInputRef.current?.click();
                  }}
                >
                  <Upload size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Upload Queue */}
          {mode === 'upload' && (
            <div className="upload-queue">
              <div className="queue-header">
                <div className="queue-stats">
                  <span>{queuedFiles.length} tickets queued</span>
                  {completeCount > 0 && (
                    <span className="stat-complete">
                      <CheckCircle size={14} /> {completeCount} complete
                    </span>
                  )}
                  {errorCount > 0 && (
                    <span className="stat-error">
                      <AlertTriangle size={14} /> {errorCount} failed
                    </span>
                  )}
                </div>
                <div className="queue-actions">
                  <button
                    className="btn-text"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                  >
                    <Plus size={16} /> Add More
                  </button>
                  {completeCount > 0 && (
                    <button className="btn-text" onClick={clearCompleted}>
                      Clear Completed
                    </button>
                  )}
                </div>
              </div>

              <div className="queue-list">
                {queuedFiles.map(qf => (
                  <div key={qf.id} className={`queue-item status-${qf.status}`}>
                    <div className="item-preview">
                      {qf.preview ? (
                        <img src={qf.preview} alt="Ticket preview" />
                      ) : (
                        <FileText size={32} />
                      )}
                      {qf.status === 'uploading' && (
                        <div className="upload-progress">
                          <div className="progress-bar" style={{ width: `${qf.progress}%` }} />
                        </div>
                      )}
                      {qf.status === 'processing' && (
                        <div className="processing-indicator">
                          <Scan size={20} className="spinning" />
                        </div>
                      )}
                    </div>

                    <div className="item-info">
                      <div className="item-name">{qf.file.name}</div>
                      <div className="item-meta">
                        <span>{(qf.file.size / 1024).toFixed(0)} KB</span>
                        {qf.gpsLocation && (
                          <span className="gps-tag">
                            <MapPin size={12} /> GPS
                          </span>
                        )}
                      </div>
                      {qf.status === 'complete' && qf.confidence && (
                        <div className="item-result">
                          <CheckCircle size={14} />
                          <span>
                            OCR Complete ({qf.confidence.toFixed(0)}% confidence)
                          </span>
                        </div>
                      )}
                      {qf.status === 'error' && (
                        <div className="item-error">
                          <AlertTriangle size={14} />
                          <span>{qf.error}</span>
                        </div>
                      )}
                    </div>

                    <div className="item-controls">
                      {qf.status === 'pending' && (
                        <>
                          <select
                            value={qf.documentType}
                            onChange={e =>
                              updateFileDocType(qf.id, e.target.value as DocumentType)
                            }
                            disabled={isProcessing}
                          >
                            {DOCUMENT_TYPES.map(dt => (
                              <option key={dt.value} value={dt.value}>
                                {dt.label}
                              </option>
                            ))}
                          </select>
                          <button
                            className="btn-remove"
                            onClick={() => removeFromQueue(qf.id)}
                            disabled={isProcessing}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                      {(qf.status === 'uploading' || qf.status === 'processing') && (
                        <Loader2 size={20} className="spinning" />
                      )}
                      {qf.status === 'complete' && (
                        <CheckCircle size={20} className="success-icon" />
                      )}
                      {qf.status === 'error' && (
                        <button
                          className="btn-retry"
                          onClick={() => {
                            // Reset to pending for retry
                            setQueuedFiles(prev =>
                              prev.map(f =>
                                f.id === qf.id
                                  ? { ...f, status: 'pending', progress: 0, error: undefined }
                                  : f
                              )
                            );
                          }}
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Processing Status */}
              {isProcessing && (
                <div className="processing-status">
                  <Loader2 size={20} className="spinning" />
                  <span>
                    Processing {processingProgress.current} of {processingProgress.total}...
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="capture-modal-footer">
          {mode === 'upload' && (
            <>
              <button
                className="btn-secondary"
                onClick={() => {
                  if (queuedFiles.length > 0 && !isProcessing) {
                    if (confirm('Discard all queued tickets?')) {
                      queuedFiles.forEach(f => {
                        if (f.preview) URL.revokeObjectURL(f.preview);
                      });
                      setQueuedFiles([]);
                      setMode('select');
                    }
                  } else {
                    setMode('select');
                  }
                }}
                disabled={isProcessing}
              >
                Back
              </button>
              <button
                className="btn-primary"
                onClick={processQueue}
                disabled={isProcessing || pendingCount === 0}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="spinning" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Scan size={18} />
                    Process {pendingCount} Ticket{pendingCount !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </>
          )}

          {mode === 'select' && (
            <button className="btn-secondary" onClick={handleClose}>
              Cancel
            </button>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}

export default TicketCaptureModal;
