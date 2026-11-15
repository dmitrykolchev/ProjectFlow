import { getTranslation } from '../../i18n';
import { DocumentItem } from '../../types';

export const MAX_PREVIEW_BYTES = Math.round(1.5 * 1024 * 1024); // 1.5 MB

const TEXT_EXTENSIONS = new Set([
  'md',
  'markdown',
  'txt',
  'json',
  'csv',
  'tsv',
  'sql',
  'xml',
  'yaml',
  'yml',
  'ts',
  'tsx',
  'js',
  'jsx',
  'css',
  'html',
  'htm',
  'svg',
  'log',
  'ini',
  'conf',
  'sh',
  'env',
]);

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico']);

export interface ReadFilePayload {
  fileName: string;
  extension: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl?: string;
  textContent?: string;
  truncatedNote?: string;
}

export function extractExtension(fileName: string): string {
  const parts = fileName.trim().split('.');
  if (parts.length < 2) return '';
  return (parts.pop() || '').toLowerCase();
}

export function guessMimeType(ext: string): string {
  switch (ext.toLowerCase()) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    case 'md':
    case 'markdown':
      return 'text/markdown';
    case 'json':
      return 'application/json';
    case 'csv':
      return 'text/csv';
    case 'sql':
      return 'application/sql';
    case 'txt':
    case 'log':
      return 'text/plain';
    case 'html':
    case 'htm':
      return 'text/html';
    case 'xml':
      return 'application/xml';
    case 'yaml':
    case 'yml':
      return 'text/yaml';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'zip':
      return 'application/zip';
    default:
      return 'application/octet-stream';
  }
}

export function isTextMimeOrExt(mime: string, ext: string): boolean {
  const normalizedExt = (ext || '').toLowerCase();
  if (TEXT_EXTENSIONS.has(normalizedExt)) return true;
  const m = (mime || '').toLowerCase();
  return (
    m.startsWith('text/') ||
    m === 'application/json' ||
    m === 'application/sql' ||
    m === 'application/xml' ||
    m === 'image/svg+xml'
  );
}

export function isImageMimeOrExt(mime: string, ext: string): boolean {
  const normalizedExt = (ext || '').toLowerCase();
  if (IMAGE_EXTENSIONS.has(normalizedExt)) return true;
  return (mime || '').toLowerCase().startsWith('image/');
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error || new Error('FileReader dataURL error'));
    reader.readAsDataURL(file);
  });
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error || new Error('FileReader text error'));
    reader.readAsText(file, 'utf-8');
  });
}

export async function readBrowserFile(
  file: File,
  tooLargeNote?: string
): Promise<ReadFilePayload> {
  const fileName = file.name || 'document';
  const extension = extractExtension(fileName);
  const mimeType = file.type || guessMimeType(extension);
  const sizeBytes = file.size || 0;

  if (sizeBytes > MAX_PREVIEW_BYTES) {
    let textContent: string | undefined;
    if (isTextMimeOrExt(mimeType, extension) && extension !== 'svg') {
      try {
        const partialBlob = file.slice(0, 64 * 1024);
        const partialFile = new File([partialBlob], fileName, { type: mimeType });
        textContent = await readAsText(partialFile);
      } catch {
        textContent = undefined;
      }
    }
    return {
      fileName,
      extension,
      mimeType,
      sizeBytes,
      textContent,
      truncatedNote: tooLargeNote,
    };
  }

  let dataUrl: string | undefined;
  let textContent: string | undefined;

  if (isTextMimeOrExt(mimeType, extension)) {
    try {
      textContent = await readAsText(file);
    } catch {
      textContent = undefined;
    }
  }

  try {
    dataUrl = await readAsDataUrl(file);
  } catch {
    dataUrl = undefined;
  }

  return {
    fileName,
    extension,
    mimeType,
    sizeBytes,
    dataUrl,
    textContent,
  };
}

export function formatFileSize(bytes: number, t: ReturnType<typeof getTranslation>): string {
  const safe = Math.max(0, Number(bytes) || 0);
  if (safe < 1024) {
    return `${safe} ${t.viewTexts.documents.unitsBytes}`;
  }
  const kb = safe / 1024;
  if (kb < 1024) {
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} ${t.viewTexts.documents.unitsKb}`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 2 : 1)} ${t.viewTexts.documents.unitsMb}`;
}

export function downloadDocumentFile(doc: DocumentItem): void {
  const link = document.createElement('a');
  const fileName = doc.fileName || `${doc.title || 'document'}.${doc.extension || 'txt'}`;
  let revokeUrl: string | null = null;

  if (doc.dataUrl) {
    link.href = doc.dataUrl;
  } else {
    const content =
      doc.textContent ||
      [
        `Document: ${doc.title}`,
        `File: ${fileName}`,
        `Version: v${doc.version}`,
        `Category: ${doc.category}`,
        `Status: ${doc.status}`,
        `Updated: ${doc.updatedAt}`,
        '',
        doc.description || '',
      ].join('\n');
    const blob = new Blob([content], { type: doc.mimeType || 'text/plain;charset=utf-8' });
    revokeUrl = URL.createObjectURL(blob);
    link.href = revokeUrl;
  }

  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (revokeUrl) {
    window.setTimeout(() => URL.revokeObjectURL(revokeUrl!), 1000);
  }
}

export function getSafeExternalUrl(raw?: string): string | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
