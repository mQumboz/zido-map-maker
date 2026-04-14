import React, { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { ObjectType, PaletteObject } from '../types';

interface PaletteSidebarProps {
  palette: PaletteObject[];
  setPalette: React.Dispatch<React.SetStateAction<PaletteObject[]>>;
  activePaletteIndex: number | null;
  setActivePaletteIndex: (index: number | null) => void;
  mapWidth: number;
  setMapWidth: React.Dispatch<React.SetStateAction<number>>;
  mapHeight: number;
  setMapHeight: React.Dispatch<React.SetStateAction<number>>;
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PaletteSidebar: React.FC<PaletteSidebarProps> = ({
  palette,
  setPalette,
  activePaletteIndex,
  setActivePaletteIndex,
  mapWidth,
  setMapWidth,
  mapHeight,
  setMapHeight,
  onExportJSON,
  onImportJSON
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadFileRef = useRef<HTMLInputElement>(null);
  const loadMapFileRef = useRef<HTMLInputElement>(null);
  
  const [newObjectName, setNewObjectName] = useState('');
  const [newObjectType, setNewObjectType] = useState<ObjectType>('prop');
  const [hasNumber, setHasNumber] = useState(false);
  const [newObjectNumber, setNewObjectNumber] = useState<number>(1);
  const [newOffsetX, setNewOffsetX] = useState<number>(0);
  const [newOffsetY, setNewOffsetY] = useState<number>(0);
  
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageDims, setImageDims] = useState<{w: number, h: number} | null>(null);

  const [isDragging, setIsDragging] = useState(false);

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  const getImgDimensions = (src: string): Promise<{w: number, h: number}> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.width, h: img.height });
      img.src = src;
    });
  };

  const handleFileInput = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) return;
      
      const dataUrl = await readFileAsDataUrl(file);
      setImageSrc(dataUrl);
      const dims = await getImgDimensions(dataUrl);
      setImageDims(dims);
      if (!newObjectName) {
        setNewObjectName(file.name.split('.')[0] || '');
      }
      
      // Reset input
      e.target.value = '';
    }
  };

  const handleCreateObject = () => {
    if (!imageSrc || !imageDims) return;
    if (newObjectType === 'tile' && hasNumber && newObjectNumber === 0) return;

    const newObj: PaletteObject = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      name: newObjectName || 'Unknown',
      type: newObjectType,
      imageSrc: imageSrc,
      width: imageDims.w,
      height: imageDims.h,
    };

    if (newObjectType === 'tile' && hasNumber) {
      newObj.assignedNumber = newObjectNumber;
      newObj.numberOffsetX = newOffsetX;
      newObj.numberOffsetY = newOffsetY;
    }

    setPalette(prev => [...prev, newObj]);
    
    // Reset form
    setImageSrc(null);
    setImageDims(null);
    setNewObjectName('');
    setHasNumber(false);
    setNewObjectNumber(1);
    setNewOffsetX(0);
    setNewOffsetY(0);
  };

  const handleSavePalette = () => {
    const blob = new Blob([JSON.stringify(palette, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'palette.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadPaletteFile = (e: ChangeEvent<HTMLInputElement>) => {
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
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (!file.type.startsWith('image/')) return;
      
      const dataUrl = await readFileAsDataUrl(file);
      setImageSrc(dataUrl);
      const dims = await getImgDimensions(dataUrl);
      setImageDims(dims);
      if (!newObjectName) {
        setNewObjectName(file.name.split('.')[0] || '');
      }
    }
  };

  return (
    <div className="sidebar glass-panel">
      <div>
        <h2>Map Settings</h2>
        <div className="form-group" style={{ flexDirection: 'row', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label>Width (px)</label>
            <input 
              type="number" 
              className="input-field" 
              value={mapWidth} 
              onChange={e => setMapWidth(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>Height (px)</label>
            <input 
              type="number" 
              className="input-field" 
              value={mapHeight} 
              onChange={e => setMapHeight(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => loadMapFileRef.current?.click()}>Import JSON</button>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onExportJSON}>Export JSON</button>
        </div>
        <input type="file" ref={loadMapFileRef} style={{ display: 'none' }} accept="application/json" onChange={onImportJSON} />
      </div>

      <hr style={{ borderColor: 'var(--panel-border)', margin: '8px 0' }} />

      <div>
        <h2>Add to Palette</h2>
        <div className="form-group">
          <label>Object Type</label>
          <select 
            className="input-field"
            value={newObjectType}
            onChange={e => {
              setNewObjectType(e.target.value as ObjectType);
              if (e.target.value !== 'tile') {
                setHasNumber(false);
              }
            }}
          >
            <option value="prop">Prop</option>
            <option value="background">Background Element</option>
            <option value="tile">Tile</option>
          </select>
        </div>

        <div className="form-group">
          <label>Object Name</label>
          <input 
            type="text" 
            className="input-field" 
            placeholder="e.g. Tree, Hero, Wall"
            value={newObjectName}
            onChange={e => setNewObjectName(e.target.value)}
          />
        </div>

        {newObjectType === 'tile' && (
          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center' }}>
            <input 
              type="checkbox" 
              checked={hasNumber}
              onChange={e => setHasNumber(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <label style={{ margin: 0 }}>Enable Number Overlay</label>
          </div>
        )}

        {newObjectType === 'tile' && hasNumber && (
          <>
            <div className="form-group">
              <label>Assigned Number</label>
              <select 
                className="input-field" 
                value={newObjectNumber}
                onChange={e => setNewObjectNumber(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <option key={n} value={n}>Number {n}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flexDirection: 'row', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <label>Offset X (px)</label>
                <input type="number" className="input-field" value={newOffsetX} onChange={e => setNewOffsetX(Number(e.target.value))} style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label>Offset Y (px)</label>
                <input type="number" className="input-field" value={newOffsetY} onChange={e => setNewOffsetY(Number(e.target.value))} style={{ width: '100%' }} />
              </div>
            </div>
          </>
        )}

        <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '8px', display: 'block' }}>
          Image Asset
        </label>
        <div 
          className={`upload-zone ${isDragging ? 'drag-active' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          style={{ width: '100%', padding: '12px', borderColor: imageSrc ? 'var(--accent-color)' : '', minHeight: '80px', display: 'flex', justifyContent: 'center' }}
        >
          <div style={{ fontSize: '20px' }}>{imageSrc ? '✅' : '📁'}</div>
          <div style={{ fontSize: '0.75rem', fontWeight: 500 }}>{imageSrc ? 'Ready' : 'Click or drop image'}</div>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*"
          onChange={handleFileInput}
        />

        {imageSrc && imageDims && (
          <div style={{ marginTop: '16px', marginBottom: '16px' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '8px', display: 'block' }}>
              Live Preview
            </label>
            <div style={{ 
              width: '100%', 
              height: '150px', 
              border: '1px dashed var(--panel-border)', 
              borderRadius: '8px',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              overflow: 'hidden',
              background: 'rgba(0,0,0,0.2)'
            }}>
              <div style={{
                position: 'relative',
                width: imageDims.w,
                height: imageDims.h,
                transform: `scale(${Math.min(1, 130 / imageDims.w, 130 / imageDims.h)})`
              }}>
                 <img src={imageSrc} style={{ width: '100%', height: '100%', display: 'block' }} alt="Preview" />
                 {newObjectType === 'tile' && hasNumber && (
                   <img src={`/tilesmap/${newObjectNumber}.png`} style={{ position: 'absolute', top: newOffsetY, left: newOffsetX, width: 'auto', height: 'auto', pointerEvents: 'none', zIndex: 1, maxWidth: 'none', maxHeight: 'none' }} alt="Num" />
                 )}
              </div>
            </div>
          </div>
        )}

        <button 
          className="btn-primary" 
          style={{ marginTop: '16px' }}
          disabled={!imageSrc}
          onClick={handleCreateObject}
        >
          Create Palette Object
        </button>
      </div>

      <hr style={{ borderColor: 'var(--panel-border)', margin: '8px 0' }} />

      <div style={{ marginTop: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ margin: 0 }}>Palette Library</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', width: 'auto' }} onClick={() => loadFileRef.current?.click()} title="Load Palette">📂 Load</button>
            <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', width: 'auto' }} onClick={handleSavePalette} title="Save Palette">💾 Save</button>
            <input type="file" ref={loadFileRef} style={{ display: 'none' }} accept="application/json" onChange={handleLoadPaletteFile} />
          </div>
        </div>
        {palette.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', marginTop: '20px' }}>
            Upload an image above to start building your palette.
          </div>
        ) : (
          <div className="palette-grid" style={{ paddingRight: '4px', width: '100%' }}>
            {palette.map((item, index) => (
              <div 
                key={item.id} 
                className={`palette-item ${activePaletteIndex === index ? 'active' : ''}`}
                onClick={() => setActivePaletteIndex(index === activePaletteIndex ? null : index)}
              >
                <div style={{ position: 'relative', width: '100%', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', width: item.width || 64, height: item.height || 64, transform: `translate(-50%, -50%) scale(${Math.min(64 / (item.width || 64), 64 / (item.height || 64))})` }}>
                    <img src={item.imageSrc} alt={item.name} style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }} />
                    {item.type === 'tile' && item.assignedNumber !== undefined && (
                      <img src={`/tilesmap/${item.assignedNumber}.png`} alt={`Number ${item.assignedNumber}`} style={{ position: 'absolute', top: item.numberOffsetY || 0, left: item.numberOffsetX || 0, width: 'auto', height: 'auto', zIndex: 1, pointerEvents: 'none', maxWidth: 'none', maxHeight: 'none' }} />
                    )}
                  </div>
                </div>
                <div className="palette-item-name">{item.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <div className="palette-item-type">
                    {item.type} {item.type === 'tile' && item.assignedNumber !== undefined && `#${item.assignedNumber}`}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                    {item.width || '?' }x{item.height || '?'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaletteSidebar;
