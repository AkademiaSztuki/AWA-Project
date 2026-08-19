export const STORIES_CANVAS_WIDTH = 1080;
export const STORIES_CANVAS_HEIGHT = 1920;
/** Instagram Stories frame: 9:16 (width / height). */
export const STORIES_ASPECT = STORIES_CANVAS_WIDTH / STORIES_CANVAS_HEIGHT;

/** Warm beige / gold glass — matches IDA marketing and generate UI, not dark serif frames. */
export const STORIES_COLORS = {
  background: '#F6EFE3',
  backgroundHi: '#FFFEF7',
  gold: '#C79833',
  goldSoft: '#DAA520',
  graphite: '#374151',
  muted: '#6B7280',
  whiteGlass: 'rgba(255, 255, 255, 0.72)',
} as const;

export type StoriesPhotoSlot = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type StoriesBrandLayout = {
  canvasWidth: number;
  canvasHeight: number;
  imageX: number;
  imageY: number;
  imageWidth: number;
  imageHeight: number;
  topBarHeight: number;
  bottomBarHeight: number;
  radius: number;
  beforeSlot: StoriesPhotoSlot | null;
  afterSlot: StoriesPhotoSlot;
};

/**
 * 9:16 Stories chrome. Photos use cover-crop slots (little letterboxing).
 * Source dimensions are accepted for callers/tests but the canvas is always 1080×1920.
 * Share cards always pass hasBefore=true (Przed + Po). hasBefore=false is only for
 * legacy cards that were stored without a room photo.
 */
export function storiesBrandLayout(
  _sourceWidth: number,
  _sourceHeight: number,
  hasBefore = false,
): StoriesBrandLayout {
  const canvasWidth = STORIES_CANVAS_WIDTH;
  const canvasHeight = STORIES_CANVAS_HEIGHT;
  const pad = Math.round(canvasWidth * 0.045);
  const topBarHeight = Math.round(canvasHeight * 0.068);
  const bottomBarHeight = Math.round(canvasHeight * 0.092);
  const radius = Math.round(canvasWidth * 0.035);
  const slotX = pad;
  const slotWidth = canvasWidth - pad * 2;
  const availableTop = topBarHeight;
  const availableHeight = canvasHeight - topBarHeight - bottomBarHeight - pad * 0.35;
  const gap = hasBefore ? Math.round(pad * 0.55) : 0;

  let beforeSlot: StoriesPhotoSlot | null = null;
  let afterSlot: StoriesPhotoSlot;

  if (hasBefore) {
    const slotHeight = Math.max(1, Math.round((availableHeight - gap) / 2));
    beforeSlot = { x: slotX, y: availableTop, width: slotWidth, height: slotHeight };
    afterSlot = {
      x: slotX,
      y: availableTop + slotHeight + gap,
      width: slotWidth,
      height: slotHeight,
    };
  } else {
    afterSlot = {
      x: slotX,
      y: availableTop,
      width: slotWidth,
      height: Math.max(1, Math.round(availableHeight)),
    };
  }

  return {
    canvasWidth,
    canvasHeight,
    imageX: afterSlot.x,
    imageY: afterSlot.y,
    imageWidth: afterSlot.width,
    imageHeight: afterSlot.height,
    topBarHeight,
    bottomBarHeight,
    radius,
    beforeSlot,
    afterSlot,
  };
}

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

export function downloadBlobFile(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  triggerAnchorDownload(objectUrl, filename);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
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

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawCoverInRoundedRect(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  slot: StoriesPhotoSlot,
  radius: number,
): void {
  const srcW = Math.max(1, img.naturalWidth || img.width);
  const srcH = Math.max(1, img.naturalHeight || img.height);
  const scale = Math.max(slot.width / srcW, slot.height / srcH);
  const dw = srcW * scale;
  const dh = srcH * scale;
  const dx = slot.x + (slot.width - dw) / 2;
  const dy = slot.y + (slot.height - dh) / 2;

  ctx.save();
  roundedRectPath(ctx, slot.x, slot.y, slot.width, slot.height, radius);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();

  ctx.save();
  roundedRectPath(ctx, slot.x, slot.y, slot.width, slot.height, radius);
  ctx.strokeStyle = 'rgba(199, 152, 51, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawPillLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  slot: StoriesPhotoSlot,
): void {
  const fontSize = Math.max(18, Math.round(slot.width * 0.038));
  ctx.font = `600 ${fontSize}px "Exo 2", "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const padX = Math.round(fontSize * 0.85);
  const padY = Math.round(fontSize * 0.45);
  const textW = ctx.measureText(text).width;
  const w = textW + padX * 2;
  const h = fontSize + padY * 2;
  const x = slot.x + Math.round(slot.width * 0.035);
  const y = slot.y + slot.height - h - Math.round(slot.height * 0.04);
  const r = h / 2;

  ctx.save();
  roundedRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = 'rgba(255, 254, 247, 0.88)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(199, 152, 51, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = STORIES_COLORS.graphite;
  ctx.fillText(text, x + padX, y + h / 2);
  ctx.restore();
}

function drawFittedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  weight: '600' | '700',
  color: string,
): void {
  let size = fontSize;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  do {
    ctx.font = `${weight} ${size}px "Exo 2", "Segoe UI", system-ui, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth || size <= 12) break;
    size -= 1;
  } while (size > 12);
  ctx.fillText(text, x, y, maxWidth);
}

function paintWarmBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, STORIES_COLORS.backgroundHi);
  gradient.addColorStop(0.45, STORIES_COLORS.background);
  gradient.addColorStop(1, '#E8D9B8');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(width * 0.5, height * 0.18, 20, width * 0.5, height * 0.18, width * 0.7);
  glow.addColorStop(0, 'rgba(255, 215, 0, 0.16)');
  glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

export function composeBrandedCanvas(
  afterImg: HTMLImageElement,
  cta: string,
  beforeImg?: HTMLImageElement | null,
  labels?: { before: string; after: string },
): HTMLCanvasElement {
  const srcW = Math.max(1, afterImg.naturalWidth || afterImg.width);
  const srcH = Math.max(1, afterImg.naturalHeight || afterImg.height);
  const hasBefore = Boolean(beforeImg);
  const layout = storiesBrandLayout(srcW, srcH, hasBefore);
  const canvas = document.createElement('canvas');
  canvas.width = layout.canvasWidth;
  canvas.height = layout.canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('no_canvas');
  }

  paintWarmBackground(ctx, canvas.width, canvas.height);

  const beforeLabel = labels?.before ?? 'Twój pokój';
  const afterLabel = labels?.after ?? 'IDA';

  if (hasBefore && beforeImg && layout.beforeSlot) {
    drawCoverInRoundedRect(ctx, beforeImg, layout.beforeSlot, layout.radius);
    drawPillLabel(ctx, beforeLabel, layout.beforeSlot);
    drawCoverInRoundedRect(ctx, afterImg, layout.afterSlot, layout.radius);
    drawPillLabel(ctx, afterLabel, layout.afterSlot);
  } else {
    drawCoverInRoundedRect(ctx, afterImg, layout.afterSlot, layout.radius);
  }

  const wordmarkSize = Math.max(28, Math.round(layout.topBarHeight * 0.42));
  drawFittedText(
    ctx,
    'IDA',
    canvas.width / 2,
    layout.topBarHeight * 0.52,
    canvas.width * 0.7,
    wordmarkSize,
    '700',
    STORIES_COLORS.graphite,
  );

  const ctaSize = Math.max(18, Math.round(layout.bottomBarHeight * 0.28));
  drawFittedText(
    ctx,
    cta,
    canvas.width / 2,
    canvas.height - layout.bottomBarHeight * 0.52,
    canvas.width * 0.86,
    ctaSize,
    '600',
    STORIES_COLORS.graphite,
  );
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('blob_failed'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      0.92,
    );
  });
}

export async function composeBrandedImageBlob(
  url: string,
  cta = 'Wygeneruj swoje na project-ida.com',
  beforeUrl?: string | null,
  labels?: { before: string; after: string },
): Promise<Blob> {
  const afterImg = await loadHtmlImage(url);
  let beforeImg: HTMLImageElement | null = null;
  if (beforeUrl) {
    try {
      beforeImg = await loadHtmlImage(beforeUrl);
    } catch {
      beforeImg = null;
    }
  }
  const canvas = composeBrandedCanvas(afterImg, cta, beforeImg, labels);
  return canvasToBlob(canvas);
}

export async function downloadShareImage(
  url: string,
  filenameBase = 'ida-interior',
  branded = false,
  cta = 'Wygeneruj swoje na project-ida.com',
  beforeUrl?: string | null,
  labels?: { before: string; after: string },
): Promise<void> {
  const stamp = Date.now();

  if (branded) {
    try {
      const blob = await composeBrandedImageBlob(url, cta, beforeUrl, labels);
      downloadBlobFile(blob, `${filenameBase}-${stamp}.jpg`);
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
