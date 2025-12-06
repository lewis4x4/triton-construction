import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, AlertTriangle, CheckCircle, Image as ImageIcon, MapPin, Calendar, Loader2, Minimize2 } from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import { compressImage, shouldCompress, formatBytes, COMPRESSION_PRESETS } from '../../utils/imageCompression';
import './PhotoUpload.css';

interface PhotoUploadProps {
  ticketId: string;
  ticketNumber: string;
  onUploadComplete?: () => void;
  maxFiles?: number;
  maxFileSizeMB?: number;
}

interface UploadingFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'compressing' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  error?: string;
  exifData?: ExifData;
  // Compression stats
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: number;
  compressedBlob?: Blob;
}

interface ExifData {
  cameraMake?: string;
  cameraModel?: string;
  focalLength?: string;
  aperture?: string;
  iso?: string;
  exposureTime?: string;
  flashUsed?: boolean;
  orientation?: number;
  width?: number;
  height?: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  gpsAccuracy?: number;
  dateTimeOriginal?: Date;
  rawData?: Record<string, unknown>;
}

// EXIF tag constants
const EXIF_TAGS = {
  Make: 0x010F,
  Model: 0x0110,
  Orientation: 0x0112,
  DateTimeOriginal: 0x9003,
  FocalLength: 0x920A,
  FNumber: 0x829D,
  ISOSpeedRatings: 0x8827,
  ExposureTime: 0x829A,
  Flash: 0x9209,
  PixelXDimension: 0xA002,
  PixelYDimension: 0xA003,
  GPSLatitude: 0x0002,
  GPSLatitudeRef: 0x0001,
  GPSLongitude: 0x0004,
  GPSLongitudeRef: 0x0003,
  GPSAltitude: 0x0006,
  GPSAltitudeRef: 0x0005,
  GPSHPositioningError: 0x001F,
};

// Extract EXIF data from an image file
async function extractExifData(file: File): Promise<ExifData> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as ArrayBuffer;
      const exif = parseExifData(result);
      resolve(exif);
    };
    reader.onerror = () => resolve({});
    reader.readAsArrayBuffer(file.slice(0, 131072)); // Read first 128KB for EXIF
  });
}

// Parse EXIF data from ArrayBuffer (simplified parser)
function parseExifData(buffer: ArrayBuffer): ExifData {
  const view = new DataView(buffer);
  const exif: ExifData = {};

  // Check for JPEG marker
  if (view.getUint16(0) !== 0xFFD8) {
    return exif;
  }

  let offset = 2;
  while (offset < view.byteLength - 2) {
    const marker = view.getUint16(offset);

    // APP1 marker (EXIF data)
    if (marker === 0xFFE1) {
      const segmentLength = view.getUint16(offset + 2);
      const exifStart = offset + 4;

      // Check for "Exif" string
      if (
        view.getUint8(exifStart) === 0x45 &&
        view.getUint8(exifStart + 1) === 0x78 &&
        view.getUint8(exifStart + 2) === 0x69 &&
        view.getUint8(exifStart + 3) === 0x66
      ) {
        const tiffStart = exifStart + 6;
        const isLittleEndian = view.getUint16(tiffStart) === 0x4949;

        const getUint16 = (offset: number) =>
          isLittleEndian ? view.getUint16(offset, true) : view.getUint16(offset);
        const getUint32 = (offset: number) =>
          isLittleEndian ? view.getUint32(offset, true) : view.getUint32(offset);

        // Parse IFD0
        const ifd0Offset = tiffStart + getUint32(tiffStart + 4);
        const numEntries = getUint16(ifd0Offset);

        for (let i = 0; i < numEntries && ifd0Offset + 2 + i * 12 + 12 < view.byteLength; i++) {
          const entryOffset = ifd0Offset + 2 + i * 12;
          const tag = getUint16(entryOffset);
          const valueOffset = entryOffset + 8;

          try {
            switch (tag) {
              case EXIF_TAGS.Make:
                exif.cameraMake = readString(view, tiffStart, getUint32(valueOffset), isLittleEndian);
                break;
              case EXIF_TAGS.Model:
                exif.cameraModel = readString(view, tiffStart, getUint32(valueOffset), isLittleEndian);
                break;
              case EXIF_TAGS.Orientation:
                exif.orientation = getUint16(valueOffset);
                break;
            }
          } catch {
            // Continue parsing other tags
          }
        }

        // Try to get more detailed EXIF from EXIF IFD
        // This is simplified - a full implementation would traverse all IFDs
      }

      break;
    }

    // Skip to next marker
    if ((marker & 0xFF00) === 0xFF00 && marker !== 0xFF00) {
      const length = view.getUint16(offset + 2);
      offset += 2 + length;
    } else {
      offset++;
    }
  }

  return exif;
}

function readString(view: DataView, tiffStart: number, offset: number, isLittleEndian: boolean): string {
  const absOffset = tiffStart + offset;
  let str = '';
  for (let i = 0; i < 64 && absOffset + i < view.byteLength; i++) {
    const char = view.getUint8(absOffset + i);
    if (char === 0) break;
    str += String.fromCharCode(char);
  }
  return str.trim();
}

