import Papa from 'papaparse';
import { formatCurrency, formatDateShort } from './format';
import type { Product, Order, Invoice, Account } from '@/types';

type ExportRow = Record<string, string | number>;

// Lazy-load ExcelJS to keep initial bundle small
let ExcelJSModule: typeof import('exceljs') | null = null;
async function getExcelJS() {
  if (!ExcelJSModule) {
    ExcelJSModule = await import('exceljs');
  }
  return ExcelJSModule;
}

async function downloadExcel(filename: string, sheets: { name: string; rows: ExportRow[] }[]) {
  const ExcelJS = await getExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'متجر النخبة';
  wb.created = new Date();

  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name);
    if (sheet.rows.length === 0) continue;

    const headers = Object.keys(sheet.rows[0]);
    const headerRow = ws.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const row of sheet.rows) {
      ws.addRow(Object.values(row));
    }

    // Auto-fit columns
    ws.columns.forEach((col: { width?: number }, i: number) => {
      let maxLen = headers[i].length;
      for (const row of sheet.rows) {
        const val = String(Object.values(row)[i] || '');
        if (val.length > maxLen) maxLen = val.length;
      }
      col.width = Math.min(maxLen + 3, 40);
    });

    // RTL
    ws.views = [{ rightToLeft: true }];
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCSV(filename: string, rows: ExportRow[]) {
  const csv = Papa.unparse(rows);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const exporters = {
  productsExcel: async (products: Product[]) => {
    const rows: ExportRow[] = products.map((p) => ({
      'SKU': p.sku || '',
      'الاسم': p.name,
      'السعر': p.price,
      'التكلفة': p.cost,
      'المخزون': p.stock,
      'الفئة': p.category?.name || '',
      'نشط': p.is_active ? 'نعم' : 'لا',
      'مميز': p.is_featured ? 'نعم' : 'لا',
      'التقييم': p.rating,
    }));
    await downloadExcel('المنتجات.xlsx', [{ name: 'المنتجات', rows }]);
  },

  productsCSV: (products: Product[]) => {
    const rows: ExportRow[] = products.map((p) => ({
      sku: p.sku || '',
      name: p.name,
      price: p.price,
      cost: p.cost,
      stock: p.stock,
      category: p.category?.name || '',
    }));
    downloadCSV('المنتجات.csv', rows);
  },

  ordersExcel: async (orders: Order[]) => {
    const rows: ExportRow[] = orders.map((o) => ({
      'رقم الطلب': o.order_number,
      'العميل': o.customer?.name || o.shipping_name || '',
      'التاريخ': formatDateShort(o.created_at),
      'الحالة': o.status,
      'حالة الدفع': o.payment_status,
      'المجموع الفرعي': o.subtotal,
      'الضريبة': o.tax_amount,
      'الشحن': o.shipping_cost,
      'الإجمالي': o.total,
    }));
    await downloadExcel('الطلبات.xlsx', [{ name: 'الطلبات', rows }]);
  },

  ordersCSV: (orders: Order[]) => {
    const rows: ExportRow[] = orders.map((o) => ({
      order_number: o.order_number,
      customer: o.customer?.name || o.shipping_name || '',
      date: formatDateShort(o.created_at),
      status: o.status,
      total: o.total,
    }));
    downloadCSV('الطلبات.csv', rows);
  },

  invoicesExcel: async (invoices: Invoice[]) => {
    const rows: ExportRow[] = invoices.map((inv) => ({
      'رقم الفاتورة': inv.invoice_number,
      'العميل': inv.customer?.name || '',
      'تاريخ الإصدار': formatDateShort(inv.invoice_date),
      'تاريخ الاستحقاق': inv.due_date ? formatDateShort(inv.due_date) : '',
      'المجموع الفرعي': inv.subtotal,
      'الضريبة': inv.tax_amount,
      'الإجمالي': inv.total,
      'المدفوع': inv.paid_amount,
      'الحالة': inv.status,
    }));
    await downloadExcel('الفواتير.xlsx', [{ name: 'الفواتير', rows }]);
  },

  financialReportExcel: async (accounts: Account[], summary: { totalRevenue: number; totalExpenses: number; netProfit: number }) => {
    const sheets = [
      {
        name: 'قائمة الدخل',
        rows: [
          { 'البند': 'إجمالي الإيرادات', 'المبلغ': summary.totalRevenue },
          { 'البند': 'إجمالي المصروفات', 'المبلغ': summary.totalExpenses },
          { 'البند': 'صافي الربح', 'المبلغ': summary.netProfit },
        ] as ExportRow[],
      },
      {
        name: 'دليل الحسابات',
        rows: accounts.map((a) => ({
          'الرمز': a.code,
          'الحساب': a.name,
          'النوع': a.type,
          'الرصيد': a.balance,
        })) as ExportRow[],
      },
    ];
    await downloadExcel('التقرير_المالي.xlsx', sheets);
  },
};
