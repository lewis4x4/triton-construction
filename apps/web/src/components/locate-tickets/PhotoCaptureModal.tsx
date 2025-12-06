import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera,
  Upload,
  X,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Calendar,
  Loader2,
  ChevronRight,
  Zap,
  Flame,
  Phone,
  Droplet,
  Waves,
  Target,
  Square,
  Clock,
  Search,
  Layers,
  Truck,
  Check,
  Ban,
  CloudRain,
  Move,
  AlertOctagon,
  FileText,
  Scan,
  ShieldCheck,
  Siren,
  CheckCircle2,
  Droplets,
  Image as ImageIcon,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import {
  PHOTO_CATEGORIES,
  PHOTO_CATEGORY_GROUPS,
  QUICK_CAPTURE_CATEGORIES,
  getCategoriesByGroup,
  getCategoryById,
  type PhotoCategory,
  type PhotoCategoryGroup,
} from './photoCategories';
import './PhotoCaptureModal.css';

// Icon mapping
const ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  MapPin,
  FileText,
  Camera,
  Zap,
  Flame,
  Phone,
  Droplet,
  Waves,
  Droplets,
  Target,
  Square,
  Clock,
  Scan,
  Search,
  Layers,
  Truck,
  AlertTriangle,
  Check,
  CheckCircle,
  CheckCircle2,
  Ban,
  CloudRain,
  Move,
  AlertOctagon,
  ShieldCheck,
  Siren,
};

interface PhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  ticketNumber: string;
  onUploadComplete?: () => void;
  promptCategory?: string;  // Auto-select a category (e.g., from workflow trigger)
  promptMessage?: string;   // Custom prompt message
}

interface SelectedFile {
  id: string;
  file: File;
  preview: string;
  category: string | null;
  notes: string;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
  latitude?: number;
  longitude?: number;
  timestamp?: Date;
}

