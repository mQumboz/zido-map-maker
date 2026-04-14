import { useState, useCallback } from 'react';
import './index.css';
import type { PaletteObject, MapObject, EditorTool } from './types';
import PaletteSidebar from './components/PaletteSidebar';
import MapEditor from './components/MapEditor';

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
      .map(p => ({
        id: p.id,
        name: p.name,
        type: p.type,
        width: p.width,
        height: p.height,
        imageSrc: p.imageSrc,
        assignedNumber: p.assignedNumber,
        numberOffsetX: p.numberOffsetX,
        numberOffsetY: p.numberOffsetY
      }));

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

  return (
    <div className="app-container">
      <PaletteSidebar
        palette={palette}
        setPalette={setPalette}
        activePaletteIndex={activePaletteIndex}
        setActivePaletteIndex={handlePaletteSelect}
        mapWidth={mapWidth}
        setMapWidth={setMapWidth}
        mapHeight={mapHeight}
        setMapHeight={setMapHeight}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportMapFiles}
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
  );
}

export default App;
