import type { Timestamp } from 'firebase/firestore';
import { BLUEPRINT_LIMITS } from '../types/mputpos';

export function formatRp(value: number): string {
  const safe = Number.isFinite(value) ? Math.round(value) : 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safe);
}

export function formatTimeShort(ts?: Timestamp | null): string {
  if (!ts) return 'Baru saja';
  try {
    const d = ts.toDate();
    return d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Baru saja';
  }
}

export function createSafeId(prefix = 'id'): string {
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) || 'id';
  const rand =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 14)
      : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const candidate = `${cleanPrefix}_${rand}`;
  return candidate.slice(0, BLUEPRINT_LIMITS.ID_MAX);
}

export function sanitizeStr(val: string, maxLen: number): string {
  return val.trim().slice(0, maxLen);
}

export function sanitizeNonNegNumber(val: unknown): number {
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.round(num);
}

/**
 * Compresses an image file selected from the device gallery/album
 * so it stays well within Firestore's document size limits and syncs across devices.
 */
export async function compressImageFromFile(
  file: File,
  maxDimension = 420,
  maxChars = 180000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak didukung.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height / width) * maxDimension);
            width = maxDimension;
          } else {
            width = Math.round((width / height) * maxDimension);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas tidak tersedia di perangkat ini.'));
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        let quality = 0.78;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > maxChars && quality > 0.3) {
          quality -= 0.12;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        if (dataUrl.length > maxChars) {
          // Final downscale pass if image is extraordinarily detailed
          const smallCanvas = document.createElement('canvas');
          smallCanvas.width = Math.max(1, Math.round(canvas.width * 0.65));
          smallCanvas.height = Math.max(1, Math.round(canvas.height * 0.65));
          const sCtx = smallCanvas.getContext('2d');
          if (sCtx) {
            sCtx.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);
            dataUrl = smallCanvas.toDataURL('image/jpeg', 0.6);
          }
        }

        resolve(dataUrl.slice(0, maxChars));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
