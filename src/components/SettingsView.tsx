import React, { useEffect, useState } from 'react';
import {
  Camera,
  Check,
  Cloud,
  LogOut,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Sheet as SheetIcon,
  Trash2,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { DEFAULT_LOGO_URL } from '../data/defaults';
import { compressImageFromFile } from '../utils/format';
import { FoodImage } from './FoodImage';
import { PWAInstallCard } from './PWAInstallButton';

export const SettingsView: React.FC = () => {
  const {
    user,
    store,
    sheets,
    areas,
    updateStoreBranding,
    createSheet,
    renameSheet,
    deleteSheet,
    createArea,
    renameArea,
    deleteArea,
    logout,
  } = useStore();

  const [storeName, setStoreName] = useState(store?.storeName || 'MputPos');
  const [logoUrl, setLogoUrl] = useState(store?.logoUrl || DEFAULT_LOGO_URL);
  const [savingBrand, setSavingBrand] = useState(false);
  const [brandSavedMsg, setBrandSavedMsg] = useState('');

  // Sheets management
  const [newSheetName, setNewSheetName] = useState('');
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [editSheetName, setEditSheetName] = useState('');
  const [confirmDeleteSheetId, setConfirmDeleteSheetId] = useState<string | null>(null);

  // Areas management
  const [newAreaName, setNewAreaName] = useState('');
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editAreaName, setEditAreaName] = useState('');
  const [confirmDeleteAreaId, setConfirmDeleteAreaId] = useState<string | null>(null);

  useEffect(() => {
    if (store) {
      setStoreName(store.storeName || 'MputPos');
      setLogoUrl(store.logoUrl || DEFAULT_LOGO_URL);
    }
  }, [store]);

  const handlePickLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSavingBrand(true);
    try {
      const compressed = await compressImageFromFile(file, 320, 160000);
      setLogoUrl(compressed);
      await updateStoreBranding(storeName || 'MputPos', compressed);
      setBrandSavedMsg('Logo berhasil diperbarui');
      setTimeout(() => setBrandSavedMsg(''), 2500);
    } finally {
      setSavingBrand(false);
      e.target.value = '';
    }
  };

  const handleSaveBrandName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) return;
    setSavingBrand(true);
    try {
      await updateStoreBranding(storeName.trim(), logoUrl);
      setBrandSavedMsg('Pengaturan toko tersimpan');
      setTimeout(() => setBrandSavedMsg(''), 2500);
    } finally {
      setSavingBrand(false);
    }
  };

  const handleResetLogo = async () => {
    setSavingBrand(true);
    try {
      setLogoUrl(DEFAULT_LOGO_URL);
      await updateStoreBranding(storeName || 'MputPos', DEFAULT_LOGO_URL);
      setBrandSavedMsg('Logo dikembalikan ke bawaan');
      setTimeout(() => setBrandSavedMsg(''), 2500);
    } finally {
      setSavingBrand(false);
    }
  };

  const handleAddSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSheetName.trim()) return;
    await createSheet(newSheetName.trim());
    setNewSheetName('');
  };

  const handleSaveSheetRename = async (sheetId: string) => {
    if (!editSheetName.trim()) return;
    await renameSheet(sheetId, editSheetName.trim());
    setEditingSheetId(null);
  };

  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;
    await createArea(newAreaName.trim());
    setNewAreaName('');
  };

  const handleSaveAreaRename = async (areaId: string) => {
    if (!editAreaName.trim()) return;
    await renameArea(areaId, editAreaName.trim());
    setEditingAreaId(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left Column: Branding & Account & PWA */}
      <div className="lg:col-span-5 space-y-5">
        {/* Branding & Logo from Album */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Logo & Nama Aplikasi
            </h2>
            <p className="text-xs text-slate-500">
              Ganti logo MputPos dari album foto di HP Anda.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <FoodImage
              src={logoUrl}
              alt="Logo MputPos"
              className="h-16 w-16 shrink-0 rounded-2xl border border-slate-200"
            />
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-orange-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-orange-700 min-h-[40px]">
                <Camera className="h-4 w-4" />
                <span>Pilih Logo dari Album</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePickLogo}
                  className="hidden"
                />
              </label>

              {logoUrl !== DEFAULT_LOGO_URL && (
                <button
                  type="button"
                  onClick={handleResetLogo}
                  disabled={savingBrand}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[40px]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSaveBrandName} className="space-y-2.5 pt-1">
            <label className="block text-xs font-semibold text-slate-700">
              Nama Aplikasi / Usaha
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                maxLength={80}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none min-h-[42px]"
              />
              <button
                type="submit"
                disabled={savingBrand}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60 min-h-[42px]"
              >
                Simpan
              </button>
            </div>
            {brandSavedMsg && (
              <p className="text-xs font-semibold text-emerald-600">
                {brandSavedMsg}
              </p>
            )}
          </form>
        </section>

        {/* PWA Install & Account */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Install di HP & Akun Google
            </h2>
            <p className="text-xs text-slate-500">
              Pasang aplikasi di layar utama HP & kelola sinkronisasi akun Google.
            </p>
          </div>

          <PWAInstallCard variant="settings" />

          {user && (
            <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Akun Google'}
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">
                    {(user.displayName || 'M')[0]}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {user.displayName || 'Penjual MputPos'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
                <Cloud className="h-4 w-4 text-emerald-600 shrink-0" />
              </div>

              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors min-h-[42px]"
              >
                <LogOut className="h-4 w-4" />
                <span>Keluar dari Akun Google</span>
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Right Column: Sheets & Area Management */}
      <div className="lg:col-span-7 space-y-5">
        {/* Kelola Sheet Tanggal */}
        <section className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center gap-2.5">
            <SheetIcon className="h-4 w-4 text-orange-600" />
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Kelola Sheet Tanggal
              </h2>
              <p className="text-xs text-slate-500">
                Pisahkan pesanan berdasarkan tanggal (misal Tanggal 11, Tanggal 12)
                dan ubah namanya kapan saja.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleAddSheet}
            className="flex gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-3"
          >
            <input
              type="text"
              value={newSheetName}
              onChange={(e) => setNewSheetName(e.target.value)}
              placeholder="Tambah sheet baru (misal: Tanggal 13)"
              maxLength={60}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none min-h-[42px]"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-700 min-h-[42px] shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah</span>
            </button>
          </form>

          <div className="divide-y divide-slate-100">
            {sheets.map((sheet) => (
              <div
                key={sheet.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                {editingSheetId === sheet.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="text"
                      value={editSheetName}
                      onChange={(e) => setEditSheetName(e.target.value)}
                      maxLength={60}
                      className="flex-1 rounded-xl border border-orange-400 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 focus:outline-none min-h-[40px]"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveSheetRename(sheet.id)}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white min-h-[40px]"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Simpan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingSheetId(null)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 min-h-[40px]"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-bold text-slate-900 truncate">
                      {sheet.name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSheetId(sheet.id);
                          setEditSheetName(sheet.name);
                        }}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[36px]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Ubah Nama</span>
                      </button>

                      {sheets.length > 1 &&
                        (confirmDeleteSheetId === sheet.id ? (
                          <button
                            type="button"
                            onClick={async () => {
                              await deleteSheet(sheet.id);
                              setConfirmDeleteSheetId(null);
                            }}
                            className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white min-h-[36px]"
                          >
                            Yakin Hapus?
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteSheetId(sheet.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            aria-label={`Hapus ${sheet.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Kelola Filter Area */}
        <section className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center gap-2.5">
            <MapPin className="h-4 w-4 text-orange-600" />
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Kelola Filter Area
              </h2>
              <p className="text-xs text-slate-500">
                Ubah nama area (misal Area A, Area B, atau nama komplek/wilayah)
                sesuai rute pengiriman Anda.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleAddArea}
            className="flex gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-3"
          >
            <input
              type="text"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              placeholder="Tambah area baru (misal: Area D / Perumahan)"
              maxLength={50}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none min-h-[42px]"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-700 min-h-[42px] shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah</span>
            </button>
          </form>

          <div className="divide-y divide-slate-100">
            {areas.map((area) => (
              <div
                key={area.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                {editingAreaId === area.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="text"
                      value={editAreaName}
                      onChange={(e) => setEditAreaName(e.target.value)}
                      maxLength={50}
                      className="flex-1 rounded-xl border border-orange-400 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 focus:outline-none min-h-[40px]"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveAreaRename(area.id)}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white min-h-[40px]"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Simpan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingAreaId(null)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 min-h-[40px]"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-bold text-slate-900 truncate">
                      {area.name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAreaId(area.id);
                          setEditAreaName(area.name);
                        }}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[36px]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Ubah Nama</span>
                      </button>

                      {areas.length > 1 &&
                        (confirmDeleteAreaId === area.id ? (
                          <button
                            type="button"
                            onClick={async () => {
                              await deleteArea(area.id);
                              setConfirmDeleteAreaId(null);
                            }}
                            className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white min-h-[36px]"
                          >
                            Hapus
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteAreaId(area.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            aria-label={`Hapus ${area.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
