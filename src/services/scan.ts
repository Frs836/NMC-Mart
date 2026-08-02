import { BrowserMultiFormatReader } from '@zxing/library';

export interface BarcodeDetection {
  code: string;
  format: string;
}

export interface ScanHandle {
  stop: () => void;
}

let zxingReader: BrowserMultiFormatReader | null = null;

function isNativeSupported(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

/**
 * Mulai scan barcode kontinu dari video element.
 * Prioritas: BarcodeDetector native (Chrome/Edge Android, iOS Safari 16.4+).
 * Fallback: @zxing/library (decode frame).
 * Ada jeda anti re-scan agar kode yang sama tidak terdeteksi ganda beruntun.
 */
export function startBarcodeScan(
  video: HTMLVideoElement,
  onDetect: (detection: BarcodeDetection) => void,
  minGapMs = 600
): ScanHandle {
  let running = true;
  let lastScanAt = 0;

  const emit = (d: BarcodeDetection | null) => {
    if (!running || !d || !d.code) return;
    const now = Date.now();
    if (now - lastScanAt < minGapMs) return;
    lastScanAt = now;
    onDetect(d);
  };

  const stop = () => {
    running = false;
    try {
      if (zxingReader) {
        zxingReader.reset();
      }
    } catch (e) {
      /* ignore */
    }
  };

  if (isNativeSupported()) {
    const BarcodeDetectorCtor = (window as any).BarcodeDetector;
    let detector: any;
    try {
      detector = new BarcodeDetectorCtor({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code']
      });
    } catch (e) {
      detector = new BarcodeDetectorCtor();
    }

    const loop = async () => {
      while (running) {
        try {
          if (video.readyState >= 1 && !video.paused) {
            const barcodes = await detector.detect(video);
            if (barcodes && barcodes.length > 0) {
              emit({ code: String(barcodes[0].rawValue), format: String(barcodes[0].format || '') });
            }
          }
        } catch (e) {
          /* frame decode gagal — lanjutkan */
        }
        await new Promise((r) => setTimeout(r, 150));
      }
    };
    loop();
    return { stop };
  }

  // Fallback @zxing
  try {
    if (!zxingReader) {
      zxingReader = new BrowserMultiFormatReader();
    }
    zxingReader.decodeFromVideoElementContinuously(video, (result) => {
      if (result && result.getText()) {
        emit({ code: result.getText(), format: String(result.getBarcodeFormat() || '') });
      }
    });
  } catch (e) {
    console.warn('Zxing scan init error:', e);
  }
  return { stop };
}

/** Bunyi umpan balik scan (ok = sukses, error = nada gagal) */
export function playScanBeep(ok: boolean) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(ok ? 880 : 220, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
    osc.onended = () => ctx.close().catch(() => {});
  } catch (e) {
    /* audio diblokir browser */
  }
}

/** Getar singkat (HP) */
export function vibrate(pattern: number | number[] = 50) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch (e) {
    /* unsupported */
  }
}
