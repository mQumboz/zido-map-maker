import React, { useRef, useState } from 'react';

interface TopMenuProps {
  onNewMap: () => void;
  onImportMap: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportMap: (scale?: number) => void;
  onExportImage: (scale?: number) => void;
  onImportPalette: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportPalette: () => void;
  onDownloadPaletteZip: () => void;
  onEmptyPalette: () => void;
  onOpenBulkReplace: () => void;
}

const TopMenu: React.FC<TopMenuProps> = ({
  onNewMap,
  onImportMap,
  onExportMap,
  onExportImage,
  onImportPalette,
  onExportPalette,
  onDownloadPaletteZip,
  onEmptyPalette,
  onOpenBulkReplace
}) => {
  const mapFileRef = useRef<HTMLInputElement>(null);
  const paletteFileRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);

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
          <div className="dropdown glass-panel" style={{ position: 'absolute', top: '100%', left: 0, minWidth: '220px', display: 'flex', flexDirection: 'column', padding: '8px 0', zIndex: 200, marginTop: '2px', backgroundColor: 'black' }}>
            <div className="dropdown-item" onClick={() => { onNewMap(); setMenuOpen(false); }}>New Map</div>
            <div className="dropdown-item" onClick={() => { mapFileRef.current?.click(); setMenuOpen(false); }}>Import Map</div>
            <div className="dropdown-item" onClick={() => { onExportMap(1); setMenuOpen(false); }}>Export Map (JSON)</div>
            <div className="dropdown-item" onClick={() => { onExportMap(2); setMenuOpen(false); }}>Export Map 2x (JSON)</div>
            <hr style={{ borderColor: 'var(--panel-border)', margin: '4px 0' }} />
            <div className="dropdown-item" onClick={() => { onExportImage(1); setMenuOpen(false); }}>Export Image (PNG)</div>
            <div className="dropdown-item" onClick={() => { onExportImage(2); setMenuOpen(false); }}>Export Image 2x (PNG)</div>
            <hr style={{ borderColor: 'var(--panel-border)', margin: '4px 0' }} />
            <div className="dropdown-item" onClick={() => { paletteFileRef.current?.click(); setMenuOpen(false); }}>Import Palette</div>
            <div className="dropdown-item" onClick={() => { onExportPalette(); setMenuOpen(false); }}>Export Palette (JSON)</div>
            <div className="dropdown-item" onClick={() => { onDownloadPaletteZip(); setMenuOpen(false); }}>Download Palette as PNG (ZIP)</div>
            <div className="dropdown-item" onClick={() => { onEmptyPalette(); setMenuOpen(false); }}>Empty Palette</div>
          </div>
        )}
      </div>

      <div
        className="menu-item"
        onMouseEnter={() => setToolsMenuOpen(true)}
        onMouseLeave={() => setToolsMenuOpen(false)}
        style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '0 12px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
          </svg>
          Tools
        </div>
        {toolsMenuOpen && (
          <div className="dropdown glass-panel" style={{ position: 'absolute', top: '100%', left: 0, minWidth: '240px', display: 'flex', flexDirection: 'column', padding: '8px 0', zIndex: 200, marginTop: '2px', backgroundColor: 'black' }}>
            <div 
              className="dropdown-item" 
              onClick={() => { onOpenBulkReplace(); setToolsMenuOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span>🔄</span> Bulk Replace Palette Items...
            </div>
          </div>
        )}
      </div>

      <input type="file" ref={mapFileRef} style={{ display: 'none' }} accept="application/json" onChange={onImportMap} />
      <input type="file" ref={paletteFileRef} style={{ display: 'none' }} accept="application/json" onChange={onImportPalette} />
    </div>
  );
};

export default TopMenu;
