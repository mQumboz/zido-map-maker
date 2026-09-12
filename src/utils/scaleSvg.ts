export function isFullSvg(svg: string): boolean {
  return /^\s*<svg\b/i.test(svg);
}

function scaleViewBox(vb: string, factor: number): string {
  const parts = vb.trim().split(/[\s,]+/);
  if (parts.length === 4) {
    const scaledParts = parts.map(p => {
      const v = parseFloat(p);
      return isNaN(v) ? p : (Math.round(v * factor * 100) / 100).toString();
    });
    return scaledParts.join(' ');
  }
  return vb;
}

function scaleSvgPath(d: string, factor: number): string {
  const commandRegex = /([a-df-z])([^a-df-z]*)/gi;
  return d.replace(commandRegex, (_match: string, cmd: string, argsStr: string) => {
    const numbers = argsStr.match(/[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g);
    if (!numbers) return cmd + argsStr;

    const upper = cmd.toUpperCase();
    if (upper === 'A') {
      // Arc params: rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y
      const scaledNumbers: string[] = [];
      for (let i = 0; i < numbers.length; i++) {
        const mod = i % 7;
        const val = parseFloat(numbers[i]);
        if (isNaN(val) || mod === 2 || mod === 3 || mod === 4) {
          // Angle and binary flags are NOT multiplied by factor
          scaledNumbers.push(numbers[i]);
        } else {
          scaledNumbers.push((Math.round(val * factor * 100) / 100).toString());
        }
      }
      let idx = 0;
      return cmd + argsStr.replace(/[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g, () => scaledNumbers[idx++]);
    } else {
      return cmd + argsStr.replace(/[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g, (num: string) => {
        const val = parseFloat(num);
        return isNaN(val) ? num : (Math.round(val * factor * 100) / 100).toString();
      });
    }
  });
}

export function scaleSvgString(svg: string, factor: number): string {
  if (!svg || factor === 1) return svg;

  // Scale path d attribute
  let result = svg.replace(/\bd=(["'])(.*?)\1/gi, (_match: string, quote: string, d: string) => {
    return `d=${quote}${scaleSvgPath(d, factor)}${quote}`;
  });

  // Scale polygon/polyline points attribute
  result = result.replace(/\bpoints=(["'])(.*?)\1/gi, (_match: string, quote: string, points: string) => {
    const scaledPoints = points.replace(/[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g, (num: string) => {
      const val = parseFloat(num);
      return isNaN(val) ? num : (Math.round(val * factor * 100) / 100).toString();
    });
    return `points=${quote}${scaledPoints}${quote}`;
  });

  // Scale viewBox="minX minY w h"
  result = result.replace(/\bviewBox=(["'])(.*?)\1/gi, (_match: string, quote: string, vb: string) => {
    return `viewBox=${quote}${scaleViewBox(vb, factor)}${quote}`;
  });

  // Scale geometric and stroke attributes: stroke-width, x, y, width, height, cx, cy, r, rx, ry, x1, y1, x2, y2, dx, dy, font-size
  result = result.replace(
    /(?<!-)\b(stroke-width|x|y|width|height|cx|cy|r|rx|ry|x1|y1|x2|y2|dx|dy|font-size)=(["'])([-+]?[0-9]*\.?[0-9]+)(px)?\2/gi,
    (_match: string, attr: string, quote: string, valStr: string, unit?: string) => {
      const val = parseFloat(valStr);
      if (isNaN(val)) return _match;
      const scaled = Math.round(val * factor * 100) / 100;
      return `${attr}=${quote}${scaled}${unit || ''}${quote}`;
    }
  );

  // Scale inline style stroke-width
  result = result.replace(/\bstroke-width\s*:\s*([-+]?[0-9]*\.?[0-9]+)(px)?/gi, (_match: string, valStr: string, unit?: string) => {
    const val = parseFloat(valStr);
    if (isNaN(val)) return _match;
    const scaled = Math.round(val * factor * 100) / 100;
    return `stroke-width:${scaled}${unit || ''}`;
  });

  return result;
}

/**
 * Prepares SVG outline string for DOM display inside a tile div.
 * Prevents nested <svg> viewports by applying root SVG styling directly,
 * or wraps raw snippets in a single clean <svg> root.
 */
export function prepareSvgForDisplay(svg: string, width: number, height: number): string {
  if (!svg) return '';
  const commonSvgStyle = 'width: 100%; height: 100%; display: block;';
  if (isFullSvg(svg)) {
    let result = svg.trim();
    if (!/\bviewBox=/i.test(result)) {
      const wMatch = result.match(/\bwidth=(["'])([-+]?[0-9]*\.?[0-9]+)\1/i);
      const hMatch = result.match(/\bheight=(["'])([-+]?[0-9]*\.?[0-9]+)\1/i);
      const vbW = wMatch ? wMatch[2] : width;
      const vbH = hMatch ? hMatch[2] : height;
      result = result.replace(/<svg\b/i, `<svg viewBox="0 0 ${vbW} ${vbH}"`);
    }
    // Remove static width/height on root svg so style width:100% height:100% reliably fills the tile container
    result = result.replace(/(<svg\b[^>]*)\bwidth=(["']).*?\2/i, '$1');
    result = result.replace(/(<svg\b[^>]*)\bheight=(["']).*?\2/i, '$1');

    if (/\bstyle=(["'])(.*?)\1/i.test(result)) {
      result = result.replace(/\bstyle=(["'])(.*?)\1/i, (_m: string, quote: string, style: string) => {
        return `style=${quote}${commonSvgStyle} ${style}${quote}`;
      });
    } else {
      result = result.replace(/<svg\b/i, `<svg style="${commonSvgStyle}"`);
    }
    return result;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="${commonSvgStyle}">${svg}</svg>`;
}

/**
 * Prepares SVG outline string for rasterization on Canvas for PNG export.
 */
export function prepareSvgForExport(svg: string, width: number, height: number): string {
  if (!svg) return '';
  if (isFullSvg(svg)) {
    let result = svg.trim();
    if (!/\bxmlns=/i.test(result)) {
      result = result.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!/\bviewBox=/i.test(result)) {
      const wMatch = result.match(/\bwidth=(["'])([-+]?[0-9]*\.?[0-9]+)\1/i);
      const hMatch = result.match(/\bheight=(["'])([-+]?[0-9]*\.?[0-9]+)\1/i);
      const vbW = wMatch ? wMatch[2] : width;
      const vbH = hMatch ? hMatch[2] : height;
      result = result.replace(/<svg\b/i, `<svg viewBox="0 0 ${vbW} ${vbH}"`);
    }
    if (/\bwidth=/i.test(result)) {
      result = result.replace(/(<svg\b[^>]*)\bwidth=(["']).*?\2/i, `$1width="${width}"`);
    } else {
      result = result.replace(/<svg\b/i, `<svg width="${width}"`);
    }
    if (/\bheight=/i.test(result)) {
      result = result.replace(/(<svg\b[^>]*)\bheight=(["']).*?\2/i, `$1height="${height}"`);
    } else {
      result = result.replace(/<svg\b/i, `<svg height="${height}"`);
    }
    return result;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${svg}</svg>`;
}
