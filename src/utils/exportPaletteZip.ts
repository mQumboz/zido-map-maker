import JSZip from 'jszip';
import type { PaletteObject } from '../types';

export async function downloadPaletteAsZip(palette: PaletteObject[]): Promise<void> {
  if (!palette || palette.length === 0) {
    alert('Palette is empty. Add items to palette before downloading.');
    return;
  }

  const zip = new JSZip();
  const nameCounts: Record<string, number> = {};

  for (const item of palette) {
    if (!item.imageSrc) continue;

    const baseName = (item.name || 'unnamed').trim().replace(/[/\\?%*:|"<>]/g, '_');
    const count = nameCounts[baseName] || 0;
    nameCounts[baseName] = count + 1;
    const filename = count === 0 ? `${baseName}.png` : `${baseName}_${count}.png`;

    try {
      // If item was upscaled or resized (width/height differ from natural image), render at item.width x item.height
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load ${item.name}`));
        img.src = item.imageSrc;
      });

      if (
        img.naturalWidth > 0 &&
        img.naturalHeight > 0 &&
        (img.naturalWidth !== item.width || img.naturalHeight !== item.height)
      ) {
        const canvas = document.createElement('canvas');
        canvas.width = item.width;
        canvas.height = item.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, item.width, item.height);
          const dataUrl = canvas.toDataURL('image/png');
          const base64 = dataUrl.split(',')[1];
          zip.file(filename, base64, { base64: true });
          continue;
        }
      }

      // If at natural size and base64 data url, save directly
      if (item.imageSrc.startsWith('data:image/')) {
        const base64 = item.imageSrc.split(',')[1];
        zip.file(filename, base64, { base64: true });
      } else {
        const res = await fetch(item.imageSrc);
        const blob = await res.blob();
        zip.file(filename, blob);
      }
    } catch (err) {
      console.warn(`Failed to package ${filename} into zip:`, err);
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'palette-pngs.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
