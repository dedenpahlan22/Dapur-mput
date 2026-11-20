import * as XLSX from 'xlsx';
import type { Expense, Order, Sheet } from '../types/mputpos';
import { formatRp, formatTimeShort } from './format';

function formatOrderItemsSummary(order: Order): string {
  return order.items
    .map((item) => {
      const details: string[] = [];
      if (item.variantName) details.push(item.variantName);
      if (item.addonNames && item.addonNames.length > 0) {
        details.push(item.addonNames.join(', '));
      }
      const suffix = details.length > 0 ? ` (${details.join(' · ')})` : '';
      return `${item.qty}x ${item.menuName}${suffix}`;
    })
    .join('; ');
}

export function buildMenuPrepSummary(orders: Order[]) {
  const map = new Map<
    string,
    { menuName: string; detail: string; totalQty: number; totalRevenue: number }
  >();

  for (const order of orders) {
    for (const item of order.items) {
      const detailParts: string[] = [];
      if (item.variantName) detailParts.push(item.variantName);
      if (item.addonNames && item.addonNames.length > 0) {
        detailParts.push(item.addonNames.join(', '));
      }
      const detail = detailParts.join(' + ') || 'Standar';
      const key = `${item.menuName}__${detail}`;
      const existing = map.get(key);
      if (existing) {
        existing.totalQty += item.qty;
        existing.totalRevenue += item.subtotal;
      } else {
        map.set(key, {
          menuName: item.menuName,
          detail,
          totalQty: item.qty,
          totalRevenue: item.subtotal,
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalQty - a.totalQty);
}

export function exportSheetToExcel(
  sheet: Sheet,
  orders: Order[],
  expenses: Expense[],
  storeName = 'MputPos'
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Daftar Pesanan
  const orderRows = orders.map((order, idx) => ({
    No: idx + 1,
    'Nama Pemesan': order.customerName,
    Area: order.areaName,
    'Daftar Pesanan': formatOrderItemsSummary(order),
    Keterangan: order.notes || '-',
    'Status Bayar': order.isPaid ? 'Sudah Bayar' : 'Belum Bayar',
    'Total (Rp)': order.totalAmount,
    Waktu: formatTimeShort(order.createdAt),
  }));

  const grossRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const paidRevenue = orders
    .filter((o) => o.isPaid)
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const unpaidRevenue = grossRevenue - paidRevenue;

  orderRows.push({
    No: orders.length + 1,
    'Nama Pemesan': 'TOTAL OMSET KOTOR',
    Area: '',
    'Daftar Pesanan': `${orders.length} pesanan`,
    Keterangan: `Lunas: ${formatRp(paidRevenue)} | Belum: ${formatRp(unpaidRevenue)}`,
    'Status Bayar': '',
    'Total (Rp)': grossRevenue,
    Waktu: '',
  });

  const wsOrders = XLSX.utils.json_to_sheet(orderRows);
  wsOrders['!cols'] = [
    { wch: 5 },
    { wch: 20 },
    { wch: 14 },
    { wch: 42 },
    { wch: 24 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, wsOrders, 'Pesanan');

  // Sheet 2: Rekap Menu
  const prepSummary = buildMenuPrepSummary(orders);
  const prepRows = prepSummary.map((row, idx) => ({
    No: idx + 1,
    Menu: row.menuName,
    'Pilihan / Tambahan': row.detail,
    'Jumlah Porsi': row.totalQty,
    'Total Penjualan (Rp)': row.totalRevenue,
  }));
  const wsPrep = XLSX.utils.json_to_sheet(
    prepRows.length > 0
      ? prepRows
      : [{ No: '-', Menu: 'Belum ada pesanan', 'Pilihan / Tambahan': '-', 'Jumlah Porsi': 0, 'Total Penjualan (Rp)': 0 }]
  );
  wsPrep['!cols'] = [
    { wch: 5 },
    { wch: 22 },
    { wch: 24 },
    { wch: 14 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, wsPrep, 'Rekap Menu');

  // Sheet 3: Modal & Omset
  const totalCost = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = grossRevenue - totalCost;
  const financeRows = [
    ...expenses.map((exp, idx) => ({
      No: idx + 1,
      'Nama Bahan / Pengeluaran': exp.name,
      'Takaran / Catatan': exp.unitNote || '-',
      'Biaya Modal (Rp)': exp.amount,
    })),
    { No: '', 'Nama Bahan / Pengeluaran': '', 'Takaran / Catatan': '', 'Biaya Modal (Rp)': '' },
    {
      No: '',
      'Nama Bahan / Pengeluaran': 'TOTAL MODAL BAHAN',
      'Takaran / Catatan': '',
      'Biaya Modal (Rp)': totalCost,
    },
    {
      No: '',
      'Nama Bahan / Pengeluaran': 'OMSET KOTOR (PENJUALAN)',
      'Takaran / Catatan': '',
      'Biaya Modal (Rp)': grossRevenue,
    },
    {
      No: '',
      'Nama Bahan / Pengeluaran': 'OMSET BERSIH (LABA)',
      'Takaran / Catatan': netProfit >= 0 ? 'Untung' : 'Rugi',
      'Biaya Modal (Rp)': netProfit,
    },
  ];
  const wsFinance = XLSX.utils.json_to_sheet(financeRows);
  wsFinance['!cols'] = [
    { wch: 5 },
    { wch: 28 },
    { wch: 20 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsFinance, 'Modal & Omset');

  const safeSheetName = sheet.name.replace(/[^a-zA-Z0-9_-]+/g, '_');
  const safeStore = storeName.replace(/[^a-zA-Z0-9_-]+/g, '_');
  XLSX.writeFile(wb, `${safeStore}_${safeSheetName}.xlsx`);
}

export function exportSheetToCSV(
  sheet: Sheet,
  orders: Order[],
  storeName = 'MputPos'
) {
  const headers = [
    'No',
    'Nama Pemesan',
    'Area',
    'Daftar Pesanan',
    'Keterangan',
    'Status Bayar',
    'Total Harga',
    'Waktu',
  ];

  const escapeCsv = (val: string | number) => {
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const lines = [
    headers.map(escapeCsv).join(','),
    ...orders.map((order, idx) =>
      [
        idx + 1,
        order.customerName,
        order.areaName,
        formatOrderItemsSummary(order),
        order.notes || '-',
        order.isPaid ? 'Sudah Bayar' : 'Belum Bayar',
        order.totalAmount,
        formatTimeShort(order.createdAt),
      ]
        .map(escapeCsv)
        .join(',')
    ),
  ];

  const csvContent = '\uFEFF' + lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeSheetName = sheet.name.replace(/[^a-zA-Z0-9_-]+/g, '_');
  const safeStore = storeName.replace(/[^a-zA-Z0-9_-]+/g, '_');
  link.href = url;
  link.download = `${safeStore}_${safeSheetName}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildWhatsAppSummary(
  sheet: Sheet,
  orders: Order[],
  storeName = 'MputPos'
): string {
  const total = orders.reduce((s, o) => s + o.totalAmount, 0);
  const paidCount = orders.filter((o) => o.isPaid).length;
  const prep = buildMenuPrepSummary(orders);

  const lines: string[] = [
    `*${storeName} — ${sheet.name}*`,
    `Total Pesanan: ${orders.length} (${paidCount} Lunas)`,
    `Total Omset: ${formatRp(total)}`,
    '',
    '*Rekap Menu:*',
    ...prep.map((p) => `- ${p.menuName} (${p.detail}): ${p.totalQty} porsi`),
    '',
    '*Daftar Pemesan:*',
    ...orders.map(
      (o, i) =>
        `${i + 1}. ${o.customerName} [${o.areaName}] - ${formatOrderItemsSummary(o)} (${formatRp(o.totalAmount)}) [${o.isPaid ? 'LUNAS' : 'BELUM BAYAR'}]${o.notes ? ` | Cat: ${o.notes}` : ''}`
    ),
  ];

  return lines.join('\n');
}
