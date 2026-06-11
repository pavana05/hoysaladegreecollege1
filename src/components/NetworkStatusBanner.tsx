import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { WifiOff } from "lucide-react";

/**
 * Native-only offline banner. Renders a top-anchored alert whenever the
 * device loses network connectivity inside the Capacitor WebView so users
 * know why screens aren't loading and aren't silently shown stale data.
 *
 * Uses the standard `navigator.onLine` + `online`/`offline` events which
 * are supported on Android/iOS WebViews without an extra plugin.
 */
export default function NetworkStatusBanner() {
  const isNative = Capacitor.isNativePlatform();
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    if (!isNative) return;
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isNative]);

  if (!isNative || online) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 inset-x-0 z-[9999] px-4 py-3 flex items-center justify-center gap-2 text-white text-sm font-medium shadow-lg"
      style={{
        background: "linear-gradient(135deg, hsl(0 70% 45%), hsl(0 75% 38%))",
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
      }}
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>No internet connection. Some features won't work until you're back online.</span>
    </div>
  );
}
