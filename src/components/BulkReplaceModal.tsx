import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { PaletteObject } from '../types';

export interface BulkReplacement {
  paletteId: string;
  paletteName: string;
  imageSrc: string;
  width: number;
  height: number;
  oldWidth: number;
  oldHeight: number;
}

interface ProcessedFile {
  file: File;
  baseName: string;
  dataUrl: string;
  width: number;
  height: number;
  matchedPaletteItem: PaletteObject | null;
}

interface BulkReplaceModalProps {
  palette: PaletteObject[];
  onApply: (
    replacements: BulkReplacement[],
    updateMapElements: boolean,
    updateDimensions: boolean
  ) => void;
  onCancel: () => void;
  mapElementsCount?: number;
}

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const getImageDimensions = (src: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = src;
  });
};

const BulkReplaceModal: React.FC<BulkReplaceModalProps> = ({
  palette,
  onApply,
  onCancel,
  mapElementsCount = 0
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [updateMapElements, setUpdateMapElements] = useState(true);
  const [updateDimensions, setUpdateDimensions] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'matched' | 'unmatched'>('all');

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  // Match file to palette object
  const findMatchingPaletteItem = useCallback(
    (fileName: string): PaletteObject | null => {
      const baseName = fileName.replace(/\.[^/.]+$/, '').trim();
      const rawName = fileName.trim();

      // 1. Exact match against baseName or rawName
      const exact = palette.find(
        (p) => p.name === baseName || p.name === rawName
      );
      if (exact) return exact;

      // 2. Case-insensitive match
      const lowerBase = baseName.toLowerCase();
      const lowerRaw = rawName.toLowerCase();
      const caseInsensitive = palette.find((p) => {
        const pLower = p.name.trim().toLowerCase();
        return pLower === lowerBase || pLower === lowerRaw;
      });

      return caseInsensitive || null;
    },
    [palette]
  );

  // Process selected files
  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      setIsProcessing(true);
      const filesArray = Array.from(fileList).filter(
        (f) => f.type.startsWith('image/') || f.name.toLowerCase().endsWith('.png')
      );

      const results: ProcessedFile[] = [];

      for (const file of filesArray) {
        try {
          const dataUrl = await readFileAsDataUrl(file);
          const { width, height } = await getImageDimensions(dataUrl);
          const baseName = file.name.replace(/\.[^/.]+$/, '');
          const matchedItem = findMatchingPaletteItem(file.name);

          results.push({
            file,
            baseName,
            dataUrl,
            width,
            height,
            matchedPaletteItem: matchedItem
          });
        } catch (err) {
          console.error(`Failed to process file ${file.name}:`, err);
        }
      }

      setProcessedFiles((prev) => {
        // Merge with existing, replacing duplicates with the newer file
        const merged = [...prev];
        for (const newFile of results) {
          const idx = merged.findIndex(
            (m) => m.file.name.toLowerCase() === newFile.file.name.toLowerCase()
          );
          if (idx >= 0) {
            merged[idx] = newFile;
          } else {
            merged.push(newFile);
          }
        }
        return merged;
      });

      setIsProcessing(false);
    },
    [findMatchingPaletteItem]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemoveFile = (index: number) => {
    setProcessedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    setProcessedFiles([]);
  };

  // Group matched files by palette item ID to avoid applying multiple files to the same palette item
  const matchedFiles = processedFiles.filter((p) => p.matchedPaletteItem !== null);
  const unmatchedFiles = processedFiles.filter((p) => p.matchedPaletteItem === null);

  // Deduplicate matched palette items (if multiple files match the same item, use the last one)
  const uniqueReplacementsMap = new Map<string, BulkReplacement>();
  for (const pf of matchedFiles) {
    if (pf.matchedPaletteItem) {
      uniqueReplacementsMap.set(pf.matchedPaletteItem.id, {
        paletteId: pf.matchedPaletteItem.id,
        paletteName: pf.matchedPaletteItem.name,
        imageSrc: pf.dataUrl,
        width: pf.width,
        height: pf.height,
        oldWidth: pf.matchedPaletteItem.width,
        oldHeight: pf.matchedPaletteItem.height
      });
    }
  }

  const replacementsToApply = Array.from(uniqueReplacementsMap.values());

  const handleApply = () => {
    if (replacementsToApply.length === 0) return;
    onApply(replacementsToApply, updateMapElements, updateDimensions);
  };

  const displayedFiles =
    activeTab === 'matched'
      ? matchedFiles
      : activeTab === 'unmatched'
      ? unmatchedFiles
      : processedFiles;

  return createPortal(
    <div className="modal-overlay" onClick={onCancel} style={{ zIndex: 1100 }}>
      <div
        className="modal-content glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90%',
          maxWidth: '780px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          gap: '16px'
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔄</span> Bulk Replace Palette Items
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Select multiple PNG files. Each file will replace the image of the palette item with the matching name.
            </p>
          </div>
          <button
            onClick={onCancel}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              background: 'rgba(255,255,255,0.06)',
              fontSize: '1rem',
              color: 'var(--text-secondary)'
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Upload Zone */}
        <div
          className={`upload-zone ${isDragging ? 'drag-active' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            width: '100%',
            padding: '20px',
            borderColor: isDragging ? 'var(--accent-color)' : 'var(--panel-border)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            background: isDragging ? 'rgba(99, 102, 241, 0.1)' : 'rgba(0, 0, 0, 0.25)',
            borderStyle: 'dashed',
            borderWidth: '2px',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ fontSize: '28px', marginBottom: '4px' }}>
            {isProcessing ? '⏳' : '📁'}
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
            {isProcessing ? 'Processing files...' : 'Click to select or drop multiple PNG files here'}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Select as many PNGs as needed. Names are matched against palette objects (e.g. <code>Tree.png</code> → <code>Tree</code>)
          </div>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/png,image/*"
            multiple
            onChange={handleFileInput}
          />
        </div>

        {/* Stats & Filters Bar */}
        {processedFiles.length > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              border: '1px solid var(--panel-border)'
            }}
          >
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  background: activeTab === 'all' ? 'var(--accent-color)' : 'transparent',
                  color: activeTab === 'all' ? '#fff' : 'var(--text-secondary)'
                }}
              >
                All ({processedFiles.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('matched')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  background: activeTab === 'matched' ? 'var(--accent-color)' : 'transparent',
                  color: activeTab === 'matched' ? '#fff' : '#10b981'
                }}
              >
                ✓ Matched ({replacementsToApply.length})
              </button>
              {unmatchedFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('unmatched')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    background: activeTab === 'unmatched' ? 'var(--accent-color)' : 'transparent',
                    color: activeTab === 'unmatched' ? '#fff' : '#f59e0b'
                  }}
                >
                  ⚠ Unmatched ({unmatchedFiles.length})
                </button>
              )}
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              >
                + Add More Files
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  color: 'var(--danger-color)',
                  borderRadius: '6px'
                }}
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Files List Preview */}
        {processedFiles.length > 0 ? (
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              maxHeight: '280px',
              paddingRight: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            {displayedFiles.map((item, idx) => {
              const isMatched = item.matchedPaletteItem !== null;
              return (
                <div
                  key={`${item.file.name}-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: isMatched
                      ? 'rgba(16, 185, 129, 0.05)'
                      : 'rgba(239, 68, 68, 0.05)',
                    border: `1px solid ${
                      isMatched ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.2)'
                    }`
                  }}
                >
                  {/* File preview icon/thumbnail */}
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '6px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid var(--panel-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}
                  >
                    <img
                      src={item.dataUrl}
                      alt={item.file.name}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  </div>

                  {/* Comparison info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: '0.88rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                        title={item.file.name}
                      >
                        {item.file.name}
                      </span>
                      {isMatched && item.matchedPaletteItem && (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(99, 102, 241, 0.2)',
                            color: '#818cf8',
                            textTransform: 'uppercase',
                            fontWeight: 600
                          }}
                        >
                          {item.matchedPaletteItem.type}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {isMatched && item.matchedPaletteItem ? (
                        <span>
                          Matches: <strong>{item.matchedPaletteItem.name}</strong> • Dimensions: {item.matchedPaletteItem.width}×{item.matchedPaletteItem.height}px
                          {item.width !== item.matchedPaletteItem.width || item.height !== item.matchedPaletteItem.height ? (
                            <span style={{ color: '#fbbf24', marginLeft: '6px' }}>
                              → {item.width}×{item.height}px
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>
                              (unchanged {item.width}×{item.height}px)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span style={{ color: '#f87171' }}>
                          No palette item matching &quot;{item.baseName}&quot; found
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Matched vs Unmatched Status Badge */}
                  <div>
                    {isMatched ? (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34d399',
                          fontWeight: 500,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        ✓ Ready
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171',
                          fontWeight: 500
                        }}
                      >
                        No Match
                      </span>
                    )}
                  </div>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                      borderRadius: '4px'
                    }}
                    title="Remove file"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '8px',
              border: '1px dashed var(--panel-border)'
            }}
          >
            No files uploaded yet. Drag & drop or select PNG files to begin.
          </div>
        )}

        {/* Options & Checkboxes */}
        <div
          style={{
            padding: '14px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '10px',
            border: '1px solid var(--panel-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              fontSize: '0.88rem',
              fontWeight: 500
            }}
          >
            <input
              type="checkbox"
              checked={updateMapElements}
              onChange={(e) => setUpdateMapElements(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)' }}
            />
            <span>
              Update map elements after replacing the content of the palette
              {mapElementsCount > 0 && (
                <span style={{ color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '6px' }}>
                  ({mapElementsCount} placed object{mapElementsCount === 1 ? '' : 's'} on current map)
                </span>
              )}
            </span>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              fontSize: '0.88rem',
              fontWeight: 500
            }}
          >
            <input
              type="checkbox"
              checked={updateDimensions}
              onChange={(e) => setUpdateDimensions(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)' }}
            />
            <span>
              Update dimensions (width & height) if new PNGs have different dimensions
            </span>
          </label>
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            style={{ padding: '8px 16px', fontSize: '0.88rem' }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleApply}
            disabled={replacementsToApply.length === 0}
            style={{
              padding: '8px 20px',
              fontSize: '0.88rem',
              fontWeight: 600,
              opacity: replacementsToApply.length === 0 ? 0.5 : 1,
              cursor: replacementsToApply.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🔄</span> Replace {replacementsToApply.length} Item
            {replacementsToApply.length === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BulkReplaceModal;
