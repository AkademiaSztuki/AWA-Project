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

export async function downloadShareImage(url: string, filenameBase = 'ida-interior'): Promise<void> {
  const stamp = Date.now();
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
