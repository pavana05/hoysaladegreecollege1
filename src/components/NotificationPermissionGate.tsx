import { useState, useEffect } from "react";
import { Bell, ShieldAlert, Settings, Smartphone, Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Capacitor } from "@capacitor/core";

export default function NotificationPermissionGate() {
  const { user } = useAuth();
  const { permission, isSubscribed, isSupported, subscribe, isLoading } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    setDismissed(false);
  }, [user?.id]);

  if (!user || isSubscribed || permission === "granted" || !isSupported || dismissed) {
    return null;
  }

  const isDenied = permission === "denied";

  const handleAllow = async () => {
    setRequesting(true);
    await subscribe();
    setRequesting(false);
  };

  const handleOpenSettings = async () => {
    try {
      const { NativeSettings, AndroidSettings, IOSSettings } = await import("capacitor-native-settings");
      await NativeSettings.open({
        optionAndroid: AndroidSettings.AppNotification,
        optionIOS: IOSSettings.App,
      });
    } catch (err) {
      console.error("Failed to open native settings:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-20 pointer-events-none"
        style={{ background: isDenied
          ? "radial-gradient(circle, hsl(var(--destructive) / 0.4), transparent 70%)"
          : "radial-gradient(circle, hsl(var(--primary) / 0.4), transparent 70%)"
        }}
      />

      {/* Card */}
      <div className="relative max-w-[380px] w-full overflow-hidden rounded-[1.5rem] border border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        {/* Shimmer sweep */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[1.5rem]">
          <div className="absolute -inset-full animate-[shimmer_3s_ease-in-out_infinite]"
            style={{ background: "linear-gradient(120deg, transparent 30%, hsl(var(--primary) / 0.06) 50%, transparent 70%)" }}
          />
        </div>

        {/* Top accent line */}
        <div className="h-[2px] w-full" style={{
          background: isDenied
            ? "linear-gradient(90deg, transparent, hsl(var(--destructive)), transparent)"
            : "linear-gradient(90deg, transparent, hsl(var(--primary)), hsl(var(--gold, 42 75% 55%)), transparent)"
        }} />

        <div className="p-7 space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center"
                style={{
                  background: isDenied
                    ? "linear-gradient(135deg, hsl(var(--destructive) / 0.15), hsl(var(--destructive) / 0.05))"
                    : "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))",
                  border: isDenied
                    ? "1px solid hsl(var(--destructive) / 0.2)"
                    : "1px solid hsl(var(--primary) / 0.2)",
                }}
              >
                {isDenied ? (
                  <ShieldAlert className="w-8 h-8 text-destructive" />
                ) : (
                  <Bell className="w-8 h-8 text-primary animate-[bellSwing_2s_ease-in-out_infinite]" />
                )}
              </div>
              {!isDenied && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                  <Sparkles className="w-3 h-3 text-primary" />
                </div>
              )}
            </div>
          </div>

          {/* Title & Description */}
          <div className="text-center space-y-2.5">
            <h2 className="text-lg font-semibold text-foreground tracking-tight">
              {isDenied ? "Notifications Blocked" : "Enable Notifications"}
            </h2>
            <p className="text-[13px] text-muted-foreground leading-relaxed px-2">
              {isDenied
                ? isNative
                  ? "Notifications are turned off. Open settings to enable them and receive important updates."
                  : "Notifications are blocked. Update your browser settings to receive important updates."
                : "Stay updated with real-time alerts for attendance, marks, and announcements."}
            </p>
          </div>

          {/* Feature highlights */}
          {!isDenied && (
            <div className="space-y-1.5 px-1">
              {[
                { icon: "📋", text: "Attendance alerts when marked" },
                { icon: "📊", text: "Marks & results updates" },
                { icon: "📢", text: "Important announcements" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 px-3 rounded-xl bg-muted/40 border border-border/30">
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-[12px] text-muted-foreground font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-1">
            {isDenied && isNative ? (
              <Button
                onClick={handleOpenSettings}
                className="w-full h-12 text-sm font-semibold rounded-xl gap-2"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))" }}
              >
                <Settings className="w-4 h-4" />
                Open App Settings
              </Button>
            ) : !isDenied ? (
              <Button
                onClick={handleAllow}
                disabled={isLoading || requesting}
                className="w-full h-12 text-sm font-semibold rounded-xl border-0 transition-all duration-300 hover:shadow-lg"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))", boxShadow: "0 4px 20px hsl(var(--primary) / 0.25)" }}
              >
                {isLoading || requesting ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    <Bell className="w-4 h-4 mr-2" />
                    Allow Notifications
                  </>
                )}
              </Button>
            ) : null}

            {isDenied && !isNative && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/40">
                <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Click the <span className="font-semibold text-foreground/70">lock icon</span> in your address bar → Site settings → Allow notifications
                </p>
              </div>
            )}

            <button
              onClick={() => setDismissed(true)}
              className="w-full py-2.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors duration-300 rounded-xl hover:bg-muted/30"
            >
              {isDenied ? "I understand, continue anyway" : "Maybe later"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bellSwing {
          0%, 100% { transform: rotate(0deg); }
          15% { transform: rotate(12deg); }
          30% { transform: rotate(-10deg); }
          45% { transform: rotate(6deg); }
          60% { transform: rotate(-4deg); }
          75% { transform: rotate(0deg); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
