import { useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(() => {
      if (typeof window !== 'undefined' && window.__deferredPWAPrompt) {
        return window.__deferredPWAPrompt as BeforeInstallPromptEvent;
      }
      return null;
    });
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [appUrl, setAppUrl] = useState('');
  const [chromeIntentUrl, setChromeIntentUrl] = useState('');
  const [wantsInstallFromUrl, setWantsInstallFromUrl] = useState(false);

  useEffect(() => {
    const isCapacitorNative = Boolean(
      (
        window as unknown as {
          Capacitor?: { isNativePlatform?: () => boolean };
        }
      ).Capacitor?.isNativePlatform?.()
    );
    const isStandalone =
      isCapacitorNative ||
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent || '';
    const uaLower = ua.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(uaLower) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroidDevice = /android/.test(uaLower);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    const inApp =
      /;\s*wv\)|fban|fbav|instagram|bytedancewebview|musical_ly|trill|line\/|gsa\/|whatsapp|micromessenger/i.test(
        ua
      );
    setIsInAppBrowser(inApp);

    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }

    const origin = window.location.origin;
    setAppUrl(origin);
    setChromeIntentUrl(
      `intent://${window.location.host}${window.location.pathname}#Intent;scheme=https;package=com.android.chrome;end`
    );

    const params = new URLSearchParams(window.location.search);
    if (
      params.get('install') === '1' ||
      params.get('download') === '1' ||
      window.location.hash === '#install'
    ) {
      setWantsInstallFromUrl(true);
    }

    const syncFromWindow = () => {
      if (window.__deferredPWAPrompt) {
        setDeferredPrompt(
          window.__deferredPWAPrompt as BeforeInstallPromptEvent
        );
      }
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      window.__deferredPWAPrompt = e;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.__deferredPWAPrompt = null;
    };

    syncFromWindow();
    window.addEventListener('mputpos-pwa-prompt-ready', syncFromWindow);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('mputpos-pwa-prompt-ready', syncFromWindow);
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    const promptEvent =
      deferredPrompt ||
      (window.__deferredPWAPrompt as BeforeInstallPromptEvent | null);
    if (!promptEvent) return false;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.__deferredPWAPrompt = null;
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    isInIframe,
    isInAppBrowser,
    appUrl,
    chromeIntentUrl,
    wantsInstallFromUrl,
    install,
  };
}
