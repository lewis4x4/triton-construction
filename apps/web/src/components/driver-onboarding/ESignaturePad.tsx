import { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, Check, RotateCcw } from 'lucide-react';
import './ESignaturePad.css';

interface ESignaturePadProps {
  onSignatureChange: (signatureData: string | null) => void;
  signerName?: string;
  initialSignature?: string | null;
  disabled?: boolean;
  width?: number;
  height?: number;
  label?: string;
  required?: boolean;
}

export function ESignaturePad({
  onSignatureChange,
  signerName,
  initialSignature,
  disabled = false,
  width = 400,
  height = 150,
  label = 'Signature',
  required = false,
}: ESignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [typedName, setTypedName] = useState(signerName || '');

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Load initial signature if provided
    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setHasSignature(true);
      };
      img.src = initialSignature;
    }
  }, [width, height, initialSignature]);

  const getCoordinates = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ('touches' in e) {
        const touch = e.touches[0];
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      }

      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      const { x, y } = getCoordinates(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    },
    [disabled, getCoordinates]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || disabled) return;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      const { x, y } = getCoordinates(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasSignature(true);
    },
    [isDrawing, disabled, getCoordinates]
  );

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;

    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (canvas && hasSignature) {
      const signatureData = canvas.toDataURL('image/png');
      onSignatureChange(signatureData);
    }
  }, [isDrawing, hasSignature, onSignatureChange]);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    setHasSignature(false);
    onSignatureChange(null);
  }, [width, height, onSignatureChange]);

  const handleTypedNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTypedName(e.target.value);
  };

  // Prevent touch scrolling while signing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventScroll = (e: TouchEvent) => {
      if (isDrawing) {
        e.preventDefault();
      }
    };

    canvas.addEventListener('touchmove', preventScroll, { passive: false });
    return () => {
      canvas.removeEventListener('touchmove', preventScroll);
    };
  }, [isDrawing]);

  return (
    <div className={`esignature-pad ${disabled ? 'disabled' : ''}`}>
      <label className="esignature-label">
        {label}
        {required && <span className="required">*</span>}
      </label>

      <div className="esignature-canvas-container">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="esignature-canvas"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {!hasSignature && !disabled && (
          <div className="esignature-placeholder">
            Sign here
          </div>
        )}

        <div className="esignature-actions">
          <button
            type="button"
            className="esignature-btn clear"
            onClick={clearSignature}
            disabled={disabled || !hasSignature}
            title="Clear signature"
          >
            <Eraser size={16} />
            Clear
          </button>
        </div>
      </div>

      {hasSignature && (
        <div className="esignature-confirmation">
          <Check size={14} className="check-icon" />
          Signature captured
        </div>
      )}

      <div className="esignature-typed">
        <label htmlFor="typed-name">Type your full legal name:</label>
        <input
          id="typed-name"
          type="text"
          value={typedName}
          onChange={handleTypedNameChange}
          placeholder="Full Legal Name"
          disabled={disabled}
        />
      </div>

      <p className="esignature-legal">
        By signing above, I acknowledge that this electronic signature is legally binding
        and equivalent to my handwritten signature.
      </p>
    </div>
  );
}
