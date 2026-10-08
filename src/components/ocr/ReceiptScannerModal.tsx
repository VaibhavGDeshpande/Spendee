'use client';

import { useState } from 'react';
import imageCompression from 'browser-image-compression';
import { Camera, Upload, Sparkles, X, Check, FileText, ShoppingBag, AlertCircle } from 'lucide-react';
import { OCRResult } from '@/types';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReceiptParsed: (result: OCRResult) => void;
}

export default function ReceiptScannerModal({
  isOpen,
  onClose,
  onReceiptParsed,
}: ReceiptScannerModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);

  if (!isOpen) return null;

  const handleFileSelected = async (file: File) => {
    setLoading(true);
    setError(null);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      // 1. Client-side Image Compression to save bandwidth & speed up OCR
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);

      // 2. Send compressed file to OCR route
      const formData = new FormData();
      formData.append('file', compressedFile);

      const res = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('OCR API request failed');

      const data = await res.json();
      if (data.success && data.ocr) {
        setOcrResult(data.ocr);
      } else {
        throw new Error(data.error || 'Failed to parse receipt');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error scanning receipt';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyOcr = () => {
    if (ocrResult) {
      onReceiptParsed(ocrResult);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              German Receipt OCR Scanner
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Upload Buttons */}
        {!previewUrl ? (
          <div className="space-y-3 py-4">
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:border-indigo-500 transition-colors">
              <Camera className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
              <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                Capture or Upload Receipt Photo
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Aldi, Lidl, Rewe, dm, Edeka receipts (Auto German text & MwSt parsing)
              </p>

              <div className="flex justify-center gap-3 mt-4">
                {/* Camera Input for Mobile */}
                <label className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl cursor-pointer flex items-center space-x-2 shadow-sm">
                  <Camera className="w-4 h-4" />
                  <span>Take Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
                    }}
                  />
                </label>

                {/* Upload File Input */}
                <label className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl cursor-pointer flex items-center space-x-2 border border-slate-200 dark:border-slate-700">
                  <Upload className="w-4 h-4" />
                  <span>Upload File</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Image Preview & OCR Loading */}
            <div className="relative h-40 bg-slate-100 dark:bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Receipt preview" className="object-contain h-full w-full" />

              {loading && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2">
                  <div className="w-7 h-7 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  <p className="text-xs font-semibold animate-pulse">Running German OCR Parser...</p>
                </div>
              )}
            </div>

            {/* OCR Extracted Results Preview */}
            {ocrResult && (
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div>
                    <span className="text-slate-400 block">Merchant</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {ocrResult.merchant || 'German Supermarket'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block">Total Extracted</span>
                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">
                      €{(ocrResult.total_amount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Extracted Line Items list */}
                {ocrResult.line_items && ocrResult.line_items.length > 0 && (
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    <p className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1 mb-1">
                      <ShoppingBag className="w-3 h-3 text-indigo-500" />
                      <span>Extracted Line Items ({ocrResult.line_items.length})</span>
                    </p>
                    {ocrResult.line_items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-slate-600 dark:text-slate-300 py-0.5 border-b border-slate-100 dark:border-slate-900">
                        <span>{item.quantity}x {item.item_name}</span>
                        <span className="font-medium">€{item.total_price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPreviewUrl(null);
                  setOcrResult(null);
                }}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs"
              >
                Scan Another
              </button>

              <button
                type="button"
                onClick={handleApplyOcr}
                disabled={!ocrResult}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>Apply to Transaction</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
