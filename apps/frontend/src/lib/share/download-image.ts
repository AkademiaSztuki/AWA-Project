import { SHARE_SIGNUP_CREDITS, shareOgCopy } from './captions';

export const STORIES_CANVAS_WIDTH = 1080;
export const STORIES_CANVAS_HEIGHT = 1920;
/** Instagram Stories frame: 9:16 (width / height). */
export const STORIES_ASPECT = STORIES_CANVAS_WIDTH / STORIES_CANVAS_HEIGHT;

/** Warm beige / gold glass — matches IDA marketing and the public /s card, not dark serif or neon. */
export const STORIES_COLORS = {
  background: '#F6EFE3',
  backgroundHi: '#FFFEF7',
  gold: '#C79833',
  goldSoft: '#DAA520',
  goldFill: 'rgba(255, 215, 0, 0.42)',
  goldBorder: 'rgba(255, 215, 0, 0.8)',
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

export type StoriesBrandCopy = {
  cta?: string;
  headline?: string;
  footer?: string;
  siteLabel?: string;
  metaLine?: string | null;
  labels?: { before: string; after: string };
  beforeFallbackUrl?: string | null;
};

export const STORIES_DEFAULT_COPY: {
  cta: string;
  headline: string;
  footer: string;
  siteLabel: string;
} = {
  cta: 'Wygeneruj swoją koncepcję',
  headline: shareOgCopy('pl').title,
  footer: `${SHARE_SIGNUP_CREDITS} darmowych kredytów po założeniu konta · project-ida.com`,
  siteLabel: 'project-ida.com',
};

export type StoriesBrandLayout = {
  canvasWidth: number;
  canvasHeight: number;
  pad: number;
  imageX: number;
  imageY: number;
  imageWidth: number;
  imageHeight: number;
  topBarHeight: number;
  bottomBarHeight: number;
  radius: number;
  badgeSize: number;
  beforeSlot: StoriesPhotoSlot;
  afterSlot: StoriesPhotoSlot;
  headlineY: number;
  metaY: number;
  pill: StoriesPhotoSlot;
  footerY: number;
};

/**
 * 9:16 Stories chrome matching the public /s card: header, stacked Przed/Po,
 * headline, gold pill CTA, credits footer. Canvas is always 1080×1920.
 */
export function storiesBrandLayout(
  _sourceWidth = 1,
  _sourceHeight = 1,
): StoriesBrandLayout {
  const canvasWidth = STORIES_CANVAS_WIDTH;
  const canvasHeight = STORIES_CANVAS_HEIGHT;
  const pad = Math.round(canvasWidth * 0.055);
  const badgeSize = Math.round(canvasWidth * 0.068);
  const headerGap = Math.round(pad * 0.55);
  const topBarHeight = pad + badgeSize + headerGap;
  const radius = Math.round(canvasWidth * 0.032);
  const slotX = pad;
  const slotWidth = canvasWidth - pad * 2;

  const headlineBlock = Math.round(canvasHeight * 0.056);
  const metaBlock = Math.round(canvasHeight * 0.022);
  const pillHeight = Math.round(canvasHeight * 0.036);
  const footerBlock = Math.round(canvasHeight * 0.02);
  const stackGap = Math.round(pad * 0.32);
  const bottomBarHeight =
    headlineBlock + metaBlock + pillHeight + footerBlock + stackGap * 3 + pad;

  const photoGap = Math.round(pad * 0.38);
  const availableTop = topBarHeight;
  const availableHeight = canvasHeight - topBarHeight - bottomBarHeight;
  const slotHeight = Math.max(1, Math.round((availableHeight - photoGap) / 2));

  const beforeSlot: StoriesPhotoSlot = {
    x: slotX,
    y: availableTop,
    width: slotWidth,
    height: slotHeight,
  };
  const afterSlot: StoriesPhotoSlot = {
    x: slotX,
    y: availableTop + slotHeight + photoGap,
    width: slotWidth,
    height: slotHeight,
  };

  const copyTop = afterSlot.y + afterSlot.height + stackGap;
  const headlineY = copyTop + Math.round(headlineBlock * 0.42);
  const metaY = copyTop + headlineBlock + Math.round(metaBlock * 0.35);
  const pillY = copyTop + headlineBlock + metaBlock + stackGap;
  const footerY = pillY + pillHeight + stackGap + Math.round(footerBlock * 0.35);

  return {
    canvasWidth,
    canvasHeight,
    pad,
    imageX: afterSlot.x,
    imageY: afterSlot.y,
    imageWidth: afterSlot.width,
    imageHeight: afterSlot.height,
    topBarHeight,
    bottomBarHeight,
    radius,
    badgeSize,
    beforeSlot,
    afterSlot,
    headlineY,
    metaY,
    pill: { x: slotX, y: pillY, width: slotWidth, height: pillHeight },
    footerY,
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

async function loadRequiredImage(url: string | null | undefined, errorCode: string): Promise<HTMLImageElement> {
  const trimmed = url?.trim() || '';
  if (!trimmed) {
    throw new Error(errorCode);
  }
  try {
    return await loadHtmlImage(trimmed);
  } catch {
    throw new Error(errorCode);
  }
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

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  font: string,
): string[] {
  ctx.font = font;
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text];
}

function drawLeftText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string,
): void {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function paintWarmBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, STORIES_COLORS.backgroundHi);
  gradient.addColorStop(0.45, STORIES_COLORS.background);
  gradient.addColorStop(1, '#E8D9B8');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(
    width * 0.5,
    height * 0.18,
    20,
    width * 0.5,
    height * 0.18,
    width * 0.7,
  );
  glow.addColorStop(0, 'rgba(255, 215, 0, 0.16)');
  glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

function paintGlassCard(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const inset = Math.round(width * 0.018);
  const radius = Math.round(width * 0.055);
  roundedRectPath(ctx, inset, inset, width - inset * 2, height - inset * 2, radius);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawShareHeader(ctx: CanvasRenderingContext2D, layout: StoriesBrandLayout, siteLabel: string): void {
  const { pad, badgeSize } = layout;
  const cx = pad + badgeSize / 2;
  const cy = pad + badgeSize / 2;

  const badge = ctx.createLinearGradient(cx - badgeSize / 2, cy - badgeSize / 2, cx + badgeSize / 2, cy + badgeSize / 2);
  badge.addColorStop(0, 'rgba(199, 152, 51, 0.55)');
  badge.addColorStop(0.5, 'rgba(247, 231, 206, 0.85)');
  badge.addColorStop(1, 'rgba(199, 152, 51, 0.35)');

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, badgeSize / 2, 0, Math.PI * 2);
  ctx.fillStyle = badge;
  ctx.fill();
  ctx.strokeStyle = 'rgba(199, 152, 51, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = `700 ${Math.round(badgeSize * 0.32)}px "Exo 2", "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = STORIES_COLORS.graphite;
  ctx.fillText('IDA', cx, cy);
  ctx.restore();

  drawLeftText(
    ctx,
    siteLabel,
    pad + badgeSize + Math.round(pad * 0.35),
    cy,
    `600 ${Math.max(22, Math.round(badgeSize * 0.38))}px "Exo 2", "Segoe UI", system-ui, sans-serif`,
    'rgba(55, 65, 81, 0.8)',
  );
}

function drawGoldCtaPill(ctx: CanvasRenderingContext2D, text: string, slot: StoriesPhotoSlot): void {
  ctx.save();
  roundedRectPath(ctx, slot.x, slot.y, slot.width, slot.height, slot.height / 2);
  ctx.fillStyle = STORIES_COLORS.goldFill;
  ctx.fill();
  ctx.strokeStyle = STORIES_COLORS.goldBorder;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = `600 ${Math.max(22, Math.round(slot.height * 0.42))}px "Exo 2", "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = STORIES_COLORS.graphite;
  ctx.fillText(text, slot.x + slot.width / 2, slot.y + slot.height / 2, slot.width * 0.9);
  ctx.restore();
}

export function composeBrandedCanvas(
  afterImg: HTMLImageElement,
  beforeImg: HTMLImageElement,
  copy?: StoriesBrandCopy,
): HTMLCanvasElement {
  if (!beforeImg) {
    throw new Error('before_image_required');
  }

  const srcW = Math.max(1, afterImg.naturalWidth || afterImg.width);
  const srcH = Math.max(1, afterImg.naturalHeight || afterImg.height);
  const layout = storiesBrandLayout(srcW, srcH);
  const canvas = document.createElement('canvas');
  canvas.width = layout.canvasWidth;
  canvas.height = layout.canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('no_canvas');
  }

  const headline = copy?.headline?.trim() || STORIES_DEFAULT_COPY.headline;
  const cta = copy?.cta?.trim() || STORIES_DEFAULT_COPY.cta;
  const footer = copy?.footer?.trim() || STORIES_DEFAULT_COPY.footer;
  const siteLabel = copy?.siteLabel?.trim() || STORIES_DEFAULT_COPY.siteLabel;
  const metaLine = copy?.metaLine?.trim() || '';
  const beforeLabel = copy?.labels?.before ?? 'Przed';
  const afterLabel = copy?.labels?.after ?? 'Po';

  paintWarmBackground(ctx, canvas.width, canvas.height);
  paintGlassCard(ctx, canvas.width, canvas.height);
  drawShareHeader(ctx, layout, siteLabel);

  drawCoverInRoundedRect(ctx, beforeImg, layout.beforeSlot, layout.radius);
  drawPillLabel(ctx, beforeLabel, layout.beforeSlot);
  drawCoverInRoundedRect(ctx, afterImg, layout.afterSlot, layout.radius);
  drawPillLabel(ctx, afterLabel, layout.afterSlot);

  const headlineMaxWidth = layout.beforeSlot.width;
  let headlineFontSize = Math.max(26, Math.round(layout.canvasWidth * 0.038));
  let headlineFont = `700 ${headlineFontSize}px "Exo 2", "Segoe UI", system-ui, sans-serif`;
  let headlineLines = wrapTextLines(ctx, headline, headlineMaxWidth, headlineFont);
  let lineHeight = Math.round(headlineFontSize * 1.12);
  while (
    headlineFontSize > 22 &&
    (headlineLines.length > 2 || layout.headlineY + (headlineLines.length - 1) * lineHeight > layout.metaY - 4)
  ) {
    headlineFontSize -= 2;
    headlineFont = `700 ${headlineFontSize}px "Exo 2", "Segoe UI", system-ui, sans-serif`;
    headlineLines = wrapTextLines(ctx, headline, headlineMaxWidth, headlineFont);
    lineHeight = Math.round(headlineFontSize * 1.12);
  }
  headlineLines.slice(0, 2).forEach((line, index) => {
    drawLeftText(
      ctx,
      line,
      layout.pad,
      layout.headlineY + index * lineHeight,
      headlineFont,
      STORIES_COLORS.graphite,
    );
  });

  if (metaLine) {
    drawLeftText(
      ctx,
      metaLine,
      layout.pad,
      layout.metaY,
      `400 ${Math.max(18, Math.round(layout.canvasWidth * 0.024))}px "Exo 2", "Segoe UI", system-ui, sans-serif`,
      'rgba(55, 65, 81, 0.7)',
    );
  }

  drawGoldCtaPill(ctx, cta, layout.pill);

  ctx.save();
  ctx.font = `400 ${Math.max(16, Math.round(layout.canvasWidth * 0.022))}px "Exo 2", "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(55, 65, 81, 0.6)';
  ctx.fillText(footer, canvas.width / 2, layout.footerY, layout.beforeSlot.width);
  ctx.restore();

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
  cta = STORIES_DEFAULT_COPY.cta,
  beforeUrl?: string | null,
  labels?: { before: string; after: string },
  extras?: StoriesBrandCopy,
): Promise<Blob> {
  const beforeCandidates = [beforeUrl, extras?.beforeFallbackUrl]
    .map((candidate) => candidate?.trim() || '')
    .filter(Boolean);
  if (beforeCandidates.length === 0) {
    throw new Error('before_image_required');
  }

  const afterImg = await loadRequiredImage(url, 'image_load_failed');
  let beforeImg: HTMLImageElement | null = null;
  for (const candidate of beforeCandidates) {
    try {
      beforeImg = await loadHtmlImage(candidate);
      break;
    } catch {
      beforeImg = null;
    }
  }
  if (!beforeImg) {
    throw new Error('before_image_load_failed');
  }
  const canvas = composeBrandedCanvas(afterImg, beforeImg, {
    ...extras,
    cta,
    labels: labels ?? extras?.labels,
  });
  return canvasToBlob(canvas);
}

export async function downloadShareImage(
  url: string,
  filenameBase = 'ida-interior',
  branded = false,
  cta = STORIES_DEFAULT_COPY.cta,
  beforeUrl?: string | null,
  labels?: { before: string; after: string },
  extras?: StoriesBrandCopy,
): Promise<void> {
  const stamp = Date.now();

  if (branded) {
    const blob = await composeBrandedImageBlob(url, cta, beforeUrl, labels, extras);
    downloadBlobFile(blob, `${filenameBase}-${stamp}.jpg`);
    return;
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
