import React, { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Share,
  Share2,
  Smartphone,
  WifiOff,
  X,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface PWAInstallButtonProps {
  compact?: boolean;
}

const InstallGuideModal: React.FC<{
  isIOS: boolean;
  isAndroid: boolean;
  isInIframe: boolean;
  isInAppBrowser: boolean;
  isInstallable: boolean;
  appUrl: string;
  chromeIntentUrl: string;
  onInstall: () => Promise<boolean>;
  onClose: () => void;
}> = ({
  isIOS,
  isAndroid,
  isInIframe,
  isInAppBrowser,
  isInstallable,
  appUrl,
  chromeIntentUrl,
  onInstall,
  onClose,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const canShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      setCopiedLink(false);
    }
  };

  const handleShareLink = async () => {
    if (!canShare) {
      await handleCopyLink();
      return;
    }
    try {
      await navigator.share({
        title: 'MputPos — Aplikasi Kasir & Pesanan',
        text: 'Buka dan install aplikasi MputPos di HP Anda:',
        url: appUrl,
      });
    } catch {
      // User cancelled share sheet
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-900">
              Download & Install MputPos
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Pasang langsung ke HP Android, iPhone, atau Laptop agar bisa dibuka
              layaknya aplikasi & tetap jalan saat sinyal lemah.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isInstallable && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
            <p className="text-xs font-semibold text-emerald-900">
              Perangkat Anda mendukung download & install otomatis dalam 1 ketukan:
            </p>
            <button
              type="button"
              onClick={async () => {
                const accepted = await onInstall();
                if (accepted) onClose();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white hover:bg-orange-700 min-h-[46px]"
            >
              <Download className="h-4 w-4" />
              <span>Download & Pasang Sekarang</span>
            </button>
          </div>
        )}

        {(isInIframe || (isAndroid && isInAppBrowser)) && (
          <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50/70 p-3.5 space-y-2.5">
            <p className="text-xs font-semibold text-orange-950">
              {isInAppBrowser
                ? 'Anda membuka link dari browser dalam aplikasi (WebView). Buka di Google Chrome agar tombol Install otomatis muncul:'
                : 'Sedang dibuka di tampilan pratinjau. Buka langsung di tab browser penuh untuk mengunduh aplikasi:'}
            </p>
            <div className="flex flex-wrap gap-2">
              {isAndroid && isInAppBrowser ? (
                <a
                  href={chromeIntentUrl}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-orange-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-orange-700 min-h-[40px]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Buka di Google Chrome</span>
                </a>
              ) : (
                <a
                  href={appUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-orange-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-orange-700 min-h-[40px]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Buka Tab Penuh</span>
                </a>
              )}
            </div>
          </div>
        )}

        {isIOS ? (
          <ol className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            <li className="flex items-start gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
                1
              </span>
              <span>
                Buka link aplikasi di browser{' '}
                <strong className="text-slate-900">Safari</strong>, lalu ketuk
                ikon{' '}
                <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                  <Share className="h-3.5 w-3.5" /> Bagikan (Share)
                </span>
                .
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
                2
              </span>
              <span>
                Pilih{' '}
                <strong className="text-slate-900">
                  Tambah ke Layar Utama (Add to Home Screen)
                </strong>
                .
              </span>
            </li>
          </ol>
        ) : (
          <ol className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            <li className="flex items-start gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
                1
              </span>
              <span>
                Pastikan link dibuka di{' '}
                <strong className="text-slate-900">Google Chrome</strong> (Android
                / Desktop) atau <strong className="text-slate-900">Edge</strong>.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
                2
              </span>
              <span>
                Ketuk menu <strong className="text-slate-900">⋮</strong> di pojok
                kanan atas lalu pilih{' '}
                <strong className="text-slate-900">
                  Install aplikasi / Tambahkan ke layar utama
                </strong>
                .
              </span>
            </li>
          </ol>
        )}

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
          <p className="text-[11px] font-semibold text-slate-500">
            Link Langsung Aplikasi (bisa dibuka di HP lain):
          </p>
          <p className="truncate rounded-lg bg-white px-2.5 py-1.5 font-mono text-[11px] text-slate-700 border border-slate-200">
            {appUrl}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 min-h-[38px]"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Link Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Salin Link</span>
                </>
              )}
            </button>
            {canShare && (
              <button
                type="button"
                onClick={handleShareLink}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 min-h-[38px]"
              >
                <Share2 className="h-3.5 w-3.5 text-orange-600" />
                <span>Bagikan ke HP</span>
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors min-h-[44px]"
        >
          Tutup
        </button>
      </div>
    </div>
  );
};

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
}) => {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    isInIframe,
    isInAppBrowser,
    appUrl,
    chromeIntentUrl,
    wantsInstallFromUrl,
    install,
  } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (wantsInstallFromUrl && !isInstalled) {
      setShowGuide(true);
    }
  }, [wantsInstallFromUrl, isInstalled]);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-orange-700 active:scale-[0.98] whitespace-nowrap shrink-0 min-h-[40px]"
      >
        <Download className="h-4 w-4 shrink-0" />
        <span>{compact ? 'Download App' : 'Download & Install'}</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 active:scale-[0.98] whitespace-nowrap shrink-0 min-h-[40px]"
      >
        <Download className="h-4 w-4 text-orange-600 shrink-0" />
        <span>{compact ? 'Download' : 'Download / Install'}</span>
      </button>

      {showGuide && (
        <InstallGuideModal
          isIOS={isIOS}
          isAndroid={isAndroid}
          isInIframe={isInIframe}
          isInAppBrowser={isInAppBrowser}
          isInstallable={isInstallable}
          appUrl={appUrl}
          chromeIntentUrl={chromeIntentUrl}
          onInstall={install}
          onClose={() => setShowGuide(false)}
        />
      )}
    </>
  );
};

