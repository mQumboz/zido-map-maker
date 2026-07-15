import React, { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import type { ObjectType, PaletteObject } from '../types';

interface EditPaletteModalProps {
  item: PaletteObject;
  onSave: (updatedItem: PaletteObject) => void;
  onCancel: () => void;
}

const EditPaletteModal: React.FC<EditPaletteModalProps> = ({ item, onSave, onCancel }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [objectName, setObjectName] = useState(item.name);
  const [objectType, setObjectType] = useState<ObjectType>(item.type);
  const [hasNumber, setHasNumber] = useState(item.assignedNumber !== undefined);
  const [objectNumber, setObjectNumber] = useState<number>(item.assignedNumber ?? 1);
  const [offsetX, setOffsetX] = useState<number>(item.numberOffsetX ?? 0);
  const [offsetY, setOffsetY] = useState<number>(item.numberOffsetY ?? 0);
  const [enableSvgOutline, setEnableSvgOutline] = useState(item.enableSvgOutline ?? false);
  const [svgOutline, setSvgOutline] = useState(item.svgOutline ?? '');

  const [imageSrc, setImageSrc] = useState<string>(item.imageSrc);
  const [imageDims, setImageDims] = useState<{w: number, h: number}>({ w: item.width, h: item.height });

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
      if (!objectName) {
        setObjectName(file.name.split('.')[0] || '');
      }
      
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
      if (!objectName) {
        setObjectName(file.name.split('.')[0] || '');
      }
    }
  };

  const handleSave = () => {
    if (!imageSrc || !imageDims) return;
    if (objectType === 'tile' && hasNumber && objectNumber === 0) return;

    const updatedObj: PaletteObject = {
      ...item,
      name: objectName || 'Unknown',
      type: objectType,
      imageSrc: imageSrc,
      width: imageDims.w,
      height: imageDims.h,
    };

    if (objectType === 'tile' && hasNumber) {
      updatedObj.assignedNumber = objectNumber;
      updatedObj.numberOffsetX = offsetX;
      updatedObj.numberOffsetY = offsetY;
    } else {
      delete updatedObj.assignedNumber;
      delete updatedObj.numberOffsetX;
      delete updatedObj.numberOffsetY;
    }

    if (objectType === 'tile' && enableSvgOutline) {
      updatedObj.enableSvgOutline = true;
      updatedObj.svgOutline = svgOutline;
    } else {
      delete updatedObj.enableSvgOutline;
      delete updatedObj.svgOutline;
    }

    onSave(updatedObj);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ width: '400px', maxWidth: '90vw' }}>
        <h2 style={{ marginBottom: '16px' }}>Edit Palette Object</h2>
        
        <div className="form-group">
          <label>Object Type</label>
          <select 
            className="input-field"
            value={objectType}
            onChange={e => {
              setObjectType(e.target.value as ObjectType);
              if (e.target.value !== 'tile') {
                setHasNumber(false);
                setEnableSvgOutline(false);
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
            value={objectName}
            onChange={e => setObjectName(e.target.value)}
          />
        </div>

        {objectType === 'tile' && (
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

        {objectType === 'tile' && hasNumber && (
          <>
            <div className="form-group">
              <label>Assigned Number</label>
              <select 
                className="input-field" 
                value={objectNumber}
                onChange={e => setObjectNumber(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <option key={n} value={n}>Number {n}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flexDirection: 'row', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <label>Offset X (px)</label>
                <input type="number" className="input-field" value={offsetX} onChange={e => setOffsetX(Number(e.target.value))} style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label>Offset Y (px)</label>
                <input type="number" className="input-field" value={offsetY} onChange={e => setOffsetY(Number(e.target.value))} style={{ width: '100%' }} />
              </div>
            </div>
          </>
        )}

        {objectType === 'tile' && (
          <>
            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', marginTop: '8px' }}>
              <input 
                type="checkbox" 
                checked={enableSvgOutline}
                onChange={e => setEnableSvgOutline(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              <label style={{ margin: 0 }}>Enable SVG Outline</label>
            </div>
            {enableSvgOutline && (
              <div className="form-group">
                <label>SVG Path (Code Snippet)</label>
                <textarea 
                  className="input-field" 
                  value={svgOutline}
                  onChange={e => setSvgOutline(e.target.value)}
                  placeholder='e.g. <path d="M10 10 H 90 V 90 H 10 L 10 10"/>'
                  style={{ minHeight: '80px', fontFamily: 'monospace', resize: 'vertical' }}
                />
              </div>
            )}
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
                 {objectType === 'tile' && hasNumber && (
                   <img src={`/tilesmap/${objectNumber}.png`} style={{ position: 'absolute', top: offsetY, left: offsetX, width: 'auto', height: 'auto', pointerEvents: 'none', zIndex: 1, maxWidth: 'none', maxHeight: 'none' }} alt="Num" />
                 )}
                 {objectType === 'tile' && enableSvgOutline && svgOutline && (
                   <svg
                     viewBox={`0 0 ${imageDims.w} ${imageDims.h}`}
                     style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}
                     dangerouslySetInnerHTML={{ __html: svgOutline }}
                   />
                 )}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" disabled={!imageSrc} onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default EditPaletteModal;
