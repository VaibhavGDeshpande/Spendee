'use client';

import { useState } from 'react';
import imageCompression from 'browser-image-compression';
import { Camera, Upload, X, Check, AlertCircle, FileText } from 'lucide-react';
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
  const [base64Data, setBase64Data] = useState<string | null>(null);

  const fileToBase64 = (f: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(f);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

  if (!isOpen) return null;

  const handleFileSelected = async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      if (file.type === 'application/pdf') {
        if (file.size > 2 * 1024 * 1024) {
          throw new Error('PDF file size must be less than 2MB');
        }
        const b64 = await fileToBase64(file);
        setBase64Data(b64);
        setPreviewUrl(b64);
      } else {
        setPreviewUrl(URL.createObjectURL(file));
        // Client-side Image Compression
        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
        };

        const compressedFile = await imageCompression(file, options);
        const b64 = await fileToBase64(compressedFile);
        setBase64Data(b64);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error attaching file';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPhoto = () => {
    if (base64Data) {
      onReceiptParsed({ 
        merchant: null, 
        transaction_date: null, 
        total_amount: null, 
        currency: 'EUR', 
        line_items: [], 
        image_data: base64Data 
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Attach Receipt / PDF
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
                Capture Photo or Upload File
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Attach a copy of your receipt (Image or PDF)
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
                    accept="image/*,application/pdf"
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
            {/* Image Preview */}
            <div className="relative h-64 bg-slate-100 dark:bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center">
              {previewUrl?.startsWith('data:application/pdf') ? (
                <iframe src={previewUrl} className="w-full h-full border-none" title="PDF Preview" />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={previewUrl as string} alt="Receipt preview" className="object-contain h-full w-full" />
              )}

              {loading && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2">
                  <div className="w-7 h-7 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  <p className="text-xs font-semibold animate-pulse">Compressing photo...</p>
                </div>
              )}
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPreviewUrl(null);
                  setBase64Data(null);
                }}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs"
              >
                Choose Another
              </button>

              <button
                type="button"
                onClick={handleApplyPhoto}
                disabled={!base64Data || loading}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>Attach to Transaction</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
