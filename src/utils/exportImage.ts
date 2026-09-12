import type { MapObject } from '../types';

import { scaleSvgString, prepareSvgForExport } from './scaleSvg';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

export async function exportMapAsImage(
  mapWidth: number,
  mapHeight: number,
  mapObjects: MapObject[],
  scale: number = 1
): Promise<void> {
  const targetWidth = Math.round(mapWidth * scale);
  const targetHeight = Math.round(mapHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Could not get 2D canvas context');
    return;
  }

  // Ensure high quality smoothing for scaled rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Sort objects by z-index ascending
  const sortedObjects = [...mapObjects].sort((a, b) => a.zIndex - b.zIndex);

  for (const obj of sortedObjects) {
    // 1. Draw main object sprite
    if (obj.imageSrc) {
      try {
        const img = await loadImage(obj.imageSrc);
        ctx.drawImage(
          img,
          Math.round(obj.x * scale),
          Math.round(obj.y * scale),
          Math.round(obj.width * scale),
          Math.round(obj.height * scale)
        );
      } catch (err) {
        console.warn(`Could not render object image for ${obj.name}:`, err);
      }
    }

    // 2. Draw tile number badge if assigned, scaled proportionally
    if (obj.type === 'tile' && obj.assignedNumber !== undefined) {
      try {
        const targetObjWidth = Math.round(obj.width * scale);
        const is2x = obj.numberVariant === '@2x' || (!obj.numberVariant && obj.width > 200) || (scale > 1 && targetObjWidth > 200);
        const variantSuffix = is2x ? '@2x' : '';
        const numImg = await loadImage(`/tilesmap/${obj.assignedNumber}${variantSuffix}.png`);
        const posX = Math.round((obj.x + (obj.numberOffsetX || 0)) * scale);
        const posY = Math.round((obj.y + (obj.numberOffsetY || 0)) * scale);
        const numWidth = Math.round(numImg.naturalWidth * scale);
        const numHeight = Math.round(numImg.naturalHeight * scale);

        ctx.drawImage(numImg, posX, posY, numWidth, numHeight);
      } catch (err) {
        console.warn(`Could not render tile number for tile ${obj.assignedNumber}:`, err);
      }
    }

    // 3. Draw SVG outline if enabled, scaled proportionally
    if (obj.type === 'tile' && obj.enableSvgOutline && obj.svgOutline) {
      try {
        const scaledOutline = scale !== 1 ? scaleSvgString(obj.svgOutline, scale) : obj.svgOutline;
        const targetObjW = Math.round(obj.width * scale);
        const targetObjH = Math.round(obj.height * scale);
        const svgContent = prepareSvgForExport(scaledOutline, targetObjW, targetObjH);
        const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        const svgImg = await loadImage(svgUrl);

        ctx.drawImage(
          svgImg,
          Math.round(obj.x * scale),
          Math.round(obj.y * scale),
          targetObjW,
          targetObjH
        );

        URL.revokeObjectURL(svgUrl);
      } catch (err) {
        console.warn(`Could not render tile SVG outline for ${obj.name}:`, err);
      }
    }
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve();
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = scale === 1 ? 'map.png' : `map-${scale}x.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}
