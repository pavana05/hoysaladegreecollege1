import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Palette, Bell, Shield, UserCog, Type, Check, Fingerprint, ExternalLink, Sun, Moon, KeyRound } from "lucide-react";

type ThemeMode = "dark" | "light";
type FontScale = "sm" | "md" | "lg";

const ACCENTS: { name: string; hsl: string }[] = [
  { name: "Royal Navy", hsl: "217 72% 18%" },
  { name: "Aurora Gold", hsl: "42 87% 55%" },
  { name: "Emerald", hsl: "152 60% 38%" },
  { name: "Ruby", hsl: "350 70% 50%" },
  { name: "Plum", hsl: "265 55% 50%" },
  { name: "Teal", hsl: "190 70% 40%" },
];

const NOTIF_KEYS: { key: string; label: string; desc: string }[] = [
  { key: "fees", label: "Fee reminders", desc: "Due payments & receipts" },
  { key: "attendance", label: "Attendance", desc: "Daily mark notifications" },
  { key: "messages", label: "Messages", desc: "Direct messages from faculty" },
  { key: "announcements", label: "Announcements & Notices", desc: "College-wide updates" },
];

function applyAccent(hsl: string) {
  document.documentElement.style.setProperty("--primary", hsl);
  document.documentElement.style.setProperty("--ring", hsl);
}
function applyFontScale(s: FontScale) {
  const root = document.documentElement;
  root.classList.remove("font-scale-sm", "font-scale-md", "font-scale-lg");
  root.classList.add(`font-scale-${s}`);
}

