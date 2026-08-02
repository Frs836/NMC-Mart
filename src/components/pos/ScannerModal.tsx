import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, AlertTriangle } from 'lucide-react';
import { startBarcodeScan, playScanBeep, vibrate, ScanHandle } from '../../services/scan';

interface ScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
  autoCloseOnScan?: boolean;
}

/**
 * Modal scan barcode via kamera (continuous default).
 * Dipakai dari POS (scan ke keranjang) & form produk (isi field barcode).
 */
export const ScannerModal: React.FC<ScannerModalProps> = ({
  open,
  onClose,
  onScan,
  title = 'Pindai Barcode',
  autoCloseOnScan = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanRef = useRef<ScanHandle | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastCode, setLastCode] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCameraError(null);
    setLastCode(null);

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          scanRef.current = startBarcodeScan(video, (d) => {
            setLastCode(d.code);
            playScanBeep(true);
            vibrate(60);
            onScan(d.code);
            if (autoCloseOnScan) {
              setTimeout(() => onClose(), 400);
            }
          });
        }
      } catch (e: any) {
        if (!cancelled) {
          setCameraError(
            e?.name === 'NotAllowedError'
              ? 'Izin kamera ditolak. Izinkan akses kamera di pengaturan browser, lalu coba lagi.'
              : e?.message || 'Gagal mengakses kamera.'
          );
        }
      }
    };
    start();

    return () => {
      cancelled = true;
      if (scanRef.current) {
        scanRef.current.stop();
        scanRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col">
      <div className="flex items-center justify-between p-4 text-white">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-emerald-400" />
          <h3 className="font-extrabold text-sm">{title}</h3>
        </div>
        <button
          onClick={onClose}
          className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
          aria-label="Tutup scanner"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 w-full h-full object-cover" />
        {/* Viewfinder Frame */}
        <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-36 border-2 border-emerald-400 rounded-2xl opacity-70 pointer-events-none" />
        {lastCode && (
          <div className="absolute inset-x-0 top-5 flex justify-center pointer-events-none">
            <span className="bg-emerald-500 text-white font-mono font-bold text-xs px-3 py-1.5 rounded-full shadow-lg">
              ✓ {lastCode}
            </span>
          </div>
        )}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
            <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
            <p className="text-white text-xs font-semibold max-w-xs">{cameraError}</p>
          </div>
        )}
      </div>

      <div className="p-4 text-center text-white/70 text-[11px] font-semibold">
        Arahkan kamera ke barcode produk.{' '}
        {autoCloseOnScan
          ? 'Scanner otomatis tertutup setelah 1 pindai.'
          : 'Mode multi-scan: terus pindai barang berikutnya.'}
      </div>
    </div>
  );
};
