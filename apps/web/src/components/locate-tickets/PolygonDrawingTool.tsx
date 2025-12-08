import { useState, useRef, useEffect } from 'react';
import {
  Pencil,
  Trash2,
  Check,
  X,
  RotateCcw,
  Move,
  Square,
  Circle,
  Pentagon,
  Ruler,
  MapPin,
  Download,
  ZoomIn,
  ZoomOut,
  Crosshair,
} from 'lucide-react';
import './PolygonDrawingTool.css';

interface Point {
  x: number;
  y: number;
  lat?: number;
  lng?: number;
}

interface Polygon {
  id: string;
  points: Point[];
  closed: boolean;
  color: string;
  label?: string;
}

interface PolygonDrawingToolProps {
  initialPolygons?: Polygon[];
  mapCenter?: { lat: number; lng: number };
  mapZoom?: number;
  onPolygonComplete?: (polygon: Polygon) => void;
  onPolygonsChange?: (polygons: Polygon[]) => void;
  backgroundImage?: string;
  ticketLocation?: { lat: number; lng: number };
  readonly?: boolean;
}

type DrawMode = 'select' | 'polygon' | 'rectangle' | 'circle' | 'freehand';

export function PolygonDrawingTool({
  initialPolygons = [],
  mapCenter: _mapCenter,
  mapZoom: _mapZoom = 15,
  onPolygonComplete,
  onPolygonsChange,
  backgroundImage: _backgroundImage,
  ticketLocation,
  readonly = false,
}: PolygonDrawingToolProps) {
  // Note: _mapCenter, _mapZoom, _backgroundImage are intentionally unused for now
  // Future implementation: Integrate with actual map tiles
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [polygons, setPolygons] = useState<Polygon[]>(initialPolygons);
  const [currentPolygon, setCurrentPolygon] = useState<Point[]>([]);
  const [selectedPolygonId, setSelectedPolygonId] = useState<string | null>(null);
  const [drawMode, setDrawMode] = useState<DrawMode>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 500 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [gridVisible, setGridVisible] = useState(true);

  // Colors for polygons
  const polygonColors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#06b6d4', // cyan
  ];

  // Initialize canvas size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Draw everything on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Draw grid
    if (gridVisible) {
      drawGrid(ctx);
    }

    // Draw ticket location marker
    if (ticketLocation) {
      drawTicketMarker(ctx);
    }

    // Draw completed polygons
    polygons.forEach((polygon) => {
      drawPolygon(ctx, polygon, polygon.id === selectedPolygonId);
    });

    // Draw current polygon being drawn
    if (currentPolygon.length > 0) {
      drawCurrentPolygon(ctx);
    }
  }, [polygons, currentPolygon, selectedPolygonId, canvasSize, offset, scale, gridVisible, ticketLocation]);

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    const gridSize = 50 * scale;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = (offset.x % gridSize); x < canvasSize.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasSize.height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = (offset.y % gridSize); y < canvasSize.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasSize.width, y);
      ctx.stroke();
    }
  };

  const drawTicketMarker = (ctx: CanvasRenderingContext2D) => {
    const centerX = canvasSize.width / 2 + offset.x;
    const centerY = canvasSize.height / 2 + offset.y;

    // Pulsing circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20 * scale, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(37, 99, 235, 0.2)';
    ctx.fill();

    // Inner dot
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8 * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#2563eb';
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.fillText('Ticket Location', centerX, centerY + 30 * scale);
  };

  const drawPolygon = (ctx: CanvasRenderingContext2D, polygon: Polygon, isSelected: boolean) => {
    if (polygon.points.length < 2) return;

    const transformedPoints = polygon.points.map((p) => ({
      x: p.x * scale + offset.x,
      y: p.y * scale + offset.y,
    }));

    const firstPt = transformedPoints[0];
    if (!firstPt) return;

    ctx.beginPath();
    ctx.moveTo(firstPt.x, firstPt.y);

    for (let i = 1; i < transformedPoints.length; i++) {
      const pt = transformedPoints[i];
      if (pt) ctx.lineTo(pt.x, pt.y);
    }

    if (polygon.closed) {
      ctx.closePath();
      ctx.fillStyle = polygon.color + '30';
      ctx.fill();
    }

    ctx.strokeStyle = isSelected ? '#1e40af' : polygon.color;
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.stroke();

    // Draw vertices
    transformedPoints.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, isSelected ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#1e40af' : polygon.color;
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw vertex numbers if selected
      if (isSelected) {
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#1e293b';
        ctx.textAlign = 'center';
        ctx.fillText(String(index + 1), point.x, point.y - 12);
      }
    });

    // Draw measurements
    if (showMeasurements && polygon.closed) {
      const area = calculatePolygonArea(polygon.points);
      const centroid = calculateCentroid(transformedPoints);

      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      ctx.fillText(`${area.toFixed(0)} sq ft`, centroid.x, centroid.y);
    }

    // Draw label
    if (polygon.label && transformedPoints.length > 0) {
      const centroid = calculateCentroid(transformedPoints);
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = polygon.color;
      ctx.textAlign = 'center';
      ctx.fillText(polygon.label, centroid.x, centroid.y - 20);
    }
  };

  const drawCurrentPolygon = (ctx: CanvasRenderingContext2D) => {
    const transformedPoints = currentPolygon.map((p) => ({
      x: p.x * scale + offset.x,
      y: p.y * scale + offset.y,
    }));

    if (transformedPoints.length === 0) return;

    const startPt = transformedPoints[0];
    if (!startPt) return;

    ctx.beginPath();
    ctx.moveTo(startPt.x, startPt.y);

    for (let i = 1; i < transformedPoints.length; i++) {
      const pt = transformedPoints[i];
      if (pt) ctx.lineTo(pt.x, pt.y);
    }

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw vertices
    transformedPoints.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = index === 0 ? '#10b981' : '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Show "click first point to close" hint
    if (transformedPoints.length >= 3) {
      const firstPoint = transformedPoints[0];
      if (firstPoint) {
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#10b981';
        ctx.textAlign = 'center';
        ctx.fillText('Click to close', firstPoint.x, firstPoint.y - 15);
      }
    }
  };

  const calculatePolygonArea = (points: Point[]): number => {
    if (points.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const pi = points[i];
      const pj = points[j];
      if (pi && pj) {
        area += pi.x * pj.y;
        area -= pj.x * pi.y;
      }
    }

    // Convert to square feet (assuming 1 pixel = 0.5 feet at current scale)
    const pixelToFeet = 0.5 / scale;
    return Math.abs(area / 2) * pixelToFeet * pixelToFeet;
  };

  const calculateCentroid = (points: Point[]): Point => {
    const sum = points.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
      { x: 0, y: 0 }
    );
    return { x: sum.x / points.length, y: sum.y / points.length };
  };

  const getCanvasPoint = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - offset.x) / scale,
      y: (e.clientY - rect.top - offset.y) / scale,
    };
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (readonly || drawMode === 'select') {
      // Check if clicking on a polygon
      const point = getCanvasPoint(e);
      const clickedPolygon = polygons.find((p) => isPointInPolygon(point, p.points));
      setSelectedPolygonId(clickedPolygon?.id || null);
      return;
    }

    const point = getCanvasPoint(e);

    if (drawMode === 'polygon') {
      // Check if clicking near first point to close polygon
      if (currentPolygon.length >= 3) {
        const firstPoint = currentPolygon[0];
        if (!firstPoint) return;
        const distance = Math.sqrt(
          Math.pow(point.x - firstPoint.x, 2) + Math.pow(point.y - firstPoint.y, 2)
        );
        if (distance < 15 / scale) {
          completePolygon();
          return;
        }
      }

      setCurrentPolygon([...currentPolygon, point]);
    } else if (drawMode === 'rectangle') {
      if (!isDrawing) {
        setCurrentPolygon([point]);
        setIsDrawing(true);
      } else {
        const startPoint = currentPolygon[0];
        if (!startPoint) return;
        const rectPoints: Point[] = [
          startPoint,
          { x: point.x, y: startPoint.y },
          point,
          { x: startPoint.x, y: point.y },
        ];
        setCurrentPolygon([]);
        setIsDrawing(false);
        createPolygon(rectPoints);
      }
    } else if (drawMode === 'circle') {
      if (!isDrawing) {
        setCurrentPolygon([point]);
        setIsDrawing(true);
      } else {
        const center = currentPolygon[0];
        if (!center) return;
        const radius = Math.sqrt(
          Math.pow(point.x - center.x, 2) + Math.pow(point.y - center.y, 2)
        );
        const circlePoints = generateCirclePoints(center, radius, 24);
        setCurrentPolygon([]);
        setIsDrawing(false);
        createPolygon(circlePoints);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && dragStart) {
      const newOffset = {
        x: offset.x + (e.clientX - dragStart.x),
        y: offset.y + (e.clientY - dragStart.y),
      };
      setOffset(newOffset);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const generateCirclePoints = (center: Point, radius: number, segments: number): Point[] => {
    const points: Point[] = [];
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * 2 * Math.PI;
      points.push({
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
      });
    }
    return points;
  };

  const isPointInPolygon = (point: Point, polygonPoints: Point[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
      const pi = polygonPoints[i];
      const pj = polygonPoints[j];
      if (!pi || !pj) continue;
      const xi = pi.x, yi = pi.y;
      const xj = pj.x, yj = pj.y;

      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  };

  const createPolygon = (points: Point[]) => {
    const newPolygon: Polygon = {
      id: `polygon-${Date.now()}`,
      points,
      closed: true,
      color: polygonColors[polygons.length % polygonColors.length] || '#3b82f6',
    };

    const updatedPolygons = [...polygons, newPolygon];
    setPolygons(updatedPolygons);
    onPolygonComplete?.(newPolygon);
    onPolygonsChange?.(updatedPolygons);
  };

  const completePolygon = () => {
    if (currentPolygon.length < 3) return;

    createPolygon(currentPolygon);
    setCurrentPolygon([]);
    setDrawMode('select');
  };

  const deleteSelectedPolygon = () => {
    if (!selectedPolygonId) return;

    const updatedPolygons = polygons.filter((p) => p.id !== selectedPolygonId);
    setPolygons(updatedPolygons);
    setSelectedPolygonId(null);
    onPolygonsChange?.(updatedPolygons);
  };

  const clearAll = () => {
    setPolygons([]);
    setCurrentPolygon([]);
    setSelectedPolygonId(null);
    onPolygonsChange?.([]);
  };

  const cancelCurrentDrawing = () => {
    setCurrentPolygon([]);
    setIsDrawing(false);
  };

  const undoLastPoint = () => {
    if (currentPolygon.length > 0) {
      setCurrentPolygon(currentPolygon.slice(0, -1));
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const newScale = direction === 'in'
      ? Math.min(scale * 1.2, 3)
      : Math.max(scale / 1.2, 0.3);
    setScale(newScale);
  };

  const centerOnTicket = () => {
    setOffset({ x: 0, y: 0 });
    setScale(1);
  };

  const exportPolygons = () => {
    const data = JSON.stringify(polygons, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dig-area-polygons-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTotalArea = (): number => {
    return polygons.reduce((sum, p) => sum + calculatePolygonArea(p.points), 0);
  };

  return (
    <div className="polygon-drawing-tool">
      {/* Toolbar */}
      {!readonly && (
        <div className="drawing-toolbar">
          <div className="tool-group">
            <button
              className={`tool-btn ${drawMode === 'select' ? 'active' : ''}`}
              onClick={() => setDrawMode('select')}
              title="Select (V)"
            >
              <Move size={18} />
            </button>
            <button
              className={`tool-btn ${drawMode === 'polygon' ? 'active' : ''}`}
              onClick={() => setDrawMode('polygon')}
              title="Polygon (P)"
            >
              <Pentagon size={18} />
            </button>
            <button
              className={`tool-btn ${drawMode === 'rectangle' ? 'active' : ''}`}
              onClick={() => setDrawMode('rectangle')}
              title="Rectangle (R)"
            >
              <Square size={18} />
            </button>
            <button
              className={`tool-btn ${drawMode === 'circle' ? 'active' : ''}`}
              onClick={() => setDrawMode('circle')}
              title="Circle (C)"
            >
              <Circle size={18} />
            </button>
          </div>

          <div className="tool-divider" />

          <div className="tool-group">
            {currentPolygon.length > 0 && (
              <>
                <button className="tool-btn" onClick={undoLastPoint} title="Undo last point">
                  <RotateCcw size={18} />
                </button>
                <button className="tool-btn complete" onClick={completePolygon} title="Complete polygon">
                  <Check size={18} />
                </button>
                <button className="tool-btn cancel" onClick={cancelCurrentDrawing} title="Cancel">
                  <X size={18} />
                </button>
              </>
            )}
            {selectedPolygonId && (
              <button className="tool-btn delete" onClick={deleteSelectedPolygon} title="Delete selected">
                <Trash2 size={18} />
              </button>
            )}
          </div>

          <div className="tool-divider" />

          <div className="tool-group">
            <button
              className={`tool-btn ${showMeasurements ? 'active' : ''}`}
              onClick={() => setShowMeasurements(!showMeasurements)}
              title="Toggle measurements"
            >
              <Ruler size={18} />
            </button>
            <button
              className={`tool-btn ${gridVisible ? 'active' : ''}`}
              onClick={() => setGridVisible(!gridVisible)}
              title="Toggle grid"
            >
              <Crosshair size={18} />
            </button>
          </div>

          <div className="tool-divider" />

          <div className="tool-group">
            <button className="tool-btn" onClick={() => handleZoom('in')} title="Zoom in">
              <ZoomIn size={18} />
            </button>
            <button className="tool-btn" onClick={() => handleZoom('out')} title="Zoom out">
              <ZoomOut size={18} />
            </button>
            <button className="tool-btn" onClick={centerOnTicket} title="Center on ticket">
              <MapPin size={18} />
            </button>
          </div>

          <div className="tool-spacer" />

          <div className="tool-group">
            <button className="tool-btn" onClick={exportPolygons} title="Export polygons">
              <Download size={18} />
            </button>
            <button className="tool-btn danger" onClick={clearAll} title="Clear all">
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Canvas Container */}
      <div
        className="canvas-container"
        ref={containerRef}
        style={{ cursor: isDragging ? 'grabbing' : (drawMode === 'select' ? 'default' : 'crosshair') }}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* Drawing Instructions */}
        {drawMode !== 'select' && currentPolygon.length === 0 && !readonly && (
          <div className="drawing-instructions">
            {drawMode === 'polygon' && 'Click to add points. Click first point to close.'}
            {drawMode === 'rectangle' && 'Click to set first corner, then click for opposite corner.'}
            {drawMode === 'circle' && 'Click for center, then click to set radius.'}
          </div>
        )}

        {/* Point Counter */}
        {currentPolygon.length > 0 && (
          <div className="point-counter">
            {currentPolygon.length} points
            {currentPolygon.length >= 3 && ' (can close)'}
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="drawing-info-panel">
        <div className="info-stats">
          <div className="stat">
            <span className="stat-label">Zones</span>
            <span className="stat-value">{polygons.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Total Area</span>
            <span className="stat-value">{getTotalArea().toFixed(0)} sq ft</span>
          </div>
          <div className="stat">
            <span className="stat-label">Scale</span>
            <span className="stat-value">{(scale * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* Polygon List */}
        {polygons.length > 0 && (
          <div className="polygon-list">
            <h4>Dig Zones</h4>
            {polygons.map((polygon, index) => (
              <div
                key={polygon.id}
                className={`polygon-item ${polygon.id === selectedPolygonId ? 'selected' : ''}`}
                onClick={() => setSelectedPolygonId(polygon.id)}
              >
                <span
                  className="polygon-color"
                  style={{ backgroundColor: polygon.color }}
                />
                <span className="polygon-name">
                  {polygon.label || `Zone ${index + 1}`}
                </span>
                <span className="polygon-area">
                  {calculatePolygonArea(polygon.points).toFixed(0)} sq ft
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Help Text */}
        <div className="help-text">
          <p><strong>Tips:</strong></p>
          <ul>
            <li>Shift+Click to pan the view</li>
            <li>Use scroll to zoom in/out</li>
            <li>Click a zone to select it</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Compact button to open the drawing tool in a modal
interface DrawDigAreaButtonProps {
  onSave?: (polygons: Polygon[]) => void;
  existingPolygons?: Polygon[];
  ticketNumber?: string;
}

export function DrawDigAreaButton({ onSave, existingPolygons, ticketNumber }: DrawDigAreaButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [polygons, setPolygons] = useState<Polygon[]>(existingPolygons || []);

  const handleSave = () => {
    onSave?.(polygons);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button className="draw-dig-area-btn" onClick={() => setIsOpen(true)}>
        <Pencil size={16} />
        {existingPolygons && existingPolygons.length > 0
          ? `Edit Dig Area (${existingPolygons.length} zones)`
          : 'Draw Dig Area'}
      </button>
    );
  }

  return (
    <div className="polygon-modal-overlay">
      <div className="polygon-modal">
        <div className="polygon-modal-header">
          <h2>
            <Pentagon size={20} />
            Define Dig Area {ticketNumber && `- Ticket #${ticketNumber}`}
          </h2>
          <button className="modal-close" onClick={() => setIsOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="polygon-modal-content">
          <PolygonDrawingTool
            initialPolygons={existingPolygons}
            onPolygonsChange={setPolygons}
          />
        </div>

        <div className="polygon-modal-footer">
          <button className="btn-secondary" onClick={() => setIsOpen(false)}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave}>
            <Check size={16} />
            Save Dig Area
          </button>
        </div>
      </div>
    </div>
  );
}
