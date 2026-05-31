import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Apply persisted user preferences (accent, font scale) as early as possible
try {
  const accent = localStorage.getItem("hdc_accent");
  if (accent) {
    document.documentElement.style.setProperty("--primary", accent);
    document.documentElement.style.setProperty("--ring", accent);
  }
  const fs = localStorage.getItem("hdc_font_scale");
  if (fs) document.documentElement.classList.add(`font-scale-${fs}`);
} catch {}

// On every page load: unregister stale service workers and clear old caches
function ensureFreshContent() {
  try {
    const APP_VERSION_KEY = 'hdc_app_version';
    const currentVersion = import.meta.env.VITE_APP_BUILD_TIME || '__BUILD__';
    const storedVersion = localStorage.getItem(APP_VERSION_KEY);

    if (storedVersion !== currentVersion) {
      localStorage.setItem(APP_VERSION_KEY, currentVersion);

      // Clear all caches
      if ("caches" in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }

      // Unregister all service workers to prevent stale content
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((reg) => reg.unregister());
        });
      }

      // Force hard reload if this isn't the first visit (version changed)
      if (storedVersion) {
        window.location.reload();
        return;
      }
    }
  } catch {
    // Silently fail
  }
}

ensureFreshContent();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

// Hide the HTML splash loader once React mounts
const rootLoader = document.getElementById("root-loader");
if (rootLoader) {
  rootLoader.classList.add("hide");
  setTimeout(() => rootLoader.remove(), 500);
}
