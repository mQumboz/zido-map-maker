import { useState, useCallback } from 'react';
import './index.css';
import type { PaletteObject, MapObject, EditorTool } from './types';
import PaletteSidebar from './components/PaletteSidebar';
import MapEditor from './components/MapEditor';
import TopMenu from './components/TopMenu';
import BulkReplaceModal, { type BulkReplacement } from './components/BulkReplaceModal';

import { exportMapAsImage } from './utils/exportImage';
import { scaleSvgString } from './utils/scaleSvg';
import { downloadPaletteAsZip } from './utils/exportPaletteZip';

function App() {
  const [palette, setPalette] = useState<PaletteObject[]>([]);
  const [activePaletteIndex, setActivePaletteIndex] = useState<number | null>(null);
  
  const [mapWidth, setMapWidth] = useState(800);
  const [mapHeight, setMapHeight] = useState(600);
  const [mapObjects, setMapObjects] = useState<MapObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [bulkReplaceOpen, setBulkReplaceOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Change tool to place if an active palette object is selected
  const handlePaletteSelect = (index: number | null) => {
    setActivePaletteIndex(index);
    if (index !== null) {
      setActiveTool('place');
    }
  };

  // In-editor scale function: scales map dimensions, placed objects, palette items, numbers, and SVG outlines
  const handleScaleMap = useCallback((factor: number) => {
    if (factor <= 0) return;
    setMapWidth(prev => Math.round(prev * factor));
    setMapHeight(prev => Math.round(prev * factor));
    setMapObjects(prev => prev.map(obj => {
      const newWidth = Math.round(obj.width * factor);
      let newVariant = obj.numberVariant;
      if (obj.type === 'tile' && obj.assignedNumber !== undefined) {
        if (factor > 1 && newWidth > 200) {
          newVariant = '@2x';
        } else if (factor < 1 && newWidth <= 200) {
          newVariant = '1x';
        }
      }
      return {
        ...obj,
        x: Math.round(obj.x * factor),
        y: Math.round(obj.y * factor),
        width: newWidth,
        height: Math.round(obj.height * factor),
        numberOffsetX: obj.numberOffsetX !== undefined ? Math.round(obj.numberOffsetX * factor) : undefined,
        numberOffsetY: obj.numberOffsetY !== undefined ? Math.round(obj.numberOffsetY * factor) : undefined,
        numberVariant: newVariant,
        svgOutline: obj.svgOutline ? scaleSvgString(obj.svgOutline, factor) : obj.svgOutline,
      };
    }));
    setPalette(prev => prev.map(p => {
      const newWidth = Math.round(p.width * factor);
      let newVariant = p.numberVariant;
      if (p.type === 'tile' && p.assignedNumber !== undefined) {
        if (factor > 1 && newWidth > 200) {
          newVariant = '@2x';
        } else if (factor < 1 && newWidth <= 200) {
          newVariant = '1x';
        }
      }
      return {
        ...p,
        width: newWidth,
        height: Math.round(p.height * factor),
        numberOffsetX: p.numberOffsetX !== undefined ? Math.round(p.numberOffsetX * factor) : undefined,
        numberOffsetY: p.numberOffsetY !== undefined ? Math.round(p.numberOffsetY * factor) : undefined,
        numberVariant: newVariant,
        svgOutline: p.svgOutline ? scaleSvgString(p.svgOutline, factor) : p.svgOutline,
      };
    }));
  }, []);

  // Expose JSON export function with scaling support (1x, 2x, etc.)
  const handleExportJSON = useCallback((scale: number = 1) => {
    const validScale = typeof scale === 'number' && scale > 0 ? scale : 1;
    const usedPaletteIds = new Set(mapObjects.map(obj => obj.paletteObjectId));
    const exportedPalette = palette
      .filter(p => usedPaletteIds.has(p.id))
      .map(p => {
        const entry: Record<string, unknown> = {
          id: p.id,
          name: p.name,
          type: p.type,
          width: Math.round(p.width * validScale),
          height: Math.round(p.height * validScale),
          imageSrc: p.imageSrc,
        };
        // Tile-only fields — only include when present on tile palette items
        if (p.type === 'tile') {
          if (p.assignedNumber != null) {
            entry.assignedNumber = p.assignedNumber;
            const targetW = Math.round(p.width * validScale);
            entry.numberVariant = (validScale > 1 && targetW > 200) ? '@2x' : (p.numberVariant ?? '1x');
          }
          if (p.numberOffsetX != null) entry.numberOffsetX = Math.round(p.numberOffsetX * validScale);
          if (p.numberOffsetY != null) entry.numberOffsetY = Math.round(p.numberOffsetY * validScale);
          if (p.enableSvgOutline != null) entry.enableSvgOutline = p.enableSvgOutline;
          if (p.svgOutline != null) entry.svgOutline = validScale !== 1 ? scaleSvgString(p.svgOutline, validScale) : p.svgOutline;
        }
        return entry;
      });

    const data = {
      width: Math.round(mapWidth * validScale),
      height: Math.round(mapHeight * validScale),
      palette: exportedPalette,
      objects: mapObjects.map(obj => ({
        id: obj.id,
        paletteObjectId: obj.paletteObjectId,
        x: Math.round(obj.x * validScale),
        y: Math.round(obj.y * validScale),
        zIndex: obj.zIndex,
      }))
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = validScale === 1 ? 'map.json' : `map-${validScale}x.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [mapObjects, mapWidth, mapHeight, palette]);

  // Download all palette objects as PNG files in a ZIP
  const handleDownloadPaletteZip = useCallback(() => {
    downloadPaletteAsZip(palette);
  }, [palette]);

  // Export map rendered to PNG image at requested scale
  const handleExportImage = useCallback((scale: number = 1) => {
    const validScale = typeof scale === 'number' && scale > 0 ? scale : 1;
    exportMapAsImage(mapWidth, mapHeight, mapObjects, validScale);
  }, [mapWidth, mapHeight, mapObjects]);

  const handleImportMapFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const loaded = JSON.parse(ev.target?.result as string);
          if (loaded.width && loaded.height && loaded.objects) {
            setMapWidth(loaded.width);
            setMapHeight(loaded.height);
            
            let currentPalette = palette;
            if (loaded.palette && Array.isArray(loaded.palette)) {
              const loadedIds = new Set(loaded.palette.map((p: PaletteObject) => p.id));
              const remainingOld = palette.filter(p => !loadedIds.has(p.id));
              currentPalette = [...loaded.palette, ...remainingOld];
              setPalette(currentPalette);
            }
            
            const reconstructedObjects = loaded.objects.map((obj: { id: string; paletteObjectId: string; x: number; y: number; zIndex: number }) => {
              const pObj = currentPalette.find(p => p.id === obj.paletteObjectId);
              if (pObj) {
                const variant = (obj as unknown as { numberVariant?: '1x' | '@2x' }).numberVariant ?? pObj.numberVariant ?? (pObj.width > 200 ? '@2x' : '1x');
                return {
                  ...obj,
                  name: pObj.name,
                  type: pObj.type,
                  imageSrc: pObj.imageSrc,
                  width: pObj.width,
                  height: pObj.height,
                  assignedNumber: pObj.assignedNumber,
                  numberVariant: variant,
                  numberOffsetX: pObj.numberOffsetX !== undefined ? Number(pObj.numberOffsetX) : undefined,
                  numberOffsetY: pObj.numberOffsetY !== undefined ? Number(pObj.numberOffsetY) : undefined,
                  enableSvgOutline: pObj.enableSvgOutline,
                  svgOutline: pObj.svgOutline
                };
              }
              return obj;
            });
            
            setMapObjects(reconstructedObjects);
            setSelectedObjectId(null);
            setActiveTool('select');
            setActivePaletteIndex(null);
          }
        } catch (err) {
          console.error("Failed to load map JSON", err);
        }
      };
      reader.readAsText(file);
      e.target.value = ''; // Reset input
    }
  };

  const handleSavePalette = useCallback(() => {
    const blob = new Blob([JSON.stringify(palette, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'palette.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [palette]);

  const handleLoadPaletteFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const loaded = JSON.parse(ev.target?.result as string);
          if (Array.isArray(loaded)) {
            setPalette(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              const newItems = loaded.filter(p => p.id && !existingIds.has(p.id)); // basic validation
              return [...prev, ...newItems];
            });
          }
        } catch (err) {
          console.error("Failed to load palette JSON", err);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    }
  }, []);

  const handleNewMap = useCallback(() => {
    setMapObjects([]);
  }, []);

  const handleEmptyPalette = useCallback(() => {
    setPalette([]);
  }, []);

  const handleBulkReplacePalette = useCallback((
    replacements: BulkReplacement[],
    updateMapElements: boolean,
    updateDimensions: boolean
  ) => {
    const repMap = new Map(replacements.map(r => [r.paletteId, r]));

    // 1. Replace palette items' png content (and dimensions if opted in)
    setPalette(prevPalette => prevPalette.map(item => {
      const rep = repMap.get(item.id);
      if (!rep) return item;
      return {
        ...item,
        imageSrc: rep.imageSrc,
        ...(updateDimensions ? { width: rep.width, height: rep.height } : {})
      };
    }));

    // 2. Update map elements if user checked the checkbox
    let updatedMapCount = 0;
    if (updateMapElements) {
      setMapObjects(prevObjects => prevObjects.map(obj => {
        const rep = repMap.get(obj.paletteObjectId);
        if (!rep) return obj;
        updatedMapCount++;
        return {
          ...obj,
          imageSrc: rep.imageSrc,
          ...(updateDimensions ? { width: rep.width, height: rep.height } : {})
        };
      }));
    }

    setBulkReplaceOpen(false);

    // Show feedback toast
    const msg = updateMapElements
      ? `Replaced PNG for ${replacements.length} palette item${replacements.length === 1 ? '' : 's'}${updatedMapCount > 0 ? ` and updated ${updatedMapCount} map element${updatedMapCount === 1 ? '' : 's'}` : ''}.`
      : `Replaced PNG for ${replacements.length} palette item${replacements.length === 1 ? '' : 's'}.`;
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <TopMenu
        onNewMap={handleNewMap}
        onImportMap={handleImportMapFiles}
        onExportMap={handleExportJSON}
        onExportImage={handleExportImage}
        onImportPalette={handleLoadPaletteFile}
        onExportPalette={handleSavePalette}
        onDownloadPaletteZip={handleDownloadPaletteZip}
        onEmptyPalette={handleEmptyPalette}
        onOpenBulkReplace={() => setBulkReplaceOpen(true)}
      />
      <div className="app-container" style={{ flex: 1, minHeight: 0, height: 'auto' }}>
        <PaletteSidebar
          palette={palette}
          setPalette={setPalette}
          setMapObjects={setMapObjects}
          activePaletteIndex={activePaletteIndex}
          setActivePaletteIndex={handlePaletteSelect}
          mapWidth={mapWidth}
          setMapWidth={setMapWidth}
          mapHeight={mapHeight}
          setMapHeight={setMapHeight}
          onScaleMap={handleScaleMap}
          onDownloadPaletteZip={handleDownloadPaletteZip}
        />
      
      <MapEditor
        mapWidth={mapWidth}
        mapHeight={mapHeight}
        mapObjects={mapObjects}
        setMapObjects={setMapObjects}
        palette={palette}
        setPalette={setPalette}
        activePaletteObject={activePaletteIndex !== null ? palette[activePaletteIndex] : null}
        selectedObjectId={selectedObjectId}
        setSelectedObjectId={setSelectedObjectId}
        zoom={zoom}
        setZoom={setZoom}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
      />
      </div>

      {bulkReplaceOpen && (
        <BulkReplaceModal
          palette={palette}
          mapElementsCount={mapObjects.length}
          onApply={handleBulkReplacePalette}
          onCancel={() => setBulkReplaceOpen(false)}
        />
      )}

      {toastMessage && (
        <div
          className="glass-panel"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            padding: '12px 20px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.95)',
            color: '#fff',
            fontWeight: 500,
            fontSize: '0.88rem',
            zIndex: 3000,
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            pointerEvents: 'none'
          }}
        >
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;
