import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Share } from "@capacitor/share";
import { toast } from "sonner";

const NOTIFICATION_ID = 9999;

/**
 * Downloads a file. On native platforms, saves to device storage with
 * a progress notification and opens the file on completion.
 * On web, falls back to streaming blob download.
 *
 * Optional `onProgress(percent)` is called with 0–100 during streaming
 * downloads (when content-length is known).
 */
export async function downloadFile(
  url: string,
  title: string,
  onProgress?: (percent: number) => void,
) {
  if (!Capacitor.isNativePlatform()) {
    return webDownload(url, title, onProgress);
  }
  return nativeDownload(url, title, onProgress);
}

async function webDownload(url: string, title: string, onProgress?: (p: number) => void) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const total = Number(resp.headers.get("content-length") || 0);
    const reader = resp.body?.getReader();
    const ext = url.split(".").pop()?.split("?")[0] || "file";
    let blob: Blob;
    if (reader && total > 0) {
      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          onProgress?.(Math.min(99, Math.round((received / total) * 100)));
        }
      }
      blob = new Blob(chunks as BlobPart[]);
    } else {
      blob = await resp.blob();
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
    onProgress?.(100);
  } catch {
    window.open(url, "_blank");
  }
}

async function nativeDownload(url: string, title: string, onProgress?: (p: number) => void) {
  const ext = url.split(".").pop()?.split("?")[0] || "file";
  const fileName = `${title.replace(/[^a-zA-Z0-9_\-. ]/g, "_")}.${ext}`;

  try {
    await LocalNotifications.requestPermissions();
    await showProgressNotification("Downloading…", `${title}`, 0);
    toast.loading(`Downloading ${title}…`, { id: "native-dl" });

    let resultUri: string | null = null;

    // ─── Fast path: native HTTP download via @capacitor/filesystem ───
    // Avoids streaming chunks through the JS bridge + base64 encoding.
    // Typically 3-5× faster than fetch+writeFile on Android.
    try {
      const anyFs = Filesystem as unknown as {
        downloadFile?: (opts: any) => Promise<{ path?: string }>;
        addListener?: (event: string, cb: (info: any) => void) => Promise<{ remove: () => Promise<void> }>;
      };
      if (typeof anyFs.downloadFile === "function") {
        let progHandle: { remove: () => Promise<void> } | null = null;
        let lastNotifyPercent = 0;
        if (typeof anyFs.addListener === "function") {
          try {
            progHandle = await anyFs.addListener("progress", (info: any) => {
              if (info?.contentLength > 0) {
                const pct = Math.min(99, Math.round((info.bytes / info.contentLength) * 100));
                onProgress?.(pct);
                if (pct - lastNotifyPercent >= 10) {
                  lastNotifyPercent = pct;
                  showProgressNotification("Downloading…", `${title} — ${pct}%`, pct);
                }
              }
            });
          } catch { /* progress optional */ }
        }
        const res = await anyFs.downloadFile({
          url,
          path: `Download/${fileName}`,
          directory: Directory.ExternalStorage,
          recursive: true,
          progress: true,
        });
        await progHandle?.remove();
        resultUri = res?.path ?? null;
      }
    } catch (fastErr) {
      console.warn("[update] native downloadFile failed, falling back to fetch stream", fastErr);
    }

    // ─── Fallback: streaming fetch + base64 writeFile ───
    if (!resultUri) {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const contentLength = Number(resp.headers.get("content-length") || 0);
      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No readable stream");

      const chunks: Uint8Array[] = [];
      let received = 0;
      let lastNotifyPercent = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (contentLength > 0) {
          const percent = Math.round((received / contentLength) * 100);
          onProgress?.(Math.min(99, percent));
          if (percent - lastNotifyPercent >= 10) {
            lastNotifyPercent = percent;
            await showProgressNotification("Downloading…", `${title} — ${percent}%`, percent);
          }
        }
      }

      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      const merged = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
      const base64 = uint8ToBase64(merged);

      const result = await Filesystem.writeFile({
        path: `Download/${fileName}`,
        data: base64,
        directory: Directory.ExternalStorage,
        recursive: true,
      });
      resultUri = result.uri;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIFICATION_ID,
          title: "Download Complete ✅",
          body: `${title} has been downloaded. Tap to open.`,
          smallIcon: "ic_stat_notification",
          actionTypeId: "OPEN_FILE",
          extra: { filePath: resultUri, fileName, mimeType: getMimeType(ext) },
        },
      ],
    });

    LocalNotifications.addListener("localNotificationActionPerformed", async (action) => {
      if (action.notification.id === NOTIFICATION_ID) {
        try {
          await Share.share({ title: fileName, url: action.notification.extra?.filePath || resultUri! });
        } catch { /* cancelled */ }
      }
    });

    onProgress?.(100);
    toast.success(`${title} downloaded successfully!`, { id: "native-dl" });
  } catch (err: any) {
    console.error("Native download failed:", err);
    toast.error(`Download failed: ${err?.message || "Unknown error"}`, { id: "native-dl" });
    window.open(url, "_system");
  }
}

async function showProgressNotification(title: string, body: string, _percent: number) {
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIFICATION_ID,
          title,
          body,
          ongoing: true,
          autoCancel: false,
          smallIcon: "ic_stat_notification",
        },
      ],
    });
  } catch {
    // Notification permission may be denied
  }
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    mp4: "video/mp4",
    webm: "video/webm",
    zip: "application/zip",
    apk: "application/vnd.android.package-archive",
  };
  return map[ext.toLowerCase()] || "application/octet-stream";
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
