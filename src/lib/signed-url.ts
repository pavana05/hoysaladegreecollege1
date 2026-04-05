import { supabase } from "@/integrations/supabase/client";

const SIGNED_URL_EXPIRY = 3600; // 1 hour
const urlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Extract storage path from a full public URL or return the path as-is.
 * Handles legacy messages that stored full public URLs.
 */
function extractPath(fileUrl: string): string {
  if (!fileUrl.startsWith("http")) return fileUrl;
  
  // Extract path from Supabase storage public URL
  const marker = "/object/public/message-attachments/";
  const idx = fileUrl.indexOf(marker);
  if (idx !== -1) return fileUrl.substring(idx + marker.length);
  
  // If it's some other URL, return as-is (won't be signed)
  return fileUrl;
}

/**
 * Get a signed URL for a message attachment.
 * Caches results to avoid repeated API calls.
 */
export async function getSignedUrl(fileUrl: string): Promise<string> {
  if (!fileUrl) return "";
  
  const path = extractPath(fileUrl);
  
  // If we couldn't extract a path (external URL), return original
  if (path.startsWith("http")) return fileUrl;
  
  // Check cache
  const cached = urlCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  
  // Generate signed URL
  const { data, error } = await supabase.storage
    .from("message-attachments")
    .createSignedUrl(path, SIGNED_URL_EXPIRY);
  
  if (error || !data?.signedUrl) {
    // Fallback to public URL if signing fails (e.g., bucket still public)
    const { data: publicData } = supabase.storage
      .from("message-attachments")
      .getPublicUrl(path);
    return publicData.publicUrl;
  }
  
  // Cache with 5-minute buffer before actual expiry
  urlCache.set(path, { 
    url: data.signedUrl, 
    expiresAt: Date.now() + (SIGNED_URL_EXPIRY - 300) * 1000 
  });
  
  return data.signedUrl;
}
