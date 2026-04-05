import { useState, useEffect } from "react";
import { getSignedUrl } from "@/lib/signed-url";

/**
 * Hook that resolves signed URLs for message attachments.
 * Takes an array of messages and returns a map of message ID -> signed URL.
 */
export function useSignedUrls(messages: Array<{ id: string; file_url?: string | null }>) {
  const [urlMap, setUrlMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const messagesWithFiles = messages.filter((m) => m.file_url);
    if (messagesWithFiles.length === 0) return;

    let cancelled = false;

    const resolve = async () => {
      const newMap: Record<string, string> = {};
      await Promise.all(
        messagesWithFiles.map(async (msg) => {
          try {
            const signed = await getSignedUrl(msg.file_url!);
            newMap[msg.id] = signed;
          } catch {
            newMap[msg.id] = msg.file_url!;
          }
        })
      );
      if (!cancelled) {
        setUrlMap((prev) => ({ ...prev, ...newMap }));
      }
    };

    resolve();
    return () => { cancelled = true; };
  }, [messages]);

  return urlMap;
}
