import React, { useState } from 'react';
import {
  Camera,
  Edit3,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { MenuAddon, MenuItem, MenuVariant } from '../types/mputpos';
import {
  compressImageFromFile,
  createSafeId,
  formatRp,
  sanitizeNonNegNumber,
} from '../utils/format';
import { FoodImage } from './FoodImage';

export const MenuView: React.FC = () => {
  const { menuItems, createMenuItem, updateMenuItem, deleteMenuItem } =
    useStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const [name, setName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [variants, setVariants] = useState<MenuVariant[]>([]);
  const [addons, setAddons] = useState<MenuAddon[]>([]);
  const [isActive, setIsActive] = useState(true);

  const [uploadingImg, setUploadingImg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openCreateMenu = () => {
    setEditingItem(null);
    setName('');
    setBasePrice('10000');
    setImageUrl('');
    setVariants([]);
    setAddons([]);
    setIsActive(true);
    setErrorMsg('');
    setModalOpen(true);
  };

  const openEditMenu = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setBasePrice(String(item.basePrice));
    setImageUrl(item.imageUrl || '');
    setVariants((item.variants || []).map((v) => ({ ...v })));
    setAddons((item.addons || []).map((a) => ({ ...a })));
    setIsActive(item.isActive);
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    setUploadingImg(true);
    try {
      const compressed = await compressImageFromFile(file, 420, 180000);
      setImageUrl(compressed);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal memproses foto dari album.'
      );
    } finally {
      setUploadingImg(false);
      e.target.value = '';
    }
  };

  const handleQuickImageReplace = async (
    item: MenuItem,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFromFile(file, 420, 180000);
      await updateMenuItem(item.id, {
        name: item.name,
        basePrice: item.basePrice,
        imageUrl: compressed,
        variants: item.variants,
        addons: item.addons,
        isActive: item.isActive,
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleToggleActive = async (item: MenuItem) => {
    await updateMenuItem(item.id, {
      name: item.name,
      basePrice: item.basePrice,
      imageUrl: item.imageUrl,
      variants: item.variants,
      addons: item.addons,
      isActive: !item.isActive,
    });
  };

  const addVariantRow = () => {
    setVariants((prev) => [
      ...prev,
      { id: createSafeId('var'), name: '', priceDelta: 0 },
    ]);
  };

  const addAddonRow = () => {
    setAddons((prev) => [
      ...prev,
      { id: createSafeId('add'), name: '', price: 0 },
    ]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!name.trim()) {
      setErrorMsg('Nama menu wajib diisi.');
      return;
    }

    const cleanVariants = variants
      .filter((v) => v.name.trim())
      .map((v) => ({
        id: v.id || createSafeId('var'),
        name: v.name.trim(),
        priceDelta: sanitizeNonNegNumber(v.priceDelta),
      }));

    const cleanAddons = addons
      .filter((a) => a.name.trim())
      .map((a) => ({
        id: a.id || createSafeId('add'),
        name: a.name.trim(),
        price: sanitizeNonNegNumber(a.price),
      }));

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        basePrice: sanitizeNonNegNumber(basePrice.replace(/\D/g, '') || 0),
        imageUrl,
        variants: cleanVariants,
        addons: cleanAddons,
        isActive,
      };
      if (editingItem) {
        await updateMenuItem(editingItem.id, payload);
      } else {
        await createMenuItem(payload);
      }
      setModalOpen(false);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal menyimpan menu.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Kelola Menu & Harga
          </h2>
          <p className="text-xs text-slate-500">
            Edit harga, pilihan (Matang/Mentah), tambahan (Porsi++/Cabe++), dan
            ganti foto menu dari album HP.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateMenu}
          className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-orange-700 min-h-[42px]"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Menu Baru</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {menuItems.map((item) => (
          <article
            key={item.id}
            className={`rounded-2xl border bg-white overflow-hidden transition-opacity ${
              item.isActive
                ? 'border-slate-200/90'
                : 'border-slate-200 opacity-65'
            }`}
          >
            <div className="relative aspect-[4/3] w-full bg-slate-100">
              <FoodImage
                src={item.imageUrl}
                alt={item.name}
                className="h-full w-full"
              />
              <label
                className="absolute bottom-3 right-3 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900/80 px-3 py-2 text-xs font-semibold text-white backdrop-blur-xs hover:bg-slate-900 transition-colors min-h-[38px]"
                title="Ganti foto dari album HP"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Ganti Foto</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleQuickImageReplace(item, e)}
                  className="hidden"
                />
              </label>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-display text-base font-bold text-slate-900 truncate">
                    {item.name}
                  </h3>
                  <p className="font-mono text-base font-extrabold text-orange-600 tabular-nums mt-0.5">
                    {formatRp(item.basePrice)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleActive(item)}
                  className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold min-h-[34px] ${
                    item.isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.isActive ? (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      <span>Tersedia</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3.5 w-3.5" />
                      <span>Habis</span>
                    </>
                  )}
                </button>
              </div>

              {(item.variants.length > 0 || item.addons.length > 0) && (
                <div className="space-y-1 text-xs text-slate-500 border-t border-slate-100 pt-2.5">
                  {item.variants.length > 0 && (
                    <p>
                      <span className="font-semibold text-slate-700">
                        Pilihan:{' '}
                      </span>
                      {item.variants
                        .map(
                          (v) =>
                            `${v.name}${v.priceDelta > 0 ? ` (+${formatRp(v.priceDelta)})` : ''}`
                        )
                        .join(' · ')}
                    </p>
                  )}
                  {item.addons.length > 0 && (
                    <p>
                      <span className="font-semibold text-slate-700">
                        Tambahan:{' '}
                      </span>
                      {item.addons
                        .map(
                          (a) =>
                            `${a.name}${a.price > 0 ? ` (+${formatRp(a.price)})` : ''}`
                        )
                        .join(' · ')}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => openEditMenu(item)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 min-h-[40px]"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit Menu & Harga</span>
                </button>

                {confirmDeleteId === item.id ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteMenuItem(item.id);
                      setConfirmDeleteId(null);
                    }}
                    className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white min-h-[40px]"
                  >
                    Yakin Hapus
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(item.id)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label={`Hapus ${item.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Add / Edit Menu Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="flex max-h-[92vh] w-full sm:max-w-lg flex-col rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden shrink-0" />
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 shrink-0">
              <h3 className="font-display text-lg font-bold text-slate-900">
                {editingItem ? 'Edit Menu & Harga' : 'Tambah Menu Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
            >
              {errorMsg && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
                  {errorMsg}
                </div>
              )}

              {/* Image Picker from Album */}
              <div className="flex items-center gap-4">
                <FoodImage
                  src={imageUrl}
                  alt={name || 'Foto Menu'}
                  className="h-20 w-24 shrink-0 rounded-2xl border border-slate-200"
                />
                <div className="space-y-1.5">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 min-h-[40px]">
                    <Camera className="h-4 w-4 text-orange-600" />
                    <span>
                      {uploadingImg
                        ? 'Memproses foto...'
                        : 'Pilih Foto dari Album'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImagePick}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Otomatis dikompres agar sinkron cepat di semua perangkat.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Menu
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Tahu Walik"
                  maxLength={80}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Harga Dasar (Rp)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={basePrice}
                  onChange={(e) =>
                    setBasePrice(e.target.value.replace(/\D/g, ''))
                  }
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-sm font-bold text-slate-900 tabular-nums focus:border-orange-500 focus:bg-white focus:outline-none min-h-[44px]"
                />
              </div>

              {/* Variants */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Pilihan Menu (opsional)
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Contoh: Matang, Mentah, atau Normal
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addVariantRow}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Tambah Pilihan
                  </button>
                </div>

                {variants.map((v, idx) => (
                  <div key={v.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={v.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setVariants((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, name: val } : item
                          )
                        );
                      }}
                      placeholder="Nama pilihan"
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 min-h-[40px]"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={v.priceDelta}
                      onChange={(e) => {
                        const val = sanitizeNonNegNumber(
                          e.target.value.replace(/\D/g, '') || 0
                        );
                        setVariants((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, priceDelta: val } : item
                          )
                        );
                      }}
                      placeholder="+Rp"
                      title="Tambahan harga"
                      className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs font-semibold text-slate-900 tabular-nums min-h-[40px]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setVariants((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add-ons */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Tambahan / Add-on (opsional)
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Contoh: Porsi ++, Cabe ++
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addAddonRow}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Tambah Add-on
                  </button>
                </div>

                {addons.map((a, idx) => (
                  <div key={a.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={a.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAddons((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, name: val } : item
                          )
                        );
                      }}
                      placeholder="Nama tambahan"
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 min-h-[40px]"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={a.price}
                      onChange={(e) => {
                        const val = sanitizeNonNegNumber(
                          e.target.value.replace(/\D/g, '') || 0
                        );
                        setAddons((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, price: val } : item
                          )
                        );
                      }}
                      placeholder="+Rp"
                      title="Harga tambahan"
                      className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs font-semibold text-slate-900 tabular-nums min-h-[40px]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setAddons((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </form>

            <div className="border-t border-slate-100 px-5 py-3.5 flex gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 min-h-[44px]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || uploadingImg}
                className="flex-1 rounded-xl bg-orange-600 py-2.5 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60 min-h-[44px]"
              >
                {saving ? 'Menyimpan...' : 'Simpan Menu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
