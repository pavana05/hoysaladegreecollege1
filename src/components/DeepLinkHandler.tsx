import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App, type URLOpenListenerEvent } from "@capacitor/app";

/**
 * Deep link handler.
 *
 * Handles:
 *  1. Native URI scheme + universal links via Capacitor's `appUrlOpen` event.
 *     Examples:
 *       hdc://register
 *       com.hoysala.app://login
 *       https://hoysaladegreecollege.in/register
 *  2. In-app anchor clicks (`<a href="/register">`) — intercepts same-origin
 *     navigations and routes them through react-router instead of a full reload.
 *  3. First-load `?redirect=/path` query (useful for web → app handoff).
 *
 * No third-party libraries used — only the already-installed @capacitor/app.
 */
export default function DeepLinkHandler() {
  const navigate = useNavigate();

  // Extract a router-friendly path from any incoming URL string
  const toAppPath = (raw: string): string | null => {
    try {
      // Custom schemes (hdc://register) aren't valid URL bases — normalize first
      const normalized = raw.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "https://_app_/");
      const u = new URL(normalized);
      const path = (u.pathname || "/") + (u.search || "") + (u.hash || "");
      return path.startsWith("/") ? path : "/" + path;
    } catch {
      return null;
    }
  };

  // 1. Native deep links
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let remove: (() => void) | undefined;
    App.addListener("appUrlOpen", (event: URLOpenListenerEvent) => {
      const path = toAppPath(event.url);
      if (path) navigate(path, { replace: false });
    }).then((handle) => {
      remove = () => handle.remove();
    });
    return () => {
      remove?.();
    };
  }, [navigate]);

  // 2. Intercept in-app anchor clicks for same-origin navigations
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      // Skip explicit new-tab, downloads, mailto/tel, external schemes
      if (anchor.target && anchor.target !== "" && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.dataset.external === "true") return;
      if (/^(mailto:|tel:|sms:|https?:\/\/)/i.test(href)) {
        // Allow same-origin absolute URLs to be intercepted
        if (/^https?:\/\//i.test(href)) {
          try {
            const u = new URL(href);
            if (u.origin !== window.location.origin) return;
            e.preventDefault();
            navigate(u.pathname + u.search + u.hash);
            return;
          } catch {
            return;
          }
        }
        return;
      }
      if (href.startsWith("#")) return;
      e.preventDefault();
      navigate(href);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [navigate]);

  // 3. ?redirect=/path handoff on first load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    if (redirect && redirect.startsWith("/")) {
      navigate(redirect, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
