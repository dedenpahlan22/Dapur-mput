import React, { useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Eye,
  EyeOff,
  FileSpreadsheet,
  KeyRound,
  LogOut,
  Mail,
  PieChart,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import { DEFAULT_LOGO_URL } from '../data/defaults';
import { useStore } from '../context/StoreContext';
import { FoodImage } from './FoodImage';
import { PWAInstallButton, PWAInstallCard } from './PWAInstallButton';

type AuthMode = 'login' | 'register' | 'reset';

function mapFirebaseAuthError(err: unknown, isCapacitorNative: boolean): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code)
      : '';
  const msg = err instanceof Error ? err.message : '';

  if (
    code === 'auth/popup-closed-by-user' ||
    msg.includes('popup-closed-by-user')
  ) {
    return 'Login dibatalkan. Silakan coba lagi.';
  }
  if (code === 'auth/unauthorized-domain') {
    return `Domain (${window.location.hostname}) belum didaftarkan di Firebase Authentication → Authorized domains.`;
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Login Email & Password belum diaktifkan di Firebase Console (Authentication → Sign-in method → Email/Password).';
  }
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return 'Email atau kata sandi salah. Periksa kembali atau daftar akun baru.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'Email ini sudah terdaftar. Silakan masuk menggunakan tab Masuk.';
  }
  if (code === 'auth/weak-password') {
    return 'Kata sandi terlalu pendek. Gunakan minimal 6 karakter.';
  }
  if (code === 'auth/invalid-email') {
    return 'Format alamat email tidak valid.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.';
  }
  if (isCapacitorNative) {
    return `Login Google web tidak didukung di dalam WebView APK (${code || 'blocked'}). Gunakan login Email & Password di atas.`;
  }
  return `Gagal masuk (${code || msg || 'terjadi kesalahan'}). Coba lagi.`;
}

