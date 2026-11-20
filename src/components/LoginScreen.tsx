import React, { useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  FileSpreadsheet,
  PieChart,
  Smartphone,
} from 'lucide-react';
import { DEFAULT_LOGO_URL } from '../data/defaults';
import { useStore } from '../context/StoreContext';
import { FoodImage } from './FoodImage';
import { PWAInstallButton, PWAInstallCard } from './PWAInstallButton';

export const LoginScreen: React.FC = () => {
  const { loginWithGoogle } = useStore();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal masuk dengan Google.';
      if (msg.includes('popup-closed-by-user')) {
        setErrorMsg('Login dibatalkan. Silakan coba lagi.');
      } else {
        setErrorMsg('Gagal masuk ke akun Google. Pastikan pop-up diizinkan.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="w-full border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 h-14">
          <div className="flex items-center gap-2.5 shrink-0">
            <FoodImage
              src={DEFAULT_LOGO_URL}
              alt="Logo MputPos"
              className="h-8 w-8 rounded-xl border border-slate-200"
            />
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
              MputPos
            </span>
          </div>
          <PWAInstallButton compact />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
              <span>Kasir HP & PWA</span>
              <span aria-hidden="true">·</span>
              <span>Sinkronisasi Cloud Google</span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 text-balance leading-[1.15]">
              Catat pesanan kuliner, pantau modal, dan hitung omset bersih lebih rapi.
            </h1>

            <p className="text-base text-slate-600 max-w-xl leading-relaxed">
              Dirancang khusus untuk jualan harian seperti Tahu Walik, Tahu Kocek,
              Tahu Seuhah, dan Mango Sago. Pisahkan pesanan per sheet tanggal,
              filter per area, cek status bayar, lalu ekspor ke Spreadsheet.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Sheet Tanggal & Filter Area
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Pisah batch tanggal 11, 12 dan ubah nama area sesuai rute.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <PieChart className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Hitung Modal & Laba Bersih
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Input harga terigu, sagu, tahu, ayam untuk lihat omset kotor & bersih.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Ekspor Spreadsheet
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Unduh file Excel (.xlsx) atau CSV siap buka di Google Sheets.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Siap Install di HP
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Bisa dipasang di layar utama Android & iPhone serta sinkron antar perangkat.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3.5">
                <FoodImage
                  src={DEFAULT_LOGO_URL}
                  alt="MputPos"
                  className="h-14 w-14 rounded-2xl border border-slate-200"
                />
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900">
                    Masuk ke MputPos
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Data pesanan & modal tersimpan aman di akun Google Anda
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <Cloud className="h-4 w-4 text-orange-600 shrink-0" />
                  <span>Sinkronisasi Otomatis Multi-Perangkat</span>
                </div>
                <p>
                  Pesanan yang dicatat di HP langsung muncul jika Anda buka di tablet
                  atau laptop menggunakan akun Google yang sama.
                </p>
              </div>

              {errorMsg && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
                  {errorMsg}
                </div>
              )}

              <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-orange-600 px-5 py-3.5 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:opacity-60 active:scale-[0.99] min-h-[48px]"
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81Z"
                  />
                </svg>
                <span>
                  {loading ? 'Menghubungkan Akun...' : 'Masuk dengan Akun Google'}
                </span>
              </button>

              <p className="mt-4 text-center text-[11px] text-slate-400">
                Menu bawaan (Tahu Walik, Tahu Kocek, Tahu Seuhah, Mango Sago) & modal
                bahan otomatis disiapkan saat pertama masuk.
              </p>

              <div className="mt-5 pt-5 border-t border-slate-100">
                <PWAInstallCard variant="login" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