export default function StudentSettings() {
  const { user, signOut } = useAuth();

  // Appearance
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem("theme") === "light" ? "light" : "dark"));
  const [accent, setAccent] = useState<string>(() => localStorage.getItem("hdc_accent") || ACCENTS[0].hsl);
  const [fontScale, setFontScale] = useState<FontScale>(() => (localStorage.getItem("hdc_font_scale") as FontScale) || "md");

  // Notifications
  const [notif, setNotif] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("hdc_notif_prefs") || "{}"); } catch { return {}; }
  });

  // Personalization
  const [displayName, setDisplayName] = useState<string>(() => localStorage.getItem("hdc_display_name") || "");

  // Privacy
  const [passkeyCount, setPasskeyCount] = useState<number | null>(null);

  useEffect(() => {
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => { applyAccent(accent); localStorage.setItem("hdc_accent", accent); }, [accent]);
  useEffect(() => { applyFontScale(fontScale); localStorage.setItem("hdc_font_scale", fontScale); }, [fontScale]);
  useEffect(() => { localStorage.setItem("hdc_notif_prefs", JSON.stringify(notif)); }, [notif]);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("passkeys").select("id", { count: "exact", head: true }).eq("user_id", user.id)
      .then(({ count }) => setPasskeyCount(count ?? 0));
  }, [user?.id]);

  const toggleNotif = (k: string) => setNotif((n) => ({ ...n, [k]: !(n[k] ?? true) }));

  const saveDisplayName = () => {
    localStorage.setItem("hdc_display_name", displayName.trim());
    toast.success("Display name updated");
  };

  return (
    <>
      <SEOHead title="Settings · Student" description="Personalize your student dashboard" noIndex />
      <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
        {/* Header */}
        <div className="relative overflow-hidden bg-card border border-border/60 rounded-3xl p-6 sm:p-8">
          <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full blur-3xl opacity-30" style={{ background: `hsl(${accent} / 0.45)` }} />
          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-primary/8 border border-primary/15 rounded-full px-3 py-1 mb-3">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="font-body text-[11px] text-primary font-semibold uppercase tracking-wider">Personalize</span>
            </div>
            <h1 className="font-body text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
            <p className="font-body text-sm text-muted-foreground mt-1.5">Make the app feel like yours — tune the look, alerts and security.</p>
          </div>
        </div>

        {/* Appearance */}
        <Section icon={Palette} title="Appearance" desc="Theme, accent and reading comfort">
          {/* Theme */}
          <div>
            <Label>Theme</Label>
            <div className="mt-2 grid grid-cols-2 gap-2 bg-muted/40 p-1 rounded-2xl">
              <ChipButton active={theme === "dark"} onClick={() => setTheme("dark")} icon={Moon} label="Dark luxe" />
              <ChipButton active={theme === "light"} onClick={() => setTheme("light")} icon={Sun} label="Light" />
            </div>
          </div>

          {/* Accent */}
          <div className="mt-5">
            <Label>Accent color</Label>
            <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              {ACCENTS.map((a) => {
                const selected = accent === a.hsl;
                return (
                  <button
                    key={a.name}
                    onClick={() => setAccent(a.hsl)}
                    className={`group relative aspect-square rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 ${selected ? "border-foreground/40 scale-[1.04]" : "border-border/60"}`}
                    style={{
                      background: `linear-gradient(135deg, hsl(${a.hsl}), hsl(${a.hsl} / 0.55))`,
                      boxShadow: selected ? `0 8px 24px -8px hsl(${a.hsl} / 0.6)` : undefined,
                    }}
                    aria-label={a.name}
                  >
                    {selected && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Check className="w-5 h-5 text-white drop-shadow" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="font-body text-[11px] text-muted-foreground mt-2">Currently: <span className="font-semibold text-foreground">{ACCENTS.find(a => a.hsl === accent)?.name ?? "Custom"}</span></p>
          </div>

          {/* Font scale */}
          <div className="mt-5">
            <Label>Text size</Label>
            <div className="mt-2 grid grid-cols-3 gap-2 bg-muted/40 p-1 rounded-2xl">
              {(["sm","md","lg"] as FontScale[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setFontScale(s)}
                  className={`relative py-2.5 rounded-xl font-body font-semibold transition-all ${fontScale === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Type className="w-3 h-3 inline mr-1" />
                  <span style={{ fontSize: s === "sm" ? 12 : s === "md" ? 14 : 16 }}>{s === "sm" ? "Small" : s === "md" ? "Standard" : "Large"}</span>
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Personalization */}
        <Section icon={UserCog} title="Personalization" desc="How the dashboard greets you">
          <Label>Display name (used in greeting)</Label>
          <div className="mt-2 flex gap-2">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Arjun"
              maxLength={32}
              className="flex-1 bg-muted/40 border border-border/60 rounded-xl px-3.5 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            <button
              onClick={saveDisplayName}
              className="px-4 rounded-xl bg-primary text-primary-foreground font-body text-sm font-semibold hover:scale-[1.02] active:scale-95 transition-all"
            >Save</button>
          </div>
          <p className="font-body text-[11px] text-muted-foreground mt-2">Leave empty to use your full profile name.</p>
        </Section>

        {/* Notifications */}
        <Section icon={Bell} title="Notifications" desc="What you want to be alerted about">
          <div className="divide-y divide-border/40">
            {NOTIF_KEYS.map((n) => {
              const on = notif[n.key] ?? true;
              return (
                <div key={n.key} className="flex items-center justify-between py-3.5">
                  <div className="min-w-0 pr-3">
                    <p className="font-body text-sm font-semibold text-foreground">{n.label}</p>
                    <p className="font-body text-[11px] text-muted-foreground mt-0.5">{n.desc}</p>
                  </div>
                  <button
                    onClick={() => toggleNotif(n.key)}
                    role="switch"
                    aria-checked={on}
                    className={`relative w-12 h-7 rounded-full transition-colors ${on ? "bg-primary" : "bg-muted"}`}
                  >
                    <span
                      className={`absolute top-0.5 w-6 h-6 rounded-full bg-card shadow-md transition-all ${on ? "left-[22px]" : "left-0.5"}`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Privacy */}
        <Section icon={Shield} title="Privacy & Security" desc="Biometric and session controls">
          <div className="space-y-2.5">
            <Link
              to="/dashboard/student/profile"
              className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-border/60 bg-card hover:border-foreground/20 hover:bg-muted/30 transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Fingerprint className="w-5 h-5 text-primary" /></div>
                <div className="min-w-0">
                  <p className="font-body text-sm font-semibold text-foreground">Manage passkeys</p>
                  <p className="font-body text-[11px] text-muted-foreground">{passkeyCount === null ? "Loading…" : `${passkeyCount} active biometric ${passkeyCount === 1 ? "passkey" : "passkeys"}`}</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>

            <Link
              to="/forgot-password"
              className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-border/60 bg-card hover:border-foreground/20 hover:bg-muted/30 transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><KeyRound className="w-5 h-5 text-amber-500" /></div>
                <div className="min-w-0">
                  <p className="font-body text-sm font-semibold text-foreground">Change password</p>
                  <p className="font-body text-[11px] text-muted-foreground">Reset securely via email link</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>

            <button
              onClick={async () => { await signOut(); toast.success("Signed out across this device"); }}
              className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl border border-red-500/20 bg-red-500/[0.04] hover:bg-red-500/10 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center"><Shield className="w-5 h-5 text-red-500" /></div>
                <div className="text-left">
                  <p className="font-body text-sm font-semibold text-red-500">Sign out of this device</p>
                  <p className="font-body text-[11px] text-muted-foreground">Ends the current session</p>
                </div>
              </div>
            </button>
          </div>
        </Section>
      </div>
    </DashboardLayout>
  );
}

function Section({ icon: Icon, title, desc, children }: { icon: any; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border/60 rounded-3xl p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-body text-base font-bold tracking-tight">{title}</h2>
          <p className="font-body text-[11px] text-muted-foreground">{desc}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="font-body text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">{children}</p>;
}

function ChipButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-body text-sm font-semibold transition-all ${active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
    >
      <Icon className="w-4 h-4" />{label}
    </button>
  );
}
