function extensionFromMime(mime: string): string {
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('png')) return 'png';
  return 'png';
}

function extensionFromImageUrl(url: string): string | null {
  const match = url.match(/\.(webp|jpg|jpeg|png)(?:\?|$)/i);
  return match ? match[1].toLowerCase().replace('jpeg', 'jpg') : null;
}

function triggerAnchorDownload(href: string, filename: string): void {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!url.startsWith('data:') && !url.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image_load_failed'));
    img.src = url;
  });
}

/** Instagram Stories frame: 9:16 (width / height). */
export const STORIES_ASPECT = 9 / 16;

export type StoriesBrandLayout = {
  canvasWidth: number;
  canvasHeight: number;
  imageX: number;
  imageY: number;
  imageWidth: number;
  imageHeight: number;
  topBarHeight: number;
  bottomBarHeight: number;
};

/**
 * Letterbox a source image into a 9:16 Stories canvas with room for IDA branding.
 */
export function storiesBrandLayout(sourceWidth: number, sourceHeight: number): StoriesBrandLayout {
  const srcW = Math.max(1, Math.round(sourceWidth));
  const srcH = Math.max(1, Math.round(sourceHeight));
  const canvasWidth = srcW;
  const canvasHeight = Math.max(srcH, Math.round(canvasWidth / STORIES_ASPECT));
  const topBarHeight = Math.max(64, Math.round(canvasHeight * 0.09));
  const bottomBarHeight = Math.max(110, Math.round(canvasHeight * 0.15));
  const availH = Math.max(1, canvasHeight - topBarHeight - bottomBarHeight);
  const scale = Math.min(canvasWidth / srcW, availH / srcH);
  const imageWidth = Math.max(1, Math.round(srcW * scale));
  const imageHeight = Math.max(1, Math.round(srcH * scale));
  const imageX = Math.round((canvasWidth - imageWidth) / 2);
  const imageY = topBarHeight + Math.round((availH - imageHeight) / 2);
  return {
    canvasWidth,
    canvasHeight,
    imageX,
    imageY,
    imageWidth,
    imageHeight,
    topBarHeight,
    bottomBarHeight,
  };
}

function drawFittedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
): void {
  let size = fontSize;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  do {
    ctx.font = `600 ${size}px system-ui, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth || size <= 12) break;
    size -= 1;
  } while (size > 12);
  ctx.fillText(text, x, y, maxWidth);
}

export function composeBrandedCanvas(
  img: HTMLImageElement,
  cta: string,
): HTMLCanvasElement {
  const srcW = Math.max(1, img.naturalWidth || img.width);
  const srcH = Math.max(1, img.naturalHeight || img.height);
  const layout = storiesBrandLayout(srcW, srcH);
  const canvas = document.createElement('canvas');
  canvas.width = layout.canvasWidth;
  canvas.height = layout.canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('no_canvas');
  }

  ctx.fillStyle = '#1a1612';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, layout.imageX, layout.imageY, layout.imageWidth, layout.imageHeight);

  ctx.fillStyle = '#d4af37';
  ctx.fillRect(0, layout.topBarHeight - 3, canvas.width, 3);
  ctx.fillRect(0, canvas.height - layout.bottomBarHeight, canvas.width, 3);

  ctx.fillStyle = '#d4af37';
  const wordmarkSize = Math.max(22, Math.round(layout.topBarHeight * 0.42));
  drawFittedText(ctx, 'IDA', canvas.width / 2, layout.topBarHeight / 2, canvas.width * 0.86, wordmarkSize);

  ctx.fillStyle = '#f5f0e6';
  const ctaSize = Math.max(16, Math.round(layout.bottomBarHeight * 0.28));
  drawFittedText(
    ctx,
    cta,
    canvas.width / 2,
    canvas.height - layout.bottomBarHeight / 2,
    canvas.width * 0.88,
    ctaSize,
  );
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('blob_failed'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg', 0.92);
  });
}

export async function composeBrandedImageBlob(
  url: string,
  cta = 'Wygeneruj swoje na project-ida.com',
): Promise<Blob> {
  const img = await loadHtmlImage(url);
  const canvas = composeBrandedCanvas(img, cta);
  return canvasToBlob(canvas);
}

export async function downloadShareImage(
  url: string,
  filenameBase = 'ida-interior',
  branded = false,
  cta = 'Wygeneruj swoje na project-ida.com',
): Promise<void> {
  const stamp = Date.now();

  if (branded) {
    try {
      const blob = await composeBrandedImageBlob(url, cta);
      const objectUrl = URL.createObjectURL(blob);
      triggerAnchorDownload(objectUrl, `${filenameBase}-${stamp}.jpg`);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
      return;
    } catch {
      // Fall through to the unbranded file if canvas/CORS fails.
    }
  }

  if (url.startsWith('data:')) {
    const semi = url.indexOf(';');
    const mimePart = semi > 5 ? url.slice(5, semi) : 'image/png';
    triggerAnchorDownload(url, `${filenameBase}-${stamp}.${extensionFromMime(mimePart)}`);
    return;
  }

  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const ct = res.headers.get('content-type') || blob.type;
  const ext = extensionFromMime(ct || '') || extensionFromImageUrl(url) || 'png';
  triggerAnchorDownload(objectUrl, `${filenameBase}-${stamp}.${ext}`);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
}