// Get current GPS position
async function getCurrentPosition(): Promise<{ latitude: number; longitude: number; accuracy: number } | null> {
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
          accuracy: position.coords.accuracy,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  });
}

// Generate content hash
async function generateContentHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function PhotoUpload({
  ticketId,
  ticketNumber,
  onUploadComplete,
  maxFiles = 10,
  maxFileSizeMB = 50,
}: PhotoUploadProps) {
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      const newFiles: UploadingFile[] = [];
      const maxSize = maxFileSizeMB * 1024 * 1024;

      for (let i = 0; i < Math.min(selectedFiles.length, maxFiles - files.length); i++) {
        const file = selectedFiles[i];

        // Validate file type
        if (!file.type.startsWith('image/')) {
          continue;
        }

        // Validate file size
        if (file.size > maxSize) {
          continue;
        }

        // Create preview URL
        const preview = URL.createObjectURL(file);

        // Extract EXIF data
        const exifData = await extractExifData(file);

        // If no GPS in EXIF, try to get current location
        if (!exifData.latitude || !exifData.longitude) {
          const currentPos = await getCurrentPosition();
          if (currentPos) {
            exifData.latitude = currentPos.latitude;
            exifData.longitude = currentPos.longitude;
            exifData.gpsAccuracy = currentPos.accuracy;
          }
        }

        newFiles.push({
          id: crypto.randomUUID(),
          file,
          preview,
          status: 'pending',
          progress: 0,
          exifData,
        });
      }

      setFiles((prev) => [...prev, ...newFiles]);
    },
    [files.length, maxFiles, maxFileSizeMB]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const uploadFiles = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      console.error('Not authenticated');
      return;
    }

    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', userData.user.id)
      .single();

    if (!profileData?.organization_id) {
      console.error('No organization found');
      return;
    }

    for (const uploadFile of files) {
      if (uploadFile.status !== 'pending') continue;

      try {
        let fileToUpload: File | Blob = uploadFile.file;
        let compressionStats = {
          originalSize: uploadFile.file.size,
          compressedSize: uploadFile.file.size,
          compressionRatio: 0,
        };

        // Compress if needed (files > 500KB)
        if (shouldCompress(uploadFile.file)) {
          setFiles((prev) =>
            prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'compressing' as const, progress: 0 } : f))
          );

          const compressed = await compressImage(uploadFile.file, COMPRESSION_PRESETS.standard);
          fileToUpload = compressed.blob;
          compressionStats = {
            originalSize: compressed.originalSize,
            compressedSize: compressed.compressedSize,
            compressionRatio: compressed.compressionRatio,
          };

          console.log(
            `Compressed ${uploadFile.file.name}: ${formatBytes(compressed.originalSize)} → ${formatBytes(compressed.compressedSize)} (${compressed.compressionRatio}% saved)`
          );
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  status: 'uploading' as const,
                  progress: 10,
                  ...compressionStats,
                }
              : f
          )
        );

        // Generate content hash from compressed file
        const contentHash = await generateContentHash(
          fileToUpload instanceof File ? fileToUpload : new File([fileToUpload], uploadFile.file.name)
        );

        // Create storage path: org_id/ticket_id/filename
        const ext = uploadFile.file.name.split('.').pop() || 'jpg';
        const storagePath = `${profileData.organization_id}/${ticketId}/${contentHash}.${ext}`;

        // Upload compressed file to storage
        const { error: uploadError } = await supabase.storage
          .from('wv811-attachments')
          .upload(storagePath, fileToUpload, {
            cacheControl: '3600',
            upsert: false,
            contentType: 'image/jpeg',
          });

        if (uploadError) throw uploadError;

        setFiles((prev) =>
          prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'processing' as const, progress: 50 } : f))
        );

        // Create database record with EXIF metadata
        // Note: file_size_bytes is the compressed size (what's stored), original is in metadata
        const { error: dbError } = await supabase.from('wv811_ticket_attachments').insert({
          ticket_id: ticketId,
          file_name: uploadFile.file.name,
          file_type: 'image/jpeg', // Always JPEG after compression
          file_size_bytes: compressionStats.compressedSize,
          storage_path: storagePath,
          description: description || null,
          uploaded_by: userData.user.id,

          // GPS data
          latitude: uploadFile.exifData?.latitude || null,
          longitude: uploadFile.exifData?.longitude || null,
          taken_at: uploadFile.exifData?.dateTimeOriginal?.toISOString() || null,

          // EXIF metadata
          exif_camera_make: uploadFile.exifData?.cameraMake || null,
          exif_camera_model: uploadFile.exifData?.cameraModel || null,
          exif_focal_length: uploadFile.exifData?.focalLength || null,
          exif_aperture: uploadFile.exifData?.aperture || null,
          exif_iso: uploadFile.exifData?.iso || null,
          exif_exposure_time: uploadFile.exifData?.exposureTime || null,
          exif_flash_used: uploadFile.exifData?.flashUsed || null,
          exif_orientation: uploadFile.exifData?.orientation || null,
          exif_width: uploadFile.exifData?.width || null,
          exif_height: uploadFile.exifData?.height || null,
          exif_gps_altitude: uploadFile.exifData?.altitude || null,
          exif_gps_accuracy: uploadFile.exifData?.gpsAccuracy || null,
          exif_raw_data: {
            ...uploadFile.exifData?.rawData,
            // Store compression metadata
            compression: {
              original_size: compressionStats.originalSize,
              compressed_size: compressionStats.compressedSize,
              ratio: compressionStats.compressionRatio,
              original_type: uploadFile.file.type,
            },
          },

          // Content hash for deduplication
          content_hash: contentHash,
        });

        if (dbError) throw dbError;

        setFiles((prev) =>
          prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'complete' as const, progress: 100 } : f))
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

    // Notify completion
    const allComplete = files.every((f) => f.status === 'complete' || f.status === 'error');
    if (allComplete) {
      onUploadComplete?.();
    }
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const uploadingCount = files.filter((f) => ['compressing', 'uploading', 'processing'].includes(f.status)).length;
  const completeCount = files.filter((f) => f.status === 'complete').length;

  return (
    <div className="photo-upload">
      <div className="upload-header">
        <h3>
          <Camera size={20} />
          Upload Photos
        </h3>
        <span className="ticket-ref">Ticket #{ticketNumber}</span>
      </div>

      {/* Drop zone */}
      <div
        className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          style={{ display: 'none' }}
        />
        <Upload size={32} />
        <p>Drag photos here or click to browse</p>
        <span className="drop-hint">Supports JPEG, PNG, HEIC up to {maxFileSizeMB}MB</span>
      </div>

      {/* Description input */}
      {files.length > 0 && (
        <div className="description-input">
          <label>Description (optional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Gas line marking at northwest corner"
          />
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="file-list">
          {files.map((file) => (
            <div key={file.id} className={`file-item ${file.status}`}>
              <div className="file-preview">
                <img src={file.preview} alt={file.file.name} />
              </div>
              <div className="file-info">
                <div className="file-name">{file.file.name}</div>
                <div className="file-meta">
                  {file.exifData?.cameraMake && (
                    <span className="meta-item">
                      <ImageIcon size={12} />
                      {file.exifData.cameraMake} {file.exifData.cameraModel || ''}
                    </span>
                  )}
                  {file.exifData?.latitude && (
                    <span className="meta-item">
                      <MapPin size={12} />
                      GPS captured
                    </span>
                  )}
                  {file.exifData?.dateTimeOriginal && (
                    <span className="meta-item">
                      <Calendar size={12} />
                      {file.exifData.dateTimeOriginal.toLocaleDateString()}
                    </span>
                  )}
                  {/* Show compression savings */}
                  {file.compressionRatio !== undefined && file.compressionRatio > 0 && (
                    <span className="meta-item compression-stat">
                      <Minimize2 size={12} />
                      {file.compressionRatio}% smaller
                    </span>
                  )}
                </div>
                {file.status === 'compressing' && (
                  <div className="progress-bar compressing">
                    <div className="progress-fill" style={{ width: '50%' }} />
                    <span className="progress-label">Compressing...</span>
                  </div>
                )}
                {file.status === 'uploading' && (
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${file.progress}%` }} />
                  </div>
                )}
                {file.status === 'error' && (
                  <div className="error-message">
                    <AlertTriangle size={12} />
                    {file.error}
                  </div>
                )}
              </div>
              <div className="file-actions">
                {file.status === 'pending' && (
                  <button className="remove-btn" onClick={() => removeFile(file.id)}>
                    <X size={16} />
                  </button>
                )}
                {file.status === 'compressing' && <Loader2 size={18} className="spin" />}
                {file.status === 'uploading' && <Loader2 size={18} className="spin" />}
                {file.status === 'processing' && <Loader2 size={18} className="spin" />}
                {file.status === 'complete' && <CheckCircle size={18} className="success-icon" />}
                {file.status === 'error' && (
                  <button className="retry-btn" onClick={() => setFiles((prev) =>
                    prev.map((f) => (f.id === file.id ? { ...f, status: 'pending' as const, error: undefined } : f))
                  )}>
                    Retry
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {pendingCount > 0 && (
        <div className="upload-actions">
          <div className="upload-stats">
            {completeCount > 0 && <span className="stat success">{completeCount} uploaded</span>}
            {uploadingCount > 0 && <span className="stat uploading">{uploadingCount} uploading</span>}
            <span className="stat pending">{pendingCount} ready</span>
          </div>
          <button className="btn btn-primary" onClick={uploadFiles} disabled={uploadingCount > 0}>
            {uploadingCount > 0 ? (
              <>
                <Loader2 size={16} className="spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={16} />
                Upload {pendingCount} Photo{pendingCount !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