export const PWAInstallCard: React.FC<{ variant?: 'login' | 'settings' }> = ({
  variant = 'login',
}) => {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    isInIframe,
    isInAppBrowser,
    appUrl,
    chromeIntentUrl,
    install,
  } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  const handlePrimaryClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (!ok) setShowGuide(true);
      return;
    }
    setShowGuide(true);
  };

  if (isInstalled && variant === 'login') {
    return null;
  }

  if (isInstalled && variant === 'settings') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2.5">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-emerald-950">
              MputPos Sudah Terpasang di Perangkat
            </p>
            <p className="text-[11px] text-emerald-800">
              Berjalan dalam mode aplikasi mandiri & siap dipakai offline.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Link Aplikasi Tersalin</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Salin Link untuk Perangkat Lain</span>
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-orange-200 bg-orange-50/80 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">
              {isInstallable
                ? 'Aplikasi Siap Di-download & Pasang'
                : 'Pasang Aplikasi MputPos di Perangkat'}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              {isInstallable
                ? 'Klik tombol di bawah untuk mengunduh langsung ke layar utama HP / Desktop.'
                : 'Install langsung tanpa Play Store / App Store agar lebih cepat & tetap jalan offline.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handlePrimaryClick}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-orange-700 min-h-[42px] whitespace-nowrap"
          >
            <Download className="h-4 w-4 shrink-0" />
            <span>
              {isInstallable
                ? 'Download & Install Sekarang'
                : 'Install ke Perangkat'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-orange-200 bg-white px-3.5 py-2.5 text-xs font-bold text-orange-800 hover:bg-orange-100/70 min-h-[42px] whitespace-nowrap"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Salin Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {showGuide && (
        <InstallGuideModal
          isIOS={isIOS}
          isAndroid={isAndroid}
          isInIframe={isInIframe}
          isInAppBrowser={isInAppBrowser}
          isInstallable={isInstallable}
          appUrl={appUrl}
          chromeIntentUrl={chromeIntentUrl}
          onInstall={install}
          onClose={() => setShowGuide(false)}
        />
      )}
    </>
  );
};

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (isInstalled || !isInstallable || dismissed) {
    return null;
  }

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900 truncate">
            Download & Pasang MputPos di Layar Utama HP
          </p>
          <p className="text-[11px] text-slate-600 truncate">
            Buka lebih cepat, mode layar penuh & tetap jalan offline.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={install}
          className="rounded-xl bg-orange-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-orange-700 min-h-[38px] whitespace-nowrap"
        >
          Install
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-orange-100 hover:text-slate-700"
          aria-label="Tutup banner install"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg">
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>Mode Offline — Data tersimpan lokal & sinkron saat online</span>
    </div>
  );
};
