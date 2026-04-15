import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

const APP_LOCK_KEY = "hdc_app_lock_enabled";
const LOCK_TIMEOUT_MS = 3000; // grace period after background

export function useAppLock() {
  const [isEnabled, setIsEnabled] = useState(() => localStorage.getItem(APP_LOCK_KEY) === "true");
  const [isLocked, setIsLocked] = useState(false);
  const [backgroundAt, setBackgroundAt] = useState<number | null>(null);

  const enable = useCallback(() => {
    localStorage.setItem(APP_LOCK_KEY, "true");
    setIsEnabled(true);
  }, []);

  const disable = useCallback(() => {
    localStorage.setItem(APP_LOCK_KEY, "false");
    setIsEnabled(false);
    setIsLocked(false);
  }, []);

  const unlock = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      setIsLocked(false);
      return true;
    }
    try {
      const { NativeBiometric } = await import("capacitor-native-biometric");
      await NativeBiometric.verifyIdentity({
        reason: "Unlock HDC Portal",
        title: "App Lock",
        subtitle: "Verify your identity to continue",
        useFallback: true,
      });
      setIsLocked(false);
      return true;
    } catch {
      return false;
    }
  }, []);

  const checkAvailability = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const { NativeBiometric } = await import("capacitor-native-biometric");
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch {
      return false;
    }
  }, []);

  // Listen for app state changes (background/foreground)
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !isEnabled) return;

    const listener = App.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) {
        setBackgroundAt(Date.now());
      } else if (backgroundAt && Date.now() - backgroundAt > LOCK_TIMEOUT_MS) {
        setIsLocked(true);
      }
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, [isEnabled, backgroundAt]);

  return { isEnabled, isLocked, setIsLocked, enable, disable, unlock, checkAvailability };
}
