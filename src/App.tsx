import { useState, useCallback } from 'react';
import './index.css';
import type { PaletteObject, MapObject, EditorTool } from './types';
import PaletteSidebar from './components/PaletteSidebar';
import MapEditor from './components/MapEditor';
import TopMenu from './components/TopMenu';

function App() {
  const [palette, setPalette] = useState<PaletteObject[]>([]);
  const [activePaletteIndex, setActivePaletteIndex] = useState<number | null>(null);
  
  const [mapWidth, setMapWidth] = useState(800);
  const [mapHeight, setMapHeight] = useState(600);
  const [mapObjects, setMapObjects] = useState<MapObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [activeTool, setActiveTool] = useState<EditorTool>('select');

  // Change tool to place if an active palette object is selected
  const handlePaletteSelect = (index: number | null) => {
    setActivePaletteIndex(index);
    if (index !== null) {
      setActiveTool('place');
    }
  };

  // Expose JSON export function
  const handleExportJSON = useCallback(() => {
    const usedPaletteIds = new Set(mapObjects.map(obj => obj.paletteObjectId));
    const exportedPalette = palette
      .filter(p => usedPaletteIds.has(p.id))
      .map(p => {
        const entry: Record<string, unknown> = {
          id: p.id,
          name: p.name,
          type: p.type,
          width: p.width,
          height: p.height,
          imageSrc: p.imageSrc,
        };
        // Tile-only fields — only include when present on tile palette items
        if (p.type === 'tile') {
          if (p.assignedNumber != null) entry.assignedNumber = p.assignedNumber;
          if (p.numberOffsetX != null) entry.numberOffsetX = p.numberOffsetX;
          if (p.numberOffsetY != null) entry.numberOffsetY = p.numberOffsetY;
        }
        return entry;
      });

    const data = {
      width: mapWidth,
      height: mapHeight,
      palette: exportedPalette,
      objects: mapObjects.map(obj => ({
        id: obj.id,
        paletteObjectId: obj.paletteObjectId,
        x: obj.x,
        y: obj.y,
        zIndex: obj.zIndex,
      }))
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'map.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [mapObjects, mapWidth, mapHeight, palette]);

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
              const existingIds = new Set(palette.map(p => p.id));
              const newItems = loaded.palette.filter((p: PaletteObject) => p.id && !existingIds.has(p.id));
              currentPalette = [...palette, ...newItems];
              setPalette(currentPalette);
            }
            
            const reconstructedObjects = loaded.objects.map((obj: any) => {
              const pObj = currentPalette.find(p => p.id === obj.paletteObjectId);
              if (pObj) {
                return {
                  ...obj,
                  name: pObj.name,
                  type: pObj.type,
                  imageSrc: pObj.imageSrc,
                  width: pObj.width,
                  height: pObj.height,
                  assignedNumber: pObj.assignedNumber,
                  numberOffsetX: pObj.numberOffsetX,
                  numberOffsetY: pObj.numberOffsetY
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <TopMenu
        onNewMap={handleNewMap}
        onImportMap={handleImportMapFiles}
        onExportMap={handleExportJSON}
        onImportPalette={handleLoadPaletteFile}
        onExportPalette={handleSavePalette}
        onEmptyPalette={handleEmptyPalette}
      />
      <div className="app-container" style={{ flex: 1, minHeight: 0, height: 'auto' }}>
        <PaletteSidebar
          palette={palette}
          setPalette={setPalette}
          activePaletteIndex={activePaletteIndex}
          setActivePaletteIndex={handlePaletteSelect}
          mapWidth={mapWidth}
          setMapWidth={setMapWidth}
          mapHeight={mapHeight}
          setMapHeight={setMapHeight}
        />
      
      <MapEditor
        mapWidth={mapWidth}
        mapHeight={mapHeight}
        mapObjects={mapObjects}
        setMapObjects={setMapObjects}
        activePaletteObject={activePaletteIndex !== null ? palette[activePaletteIndex] : null}
        selectedObjectId={selectedObjectId}
        setSelectedObjectId={setSelectedObjectId}
        zoom={zoom}
        setZoom={setZoom}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
      />
      </div>
    </div>
  );
}

export default App;
