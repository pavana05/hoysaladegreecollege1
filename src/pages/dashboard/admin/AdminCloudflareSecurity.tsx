import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Globe, Trash2, BarChart3, AlertTriangle, CheckCircle, RefreshCw, ArrowLeft, Zap, Lock, Eye, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import SEOHead from "@/components/SEOHead";

async function cfAction(action: string, zone_id?: string, params?: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  const { data, error } = await supabase.functions.invoke("cloudflare-security", {
    body: { action, zone_id, params },
  });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || "Unknown error");
  return data.data;
}

const SECURITY_LEVELS = [
  { value: "off", label: "Off", desc: "No challenge pages", color: "text-muted-foreground" },
  { value: "essentially_off", label: "Essentially Off", desc: "Only most threatening", color: "text-muted-foreground" },
  { value: "low", label: "Low", desc: "Challenge threatening visitors", color: "text-amber-500" },
  { value: "medium", label: "Medium", desc: "Challenge more visitors", color: "text-orange-500" },
  { value: "high", label: "High", desc: "Challenge all suspicious", color: "text-red-500" },
  { value: "under_attack", label: "Under Attack", desc: "Maximum protection", color: "text-red-600" },
];

export default function AdminCloudflareSecurity() {
  const queryClient = useQueryClient();
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const { data: zonesData, isLoading: zonesLoading, error: zonesError } = useQuery({
    queryKey: ["cf-zones"],
    queryFn: () => cfAction("get_zones"),
  });

  const zones = zonesData?.result || [];

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ["cf-settings", selectedZone],
    queryFn: () => cfAction("zone_settings", selectedZone!),
    enabled: !!selectedZone,
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ["cf-analytics", selectedZone],
    queryFn: () => cfAction("analytics", selectedZone!, { since: "-10080" }),
    enabled: !!selectedZone,
  });

  const purgeMutation = useMutation({
    mutationFn: () => cfAction("purge_cache", selectedZone!),
    onSuccess: () => toast.success("Cache purged successfully!"),
    onError: (e: Error) => toast.error(e.message),
  });

  const securityMutation = useMutation({
    mutationFn: (level: string) => cfAction("security_level", selectedZone!, { level }),
    onSuccess: () => {
      toast.success("Security level updated!");
      queryClient.invalidateQueries({ queryKey: ["cf-settings", selectedZone] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const settings = settingsData?.result || [];
  const secLevel = settings.find((s: any) => s.id === "security_level")?.value || "medium";
  const sslMode = settings.find((s: any) => s.id === "ssl")?.value || "off";
  const minify = settings.find((s: any) => s.id === "minify")?.value;
  const waf = settings.find((s: any) => s.id === "waf")?.value || "off";

  const totals = analyticsData?.result?.totals;
  const requests = totals?.requests;
  const threats = totals?.threats;
  const bandwidth = totals?.bandwidth;

  return (
    <div className="space-y-6 dashboard-enter">
      <SEOHead title="Cloudflare Security" />

      <div className="flex items-center gap-3">
        <Link to="/dashboard/admin/settings">
          <Button variant="ghost" size="icon" className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center">
          <Shield className="w-6 h-6 text-orange-500" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Cloudflare Security</h1>
          <p className="font-body text-sm text-muted-foreground">Manage CDN, firewall & cache settings</p>
        </div>
      </div>

      {/* Zone Selector */}
      {zonesLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : zonesError ? (
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
          <p className="font-body text-sm text-destructive font-semibold">Failed to load zones</p>
          <p className="font-body text-xs text-muted-foreground mt-1">{(zonesError as Error).message}</p>
        </div>
      ) : zones.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <Globe className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-display text-lg font-bold text-foreground mb-1">No Zones Found</h3>
          <p className="font-body text-sm text-muted-foreground max-w-md mx-auto">
            Add your domain to Cloudflare first. Once active, it will appear here for management.
          </p>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {zones.map((z: any) => (
              <button key={z.id} onClick={() => setSelectedZone(z.id)}
                className={`text-left p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 ${
                  selectedZone === z.id
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-border bg-card hover:border-primary/30"
                }`}>
                <div className="flex items-center gap-3 mb-2">
                  <Globe className="w-5 h-5 text-primary" />
                  <span className="font-display text-sm font-bold text-foreground">{z.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${z.status === "active" ? "bg-emerald-500" : "bg-amber-500"}`} />
                  <span className="font-body text-xs text-muted-foreground capitalize">{z.status}</span>
                </div>
              </button>
            ))}
          </div>

          {selectedZone && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Quick Stats */}
              {analyticsLoading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
                </div>
              ) : requests && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatTile icon={Eye} label="Total Requests" value={formatNum(requests.all)} color="bg-blue-500/10" iconColor="text-blue-500" />
                  <StatTile icon={CheckCircle} label="Cached" value={formatNum(requests.cached)} color="bg-emerald-500/10" iconColor="text-emerald-500" />
                  <StatTile icon={AlertTriangle} label="Threats" value={formatNum(threats?.all || 0)} color="bg-red-500/10" iconColor="text-red-500" />
                  <StatTile icon={Server} label="Bandwidth" value={formatBytes(bandwidth?.all || 0)} color="bg-violet-500/10" iconColor="text-violet-500" />
                </div>
              )}

              {/* Settings Grid */}
              {settingsLoading ? (
                <Skeleton className="h-64 rounded-2xl" />
              ) : (
                <div className="grid md:grid-cols-2 gap-5">
                  {/* Security Level */}
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className="w-5 h-5 text-orange-500" />
                      <h3 className="font-display text-base font-bold text-foreground">Security Level</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {SECURITY_LEVELS.map(sl => (
                        <button key={sl.value} onClick={() => securityMutation.mutate(sl.value)}
                          disabled={securityMutation.isPending}
                          className={`p-3 rounded-xl border text-left transition-all duration-200 hover:scale-[1.02] ${
                            secLevel === sl.value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/30"
                          }`}>
                          <span className={`font-body text-xs font-bold ${sl.color}`}>{sl.label}</span>
                          <p className="font-body text-[10px] text-muted-foreground mt-0.5">{sl.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-5 h-5 text-amber-500" />
                      <h3 className="font-display text-base font-bold text-foreground">Quick Actions</h3>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-background space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-body text-sm font-semibold text-foreground">SSL Mode</p>
                          <p className="font-body text-xs text-muted-foreground">Current: <span className="font-semibold capitalize text-primary">{sslMode}</span></p>
                        </div>
                        <Lock className="w-4 h-4 text-emerald-500" />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-background space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-body text-sm font-semibold text-foreground">WAF</p>
                          <p className="font-body text-xs text-muted-foreground">Firewall: <span className={`font-semibold capitalize ${waf === "on" ? "text-emerald-500" : "text-muted-foreground"}`}>{waf}</span></p>
                        </div>
                        <Shield className="w-4 h-4 text-primary" />
                      </div>
                    </div>

                    {minify && (
                      <div className="p-4 rounded-xl border border-border bg-background">
                        <p className="font-body text-sm font-semibold text-foreground mb-1">Auto Minify</p>
                        <div className="flex gap-3 font-body text-xs text-muted-foreground">
                          <span>JS: <span className={minify.js === "on" ? "text-emerald-500 font-bold" : ""}>{minify.js}</span></span>
                          <span>CSS: <span className={minify.css === "on" ? "text-emerald-500 font-bold" : ""}>{minify.css}</span></span>
                          <span>HTML: <span className={minify.html === "on" ? "text-emerald-500 font-bold" : ""}>{minify.html}</span></span>
                        </div>
                      </div>
                    )}

                    <Button onClick={() => purgeMutation.mutate()} disabled={purgeMutation.isPending}
                      className="w-full rounded-xl" variant="destructive">
                      {purgeMutation.isPending ? (
                        <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Purging...</>
                      ) : (
                        <><Trash2 className="w-4 h-4 mr-2" /> Purge All Cache</>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatTile({ icon: Icon, label, value, color, iconColor }: { icon: any; label: string; value: string; color: string; iconColor: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <p className="font-display text-xl font-bold text-foreground tabular-nums">{value}</p>
      <p className="font-body text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function formatNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function formatBytes(b: number) {
  if (b >= 1e9) return (b / 1e9).toFixed(2) + " GB";
  if (b >= 1e6) return (b / 1e6).toFixed(1) + " MB";
  if (b >= 1e3) return (b / 1e3).toFixed(1) + " KB";
  return b + " B";
}
