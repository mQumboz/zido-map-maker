import React, { useRef, useState } from 'react';

interface TopMenuProps {
  onNewMap: () => void;
  onImportMap: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportMap: () => void;
  onImportPalette: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportPalette: () => void;
  onEmptyPalette: () => void;
}

const TopMenu: React.FC<TopMenuProps> = ({
  onNewMap,
  onImportMap,
  onExportMap,
  onImportPalette,
  onExportPalette,
  onEmptyPalette
}) => {
  const mapFileRef = useRef<HTMLInputElement>(null);
  const paletteFileRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="top-menu glass-panel" style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none', display: 'flex', alignItems: 'center', padding: '0 16px', height: '48px', zIndex: 100, position: 'relative' }}>
      <div style={{ fontWeight: 600, marginRight: '24px', fontSize: '1.1rem' }}>map settings</div>
      <div
        className="menu-item"
        onMouseEnter={() => setMenuOpen(true)}
        onMouseLeave={() => setMenuOpen(false)}
        style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '0 12px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
          File
        </div>
        {menuOpen && (
          <div className="dropdown glass-panel" style={{ position: 'absolute', top: '100%', left: 0, minWidth: '200px', display: 'flex', flexDirection: 'column', padding: '8px 0', zIndex: 200, marginTop: '2px', backgroundColor: 'black' }}>
            <div className="dropdown-item" onClick={() => { onNewMap(); setMenuOpen(false); }}>New Map</div>
            <div className="dropdown-item" onClick={() => { mapFileRef.current?.click(); setMenuOpen(false); }}>Import Map</div>
            <div className="dropdown-item" onClick={() => { onExportMap(); setMenuOpen(false); }}>Export Map</div>
            <hr style={{ borderColor: 'var(--panel-border)', margin: '4px 0' }} />
            <div className="dropdown-item" onClick={() => { paletteFileRef.current?.click(); setMenuOpen(false); }}>Import Palette</div>
            <div className="dropdown-item" onClick={() => { onExportPalette(); setMenuOpen(false); }}>Export Palette</div>
            <div className="dropdown-item" onClick={() => { onEmptyPalette(); setMenuOpen(false); }}>Empty Palette</div>
          </div>
        )}
      </div>
      <input type="file" ref={mapFileRef} style={{ display: 'none' }} accept="application/json" onChange={onImportMap} />
      <input type="file" ref={paletteFileRef} style={{ display: 'none' }} accept="application/json" onChange={onImportPalette} />
    </div>
  );
};

export default TopMenu;
