import React from 'react';
import type { PaletteObject } from '../types';
import { prepareSvgForDisplay } from '../utils/scaleSvg';

interface PaletteGridProps {
  palette: PaletteObject[];
  activePaletteIndex?: number | null;
  onItemSelect?: (item: PaletteObject, index: number) => void;
  onContextMenu?: (e: React.MouseEvent, item: PaletteObject, index: number) => void;
}

const PaletteGrid: React.FC<PaletteGridProps> = ({
  palette,
  activePaletteIndex = null,
  onItemSelect,
  onContextMenu
}) => {
  return (
    <div className="palette-grid" style={{ paddingRight: '4px', width: '100%' }}>
      {palette.map((item, index) => (
        <div 
          key={item.id} 
          className={`palette-item ${activePaletteIndex === index ? 'active' : ''}`}
          onClick={() => onItemSelect && onItemSelect(item, index)}
          onContextMenu={(e) => onContextMenu && onContextMenu(e, item, index)}
        >
          <div style={{ position: 'relative', width: '100%', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: item.width || 64,
              height: item.height || 64,
              transform: `translate(-50%, -50%) scale(${Math.min(60 / (item.width || 64), 60 / (item.height || 64))})`
            }}>
              <img src={item.imageSrc} alt={item.name} style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }} />
              {item.type === 'tile' && item.assignedNumber !== undefined && (
                <img
                  className="tile-number-overlay"
                  src={`/tilesmap/${item.assignedNumber}${(item.numberVariant === '@2x' || (!item.numberVariant && (item.width || 64) > 200)) ? '@2x' : ''}.png`}
                  alt={`Number ${item.assignedNumber}`}
                  style={{
                    top: `${Number(item.numberOffsetY) || 0}px`,
                    left: `${Number(item.numberOffsetX) || 0}px`,
                  }}
                />
              )}
              {item.type === 'tile' && item.enableSvgOutline && item.svgOutline && (
                <div
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}
                  dangerouslySetInnerHTML={{ __html: prepareSvgForDisplay(item.svgOutline, item.width || 64, item.height || 64) }}
                />
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
