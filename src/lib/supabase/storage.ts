import { createClient } from './client';

export interface StorageUploadResult {
  publicUrl: string | null;
  path: string | null;
  error: string | null;
}

/**
 * Uploads a receipt image or document to Supabase Storage bucket 'receipts'.
 * Returns public URL on success, or fallback data URL if offline/unconfigured.
 */
export async function uploadReceiptImage(
  fileOrBlob: File | Blob,
  fileName?: string
): Promise<StorageUploadResult> {
  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (!isConfigured) {
      const dataUrl = await blobToDataUrl(fileOrBlob);
      return { publicUrl: dataUrl, path: null, error: null };
    }

    const fileExt = fileOrBlob.type.split('/')[1] || 'jpeg';
    const name = fileName || `receipt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `user_receipts/${name}`;

    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(filePath, fileOrBlob, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.warn('Supabase storage upload error, falling back to local URL:', error.message);
      const dataUrl = await blobToDataUrl(fileOrBlob);
      return { publicUrl: dataUrl, path: null, error: error.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(data.path);

    return {
      publicUrl: publicUrlData.publicUrl,
      path: data.path,
      error: null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown upload error';
    console.error('Storage upload exception:', msg);
    const dataUrl = await blobToDataUrl(fileOrBlob);
    return { publicUrl: dataUrl, path: null, error: msg };
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
