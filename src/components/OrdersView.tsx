import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Edit3,
  FileSpreadsheet,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Order } from '../types/mputpos';
import {
  buildWhatsAppSummary,
  exportSheetToCSV,
  exportSheetToExcel,
} from '../utils/exportSpreadsheet';
import { formatRp, formatTimeShort } from '../utils/format';
import { OrderFormModal } from './OrderFormModal';

export const OrdersView: React.FC = () => {
  const {
    store,
    sheets,
    areas,
    orders,
    expenses,
    activeSheetId,
    setActiveSheetId,
    createSheet,
    renameSheet,
    toggleOrderPaid,
    deleteOrder,
  } = useStore();

  const [selectedAreaId, setSelectedAreaId] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Order form modal
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Sheet create / rename modal
  const [sheetModalMode, setSheetModalMode] = useState<'create' | 'rename' | null>(null);
  const [sheetNameInput, setSheetNameInput] = useState('');
  const [sheetDateInput, setSheetDateInput] = useState('');
  const [savingSheet, setSavingSheet] = useState(false);

  // Export modal
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Inline delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const activeSheet = useMemo(
    () => sheets.find((s) => s.id === activeSheetId) || sheets[0] || null,
    [sheets, activeSheetId]
  );

  const sheetOrders = useMemo(
    () => orders.filter((o) => o.sheetId === activeSheet?.id),
    [orders, activeSheet]
  );

  const sheetExpenses = useMemo(
    () => expenses.filter((e) => e.sheetId === activeSheet?.id),
    [expenses, activeSheet]
  );

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sheetOrders.filter((o) => {
      if (selectedAreaId !== 'ALL' && o.areaId !== selectedAreaId) return false;
      if (paymentFilter === 'paid' && !o.isPaid) return false;
      if (paymentFilter === 'unpaid' && o.isPaid) return false;
      if (q) {
        const matchName = o.customerName.toLowerCase().includes(q);
        const matchNotes = (o.notes || '').toLowerCase().includes(q);
        const matchItem = o.items.some((it) =>
          it.menuName.toLowerCase().includes(q)
        );
        if (!matchName && !matchNotes && !matchItem) return false;
      }
      return true;
    });
  }, [sheetOrders, selectedAreaId, paymentFilter, searchQuery]);

  const sheetStats = useMemo(() => {
    const target = filteredOrders;
    const total = target.reduce((s, o) => s + o.totalAmount, 0);
    const paidTotal = target
      .filter((o) => o.isPaid)
      .reduce((s, o) => s + o.totalAmount, 0);
    const unpaidCount = target.filter((o) => !o.isPaid).length;
    return {
      count: target.length,
      total,
      paidTotal,
      unpaidTotal: total - paidTotal,
      unpaidCount,
    };
  }, [filteredOrders]);

  const openCreateOrder = () => {
    setEditingOrder(null);
    setOrderModalOpen(true);
  };

  const openEditOrder = (order: Order) => {
    setEditingOrder(order);
    setOrderModalOpen(true);
  };

  const openNewSheetModal = () => {
    setSheetModalMode('create');
    setSheetNameInput('');
    setSheetDateInput('');
  };

  const openRenameSheetModal = () => {
    if (!activeSheet) return;
    setSheetModalMode('rename');
    setSheetNameInput(activeSheet.name);
    setSheetDateInput(activeSheet.dateLabel || '');
  };

  const handleSaveSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetNameInput.trim()) return;
    setSavingSheet(true);
    try {
      if (sheetModalMode === 'create') {
        await createSheet(sheetNameInput.trim(), sheetDateInput.trim());
      } else if (sheetModalMode === 'rename' && activeSheet) {
        await renameSheet(
          activeSheet.id,
          sheetNameInput.trim(),
          sheetDateInput.trim()
        );
      }
      setSheetModalMode(null);
    } finally {
      setSavingSheet(false);
    }
  };

  const handleCopySummary = async () => {
    if (!activeSheet) return;
    const text = buildWhatsAppSummary(
      activeSheet,
      filteredOrders,
      store?.storeName || 'MputPos'
    );
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    } catch {
      setCopiedSummary(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar: Sheet Switcher + Export + New Order */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {sheets.map((sheet) => {
            const isActive = sheet.id === activeSheet?.id;
            return (
              <button
                key={sheet.id}
                type="button"
                onClick={() => setActiveSheetId(sheet.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{sheet.name}</span>
              </button>
            );
          })}

          {activeSheet && (
            <button
              type="button"
              onClick={openRenameSheetModal}
              title="Ubah nama sheet ini"
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 whitespace-nowrap shrink-0 min-h-[40px]"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ubah Nama</span>
            </button>
          )}

          <button
            type="button"
            onClick={openNewSheetModal}
            className="inline-flex items-center gap-1 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-orange-400 hover:text-orange-600 whitespace-nowrap shrink-0 min-h-[40px]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Sheet Baru</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            className="inline-flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 whitespace-nowrap min-h-[42px]"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Ekspor Spreadsheet</span>
          </button>

          <button
            type="button"
            onClick={openCreateOrder}
            className="inline-flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-700 active:scale-[0.98] whitespace-nowrap min-h-[42px]"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>Catat Pesanan</span>
          </button>
        </div>
      </div>

      {/* Filters Row: Search + Area Filter + Payment Filter */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama pemesan, menu, atau keterangan..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none min-h-[42px]"
            />
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 shrink-0">
            <button
              type="button"
              onClick={() => setPaymentFilter('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap min-h-[34px] ${
                paymentFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setPaymentFilter('unpaid')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap min-h-[34px] ${
                paymentFilter === 'unpaid'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Belum Bayar
            </button>
            <button
              type="button"
              onClick={() => setPaymentFilter('paid')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap min-h-[34px] ${
                paymentFilter === 'paid'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lunas
            </button>
          </div>
        </div>

        {/* Area Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 pr-1 shrink-0">
            <MapPin className="h-3.5 w-3.5" />
            Area:
          </span>
          <button
            type="button"
            onClick={() => setSelectedAreaId('ALL')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[36px] ${
              selectedAreaId === 'ALL'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Area
          </button>
          {areas.map((area) => (
            <button
              key={area.id}
              type="button"
              onClick={() => setSelectedAreaId(area.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[36px] ${
                selectedAreaId === area.id
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {area.name}
            </button>
          ))}
        </div>
      </div>

      {/* Compact Sheet Summary Strip */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white px-3.5 py-3">
          <p className="text-[11px] font-medium text-slate-500">Pesanan</p>
          <p className="mt-0.5 font-mono text-base sm:text-lg font-bold text-slate-900 tabular-nums">
            {sheetStats.count}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white px-3.5 py-3">
          <p className="text-[11px] font-medium text-slate-500">Total Omset</p>
          <p className="mt-0.5 font-mono text-base sm:text-lg font-bold text-slate-900 tabular-nums truncate">
            {formatRp(sheetStats.total)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white px-3.5 py-3">
          <p className="text-[11px] font-medium text-slate-500">Belum Bayar</p>
          <p className="mt-0.5 font-mono text-base sm:text-lg font-bold text-rose-600 tabular-nums truncate">
            {sheetStats.unpaidCount} ({formatRp(sheetStats.unpaidTotal)})
          </p>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 sm:p-12 text-center">
          <p className="font-display text-base font-bold text-slate-800">
            Belum ada pesanan di {activeSheet?.name || 'sheet ini'}
          </p>
          <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
            {searchQuery || selectedAreaId !== 'ALL' || paymentFilter !== 'all'
              ? 'Tidak ada pesanan yang cocok dengan filter saat ini.'
              : 'Tekan tombol Catat Pesanan untuk mulai mencatat order pelanggan.'}
          </p>
          <button
            type="button"
            onClick={openCreateOrder}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-700 min-h-[44px]"
          >
            <Plus className="h-4 w-4" />
            Catat Pesanan Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filteredOrders.map((order) => (
            <article
              key={order.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 transition-colors hover:border-slate-300"
            >
              <div>
                {/* Header: Customer Name + Unboxed Metadata + Payment Toggle */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-bold text-slate-900 truncate">
                      {order.customerName}
                    </h3>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">
                        {order.areaName}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{order.items.reduce((s, i) => s + i.qty, 0)} porsi</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatTimeShort(order.createdAt)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleOrderPaid(order.id, !order.isPaid)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 min-h-[36px] ${
                      order.isPaid
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                    }`}
                    title="Ketuk untuk ubah status bayar"
                  >
                    {order.isPaid ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span>Sudah Bayar</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>Belum Bayar</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Ordered Items */}
                <ul className="mt-3.5 divide-y divide-slate-100 border-t border-slate-100">
                  {order.items.map((item, idx) => {
                    const optionText = [
                      item.variantName,
                      ...(item.addonNames || []),
                    ]
                      .filter(Boolean)
                      .join(' · ');

                    return (
                      <li
                        key={item.lineId || idx}
                        className="flex items-start justify-between gap-2 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800">
                            <span className="font-mono font-bold text-orange-600 tabular-nums mr-1.5">
                              {item.qty}x
                            </span>
                            {item.menuName}
                          </p>
                          {optionText && (
                            <p className="text-xs text-slate-500 pl-6">
                              {optionText}
                            </p>
                          )}
                        </div>
                        <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums shrink-0 pt-0.5">
                          {formatRp(item.subtotal)}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {/* Order Notes */}
                {order.notes && (
                  <p className="mt-2.5 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Catatan: </span>
                    {order.notes}
                  </p>
                )}
              </div>

              {/* Footer: Total + Actions */}
              <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <div>
                  <span className="text-[11px] text-slate-400 block">Total</span>
                  <span className="font-mono text-base font-extrabold text-slate-900 tabular-nums">
                    {formatRp(order.totalAmount)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditOrder(order)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[38px]"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit / Tambah</span>
                  </button>

                  {confirmDeleteId === order.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteOrder(order.id);
                          setConfirmDeleteId(null);
                        }}
                        className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700 min-h-[38px]"
                      >
                        Yakin Hapus
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-600 min-h-[38px]"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(order.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Hapus pesanan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Order Form Modal */}
      <OrderFormModal
        isOpen={orderModalOpen}
        editingOrder={editingOrder}
        onClose={() => setOrderModalOpen(false)}
      />

      {/* Sheet Create / Rename Modal */}
      {sheetModalMode && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4"
          onClick={() => setSheetModalMode(null)}
        >
          <div
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-slate-900">
                {sheetModalMode === 'create'
                  ? 'Buat Sheet Tanggal Baru'
                  : 'Ubah Nama Sheet'}
              </h3>
              <button
                type="button"
                onClick={() => setSheetModalMode(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSheet} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Sheet
                </label>
                <input
                  type="text"
                  value={sheetNameInput}
                  onChange={(e) => setSheetNameInput(e.target.value)}
                  placeholder="Contoh: Tanggal 13 atau Batch Sabtu"
                  maxLength={60}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Keterangan Tanggal (opsional)
                </label>
                <input
                  type="text"
                  value={sheetDateInput}
                  onChange={(e) => setSheetDateInput(e.target.value)}
                  placeholder="Contoh: 13 Nov 2026"
                  maxLength={30}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none min-h-[44px]"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSheetModalMode(null)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 min-h-[44px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingSheet}
                  className="flex-1 rounded-xl bg-orange-600 py-2.5 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60 min-h-[44px]"
                >
                  {savingSheet ? 'Menyimpan...' : 'Simpan Sheet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Spreadsheet Modal */}
      {exportModalOpen && activeSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4"
          onClick={() => setExportModalOpen(false)}
        >
          <div
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  Ekspor ke Spreadsheet
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Sheet: <strong className="text-slate-700">{activeSheet.name}</strong> ({filteredOrders.length} pesanan)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  exportSheetToExcel(
                    activeSheet,
                    filteredOrders,
                    sheetExpenses,
                    store?.storeName || 'MputPos'
                  );
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-left hover:bg-emerald-50 transition-colors min-h-[60px]"
              >
                <div>
                  <p className="text-sm font-bold text-emerald-950">
                    Download Excel (.xlsx)
                  </p>
                  <p className="text-xs text-emerald-700">
                    3 tab lengkap: Pesanan, Rekap Menu, & Modal/Omset
                  </p>
                </div>
                <Download className="h-5 w-5 text-emerald-700 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  exportSheetToCSV(
                    activeSheet,
                    filteredOrders,
                    store?.storeName || 'MputPos'
                  );
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 transition-colors min-h-[60px]"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Download CSV (Google Sheets)
                  </p>
                  <p className="text-xs text-slate-500">
                    Langsung impor ke Google Sheets atau Excel
                  </p>
                </div>
                <FileSpreadsheet className="h-5 w-5 text-slate-600 shrink-0" />
              </button>

              <button
                type="button"
                onClick={handleCopySummary}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 transition-colors min-h-[60px]"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {copiedSummary ? 'Tersalin ke Clipboard!' : 'Salin Rekap WhatsApp'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Rekap jumlah porsi & daftar pesanan siap kirim
                  </p>
                </div>
                <Copy className="h-5 w-5 text-orange-600 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
