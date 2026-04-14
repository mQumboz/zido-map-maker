import React, { useRef, useState, useEffect } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { MapObject, PaletteObject, EditorTool } from '../types';

interface MapEditorProps {
  mapWidth: number;
  mapHeight: number;
  mapObjects: MapObject[];
  setMapObjects: React.Dispatch<React.SetStateAction<MapObject[]>>;
  activePaletteObject: PaletteObject | null;
  selectedObjectId: string | null;
  setSelectedObjectId: React.Dispatch<React.SetStateAction<string | null>>;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  activeTool: EditorTool;
  setActiveTool: React.Dispatch<React.SetStateAction<EditorTool>>;
}

const MapEditor: React.FC<MapEditorProps> = ({
  mapWidth,
  mapHeight,
  mapObjects,
  setMapObjects,
  activePaletteObject,
  selectedObjectId,
  setSelectedObjectId,
  zoom,
  setZoom,
  activeTool,
  setActiveTool
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Object Dragging states
  const [isDraggingObj, setIsDraggingObj] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });

  // Pan states
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // Handle map interaction
  const handleMapMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    // Prevent placing/interacting if background isn't precisely clicked (handled inside checks)

    if (activeTool === 'pan') {
      setIsPanning(true);
      setPanStart({
        x: e.clientX,
        y: e.clientY,
        scrollLeft: containerRef.current!.scrollLeft,
        scrollTop: containerRef.current!.scrollTop
      });
      return;
    }

    if (activeTool === 'place') {
      if (e.target === mapRef.current || (e.target as HTMLElement).classList.contains('map-container')) {
        if (activePaletteObject) {
          const rect = mapRef.current!.getBoundingClientRect();
          const x = (e.clientX - rect.left) / zoom;
          const y = (e.clientY - rect.top) / zoom;

          const newZIndex = mapObjects.length > 0 ? Math.max(...mapObjects.map(o => o.zIndex)) + 1 : 1;

          const newObj: MapObject = {
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
            paletteObjectId: activePaletteObject.id,
            name: activePaletteObject.name,
            type: activePaletteObject.type,
            imageSrc: activePaletteObject.imageSrc,
            assignedNumber: activePaletteObject.assignedNumber,
            numberOffsetX: activePaletteObject.numberOffsetX,
            numberOffsetY: activePaletteObject.numberOffsetY,
            width: activePaletteObject.width,
            height: activePaletteObject.height,
            x: Math.round(x - activePaletteObject.width / 2),
            y: Math.round(y - activePaletteObject.height / 2),
            zIndex: newZIndex
          };

          setMapObjects([...mapObjects, newObj]);
          setSelectedObjectId(newObj.id);
          // Optional: switch back to select automatically
          // setActiveTool('select');
        } else {
          setSelectedObjectId(null);
        }
      }
      return;
    }

    if (activeTool === 'select') {
      if (e.target === mapRef.current || (e.target as HTMLElement).classList.contains('map-container')) {
        setSelectedObjectId(null);
      }
    }
  };

  // Object dragging handlers
  const handleObjectMouseDown = (e: ReactMouseEvent<HTMLDivElement>, id: string) => {
    if (activeTool === 'pan') {
      // Delegate to Pan behavior
      handleMapMouseDown(e);
      return;
    }

    if (activeTool === 'place') {
      // Ignore clicking on objects entirely if in place tool, or overwrite? Let's ignore.
      handleMapMouseDown(e);
      return;
    }

    if (activeTool === 'select') {
      e.stopPropagation();
      setSelectedObjectId(id);
      setIsDraggingObj(true);

      const targetObj = mapObjects.find(o => o.id === id);
      if (!targetObj) return;

      const rect = mapRef.current!.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / zoom;
      const mouseY = (e.clientY - rect.top) / zoom;

      setDragStartPos({
        x: mouseX - targetObj.x,
        y: mouseY - targetObj.y
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Handle Panning
      if (isPanning && containerRef.current) {
        containerRef.current.scrollLeft = panStart.scrollLeft - (e.clientX - panStart.x);
        containerRef.current.scrollTop = panStart.scrollTop - (e.clientY - panStart.y);
      }

      // Handle Object Dragging
      if (activeTool === 'select' && isDraggingObj && selectedObjectId && mapRef.current) {
        const rect = mapRef.current.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) / zoom;
        const mouseY = (e.clientY - rect.top) / zoom;

        setMapObjects(prev => prev.map(obj => {
          if (obj.id === selectedObjectId) {
            return {
              ...obj,
              x: Math.round(mouseX - dragStartPos.x),
              y: Math.round(mouseY - dragStartPos.y)
            };
          }
          return obj;
        }));
      }
    };

    const handleMouseUp = () => {
      if (isDraggingObj) setIsDraggingObj(false);
      if (isPanning) setIsPanning(false);
    };

    if (isDraggingObj || isPanning) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingObj, isPanning, activeTool, selectedObjectId, dragStartPos, panStart, zoom, setMapObjects]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'SELECT') return;

      let handled = false;

      // Tool shortcuts
      if (e.key === 'v' || e.key === 'V') { setActiveTool('select'); handled = true; }
      if (e.key === 'p' || e.key === 'P') { setActiveTool('place'); handled = true; }
      if (e.key === 'h' || e.key === 'H') { setActiveTool('pan'); handled = true; }

      // Existing Object Manipulation Shortcuts
      if (selectedObjectId && activeTool === 'select') {
        const targetObj = mapObjects.find(o => o.id === selectedObjectId);
        if (targetObj) {
          const step = e.shiftKey ? 10 : 1;

          switch (e.key) {
            case 'ArrowUp':
              setMapObjects(prev => prev.map(o => o.id === selectedObjectId ? { ...o, y: o.y - step } : o));
              handled = true;
              break;
            case 'ArrowDown':
              setMapObjects(prev => prev.map(o => o.id === selectedObjectId ? { ...o, y: o.y + step } : o));
              handled = true;
              break;
            case 'ArrowLeft':
              setMapObjects(prev => prev.map(o => o.id === selectedObjectId ? { ...o, x: o.x - step } : o));
              handled = true;
              break;
            case 'ArrowRight':
              setMapObjects(prev => prev.map(o => o.id === selectedObjectId ? { ...o, x: o.x + step } : o));
              handled = true;
              break;
            case 'Backspace':
            case 'Delete':
              setMapObjects(prev => prev.filter(o => o.id !== selectedObjectId));
              setSelectedObjectId(null);
              handled = true;
              break;
            case '[':
              setMapObjects(prev => {
                if (e.shiftKey) {
                  const minZ = Math.min(...prev.map(o => o.zIndex), 0);
                  return prev.map(o => o.id === selectedObjectId ? { ...o, zIndex: minZ - 1 } : o);
                }
                return prev.map(o => o.id === selectedObjectId ? { ...o, zIndex: o.zIndex - 1 } : o);
              });
              handled = true;
              break;
            case ']':
              setMapObjects(prev => {
                if (e.shiftKey) {
                  const maxZ = Math.max(...prev.map(o => o.zIndex), 0);
                  return prev.map(o => o.id === selectedObjectId ? { ...o, zIndex: maxZ + 1 } : o);
                }
                return prev.map(o => o.id === selectedObjectId ? { ...o, zIndex: o.zIndex + 1 } : o);
              });
              handled = true;
              break;
          }
        }
      }

      if (handled) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObjectId, mapObjects, activeTool, setMapObjects, setSelectedObjectId, setActiveTool]);


  // Sort objects by z-index for rendering
  const sortedObjects = [...mapObjects].sort((a, b) => a.zIndex - b.zIndex);
  const selectedObjDetails = mapObjects.find(o => o.id === selectedObjectId);

  // Compute cursor style based on tool mapping
  const getCursorStyle = () => {
    if (activeTool === 'pan') return isPanning ? 'grabbing' : 'grab';
    if (activeTool === 'place' && activePaletteObject) return 'crosshair';
    return 'default';
  };

  return (
    <div className="workspace">
      {/* Background Pan Container */}
      <div
        className="pan-container"
        ref={containerRef}
      >
        <div
          className="map-container"
          ref={mapRef}
          onMouseDown={handleMapMouseDown}
          style={{
            width: mapWidth,
            height: mapHeight,
            transform: `scale(${zoom})`,
            cursor: getCursorStyle()
          }}
        >
          {sortedObjects.map(obj => (
            <div
              key={obj.id}
              className={`map-object ${selectedObjectId === obj.id ? 'selected' : ''}`}
              onMouseDown={(e) => handleObjectMouseDown(e, obj.id)}
              style={{
                left: obj.x,
                top: obj.y,
                width: obj.width,
                height: obj.height,
                zIndex: obj.zIndex,
                pointerEvents: activeTool === 'place' ? 'none' : 'auto' // if placing, click passes straight through to map
              }}
            >
              <img src={obj.imageSrc} alt={obj.name} style={{ width: '100%', height: '100%', display: 'block' }} />
              {obj.type === 'tile' && obj.assignedNumber !== undefined && (
                 <img src={`/tilesmap/${obj.assignedNumber}.png`} alt={`Number`} style={{ position: 'absolute', top: obj.numberOffsetY || 0, left: obj.numberOffsetX || 0, width: 'auto', height: 'auto', zIndex: 1, pointerEvents: 'none', maxWidth: 'none', maxHeight: 'none' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Floating Toolbar layer */}
      <div className="toolbar glass-panel">
        <button
          className="toolbar-btn"
          onClick={() => setActiveTool('select')}
          style={{ background: activeTool === 'select' ? 'var(--accent-color)' : '' }}
          title="Select & Move (V)"
        >
          👆
        </button>
        <button
          className="toolbar-btn"
          onClick={() => setActiveTool('place')}
          style={{ background: activeTool === 'place' ? 'var(--accent-color)' : '' }}
          title="Place (P)"
        >
          ➕
        </button>
        <button
          className="toolbar-btn"
          onClick={() => setActiveTool('pan')}
          style={{ background: activeTool === 'pan' ? 'var(--accent-color)' : '' }}
          title="Pan (H)"
        >
          ✋
        </button>

        <div style={{ width: '1px', height: '24px', background: 'var(--panel-border)', margin: '0 8px' }}></div>

        <button
          className="toolbar-btn"
          onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}
          title="Zoom Out"
        >
          -
        </button>
        <div style={{ display: 'flex', alignItems: 'center', width: '60px', justifyContent: 'center', fontWeight: 'bold' }}>
          {Math.round(zoom * 100)}%
        </div>
        <button
          className="toolbar-btn"
          onClick={() => setZoom(z => Math.min(3, z + 0.1))}
          title="Zoom In"
        >
          +
        </button>
      </div>

      {selectedObjDetails && activeTool === 'select' && (
        <div className="object-inspector glass-panel">
          <h3 style={{ marginBottom: '12px' }}>{selectedObjDetails.name}</h3>

          <div className="shortcut-hint">
            <span>Move</span>
            <span><span className="kbd">Arrows</span></span>
          </div>
          <div className="shortcut-hint">
            <span>Z-Index ({selectedObjDetails.zIndex})</span>
            <span><span className="kbd">[</span> <span className="kbd">]</span></span>
          </div>
          <div className="shortcut-hint">
            <span>To Front/Back</span>
            <span><span className="kbd">⇧</span> + <span className="kbd">[</span> <span className="kbd">]</span></span>
          </div>
          <div className="shortcut-hint" style={{ marginTop: '8px' }}>
            <span>Delete</span>
            <span><span className="kbd">Backspace</span></span>
          </div>

          <hr style={{ borderColor: 'var(--panel-border)', margin: '12px 0' }} />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            X: {selectedObjDetails.x}px <br />
            Y: {selectedObjDetails.y}px
          </div>
        </div>
      )}

      {activePaletteObject && activeTool === 'place' && (
        <div className="object-inspector glass-panel" style={{ opacity: 0.8, pointerEvents: 'none' }}>
          <div style={{ fontSize: '0.875rem', color: '#fbbf24', textAlign: 'center', fontWeight: 600 }}>
            Placing: {activePaletteObject.name}
          </div>
          <div style={{ fontSize: '0.75rem', textAlign: 'center', marginTop: '4px' }}>
            Click anywhere on the map to place
          </div>
        </div>
      )}
    </div>
  );
};

export default MapEditor;
