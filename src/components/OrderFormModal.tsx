import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Minus,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { MenuItem, Order, OrderItem } from '../types/mputpos';
import {
  createSafeId,
  formatRp,
  sanitizeNonNegNumber,
} from '../utils/format';
import { FoodImage } from './FoodImage';

interface OrderFormModalProps {
  isOpen: boolean;
  editingOrder: Order | null;
  onClose: () => void;
}

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  isOpen,
  editingOrder,
  onClose,
}) => {
  const {
    sheets,
    areas,
    menuItems,
    activeSheetId,
    createOrder,
    updateOrder,
  } = useStore();

  const [customerName, setCustomerName] = useState('');
  const [sheetId, setSheetId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [notes, setNotes] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [items, setItems] = useState<OrderItem[]>([]);

  // Active menu item option picker state
  const [configuringMenu, setConfiguringMenu] = useState<MenuItem | null>(null);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [pickerQty, setPickerQty] = useState(1);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    setConfiguringMenu(null);

    if (editingOrder) {
      setCustomerName(editingOrder.customerName);
      setSheetId(editingOrder.sheetId || activeSheetId || sheets[0]?.id || '');
      setAreaId(editingOrder.areaId || areas[0]?.id || '');
      setNotes(editingOrder.notes || '');
      setIsPaid(editingOrder.isPaid);
      setItems(editingOrder.items.map((it) => ({ ...it })));
    } else {
      setCustomerName('');
      setSheetId(activeSheetId || sheets[0]?.id || '');
      setAreaId(areas[0]?.id || '');
      setNotes('');
      setIsPaid(false);
      setItems([]);
    }
  }, [isOpen, editingOrder, activeSheetId, sheets, areas]);

  const activeMenus = useMemo(
    () => menuItems.filter((m) => m.isActive),
    [menuItems]
  );

  const totalAmount = useMemo(
    () => items.reduce((sum, it) => sum + it.subtotal, 0),
    [items]
  );

  if (!isOpen) return null;

  const handleOpenMenuOption = (menu: MenuItem) => {
    const hasVariants = menu.variants && menu.variants.length > 0;
    const hasAddons = menu.addons && menu.addons.length > 0;

    if (!hasVariants && !hasAddons) {
      // Quick add directly
      setItems((prev) => {
        const existingIdx = prev.findIndex(
          (p) =>
            p.menuItemId === menu.id &&
            !p.variantName &&
            (!p.addonNames || p.addonNames.length === 0)
        );
        if (existingIdx >= 0) {
          const next = [...prev];
          const target = next[existingIdx];
          const qty = target.qty + 1;
          next[existingIdx] = {
            ...target,
            qty,
            subtotal: qty * target.unitPrice,
          };
          return next;
        }
        return [
          ...prev,
          {
            lineId: createSafeId('line'),
            menuItemId: menu.id,
            menuName: menu.name,
            variantName: '',
            addonNames: [],
            qty: 1,
            unitPrice: menu.basePrice,
            subtotal: menu.basePrice,
          },
        ];
      });
      return;
    }

    setConfiguringMenu(menu);
    setSelectedVariantIdx(0);
    setSelectedAddonIds([]);
    setPickerQty(1);
  };

  const handleConfirmConfiguredMenu = () => {
    if (!configuringMenu) return;
    const variant = configuringMenu.variants?.[selectedVariantIdx];
    const variantName = variant ? variant.name : '';
    const variantDelta = variant ? variant.priceDelta : 0;

    const chosenAddons = (configuringMenu.addons || []).filter((a) =>
      selectedAddonIds.includes(a.id)
    );
    const addonNames = chosenAddons.map((a) => a.name);
    const addonsTotal = chosenAddons.reduce((s, a) => s + a.price, 0);

    const unitPrice = Math.max(
      0,
      configuringMenu.basePrice + variantDelta + addonsTotal
    );

    setItems((prev) => {
      const addonKey = [...addonNames].sort().join('|');
      const matchIdx = prev.findIndex(
        (p) =>
          p.menuItemId === configuringMenu.id &&
          p.variantName === variantName &&
          [...(p.addonNames || [])].sort().join('|') === addonKey
      );
      if (matchIdx >= 0) {
        const next = [...prev];
        const target = next[matchIdx];
        const qty = target.qty + pickerQty;
        next[matchIdx] = {
          ...target,
          qty,
          subtotal: qty * target.unitPrice,
        };
        return next;
      }
      return [
        ...prev,
        {
          lineId: createSafeId('line'),
          menuItemId: configuringMenu.id,
          menuName: configuringMenu.name,
          variantName,
          addonNames,
          qty: pickerQty,
          unitPrice,
          subtotal: pickerQty * unitPrice,
        },
      ];
    });

    setConfiguringMenu(null);
  };

  const updateLineQty = (lineId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((it) => {
          if (it.lineId !== lineId) return it;
          const nextQty = it.qty + delta;
          if (nextQty <= 0) return null;
          return { ...it, qty: nextQty, subtotal: nextQty * it.unitPrice };
        })
        .filter(Boolean) as OrderItem[]
    );
  };

  const updateLinePrice = (lineId: string, newPriceStr: string) => {
    const cleanPrice = sanitizeNonNegNumber(newPriceStr.replace(/\D/g, '') || 0);
    setItems((prev) =>
      prev.map((it) =>
        it.lineId === lineId
          ? { ...it, unitPrice: cleanPrice, subtotal: it.qty * cleanPrice }
          : it
      )
    );
  };

  const removeLine = (lineId: string) => {
    setItems((prev) => prev.filter((it) => it.lineId !== lineId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!customerName.trim()) {
      setErrorMsg('Nama pemesan wajib diisi.');
      return;
    }
    if (!sheetId) {
      setErrorMsg('Pilih sheet tanggal terlebih dahulu.');
      return;
    }
    if (!areaId) {
      setErrorMsg('Pilih area terlebih dahulu.');
      return;
    }
    if (items.length === 0) {
      setErrorMsg('Pilih minimal 1 menu makanan atau minuman.');
      return;
    }

    const areaObj = areas.find((a) => a.id === areaId);
    const areaName = areaObj?.name || editingOrder?.areaName || 'Area';

    setSaving(true);
    try {
      const payload = {
        sheetId,
        areaId,
        areaName,
        customerName: customerName.trim(),
        items,
        notes: notes.trim(),
        isPaid,
      };
      if (editingOrder) {
        await updateOrder(editingOrder.id, payload);
      } else {
        await createOrder(payload);
      }
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal menyimpan pesanan.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full sm:max-w-2xl flex-col rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden shrink-0" />
        <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3.5 shrink-0">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              {editingOrder ? 'Edit Pesanan' : 'Catat Pesanan Baru'}
            </h2>
            <p className="text-xs text-slate-500">
              {editingOrder
                ? 'Tambah menu, ubah jumlah, atau perbarui catatan pemesan'
                : 'Pilih menu, area, dan status pembayaran'}
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
              {errorMsg}
            </div>
          )}

          {/* Customer Name + Sheet + Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Pemesan
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Contoh: Teh Rina / Ibu Budi"
                maxLength={100}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Sheet Tanggal
              </label>
              <select
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none min-h-[44px]"
              >
                {sheets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Area Pengiriman
              </label>
              <select
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none min-h-[44px]"
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Menu Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700">
                Pilih Menu Makanan & Minuman
              </span>
              <span className="text-[11px] text-slate-400">
                Ketuk menu untuk menambah
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5">
              {activeMenus.map((menu) => {
                const countInOrder = items
                  .filter((i) => i.menuItemId === menu.id)
                  .reduce((s, i) => s + i.qty, 0);
                return (
                  <button
                    key={menu.id}
                    type="button"
                    onClick={() => handleOpenMenuOption(menu)}
                    className={`group flex items-center gap-2.5 rounded-2xl border p-2.5 text-left transition-all active:scale-[0.98] min-h-[64px] ${
                      countInOrder > 0
                        ? 'border-orange-400 bg-orange-50/50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <FoodImage
                      src={menu.imageUrl}
                      alt={menu.name}
                      className="h-12 w-12 shrink-0 rounded-xl border border-slate-100"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {menu.name}
                      </p>
                      <p className="font-mono text-xs font-semibold text-orange-600 tabular-nums">
                        {formatRp(menu.basePrice)}
                      </p>
                      {(menu.variants.length > 0 || menu.addons.length > 0) && (
                        <p className="text-[11px] text-slate-400 truncate">
                          Ada pilihan
                        </p>
                      )}
                    </div>
                    {countInOrder > 0 && (
                      <span className="flex h-6 min-w-[24px] items-center justify-center rounded-lg bg-orange-600 px-1.5 font-mono text-xs font-bold text-white tabular-nums">
                        {countInOrder}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Inline Option Picker when choosing Tahu Walik / Tahu Kocek */}
            {configuringMenu && (
              <div className="mt-3 rounded-2xl border border-orange-200 bg-orange-50/60 p-4 space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Atur Pilihan: {configuringMenu.name}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Harga dasar {formatRp(configuringMenu.basePrice)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfiguringMenu(null)}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-white"
                  >
                    Batal
                  </button>
                </div>

                {configuringMenu.variants.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1.5">
                      Pilihan
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {configuringMenu.variants.map((v, idx) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVariantIdx(idx)}
                          className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors min-h-[40px] ${
                            selectedVariantIdx === idx
                              ? 'bg-orange-600 text-white'
                              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {v.name}
                          {v.priceDelta !== 0 &&
                            ` (${v.priceDelta > 0 ? '+' : ''}${formatRp(v.priceDelta)})`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {configuringMenu.addons.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1.5">
                      Tambahan (opsional)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {configuringMenu.addons.map((addon) => {
                        const checked = selectedAddonIds.includes(addon.id);
                        return (
                          <button
                            key={addon.id}
                            type="button"
                            onClick={() =>
                              setSelectedAddonIds((prev) =>
                                checked
                                  ? prev.filter((id) => id !== addon.id)
                                  : [...prev, addon.id]
                              )
                            }
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors min-h-[40px] ${
                              checked
                                ? 'bg-slate-900 text-white'
                                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {checked && <Check className="h-3.5 w-3.5" />}
                            <span>{addon.name}</span>
                            {addon.price > 0 && (
                              <span className="font-mono opacity-80">
                                +{formatRp(addon.price)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setPickerQty((q) => Math.max(1, q - 1))}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
                      aria-label="Kurangi"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-7 text-center font-mono text-sm font-bold text-slate-900 tabular-nums">
                      {pickerQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPickerQty((q) => q + 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
                      aria-label="Tambah"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmConfiguredMenu}
                    className="flex-1 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-orange-700 min-h-[44px]"
                  >
                    Tambahkan ke Pesanan
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Order Items Cart */}
          {items.length > 0 && (
            <div className="space-y-2.5">
              <span className="block text-xs font-semibold text-slate-700">
                Rincian Item Pesanan ({items.length})
              </span>
              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-slate-50/50">
                {items.map((item) => {
                  const detail = [
                    item.variantName,
                    ...(item.addonNames || []),
                  ]
                    .filter(Boolean)
                    .join(' · ');

                  return (
                    <div
                      key={item.lineId}
                      className="p-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900">
                          {item.menuName}
                        </p>
                        {detail && (
                          <p className="text-xs text-slate-500">{detail}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-slate-400">Rp</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateLinePrice(item.lineId, e.target.value)
                            }
                            aria-label={`Harga ${item.menuName}`}
                            className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono text-xs font-semibold text-slate-900 tabular-nums focus:border-orange-500 focus:outline-none min-h-[36px]"
                          />
                        </div>

                        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-0.5">
                          <button
                            type="button"
                            onClick={() => updateLineQty(item.lineId, -1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                            aria-label="Kurang"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center font-mono text-xs font-bold text-slate-900 tabular-nums">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateLineQty(item.lineId, 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                            aria-label="Tambah"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <span className="w-20 text-right font-mono text-xs font-bold text-slate-900 tabular-nums">
                          {formatRp(item.subtotal)}
                        </span>

                        <button
                          type="button"
                          onClick={() => removeLine(item.lineId)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Hapus item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Keterangan / Catatan Pesanan
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              placeholder="Contoh: Cabe dipisah, antar jam 16.00, tidak pakai saos"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Payment Status */}
          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              Status Pembayaran
            </span>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setIsPaid(false)}
                className={`rounded-lg py-2.5 text-xs font-bold transition-all min-h-[42px] ${
                  !isPaid
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Belum Bayar
              </button>
              <button
                type="button"
                onClick={() => setIsPaid(true)}
                className={`rounded-lg py-2.5 text-xs font-bold transition-all min-h-[42px] ${
                  isPaid
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sudah Bayar (Lunas)
              </button>
            </div>
          </div>
        </form>

        {/* Footer Total & Submit */}
        <div className="border-t border-slate-200 bg-white px-5 py-3.5 flex items-center justify-between gap-4 shrink-0">
          <div>
            <p className="text-[11px] font-medium text-slate-500">
              Total Pesanan
            </p>
            <p className="font-mono text-lg font-extrabold text-slate-900 tabular-nums">
              {formatRp(totalAmount)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60 active:scale-[0.98] min-h-[46px] whitespace-nowrap"
          >
            {saving
              ? 'Menyimpan...'
              : editingOrder
                ? 'Simpan Perubahan'
                : 'Simpan Pesanan'}
          </button>
        </div>
      </div>
    </div>
  );
};
