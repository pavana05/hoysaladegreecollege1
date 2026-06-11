import { describe, it, expect } from "vitest";
import { resolveTapUrl } from "@/lib/push-tap";

describe("resolveTapUrl — native push tap routing", () => {
  it("routes app_update kind to the dashboard so UpdatePrompt opens", () => {
    expect(resolveTapUrl({ kind: "app_update", version: "1.2.3" })).toBe(
      "/dashboard"
    );
  });

  it("prefers app_update routing even if a different url is provided", () => {
    expect(
      resolveTapUrl({ kind: "app_update", url: "/some/other/page" })
    ).toBe("/dashboard");
  });

  it("falls back to the explicit url when no special kind is set", () => {
    expect(resolveTapUrl({ url: "/dashboard/student/notices" })).toBe(
      "/dashboard/student/notices"
    );
  });

  it("returns null for empty / missing payloads", () => {
    expect(resolveTapUrl(null)).toBeNull();
    expect(resolveTapUrl(undefined)).toBeNull();
    expect(resolveTapUrl({})).toBeNull();
    expect(resolveTapUrl({ url: "" })).toBeNull();
  });

  it("ignores non-string url values", () => {
    expect(resolveTapUrl({ url: 42 as any })).toBeNull();
  });
});
