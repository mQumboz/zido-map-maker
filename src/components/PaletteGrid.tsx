import React from 'react';
import type { PaletteObject } from '../types';

interface PaletteGridProps {
  palette: PaletteObject[];
  activePaletteIndex?: number | null;
  onItemSelect?: (item: PaletteObject, index: number) => void;
}

const PaletteGrid: React.FC<PaletteGridProps> = ({
  palette,
  activePaletteIndex = null,
  onItemSelect
}) => {
  return (
    <div className="palette-grid" style={{ paddingRight: '4px', width: '100%' }}>
      {palette.map((item, index) => (
        <div 
          key={item.id} 
          className={`palette-item ${activePaletteIndex === index ? 'active' : ''}`}
          onClick={() => onItemSelect && onItemSelect(item, index)}
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
  );
};

export default PaletteGrid;
