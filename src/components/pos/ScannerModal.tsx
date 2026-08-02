import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, AlertTriangle, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { startBarcodeScan, playScanBeep, vibrate, ScanHandle } from '../../services/scan';

export type ScanStatus = 'added' | 'error' | 'confirm';

interface ScannerModalProps {
  open: boolean;
  onClose: () => void;
  /** Kembalikan hasil scan: { status, message } untuk ditampilkan di overlay kamera */
  onScan: (code: string) => { status: ScanStatus; message: string } | void;
  title?: string;
  autoCloseOnScan?: boolean;
}

/**
 * Modal scan barcode via kamera (continuous default).
 * Notifikasi sukses/gagal/verifikasi tampil DI ATAS video kamera.
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
  const feedbackTimerRef = useRef<any>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ status: ScanStatus; message: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCameraError(null);
    setFeedback(null);

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
            const res = onScan(d.code);
            const status = (res && res.status) || 'added';
            const message = (res && res.message) || `Barcode ${d.code}`;
            setFeedback({ status, message });
            if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
            feedbackTimerRef.current = setTimeout(() => setFeedback(null), 1400);
            if (autoCloseOnScan && status === 'added') {
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
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, [open]);

  if (!open) return null;

  const feedbackStyle =
    feedback?.status === 'added'
      ? 'bg-emerald-500 text-white'
      : feedback?.status === 'confirm'
      ? 'bg-amber-500 text-white'
      : 'bg-rose-600 text-white';

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

        {/* Notifikasi hasil scan DI ATAS kamera */}
        {feedback && (
          <div className="absolute inset-x-0 top-5 flex justify-center px-4 pointer-events-none">
            <div className={`flex items-center gap-2 ${feedbackStyle} font-black text-sm px-4 py-2.5 rounded-2xl shadow-xl max-w-full`}>
              {feedback.status === 'added' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : feedback.status === 'confirm' ? (
                <HelpCircle className="w-5 h-5 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 shrink-0" />
              )}
              <span className="truncate">{feedback.message}</span>
            </div>
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
        Arahkan kamera ke barcode produk. Kode yang sama tidak discan ganda saat masih terlihat.{' '}
        {autoCloseOnScan
          ? 'Scanner otomatis tertutup setelah 1 pindai.'
          : 'Mode multi-scan: terus pindai barang berikutnya.'}
      </div>
    </div>
  );
};
