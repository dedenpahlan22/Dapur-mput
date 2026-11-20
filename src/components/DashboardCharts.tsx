import React, { useMemo, useState } from 'react';
import type { Expense, Order, Sheet } from '../types/mputpos';
import { formatRp } from '../utils/format';

interface DashboardChartsProps {
  scope: 'sheet' | 'all';
  activeSheet: Sheet | null;
  sheets: Sheet[];
  allOrders: Order[];
  allExpenses: Expense[];
  scopedOrders: Order[];
  scopedExpenses: Expense[];
}

const DONUT_COLORS = [
  '#EA580C', // orange-600
  '#D97706', // amber-600
  '#0284C7', // sky-600
  '#16A34A', // emerald-600
  '#7C3AED', // violet-600
  '#DB2777', // pink-600
  '#475569', // slate-600
];

function formatCompactRp(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1).replace(/\.0$/, '')}jt`;
  }
  if (abs >= 1_000) {
    return `${sign}${Math.round(abs / 1_000)}rb`;
  }
  return `${sign}${abs}`;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  scope,
  activeSheet,
  sheets,
  allOrders,
  allExpenses,
  scopedOrders,
  scopedExpenses,
}) => {
  const [breakdownTab, setBreakdownTab] = useState<'menu' | 'area'>('menu');
  const [selectedSheetIdx, setSelectedSheetIdx] = useState<number | null>(null);
  const [selectedSliceIdx, setSelectedSliceIdx] = useState<number | null>(null);

  // 1. Per-sheet comparison data (always across sheets for trend comparison)
  const sheetSeries = useMemo(() => {
    return sheets.map((sheet) => {
      const sOrders = allOrders.filter((o) => o.sheetId === sheet.id);
      const sExpenses = allExpenses.filter((e) => e.sheetId === sheet.id);
      const gross = sOrders.reduce((s, o) => s + o.totalAmount, 0);
      const cost = sExpenses.reduce((s, e) => s + e.amount, 0);
      const net = gross - cost;
      return {
        id: sheet.id,
        name: sheet.name,
        gross,
        cost,
        net,
        orderCount: sOrders.length,
      };
    });
  }, [sheets, allOrders, allExpenses]);

  // 2. Scoped summary numbers
  const summary = useMemo(() => {
    const gross = scopedOrders.reduce((s, o) => s + o.totalAmount, 0);
    const paid = scopedOrders
      .filter((o) => o.isPaid)
      .reduce((s, o) => s + o.totalAmount, 0);
    const unpaid = gross - paid;
    const cost = scopedExpenses.reduce((s, e) => s + e.amount, 0);
    const net = gross - cost;
    const marginPct = gross > 0 ? Math.round((net / gross) * 100) : 0;
    const paidPct = gross > 0 ? Math.round((paid / gross) * 100) : 0;
    return { gross, paid, unpaid, cost, net, marginPct, paidPct };
  }, [scopedOrders, scopedExpenses]);

  // 3. Ingredient Cost Donut Slices (grouped by ingredient name when viewing all)
  const costSlices = useMemo(() => {
    const map = new Map<string, number>();
    for (const exp of scopedExpenses) {
      const key = exp.name.trim() || 'Lainnya';
      map.set(key, (map.get(key) || 0) + exp.amount);
    }
    const sorted = Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    const total = sorted.reduce((s, x) => s + x.amount, 0);
    // Keep top 6 + group rest into "Lainnya"
    const top = sorted.slice(0, 6);
    if (sorted.length > 6) {
      const rest = sorted.slice(6).reduce((s, x) => s + x.amount, 0);
      top.push({ name: 'Lainnya', amount: rest });
    }

    return top.map((item, idx) => ({
      ...item,
      pct: total > 0 ? Math.round((item.amount / total) * 100) : 0,
      color: DONUT_COLORS[idx % DONUT_COLORS.length],
    }));
  }, [scopedExpenses]);

  // 4. Menu & Area Revenue Breakdown
  const menuBreakdown = useMemo(() => {
    const map = new Map<string, { label: string; qty: number; revenue: number }>();
    for (const ord of scopedOrders) {
      for (const item of ord.items) {
        const key = item.menuName;
        const prev = map.get(key);
        if (prev) {
          prev.qty += item.qty;
          prev.revenue += item.subtotal;
        } else {
          map.set(key, {
            label: item.menuName,
            qty: item.qty,
            revenue: item.subtotal,
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [scopedOrders]);

  const areaBreakdown = useMemo(() => {
    const map = new Map<string, { label: string; qty: number; revenue: number }>();
    for (const ord of scopedOrders) {
      const key = ord.areaName || 'Tanpa Area';
      const prev = map.get(key);
      if (prev) {
        prev.qty += 1;
        prev.revenue += ord.totalAmount;
      } else {
        map.set(key, {
          label: key,
          qty: 1,
          revenue: ord.totalAmount,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [scopedOrders]);

  const activeBreakdown = breakdownTab === 'menu' ? menuBreakdown : areaBreakdown;
  const maxBreakdownRev = Math.max(
    1,
    ...activeBreakdown.map((b) => b.revenue)
  );

  // SVG Grouped Bar Chart calculations for sheetSeries
  const maxSheetValue = Math.max(
    10000,
    ...sheetSeries.flatMap((s) => [s.gross, s.cost, Math.max(0, s.net)])
  );

  const activeHighlightedSheet =
    selectedSheetIdx !== null && sheetSeries[selectedSheetIdx]
      ? sheetSeries[selectedSheetIdx]
      : sheetSeries.find((s) => s.id === activeSheet?.id) || sheetSeries[0] || null;

  // Donut geometry
  const donutRadius = 56;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const totalCostForDonut = costSlices.reduce((s, x) => s + x.amount, 0);

  const summaryMax = Math.max(
    1,
    summary.gross,
    summary.cost,
    Math.abs(summary.net)
  );

  return (
    <div className="space-y-4">
      {/* Row 1: Financial Comparison Diagram & Sheet Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Card A: Ringkasan Visual Omset vs Modal vs Laba + Rasio Bayar */}
        <section className="lg:col-span-5 rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Diagram Omset, Modal & Laba
              </h2>
              <p className="text-xs text-slate-500">
                {scope === 'all'
                  ? 'Perbandingan total semua sheet'
                  : `Perbandingan untuk ${activeSheet?.name || 'sheet aktif'}`}
              </p>
            </div>
            <span
              className={`font-mono text-xs font-bold tabular-nums ${
                summary.net >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              Margin {summary.marginPct}%
            </span>
          </div>

          <div className="space-y-3.5 pt-1">
            {/* Bar: Omset Kotor */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700">Omset Kotor</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {formatRp(summary.gross)}
                </span>
              </div>
              <div className="h-3.5 w-full rounded-lg bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-lg bg-orange-600 transition-all duration-300"
                  style={{
                    width: `${summary.gross > 0 ? Math.max(4, (summary.gross / summaryMax) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Bar: Modal Bahan */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700">Total Modal Bahan</span>
                <span className="font-mono font-bold text-amber-700 tabular-nums">
                  {formatRp(summary.cost)}
                </span>
              </div>
              <div className="h-3.5 w-full rounded-lg bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-lg bg-amber-500 transition-all duration-300"
                  style={{
                    width: `${summary.cost > 0 ? Math.max(4, (summary.cost / summaryMax) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Bar: Omset Bersih */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700">
                  Omset Bersih ({summary.net >= 0 ? 'Untung' : 'Rugi'})
                </span>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    summary.net >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {formatRp(summary.net)}
                </span>
              </div>
              <div className="h-3.5 w-full rounded-lg bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-lg transition-all duration-300 ${
                    summary.net >= 0 ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                  style={{
                    width: `${summary.net !== 0 ? Math.max(4, (Math.abs(summary.net) / summaryMax) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Payment Collected Bar */}
          <div className="border-t border-slate-100 pt-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">
                Rasio Pembayaran Masuk
              </span>
              <span className="font-mono font-bold text-slate-700 tabular-nums">
                {summary.paidPct}% Lunas
              </span>
            </div>
            <div className="flex h-3 w-full rounded-lg bg-rose-100 overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${summary.paidPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Sudah Bayar: {formatRp(summary.paid)}</span>
              <span>Belum Bayar: {formatRp(summary.unpaid)}</span>
            </div>
          </div>
        </section>

        {/* Card B: Grafik Batang Antar Sheet Tanggal */}
        <section className="lg:col-span-7 rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Grafik Omset & Modal per Sheet
              </h2>
              <p className="text-xs text-slate-500">
                Ketuk kolom sheet untuk melihat angka detail tiap tanggal
              </p>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-orange-600" />
                Omset
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-amber-500" />
                Modal
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-emerald-600" />
                Bersih
              </span>
            </div>
          </div>

          {sheetSeries.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Belum ada data sheet untuk ditampilkan.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto no-scrollbar">
                <div
                  className="min-w-[320px] flex items-end gap-3 pt-4 pb-2 px-1"
                  style={{ height: 196 }}
                >
                  {sheetSeries.map((s, idx) => {
                    const grossH = Math.round((s.gross / maxSheetValue) * 130);
                    const costH = Math.round((s.cost / maxSheetValue) * 130);
                    const netH = Math.round(
                      (Math.max(0, s.net) / maxSheetValue) * 130
                    );
                    const isSelected = activeHighlightedSheet?.id === s.id;

                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedSheetIdx(idx)}
                        className={`flex-1 min-w-[74px] flex flex-col items-center rounded-xl px-2 py-2 transition-colors ${
                          isSelected
                            ? 'bg-slate-100/90'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-end justify-center gap-1.5 h-[134px] w-full">
                          {/* Gross Bar */}
                          <div className="flex flex-col items-center justify-end h-full">
                            <span className="font-mono text-[9px] font-semibold text-slate-500 mb-1 tabular-nums">
                              {s.gross > 0 ? formatCompactRp(s.gross) : ''}
                            </span>
                            <div
                              className="w-4 sm:w-5 rounded-t-md bg-orange-600 transition-all duration-300"
                              style={{ height: s.gross > 0 ? Math.max(6, grossH) : 2 }}
                            />
                          </div>

                          {/* Cost Bar */}
                          <div className="flex flex-col items-center justify-end h-full">
                            <span className="font-mono text-[9px] font-semibold text-slate-500 mb-1 tabular-nums">
                              {s.cost > 0 ? formatCompactRp(s.cost) : ''}
                            </span>
                            <div
                              className="w-4 sm:w-5 rounded-t-md bg-amber-500 transition-all duration-300"
                              style={{ height: s.cost > 0 ? Math.max(6, costH) : 2 }}
                            />
                          </div>

                          {/* Net Profit Bar */}
                          <div className="flex flex-col items-center justify-end h-full">
                            <span className="font-mono text-[9px] font-semibold text-slate-500 mb-1 tabular-nums">
                              {s.net !== 0 ? formatCompactRp(s.net) : ''}
                            </span>
                            <div
                              className={`w-4 sm:w-5 rounded-t-md transition-all duration-300 ${
                                s.net >= 0 ? 'bg-emerald-600' : 'bg-rose-500'
                              }`}
                              style={{
                                height:
                                  s.net > 0
                                    ? Math.max(6, netH)
                                    : s.net < 0
                                      ? 10
                                      : 2,
                              }}
                            />
                          </div>
                        </div>

                        <span className="mt-2 text-[11px] font-bold text-slate-800 truncate max-w-[84px]">
                          {s.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeHighlightedSheet && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs">
                  <span className="font-bold text-slate-900">
                    {activeHighlightedSheet.name} ({activeHighlightedSheet.orderCount}{' '}
                    pesanan)
                  </span>
                  <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums">
                    <span className="text-slate-700">
                      Omset: <strong>{formatRp(activeHighlightedSheet.gross)}</strong>
                    </span>
                    <span className="text-amber-700">
                      Modal: <strong>{formatRp(activeHighlightedSheet.cost)}</strong>
                    </span>
                    <span
                      className={
                        activeHighlightedSheet.net >= 0
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                      }
                    >
                      Bersih: <strong>{formatRp(activeHighlightedSheet.net)}</strong>
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* Row 2: Ingredient Cost Donut Chart + Menu/Area Revenue Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Card C: Donut Diagram Komposisi Modal Bahan */}
        <section className="lg:col-span-5 rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Diagram Komposisi Modal Bahan
            </h2>
            <p className="text-xs text-slate-500">
              Porsi biaya bahan terbesar (Terigu, Sagu, Tahu, Ayam, dll)
            </p>
          </div>

          {totalCostForDonut <= 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Belum ada biaya modal bahan pada cakupan ini.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="relative h-36 w-36 shrink-0 flex items-center justify-center">
                <svg
                  viewBox="0 0 140 140"
                  className="h-full w-full -rotate-90"
                  aria-label="Diagram Komposisi Modal Bahan"
                >
                  {(() => {
                    let offset = 0;
                    return costSlices.map((slice, idx) => {
                      const dash =
                        (slice.amount / totalCostForDonut) * donutCircumference;
                      const currentOffset = offset;
                      offset += dash;
                      const isActive = selectedSliceIdx === idx;
                      return (
                        <circle
                          key={slice.name}
                          cx="70"
                          cy="70"
                          r={donutRadius}
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth={isActive ? 22 : 18}
                          strokeDasharray={`${dash} ${donutCircumference - dash}`}
                          strokeDashoffset={-currentOffset}
                          className="cursor-pointer transition-all duration-200"
                          onClick={() =>
                            setSelectedSliceIdx((prev) =>
                              prev === idx ? null : idx
                            )
                          }
                        />
                      );
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                  <span className="text-[10px] font-semibold text-slate-400">
                    {selectedSliceIdx !== null && costSlices[selectedSliceIdx]
                      ? costSlices[selectedSliceIdx].name
                      : 'Total Modal'}
                  </span>
                  <span className="font-mono text-xs font-extrabold text-slate-900 tabular-nums">
                    {selectedSliceIdx !== null && costSlices[selectedSliceIdx]
                      ? formatCompactRp(costSlices[selectedSliceIdx].amount)
                      : formatCompactRp(totalCostForDonut)}
                  </span>
                </div>
              </div>

              <ul className="w-full flex-1 space-y-2">
                {costSlices.map((slice, idx) => (
                  <li key={slice.name}>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedSliceIdx((prev) =>
                          prev === idx ? null : idx
                        )
                      }
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left text-xs transition-colors ${
                        selectedSliceIdx === idx
                          ? 'bg-slate-100 font-bold'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-xs"
                          style={{ backgroundColor: slice.color }}
                        />
                        <span className="truncate text-slate-800">
                          {slice.name}
                        </span>
                      </span>
                      <span className="font-mono font-semibold text-slate-700 tabular-nums shrink-0">
                        {slice.pct}% · {formatCompactRp(slice.amount)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Card D: Diagram Penjualan per Menu & per Area */}
        <section className="lg:col-span-7 rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Diagram Penjualan {breakdownTab === 'menu' ? 'per Menu' : 'per Area'}
              </h2>
              <p className="text-xs text-slate-500">
                Kontribusi omset berdasarkan {breakdownTab === 'menu' ? 'jenis menu' : 'wilayah pengantaran'}
              </p>
            </div>

            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setBreakdownTab('menu')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors min-h-[34px] ${
                  breakdownTab === 'menu'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Per Menu
              </button>
              <button
                type="button"
                onClick={() => setBreakdownTab('area')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors min-h-[34px] ${
                  breakdownTab === 'area'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Per Area
              </button>
            </div>
          </div>

          {activeBreakdown.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Belum ada pesanan masuk pada cakupan ini.
            </div>
          ) : (
            <div className="space-y-3">
              {activeBreakdown.map((row, idx) => {
                const widthPct = Math.max(
                  4,
                  Math.round((row.revenue / maxBreakdownRev) * 100)
                );
                const barColor =
                  breakdownTab === 'menu'
                    ? DONUT_COLORS[idx % DONUT_COLORS.length]
                    : '#0284C7';
                return (
                  <div key={row.label} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-slate-800 truncate">
                        {row.label}
                        <span className="ml-1.5 font-normal text-slate-500">
                          ({row.qty} {breakdownTab === 'menu' ? 'porsi' : 'pesanan'})
                        </span>
                      </span>
                      <span className="font-mono font-bold text-slate-900 tabular-nums shrink-0">
                        {formatRp(row.revenue)}
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-lg bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-lg transition-all duration-300"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: barColor,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
