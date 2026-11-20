import React, { useState } from 'react';
import {
  BarChart3,
  ClipboardList,
  Settings,
  UtensilsCrossed,
} from 'lucide-react';
import { DashboardView } from './components/DashboardView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FoodImage } from './components/FoodImage';
import { LoginScreen } from './components/LoginScreen';
import { MenuView } from './components/MenuView';
import { OrdersView } from './components/OrdersView';
import {
  OfflineIndicator,
  PWAInstallBanner,
  PWAInstallButton,
} from './components/PWAInstallButton';
import { SettingsView } from './components/SettingsView';
import { StoreProvider, useStore } from './context/StoreContext';
import { DEFAULT_LOGO_URL } from './data/defaults';
import type { AppTab } from './types/mputpos';

const NAV_ITEMS: {
  id: AppTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'orders', label: 'Pesanan', icon: ClipboardList },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
  { id: 'settings', label: 'Pengaturan', icon: Settings },
];

const AppShell: React.FC = () => {
  const { user, isEmailVerified, authReady, dataReady, store } = useStore();
  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    if (typeof window === 'undefined') return 'orders';
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (
      tab === 'orders' ||
      tab === 'dashboard' ||
      tab === 'menu' ||
      tab === 'settings'
    ) {
      return tab;
    }
    return 'orders';
  });

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-orange-100 animate-pulse" />
          <p className="text-sm font-semibold text-slate-600">
            Menyiapkan MputPos...
          </p>
        </div>
      </div>
    );
  }

  if (!user || !isEmailVerified) {
    return <LoginScreen />;
  }

  const brandName = store?.storeName || 'MputPos';
  const brandLogo = store?.logoUrl || DEFAULT_LOGO_URL;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <OfflineIndicator />

      {/* Compact Sticky Top Bar (56px) */}
      <header className="sticky top-0 z-30 h-14 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
          {/* Zone 1: Brand Logo & Single-Line Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 min-h-[40px]"
          >
            <FoodImage
              src={brandLogo}
              alt={brandName}
              className="h-8 w-8 rounded-xl border border-slate-200"
            />
            <span className="font-display text-lg font-extrabold tracking-tight text-slate-900">
              {brandName}
            </span>
          </button>

          {/* Zone 2: Desktop Navigation Links */}
          <nav
            aria-label="Navigasi Utama"
            className="hidden md:flex items-center gap-7"
          >
            {NAV_ITEMS.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative py-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'text-orange-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-orange-600" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center gap-2.5 shrink-0">
            <PWAInstallButton compact />
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100"
              title="Akun & Pengaturan"
              aria-label="Akun & Pengaturan"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Profil'}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-slate-700">
                  {(user.displayName || 'M')[0]}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 pt-4 pb-24 md:pb-10">
        <PWAInstallBanner />
        {!dataReady ? (
          <div className="space-y-4">
            <div className="h-12 w-full rounded-2xl bg-slate-200/70 animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-44 rounded-2xl bg-slate-200/70 animate-pulse" />
              <div className="h-44 rounded-2xl bg-slate-200/70 animate-pulse" />
              <div className="h-44 rounded-2xl bg-slate-200/70 animate-pulse" />
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'orders' && <OrdersView />}
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'menu' && <MenuView />}
            {activeTab === 'settings' && <SettingsView />}
          </>
        )}
      </main>

      {/* Mobile Bottom Tab Bar (60px) */}
      <nav
        aria-label="Navigasi HP"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 backdrop-blur-md pb-safe"
      >
        <div className="grid grid-cols-4 h-[60px] items-center">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 h-full min-h-[44px] transition-colors ${
                  active ? 'text-orange-600' : 'text-slate-500'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'stroke-[2.4]' : 'stroke-[1.9]'}`} />
                <span className="text-[10px] font-bold tracking-tight whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <AppShell />
      </StoreProvider>
    </ErrorBoundary>
  );
}
