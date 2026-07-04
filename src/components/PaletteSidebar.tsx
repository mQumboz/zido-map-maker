import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ChangeEvent } from 'react';
import type { ObjectType, PaletteObject } from '../types';
import PaletteGrid from './PaletteGrid';
import EditPaletteModal from './EditPaletteModal';

interface PaletteSidebarProps {
  palette: PaletteObject[];
  setPalette: React.Dispatch<React.SetStateAction<PaletteObject[]>>;
  activePaletteIndex: number | null;
  setActivePaletteIndex: (index: number | null) => void;
  mapWidth: number;
  setMapWidth: React.Dispatch<React.SetStateAction<number>>;
  mapHeight: number;
  setMapHeight: React.Dispatch<React.SetStateAction<number>>;
}

const PaletteSidebar: React.FC<PaletteSidebarProps> = ({
  palette,
  setPalette,
  activePaletteIndex,
  setActivePaletteIndex,
  mapWidth,
  setMapWidth,
  mapHeight,
  setMapHeight
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newObjectName, setNewObjectName] = useState('');
  const [newObjectType, setNewObjectType] = useState<ObjectType>('prop');
  const [hasNumber, setHasNumber] = useState(false);
  const [newObjectNumber, setNewObjectNumber] = useState<number>(1);
  const [newOffsetX, setNewOffsetX] = useState<number>(0);
  const [newOffsetY, setNewOffsetY] = useState<number>(0);
  
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageDims, setImageDims] = useState<{w: number, h: number} | null>(null);

  const [isDragging, setIsDragging] = useState(false);

  const [paletteContextMenu, setPaletteContextMenu] = useState<{ x: number, y: number, index: number } | null>(null);
  const [editItemModal, setEditItemModal] = useState<number | null>(null);

  // Clear context menu on outside click
  React.useEffect(() => {
    const handleClickOutside = () => setPaletteContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

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
        <h2>Map Dimensions</h2>
        <div className="form-group" style={{ flexDirection: 'row', gap: '12px', marginBottom: 0 }}>
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
        </div>
        {palette.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', marginTop: '20px' }}>
            Upload an image above to start building your palette.
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <PaletteGrid 
              palette={palette} 
              activePaletteIndex={activePaletteIndex} 
              onItemSelect={(_, index) => setActivePaletteIndex(index === activePaletteIndex ? null : index)} 
              onContextMenu={(e, _, index) => {
                e.preventDefault();
                e.stopPropagation();
                setPaletteContextMenu({ x: e.clientX, y: e.clientY, index });
              }}
            />
          </div>
        )}
      </div>

      {paletteContextMenu && createPortal(
        <div 
          className="context-menu glass-panel" 
          style={{ position: 'fixed', left: paletteContextMenu.x, top: paletteContextMenu.y, zIndex: 1000, display: 'flex', flexDirection: 'column', padding: '8px', minWidth: '150px' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="dropdown-item" onClick={() => { setEditItemModal(paletteContextMenu.index); setPaletteContextMenu(null); }}>Edit</div>
          <div className="dropdown-item" onClick={() => {
            const item = palette[paletteContextMenu.index];
            if (item && item.imageSrc) {
              const a = document.createElement('a');
              a.href = item.imageSrc;
              a.download = `${item.name}.png`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }
            setPaletteContextMenu(null);
          }}>Download PNG</div>
          <div style={{ height: '1px', background: 'var(--panel-border)', margin: '4px 0' }}></div>
          <div className="dropdown-item" style={{ color: 'var(--danger-color)' }} onClick={() => {
            setPalette(prev => prev.filter((_, i) => i !== paletteContextMenu.index));
            if (activePaletteIndex === paletteContextMenu.index) setActivePaletteIndex(null);
            else if (activePaletteIndex !== null && activePaletteIndex > paletteContextMenu.index) {
              setActivePaletteIndex(activePaletteIndex - 1);
            }
            setPaletteContextMenu(null);
          }}>Remove</div>
        </div>,
        document.body
      )}

      {editItemModal !== null && palette[editItemModal] && createPortal(
        <EditPaletteModal
          item={palette[editItemModal]}
          onSave={(updatedItem) => {
            setPalette(prev => {
              const newPalette = [...prev];
              newPalette[editItemModal] = updatedItem;
              return newPalette;
            });
            setEditItemModal(null);
          }}
          onCancel={() => setEditItemModal(null)}
        />,
        document.body
      )}
    </div>
  );
};

export default PaletteSidebar;
