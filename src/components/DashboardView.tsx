import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Edit3,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Expense } from '../types/mputpos';
import { buildMenuPrepSummary } from '../utils/exportSpreadsheet';
import { formatRp, sanitizeNonNegNumber } from '../utils/format';
import { DashboardCharts } from './DashboardCharts';

export const DashboardView: React.FC = () => {
  const {
    sheets,
    orders,
    expenses,
    activeSheetId,
    setActiveSheetId,
    createExpense,
    updateExpense,
    deleteExpense,
    seedBasicIngredientsForSheet,
    copyExpensesFromSheet,
  } = useStore();

  const [scope, setScope] = useState<'sheet' | 'all'>('sheet');

  // Add / Edit Ingredient Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expName, setExpName] = useState('');
  const [expUnit, setExpUnit] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [savingExp, setSavingExp] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const activeSheet = useMemo(
    () => sheets.find((s) => s.id === activeSheetId) || sheets[0] || null,
    [sheets, activeSheetId]
  );

  const scopedOrders = useMemo(() => {
    if (scope === 'all') return orders;
    return orders.filter((o) => o.sheetId === activeSheet?.id);
  }, [orders, scope, activeSheet]);

  const scopedExpenses = useMemo(() => {
    if (scope === 'all') return expenses;
    return expenses.filter((e) => e.sheetId === activeSheet?.id);
  }, [expenses, scope, activeSheet]);

  const financial = useMemo(() => {
    const grossRevenue = scopedOrders.reduce((s, o) => s + o.totalAmount, 0);
    const paidRevenue = scopedOrders
      .filter((o) => o.isPaid)
      .reduce((s, o) => s + o.totalAmount, 0);
    const unpaidRevenue = grossRevenue - paidRevenue;
    const totalCost = scopedExpenses.reduce((s, e) => s + e.amount, 0);
    const netProfit = grossRevenue - totalCost;
    return {
      grossRevenue,
      paidRevenue,
      unpaidRevenue,
      totalCost,
      netProfit,
      orderCount: scopedOrders.length,
    };
  }, [scopedOrders, scopedExpenses]);

  const menuPrepSummary = useMemo(
    () => buildMenuPrepSummary(scopedOrders),
    [scopedOrders]
  );

  const otherSheetsWithExpenses = useMemo(
    () =>
      sheets.filter(
        (s) =>
          s.id !== activeSheet?.id &&
          expenses.some((e) => e.sheetId === s.id)
      ),
    [sheets, activeSheet, expenses]
  );

  const openAddExpense = () => {
    setEditingExpense(null);
    setExpName('');
    setExpUnit('');
    setExpAmount('');
    setModalOpen(true);
  };

  const openEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    setExpName(exp.name);
    setExpUnit(exp.unitNote || '');
    setExpAmount(String(exp.amount));
    setModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expName.trim() || !activeSheet) return;
    setSavingExp(true);
    try {
      const amountNum = sanitizeNonNegNumber(expAmount.replace(/\D/g, '') || 0);
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          name: expName.trim(),
          unitNote: expUnit.trim(),
          amount: amountNum,
        });
      } else {
        await createExpense({
          sheetId: activeSheet.id,
          name: expName.trim(),
          unitNote: expUnit.trim(),
          amount: amountNum,
        });
      }
      setModalOpen(false);
    } finally {
      setSavingExp(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Scope & Sheet Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-xl bg-slate-200/70 p-1 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setScope('sheet')}
            className={`flex-1 sm:flex-initial rounded-lg px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap min-h-[38px] ${
              scope === 'sheet'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Per Sheet ({activeSheet?.name || 'Aktif'})
          </button>
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`flex-1 sm:flex-initial rounded-lg px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap min-h-[38px] ${
              scope === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Total Semua Sheet
          </button>
        </div>

        {scope === 'sheet' && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {sheets.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSheetId(s.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 min-h-[36px] ${
                  s.id === activeSheet?.id
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3 Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Omset Kotor
            </span>
            <Wallet className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-extrabold text-slate-900 tabular-nums">
            {formatRp(financial.grossRevenue)}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <span>Lunas: {formatRp(financial.paidRevenue)}</span>
            <span aria-hidden="true">·</span>
            <span className="text-rose-600">
              Belum: {formatRp(financial.unpaidRevenue)}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Total Modal Bahan
            </span>
            <TrendingDown className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 font-mono text-2xl font-extrabold text-amber-700 tabular-nums">
            {formatRp(financial.totalCost)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {scopedExpenses.length} item bahan tercatat
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Omset Bersih (Laba)
            </span>
            <TrendingUp
              className={`h-4 w-4 ${
                financial.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            />
          </div>
          <p
            className={`mt-2 font-mono text-2xl font-extrabold tabular-nums ${
              financial.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {formatRp(financial.netProfit)}
          </p>
          <p className="mt-2 text-xs font-medium text-slate-500">
            Status:{' '}
            <span
              className={
                financial.netProfit >= 0
                  ? 'font-bold text-emerald-700'
                  : 'font-bold text-rose-700'
              }
            >
              {financial.netProfit >= 0 ? 'Untung' : 'Rugi'}
            </span>{' '}
            · {financial.orderCount} pesanan
          </p>
        </div>
      </div>

      {/* Interactive Charts & Diagrams */}
      <DashboardCharts
        scope={scope}
        activeSheet={activeSheet}
        sheets={sheets}
        allOrders={orders}
        allExpenses={expenses}
        scopedOrders={scopedOrders}
        scopedExpenses={scopedExpenses}
      />

      {/* Main 2-column content on Desktop: Modal Bahan List + Rekap Menu Terjual */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Modal & List Harga Bahan */}
        <section className="lg:col-span-7 rounded-2xl border border-slate-200/90 bg-white overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Modal & List Harga Bahan
              </h2>
              <p className="text-xs text-slate-500">
                {scope === 'all'
                  ? 'Semua bahan dari seluruh sheet'
                  : `Terigu, sagu, tahu, ayam & bahan lain untuk ${activeSheet?.name || ''}`}
              </p>
            </div>

            {scope === 'sheet' && activeSheet && (
              <button
                type="button"
                onClick={openAddExpense}
                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-orange-700 min-h-[40px]"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Bahan</span>
              </button>
            )}
          </div>

          {scopedExpenses.length === 0 ? (
            <div className="p-6 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-700">
                Belum ada list modal bahan untuk {activeSheet?.name || 'sheet ini'}.
              </p>
              {scope === 'sheet' && activeSheet && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => seedBasicIngredientsForSheet(activeSheet.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 min-h-[40px]"
                  >
                    <Check className="h-3.5 w-3.5 text-orange-600" />
                    <span>Isi Bahan Dasar (Terigu, Sagu, Tahu, Ayam)</span>
                  </button>

                  {otherSheetsWithExpenses[0] && (
                    <button
                      type="button"
                      onClick={() =>
                        copyExpensesFromSheet(
                          otherSheetsWithExpenses[0].id,
                          activeSheet.id
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 min-h-[40px]"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Salin dari {otherSheetsWithExpenses[0].name}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {scopedExpenses.map((exp) => {
                const sheetName =
                  scope === 'all'
                    ? sheets.find((s) => s.id === exp.sheetId)?.name
                    : '';
                return (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50/70"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {exp.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span>{exp.unitNote || 'Tanpa keterangan takaran'}</span>
                        {sheetName && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{sheetName}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                        {formatRp(exp.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => openEditExpense(exp)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label={`Edit ${exp.name}`}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      {confirmDeleteId === exp.id ? (
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteExpense(exp.id);
                            setConfirmDeleteId(null);
                          }}
                          className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-bold text-white"
                        >
                          Hapus
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(exp.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`Hapus ${exp.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between bg-slate-50 px-5 py-3.5">
                <span className="text-xs font-bold text-slate-600">
                  Total Modal Tercatat
                </span>
                <span className="font-mono text-base font-extrabold text-amber-700 tabular-nums">
                  {formatRp(financial.totalCost)}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Rekap Porsi Menu Terjual */}
        <section className="lg:col-span-5 rounded-2xl border border-slate-200/90 bg-white overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-display text-base font-bold text-slate-900">
              Rekap Porsi Menu Terjual
            </h2>
            <p className="text-xs text-slate-500">
              Ringkasan jumlah masak & penjualan per varian
            </p>
          </div>

          {menuPrepSummary.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              Belum ada pesanan masuk pada cakupan ini.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {menuPrepSummary.map((row, idx) => (
                <div
                  key={`${row.menuName}-${row.detail}-${idx}`}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {row.menuName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{row.detail}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-sm font-extrabold text-orange-600 tabular-nums">
                      {row.totalQty} porsi
                    </p>
                    <p className="font-mono text-xs text-slate-500 tabular-nums">
                      {formatRp(row.totalRevenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Modal Tambah / Edit Bahan Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-slate-900">
                {editingExpense ? 'Edit Bahan Modal' : 'Tambah Bahan Modal'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Bahan / Pengeluaran
                </label>
                <input
                  type="text"
                  value={expName}
                  onChange={(e) => setExpName(e.target.value)}
                  placeholder="Contoh: Terigu, Sagu, Tahu, Ayam, Minyak"
                  maxLength={80}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Takaran / Catatan (opsional)
                </label>
                <input
                  type="text"
                  value={expUnit}
                  onChange={(e) => setExpUnit(e.target.value)}
                  placeholder="Contoh: 2 kg / 1 papan / 1 liter"
                  maxLength={40}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Harga Modal (Rp)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value.replace(/\D/g, ''))}
                  placeholder="Contoh: 25000"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-sm font-bold text-slate-900 tabular-nums focus:border-orange-500 focus:bg-white focus:outline-none min-h-[44px]"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 min-h-[44px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingExp}
                  className="flex-1 rounded-xl bg-orange-600 py-2.5 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60 min-h-[44px]"
                >
                  {savingExp ? 'Menyimpan...' : 'Simpan Modal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