export function PhotoCaptureModal({
  isOpen,
  onClose,
  ticketId,
  ticketNumber,
  onUploadComplete,
  promptCategory,
  promptMessage,
}: PhotoCaptureModalProps) {
  const [step, setStep] = useState<'category' | 'capture' | 'review'>('category');
  const [selectedCategory, setSelectedCategory] = useState<PhotoCategory | null>(null);
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<PhotoCategoryGroup | null>('pre_excavation');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle prompt category on open
  useEffect(() => {
    if (isOpen && promptCategory) {
      const category = getCategoryById(promptCategory);
      if (category) {
        setSelectedCategory(category);
        setStep('capture');
      }
    }
  }, [isOpen, promptCategory]);

  // Get current GPS location
  const getCurrentPosition = useCallback(async (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles || !selectedCategory) return;

    const position = await getCurrentPosition();
    const newFiles: SelectedFile[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (!file.type.startsWith('image/')) continue;

      newFiles.push({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        category: selectedCategory.id,
        notes: '',
        status: 'pending',
        latitude: position?.latitude,
        longitude: position?.longitude,
        timestamp: new Date(),
      });
    }

    setFiles((prev) => [...prev, ...newFiles]);
    setStep('review');
  }, [selectedCategory, getCurrentPosition]);

  // Generate content hash
  const generateContentHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  // Upload files
  const uploadFiles = async () => {
    setIsUploading(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      console.error('Not authenticated');
      setIsUploading(false);
      return;
    }

    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', userData.user.id)
      .single();

    if (!profileData?.organization_id) {
      console.error('No organization found');
      setIsUploading(false);
      return;
    }

    for (const uploadFile of files) {
      if (uploadFile.status !== 'pending') continue;

      setFiles((prev) =>
        prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'uploading' as const } : f))
      );

      try {
        const contentHash = await generateContentHash(uploadFile.file);
        const ext = uploadFile.file.name.split('.').pop() || 'jpg';
        const storagePath = `${profileData.organization_id}/${ticketId}/${contentHash}.${ext}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('wv811-attachments')
          .upload(storagePath, uploadFile.file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Create database record
        const { error: dbError } = await supabase.from('wv811_ticket_attachments').insert({
          ticket_id: ticketId,
          file_name: uploadFile.file.name,
          file_type: uploadFile.file.type,
          file_size_bytes: uploadFile.file.size,
          storage_path: storagePath,
          description: uploadFile.notes || null,
          uploaded_by: userData.user.id,
          latitude: uploadFile.latitude || null,
          longitude: uploadFile.longitude || null,
          taken_at: uploadFile.timestamp?.toISOString() || null,
          content_hash: contentHash,
          // Photo category stored in AI keywords field until we add a dedicated column
          ai_keywords: [uploadFile.category || 'uncategorized'],
        });

        if (dbError) throw dbError;

        setFiles((prev) =>
          prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'complete' as const } : f))
        );
      } catch (err) {
        console.error('Upload error:', err);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: 'error' as const, error: err instanceof Error ? err.message : 'Upload failed' }
              : f
          )
        );
      }
    }

    setIsUploading(false);

    // Check if all complete
    setTimeout(() => {
      const allComplete = files.every((f) => f.status === 'complete' || f.status === 'error');
      if (allComplete) {
        onUploadComplete?.();
        handleClose();
      }
    }, 500);
  };

  // Reset and close
  const handleClose = useCallback(() => {
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setSelectedCategory(null);
    setStep('category');
    onClose();
  }, [files, onClose]);

  // Remove file
  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  // Update file notes
  const updateFileNotes = useCallback((id: string, notes: string) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, notes } : f)));
  }, []);

  if (!isOpen) return null;

  const IconComponent = selectedCategory ? ICONS[selectedCategory.icon] : null;

  return (
    <div className="photo-capture-overlay" onClick={handleClose}>
      <div className="photo-capture-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="header-content">
            <Camera size={22} />
            <div>
              <h2>Add Photo Evidence</h2>
              <span className="ticket-ref">Ticket #{ticketNumber}</span>
            </div>
          </div>
          <button className="close-btn" onClick={handleClose}>
            <X size={22} />
          </button>
        </div>

        {/* Prompt Banner */}
        {promptMessage && step === 'category' && (
          <div className="prompt-banner">
            <AlertTriangle size={18} />
            <span>{promptMessage}</span>
          </div>
        )}

        {/* Step: Category Selection */}
        {step === 'category' && (
          <div className="modal-body category-step">
            {/* Quick Capture Buttons */}
            <div className="quick-capture-section">
              <h3>Quick Capture</h3>
              <div className="quick-buttons">
                {QUICK_CAPTURE_CATEGORIES.map((catId) => {
                  const cat = getCategoryById(catId);
                  if (!cat) return null;
                  const Icon = ICONS[cat.icon];
                  return (
                    <button
                      key={cat.id}
                      className="quick-btn"
                      style={{ borderColor: cat.color }}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setStep('capture');
                      }}
                    >
                      {Icon && <Icon size={20} />}
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* All Categories */}
            <div className="all-categories">
              <h3>All Categories</h3>
              {(Object.keys(PHOTO_CATEGORY_GROUPS) as PhotoCategoryGroup[])
                .sort((a, b) => PHOTO_CATEGORY_GROUPS[a].sortOrder - PHOTO_CATEGORY_GROUPS[b].sortOrder)
                .map((groupId) => {
                  const group = PHOTO_CATEGORY_GROUPS[groupId];
                  const categories = getCategoriesByGroup(groupId);
                  const isExpanded = expandedGroup === groupId;

                  return (
                    <div key={groupId} className="category-group">
                      <button
                        className={`group-header ${isExpanded ? 'expanded' : ''}`}
                        onClick={() => setExpandedGroup(isExpanded ? null : groupId)}
                      >
                        <div className="group-info">
                          <span className="group-name">{group.label}</span>
                          <span className="group-count">{categories.length}</span>
                        </div>
                        <ChevronRight size={20} className={isExpanded ? 'rotated' : ''} />
                      </button>

                      {isExpanded && (
                        <div className="category-list">
                          {categories.map((cat) => {
                            const Icon = ICONS[cat.icon];
                            return (
                              <button
                                key={cat.id}
                                className="category-item"
                                onClick={() => {
                                  setSelectedCategory(cat);
                                  setStep('capture');
                                }}
                              >
                                <div
                                  className="category-icon"
                                  style={{ background: `${cat.color}20`, color: cat.color }}
                                >
                                  {Icon && <Icon size={18} />}
                                </div>
                                <div className="category-info">
                                  <span className="category-name">
                                    {cat.label}
                                    {cat.required && <span className="required-badge">Required</span>}
                                  </span>
                                  <span className="category-desc">{cat.description}</span>
                                </div>
                                <ChevronRight size={18} />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Step: Capture */}
        {step === 'capture' && selectedCategory && (
          <div className="modal-body capture-step">
            <div className="selected-category-banner" style={{ background: `${selectedCategory.color}15` }}>
              {IconComponent && (
                <div className="category-icon" style={{ background: selectedCategory.color }}>
                  <IconComponent size={24} />
                </div>
              )}
              <div>
                <span className="category-label">{selectedCategory.label}</span>
                <span className="category-desc">{selectedCategory.description}</span>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              style={{ display: 'none' }}
            />

            <div className="capture-options">
              <button
                className="capture-btn primary"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute('capture', 'environment');
                    fileInputRef.current.click();
                  }
                }}
              >
                <Camera size={28} />
                <span>Take Photo</span>
              </button>
              <button
                className="capture-btn secondary"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute('capture');
                    fileInputRef.current.click();
                  }
                }}
              >
                <Upload size={28} />
                <span>Choose from Gallery</span>
              </button>
            </div>

            <button className="back-btn" onClick={() => setStep('category')}>
              ← Choose Different Category
            </button>
          </div>
        )}

        {/* Step: Review */}
        {step === 'review' && (
          <div className="modal-body review-step">
            <h3>Review Photos ({files.length})</h3>

            <div className="files-list">
              {files.map((file) => (
                <div key={file.id} className={`file-card ${file.status}`}>
                  <div className="file-preview">
                    <img src={file.preview} alt="Preview" />
                    {file.status === 'pending' && (
                      <button className="remove-btn" onClick={() => removeFile(file.id)}>
                        <X size={16} />
                      </button>
                    )}
                    {file.status === 'uploading' && (
                      <div className="status-overlay">
                        <Loader2 size={24} className="spin" />
                      </div>
                    )}
                    {file.status === 'complete' && (
                      <div className="status-overlay success">
                        <CheckCircle size={24} />
                      </div>
                    )}
                    {file.status === 'error' && (
                      <div className="status-overlay error">
                        <AlertTriangle size={24} />
                      </div>
                    )}
                  </div>
                  <div className="file-details">
                    <div className="file-meta">
                      {file.latitude && (
                        <span className="meta-item">
                          <MapPin size={12} />
                          GPS
                        </span>
                      )}
                      {file.timestamp && (
                        <span className="meta-item">
                          <Calendar size={12} />
                          {file.timestamp.toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      className="notes-input"
                      placeholder="Add notes (optional)..."
                      value={file.notes}
                      onChange={(e) => updateFileNotes(file.id, e.target.value)}
                      disabled={file.status !== 'pending'}
                    />
                    {file.error && <div className="error-text">{file.error}</div>}
                  </div>
                </div>
              ))}
            </div>

            <div className="review-actions">
              <button
                className="btn-add-more"
                onClick={() => setStep('capture')}
                disabled={isUploading}
              >
                + Add More Photos
              </button>
              <button
                className="btn-upload"
                onClick={uploadFiles}
                disabled={isUploading || files.length === 0}
              >
                {isUploading ? (
                  <>
                    <Loader2 size={18} className="spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Upload {files.filter((f) => f.status === 'pending').length} Photo
                    {files.filter((f) => f.status === 'pending').length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
