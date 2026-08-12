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

export function composeBrandedCanvas(
  img: HTMLImageElement,
  cta: string,
): HTMLCanvasElement {
  const bar = Math.max(52, Math.round(img.height * 0.09));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, img.naturalWidth || img.width);
  canvas.height = Math.max(1, (img.naturalHeight || img.height) + bar);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('no_canvas');
  }

  const imageHeight = img.naturalHeight || img.height;
  ctx.drawImage(img, 0, 0, canvas.width, imageHeight);
  ctx.fillStyle = '#1a1612';
  ctx.fillRect(0, imageHeight, canvas.width, bar);
  ctx.fillStyle = '#d4af37';
  ctx.fillRect(0, imageHeight, canvas.width, 3);
  ctx.fillStyle = '#f5f0e6';
  const fontSize = Math.max(16, Math.round(bar * 0.36));
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(cta, canvas.width / 2, imageHeight + bar / 2);
  return canvas;
}

async function canvasToObjectUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('blob_failed'));
        return;
      }
      resolve(URL.createObjectURL(blob));
    }, 'image/jpeg', 0.92);
  });
}

export async function downloadShareImage(
  url: string,
  filenameBase = 'ida-interior',
  branded = false,
  cta = 'IDA  ·  project-ida.com',
): Promise<void> {
  const stamp = Date.now();

  if (branded) {
    try {
      const img = await loadHtmlImage(url);
      const canvas = composeBrandedCanvas(img, cta);
      const objectUrl = await canvasToObjectUrl(canvas);
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