export const LoginScreen: React.FC = () => {
  const {
    user,
    isEmailVerified,
    loginWithGoogle,
    loginWithEmail,
    registerEmailAccount,
    resendEmailVerification,
    refreshEmailVerification,
    sendPasswordReset,
    logout,
  } = useStore();

  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const isCapacitorNative = Boolean(
    typeof window !== 'undefined' &&
      (
        window as unknown as {
          Capacitor?: { isNativePlatform?: () => boolean };
        }
      ).Capacitor?.isNativePlatform?.()
  );

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setInfoMsg('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err, isCapacitorNative));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg('Masukkan alamat email Anda.');
      return;
    }

    if (mode === 'reset') {
      setLoading(true);
      try {
        await sendPasswordReset(trimmedEmail);
        setInfoMsg(
          'Link reset kata sandi telah dikirim ke email Anda. Periksa kotak masuk atau folder Spam.'
        );
      } catch (err) {
        setErrorMsg(mapFirebaseAuthError(err, isCapacitorNative));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter.');
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        await registerEmailAccount(trimmedEmail, password, name.trim());
        setInfoMsg(
          'Akun dibuat! Silakan buka email Anda untuk verifikasi sebelum masuk.'
        );
      } else {
        await loginWithEmail(trimmedEmail, password);
      }
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err, isCapacitorNative));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    setErrorMsg('');
    setInfoMsg('');
    setLoading(true);
    try {
      const verified = await refreshEmailVerification();
      if (!verified) {
        setErrorMsg(
          'Email belum terverifikasi. Pastikan Anda sudah menekan link verifikasi di kotak masuk atau folder Spam.'
        );
      }
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err, isCapacitorNative));
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setErrorMsg('');
    setInfoMsg('');
    setLoading(true);
    try {
      await resendEmailVerification();
      setInfoMsg(
        'Email verifikasi baru telah dikirim. Periksa kotak masuk atau folder Spam.'
      );
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err, isCapacitorNative));
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
              <span>Sinkronisasi Cloud</span>
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
                    {user && !isEmailVerified
                      ? 'Verifikasi Email Anda'
                      : 'Masuk ke MputPos'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Data pesanan & modal tersimpan aman di akun Anda
                  </p>
                </div>
              </div>

              {user && !isEmailVerified ? (
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950 space-y-2">
                    <div className="flex items-center gap-2 font-bold">
                      <Mail className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>Cek Kotak Masuk Email Anda</span>
                    </div>
                    <p className="leading-relaxed">
                      Kami mengirim link verifikasi ke{' '}
                      <strong className="break-all">{user.email}</strong>. Buka
                      email tersebut (cek juga folder Spam), ketuk linknya, lalu
                      tekan tombol di bawah ini.
                    </p>
                  </div>

                  {errorMsg && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
                      {errorMsg}
                    </div>
                  )}

                  {infoMsg && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700">
                      {infoMsg}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleCheckVerification}
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 py-3.5 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60 min-h-[48px]"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                    />
                    <span>Saya Sudah Verifikasi Email</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={loading}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 min-h-[42px]"
                    >
                      Kirim Ulang Email
                    </button>
                    <button
                      type="button"
                      onClick={() => logout()}
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-60 min-h-[42px]"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Ganti Akun</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-5 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setErrorMsg('');
                        setInfoMsg('');
                      }}
                      className={`rounded-xl py-2 text-xs font-bold transition-colors min-h-[38px] ${
                        mode === 'login' || mode === 'reset'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Masuk
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setErrorMsg('');
                        setInfoMsg('');
                      }}
                      className={`rounded-xl py-2 text-xs font-bold transition-colors min-h-[38px] ${
                        mode === 'register'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Daftar Akun
                    </button>
                  </div>

                  {errorMsg && (
                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
                      {errorMsg}
                    </div>
                  )}

                  {infoMsg && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700">
                      {infoMsg}
                    </div>
                  )}

                  <form onSubmit={handleEmailSubmit} className="mt-4 space-y-3">
                    {mode === 'register' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nama Pemilik / Usaha (Opsional)
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Misal: Dapur Mput"
                          maxLength={80}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none min-h-[44px]"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama@gmail.com"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none min-h-[44px]"
                      />
                    </div>

                    {mode !== 'reset' && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-slate-700">
                            Kata Sandi
                          </label>
                          {mode === 'login' && (
                            <button
                              type="button"
                              onClick={() => {
                                setMode('reset');
                                setErrorMsg('');
                                setInfoMsg('');
                              }}
                              className="text-[11px] font-semibold text-orange-600 hover:text-orange-700"
                            >
                              Lupa sandi?
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            minLength={6}
                            autoComplete={
                              mode === 'register'
                                ? 'new-password'
                                : 'current-password'
                            }
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Minimal 6 karakter"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-3.5 pr-11 py-2.5 text-sm text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none min-h-[44px]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700"
                            aria-label="Tampilkan kata sandi"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {mode === 'register' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Ulangi Kata Sandi
                        </label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Masukkan ulang kata sandi"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none min-h-[44px]"
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 py-3.5 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:opacity-60 active:scale-[0.99] min-h-[48px]"
                    >
                      {mode === 'reset' ? (
                        <KeyRound className="h-4 w-4 shrink-0" />
                      ) : (
                        <Mail className="h-4 w-4 shrink-0" />
                      )}
                      <span>
                        {loading
                          ? 'Memproses...'
                          : mode === 'register'
                            ? 'Daftar dengan Email'
                            : mode === 'reset'
                              ? 'Kirim Link Reset Sandi'
                              : 'Masuk dengan Email'}
                      </span>
                    </button>

                    {mode === 'reset' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('login');
                          setErrorMsg('');
                          setInfoMsg('');
                        }}
                        className="w-full text-center text-xs font-semibold text-slate-600 hover:text-slate-900 py-1"
                      >
                        Kembali ke halaman Masuk
                      </button>
                    )}
                  </form>

                  {!isCapacitorNative && (
                    <>
                      <div className="my-4 flex items-center gap-3">
                        <div className="h-px flex-1 bg-slate-200" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          atau
                        </span>
                        <div className="h-px flex-1 bg-slate-200" />
                      </div>

                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-60 active:scale-[0.99] min-h-[46px]"
                      >
                        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                          <path
                            fill="#EA4335"
                            d="M12 10.2v3.9h5.5c-.24 1.25-.96 2.31-2.04 3.02l3.3 2.56c1.92-1.77 3.04-4.38 3.04-7.48c0-.72-.06-1.41-.19-2.08H12Z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 22c2.75 0 5.06-.91 6.75-2.47l-3.3-2.56c-.91.61-2.08.98-3.45.98c-2.65 0-4.9-1.79-5.7-4.2H2.89v2.64A10.19 10.19 0 0 0 12 22Z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M6.3 13.75a6.12 6.12 0 0 1 0-3.5V7.61H2.89a10.2 10.2 0 0 0 0 8.78l3.41-2.64Z"
                          />
                          <path
                            fill="#4285F4"
                            d="M12 6.05c1.5 0 2.84.52 3.9 1.53l2.92-2.92C17.05 2.99 14.74 2 12 2A10.19 10.19 0 0 0 2.89 7.61l3.41 2.64c.8-2.41 3.05-4.2 5.7-4.2Z"
                          />
                        </svg>
                        <span>Masuk dengan Akun Google</span>
                      </button>
                    </>
                  )}

                  <div className="mt-5 rounded-2xl bg-slate-50 p-3.5 text-[11px] text-slate-600 flex items-start gap-2.5">
                    <Cloud className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                    <p>
                      Menu bawaan (Tahu Walik, Tahu Kocek, Tahu Seuhah, Mango
                      Sago) & modal bahan otomatis disiapkan saat pertama masuk.
                    </p>
                  </div>
                </>
              )}

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
