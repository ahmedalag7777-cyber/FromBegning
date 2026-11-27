import QRCode from 'qrcode';
import { formatCurrency, formatDate } from './format';
import type { Invoice, OrderItem, StoreSettings } from '@/types';

// Lazy-load jsPDF + autoTable to keep initial bundle small
let jsPDFModule: typeof import('jspdf') | null = null;
let autoTableModule: typeof import('jspdf-autotable') | null = null;

async function getPDF() {
  if (!jsPDFModule) {
    const [jsPDF, autoTable] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    jsPDFModule = jsPDF;
    autoTableModule = autoTable;
  }
  return { jsPDF: jsPDFModule.default, autoTable: autoTableModule!.default };
}

export async function generateInvoicePDF(
  invoice: Invoice,
  items: OrderItem[],
  settings: StoreSettings | null
) {
  const { jsPDF, autoTable } = await getPDF();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const storeName = settings?.store_name || 'متجر النخبة';
  const currency = settings?.currency || 'ر.س';

  // Header bar
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, pageWidth, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(storeName, pageWidth - 15, 15, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('فاتورة ضريبية مبسطة', pageWidth - 15, 25, { align: 'right' });

  // Invoice info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice: ${invoice.invoice_number}`, 15, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Date: ${formatDate(invoice.invoice_date)}`, 15, 56);
  if (invoice.due_date) {
    doc.text(`Due: ${formatDate(invoice.due_date)}`, 15, 62);
  }

  // Customer info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', pageWidth - 15, 50, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(invoice.customer?.name || 'Customer', pageWidth - 15, 56, { align: 'right' });
  if (invoice.customer?.phone) {
    doc.text(invoice.customer.phone, pageWidth - 15, 62, { align: 'right' });
  }
  if (invoice.customer?.address) {
    doc.text(invoice.customer.address, pageWidth - 15, 68, { align: 'right' });
  }

  // QR code
  try {
    const qrData = `INV:${invoice.invoice_number},TOTAL:${invoice.total},DATE:${invoice.invoice_date}`;
    const qrBase64 = await QRCode.toDataURL(qrData, { width: 80, margin: 1 });
    doc.addImage(qrBase64, 'PNG', 15, 75, 25, 25);
  } catch {
    // QR generation failed silently
  }

  // Items table
  autoTable(doc, {
    startY: 110,
    head: [['Item', 'Qty', 'Unit Price', 'Total']],
    body: items.map((item) => [
      item.product_name,
      String(item.quantity),
      formatCurrency(item.unit_price, currency),
      formatCurrency(item.total_price, currency),
    ]),
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontSize: 10 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 40, halign: 'right' },
    },
    margin: { left: 15, right: 15 },
  });

  // Totals
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  const totalsX = pageWidth - 15;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Subtotal: ${formatCurrency(invoice.subtotal, currency)}`, totalsX, finalY, { align: 'right' });
  doc.text(`Tax: ${formatCurrency(invoice.tax_amount, currency)}`, totalsX, finalY + 6, { align: 'right' });

  doc.setFillColor(15, 118, 110);
  doc.rect(pageWidth - 80, finalY + 10, 65, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Total: ${formatCurrency(invoice.total, currency)}`, totalsX - 5, finalY + 18, { align: 'right' });

  // Status
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Status: ${invoice.status}`, 15, finalY + 18);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `${storeName} | ${settings?.store_phone || ''} | ${settings?.store_email || ''}`,
    pageWidth / 2,
    285,
    { align: 'center' }
  );

  doc.save(`Invoice_${invoice.invoice_number}.pdf`);
}

export async function generateProductQR(product: { name: string; price: number; sku?: string | null; id: string }) {
  const data = JSON.stringify({
    type: 'product',
    id: product.id,
    name: product.name,
    price: product.price,
    sku: product.sku,
  });
  return QRCode.toDataURL(data, { width: 200, margin: 2 });
}
