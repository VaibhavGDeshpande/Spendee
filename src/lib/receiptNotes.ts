export interface ScannedReceipt {
  merchant: string | null;
  transaction_date: string | null;
  total_amount: number | null;
  currency: string;
  line_items: { item_name: string; quantity: number; unit_price: number | null; total_price: number }[];
}

// Sends a receipt image (data URL, or a hosted URL for older uploads) to /api/ocr.
export async function scanReceiptImage(image: string): Promise<ScannedReceipt> {
  const body = new FormData();
  if (image.startsWith('data:image/')) {
    body.append('base64', image);
  } else if (/^https?:\/\//.test(image)) {
    const blob = await (await fetch(image)).blob();
    if (!blob.type.startsWith('image/')) throw new Error('Only photos can be scanned, not PDFs');
    body.append('file', new File([blob], 'receipt', { type: blob.type }));
  } else {
    throw new Error('Only photos can be scanned, not PDFs');
  }
  const res = await fetch('/api/ocr', { method: 'POST', body });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not scan the receipt');
  return data.ocr;
}

// Items stay in receipt order; names and prices are padded into two aligned columns (monospace display).
export function receiptToNotes(ocr: ScannedReceipt): string {
  const sym = ocr.currency === 'INR' ? '₹' : '€';
  const rows: [string, string][] = (ocr.line_items ?? []).map((i) => [
    `${i.quantity > 1 ? `${i.quantity}x ` : ''}${i.item_name}${i.quantity > 1 && i.unit_price != null ? ` (${sym}${Number(i.unit_price).toFixed(2)} each)` : ''}`,
    `${sym}${Number(i.total_price).toFixed(2)}`,
  ]);
  if (!rows.length) throw new Error('No items could be read from this photo');
  const total: [string, string] | null = ocr.total_amount != null ? ['Total', `${sym}${Number(ocr.total_amount).toFixed(2)}`] : null;
  const all = total ? [...rows, total] : rows;
  const nameW = Math.max(...all.map((r) => r[0].length));
  const priceW = Math.max(...all.map((r) => r[1].length));
  const line = ([n, p]: [string, string]) => `${n.padEnd(nameW)}  ${p.padStart(priceW)}`;
  return [
    [ocr.merchant, ocr.transaction_date].filter(Boolean).join(' - '),
    ...rows.map(line),
    ...(total ? ['-'.repeat(nameW + 2 + priceW), line(total)] : []),
  ].filter(Boolean).join('\n');
}
