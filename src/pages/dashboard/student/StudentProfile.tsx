import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User, Phone, Calendar, BookOpen, Hash, Camera, Sparkles,
  Shield, Fingerprint, Trash2, FileText, Download, Lock,
  GraduationCap, IdCard, Mail, Cake, Droplet, Users, Heart, Flag, Home, BadgeCheck
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatAadhaar } from "@/lib/format-aadhaar";
import { useAppLock } from "@/hooks/useAppLock";

const base64UrlToUint8Array = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
};

const arrayBufferToBase64Url = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
};

const PASSKEY_LOGIN_KEY = "hdc_passkey_login_enabled";

export default function StudentProfile() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [registeringPasskey, setRegisteringPasskey] = useState(false);
  const [passkeyLoginEnabled, setPasskeyLoginEnabled] = useState(() => {
    return localStorage.getItem(PASSKEY_LOGIN_KEY) === "true";
  });
  const appLock = useAppLock();
  const [appLockAvailable, setAppLockAvailable] = useState(false);

  useEffect(() => {
    appLock.checkAvailability().then(setAppLockAvailable);
  }, []);

  const handleToggleAppLock = async (checked: boolean) => {
    if (checked) {
      const success = await appLock.unlock();
      if (success) {
        appLock.enable();
        toast.success("App Lock enabled");
      } else {
        toast.error("Biometric verification failed");
      }
    } else {
      appLock.disable();
      toast.success("App Lock disabled");
    }
  };

  const { data: student } = useQuery({
    queryKey: ["student-record", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("*, courses(name, code)")
        .eq("user_id", user!.id)
        .single();
      if (!data) return data;
      const { data: sensitive } = await supabase
        .from("student_sensitive_data")
        .select("aadhaar_number, religion, caste, category")
        .eq("student_id", data.id)
        .maybeSingle();
      return { ...data, ...(sensitive || {}) };
    },
    enabled: !!user,
  });

  const { data: passkeys, refetch: refetchPasskeys } = useQuery({
    queryKey: ["passkeys", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("passkeys")
        .select("id, name, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["student-documents", student?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("student_documents").select("*").eq("student_id", student!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!student?.id,
  });

  // Auto-prompt to enable passkey login when passkeys exist but setting is off
  useEffect(() => {
    if (passkeys && passkeys.length > 0 && !passkeyLoginEnabled) {
      const dismissed = sessionStorage.getItem("hdc_passkey_prompt_dismissed");
      if (!dismissed) {
        toast("Enable Passkey Login?", {
          description: "You have a registered passkey. Enable quick login with fingerprint/face/screen lock?",
          action: {
            label: "Enable",
            onClick: () => {
              setPasskeyLoginEnabled(true);
              localStorage.setItem(PASSKEY_LOGIN_KEY, "true");
              toast.success("Passkey login enabled!");
            },
          },
          duration: 10000,
          onDismiss: () => sessionStorage.setItem("hdc_passkey_prompt_dismissed", "1"),
        });
      }
    }
  }, [passkeys, passkeyLoginEnabled]);

  const handleTogglePasskeyLogin = (checked: boolean) => {
    if (checked && (!passkeys || passkeys.length === 0)) {
      toast.error("Please register a passkey first before enabling passkey login.");
      return;
    }
    setPasskeyLoginEnabled(checked);
    localStorage.setItem(PASSKEY_LOGIN_KEY, String(checked));
    toast.success(checked ? "Passkey login enabled" : "Passkey login disabled");
  };

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploading(true);
      const ext = file.name.split(".").pop();
      const path = `avatars/${user!.id}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("uploads").upload(path, file, { upsert: true });
      if (uploadErr) throw new Error("Upload failed: " + uploadErr.message);
      const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
      const avatar_url = urlData.publicUrl;
      const { error } = await supabase.from("students").update({ avatar_url }).eq("user_id", user!.id);
      if (error) throw error;
      return avatar_url;
    },
    onSuccess: () => {
      toast.success("Profile photo updated!");
      queryClient.invalidateQueries({ queryKey: ["student-record", user?.id] });
      setUploading(false);
    },
    onError: (e: any) => { toast.error(e.message); setUploading(false); },
  });

  const handleRegisterPasskey = async () => {
    if (!window.PublicKeyCredential) { toast.error("Passkeys are not supported on this device/browser"); return; }
    try {
      setRegisteringPasskey(true);
      const { data: optionsData, error: optionsError } = await supabase.functions.invoke("passkey-register", { body: { action: "get-options" } });
      if (optionsError || optionsData?.error) { toast.error(optionsError?.message || optionsData?.error || "Failed to load passkey options"); return; }
      const opts = optionsData.options;
      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge: base64UrlToUint8Array(opts.challenge),
          rp: { name: opts.rp.name, id: window.location.hostname },
          user: { id: base64UrlToUint8Array(opts.user.id), name: opts.user.name, displayName: opts.user.displayName },
          pubKeyCredParams: opts.pubKeyCredParams,
          authenticatorSelection: opts.authenticatorSelection,
          timeout: opts.timeout,
          excludeCredentials: (opts.excludeCredentials || []).map((c: any) => ({ id: base64UrlToUint8Array(c.id), type: c.type })),
        },
      })) as PublicKeyCredential;
      if (!credential) { toast.error("Registration cancelled"); return; }
      const response = credential.response as AuthenticatorAttestationResponse;
      const { data: registerData, error: registerError } = await supabase.functions.invoke("passkey-register", {
        body: {
          action: "register",
          credential: {
            id: credential.id, rawId: arrayBufferToBase64Url(credential.rawId),
            response: { attestationObject: arrayBufferToBase64Url(response.attestationObject) },
            type: credential.type, transports: (response as any).getTransports?.() || [], name: "My Passkey",
          },
        },
      });
      if (registerError || registerData?.error) { toast.error(registerError?.message || registerData?.error || "Passkey registration failed"); return; }
      toast.success("Passkey registered successfully!");
      refetchPasskeys();
      // Auto-enable passkey login after first registration
      if (!passkeyLoginEnabled) {
        setPasskeyLoginEnabled(true);
        localStorage.setItem(PASSKEY_LOGIN_KEY, "true");
      }
    } catch (err: any) {
      console.error("Passkey registration error:", err);
      if (err?.name === "NotAllowedError") toast.error("Registration was cancelled or timed out");
      else if (err?.name === "InvalidStateError") toast.error("This passkey is already registered on this device");
      else if (err?.name === "SecurityError") toast.error("Security error — passkeys require HTTPS");
      else toast.error(err?.message || "Passkey registration failed");
    } finally { setRegisteringPasskey(false); }
  };

  const handleDeletePasskey = async (passkeyId: string) => {
    const { error } = await supabase.from("passkeys").delete().eq("id", passkeyId);
    if (error) { toast.error("Failed to delete passkey"); return; }
    toast.success("Passkey removed");
    refetchPasskeys();
    // If no passkeys left, disable passkey login
    const remaining = (passkeys || []).filter(pk => pk.id !== passkeyId);
    if (remaining.length === 0) {
      setPasskeyLoginEnabled(false);
      localStorage.setItem(PASSKEY_LOGIN_KEY, "false");
    }
  };

  type Row = { label: string; value: any; icon: any; mono?: boolean; full?: boolean };
  const fieldGroups: { title: string; items: Row[] }[] = [
    {
      title: "Identity",
      items: [
        { label: "Full Name", value: profile?.full_name, icon: User },
        { label: "Father's Name", value: student?.father_name, icon: Users },
        { label: "Mother's Name", value: student?.mother_name, icon: Users },
        { label: "Date of Birth", value: student?.date_of_birth, icon: Cake, mono: true },
        { label: "Gender", value: (student as any)?.gender, icon: User },
        { label: "Blood Group", value: (student as any)?.blood_group, icon: Droplet, mono: true },
        { label: "Nationality", value: (student as any)?.nationality, icon: Flag },
        { label: "Religion", value: (student as any)?.religion, icon: Heart },
        { label: "Category", value: (student as any)?.category, icon: BadgeCheck },
        { label: "Aadhaar", value: formatAadhaar((student as any)?.aadhaar_number), icon: IdCard, mono: true },
      ],
    },
    {
      title: "Academic",
      items: [
        { label: "Roll Number", value: student?.roll_number, icon: Hash, mono: true },
        { label: "Course", value: student?.courses?.name, icon: BookOpen },
        { label: "Semester", value: student?.semester ? `Semester ${student.semester}` : null, icon: GraduationCap },
        { label: "Admission Year", value: student?.admission_year, icon: Calendar, mono: true },
        { label: "Joined On", value: (student as any)?.joined_at ? new Date((student as any).joined_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : null, icon: Calendar },
      ],
    },
    {
      title: "Contact",
      items: [
        { label: "Email", value: profile?.email || user?.email, icon: Mail },
        { label: "Phone", value: (student as any)?.phone || profile?.phone, icon: Phone, mono: true },
        { label: "Parent Phone", value: student?.parent_phone, icon: Phone, mono: true },
        { label: "Address", value: student?.address, icon: Home, full: true },
      ],
    },
  ];

  const avatarUrl = (student as any)?.avatar_url;
  const initials = (profile?.full_name || "S").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  // iOS-style grouped list row
  const ListRow = ({ item, isLast }: { item: Row; isLast: boolean }) => {
    const Icon = item.icon;
    const v = item.value;
    const empty = v === null || v === undefined || v === "";
    return (
      <div className={`flex items-center gap-3 px-4 py-3 ${!isLast ? "border-b border-border/40" : ""}`}>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-body text-[11px] text-muted-foreground/80 leading-tight">{item.label}</p>
          <p className={`font-body text-[14px] leading-tight mt-0.5 ${empty ? "text-muted-foreground/40 italic" : "text-foreground font-medium"} ${item.mono ? "font-mono tabular-nums tracking-tight" : ""} ${item.full ? "whitespace-normal break-words" : "truncate"}`}>
            {empty ? "Not provided" : v}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-4 max-w-7xl mx-auto">

      {/* HERO — iOS Settings style header */}
      <div className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-card">
        {/* Aurora backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-secondary/10" />
        <div className="pointer-events-none absolute -top-20 -right-16 w-72 h-72 rounded-full bg-primary/20 blur-[80px]" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-secondary/15 blur-[80px]" />

        <div className="relative px-6 pt-8 pb-7 flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="relative group">
            <div className="absolute -inset-1.5 rounded-[2rem] bg-gradient-to-br from-primary/40 via-secondary/30 to-primary/20 blur-md opacity-70" />
            {avatarUrl ? (
              <img src={avatarUrl} alt={profile?.full_name} className="relative w-28 h-28 rounded-[1.75rem] object-cover border-2 border-card shadow-xl" />
            ) : (
              <div className="relative w-28 h-28 rounded-[1.75rem] bg-gradient-to-br from-primary/30 via-primary/15 to-secondary/20 flex items-center justify-center border-2 border-card shadow-xl">
                <span className="font-display text-3xl font-bold text-primary">{initials}</span>
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-card shadow-lg active:scale-95 transition-transform"
              aria-label="Change profile photo"
            >
              {uploading ? (
                <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadAvatarMutation.mutate(file);
            }} />
          </div>

          {/* Name + role pill */}
          <h2 className="font-display text-[26px] leading-tight font-bold text-foreground mt-4">
            {profile?.full_name || "Student"}
          </h2>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 border border-primary/20 backdrop-blur-sm">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="font-body text-[11px] font-semibold text-primary tracking-wide">
              {student?.courses?.name || "Student"}
            </span>
          </div>

          {/* Quick stats strip */}
          <div className="grid grid-cols-3 gap-2 w-full max-w-sm mt-6">
            {[
              { label: "Semester", value: student?.semester ?? "—" },
              { label: "Roll No", value: student?.roll_number ?? "—", mono: true },
              { label: "Year", value: student?.admission_year ?? "—", mono: true },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-card/70 backdrop-blur-md border border-border/40 px-2 py-2.5">
                <p className="font-body text-[9px] uppercase tracking-[0.14em] text-muted-foreground/70">{s.label}</p>
                <p className={`font-display text-base font-bold text-foreground mt-0.5 truncate ${s.mono ? "font-mono tabular-nums" : ""}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sections grid — side-by-side on tablets/desktops */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">

      {/* GROUPED LISTS — iOS inset style */}
      {fieldGroups.map((group) => (
        <section key={group.title} className="space-y-2">

          <div className="flex items-center gap-2 px-4">
            <h3 className="font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">{group.title}</h3>
            <span className="flex-1 h-px bg-border/40" />
          </div>
          <div className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm">
            {group.items.map((it, idx) => (
              <ListRow key={it.label} item={it} isLast={idx === group.items.length - 1} />
            ))}
          </div>
        </section>
      ))}

      {/* DOCUMENTS */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 px-4">
          <h3 className="font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">Documents</h3>
          <span className="flex-1 h-px bg-border/40" />
        </div>
        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm">
          {documents.length > 0 ? (
            documents.map((doc: any, idx: number) => (
              <div key={doc.id} className={`flex items-center gap-3 px-4 py-3 ${idx !== documents.length - 1 ? "border-b border-border/40" : ""}`}>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-[14px] text-foreground font-medium truncate">{doc.file_name}</p>
                  <p className="font-body text-[11px] text-muted-foreground mt-0.5">
                    {doc.document_type?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())} · {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  className="p-2 rounded-xl hover:bg-muted/60 text-muted-foreground hover:text-primary transition-colors"
                  aria-label="Download"
                  onClick={async () => {
                    try {
                      const { data, error } = await supabase.storage.from("student-documents").download(doc.file_url);
                      if (error) throw error;
                      const url = URL.createObjectURL(data);
                      const a = document.createElement("a");
                      a.href = url; a.download = doc.file_name; a.click();
                      URL.revokeObjectURL(url);
                    } catch (e: any) { toast.error("Download failed: " + e.message); }
                  }}
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="font-body text-sm text-muted-foreground/60">No documents uploaded yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* SECURITY */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 px-4">
          <h3 className="font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">Security & Privacy</h3>
          <span className="flex-1 h-px bg-border/40" />
        </div>

        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm">
          {appLockAvailable && (
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body text-[14px] font-medium text-foreground">App Lock</p>
                <p className="font-body text-[11px] text-muted-foreground mt-0.5">Require biometric to open the app</p>
              </div>
              <Switch checked={appLock.isEnabled} onCheckedChange={handleToggleAppLock} />
            </div>
          )}

          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-body text-[14px] font-medium text-foreground">Quick Passkey Login</p>
              <p className="font-body text-[11px] text-muted-foreground mt-0.5">Sign in with fingerprint / face</p>
            </div>
            <Switch checked={passkeyLoginEnabled} onCheckedChange={handleTogglePasskeyLogin} />
          </div>
        </div>

        {/* Registered passkeys */}
        {passkeys && passkeys.length > 0 && (
          <div className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm">
            {passkeys.map((pk: any, idx: number) => (
              <div key={pk.id} className={`flex items-center gap-3 px-4 py-3 ${idx !== passkeys.length - 1 ? "border-b border-border/40" : ""}`}>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Fingerprint className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-[14px] font-medium text-foreground truncate">{pk.name || "My Passkey"}</p>
                  <p className="font-body text-[11px] text-muted-foreground mt-0.5">Added {new Date(pk.created_at).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => handleDeletePasskey(pk.id)}
                  className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Remove passkey"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Button
          variant="outline"
          className="w-full rounded-2xl font-body h-11 gap-2"
          disabled={registeringPasskey}
          onClick={handleRegisterPasskey}
        >
          {registeringPasskey ? (
            <>
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Registering…
            </>
          ) : (
            <>
              <Fingerprint className="w-4 h-4" />
              {passkeys && passkeys.length > 0 ? "Add Another Passkey" : "Register Passkey"}
            </>
          )}
        </Button>

        <p className="font-body text-[11px] text-muted-foreground/70 leading-relaxed px-4">
          ⚠️ Passkeys are bound to <span className="font-semibold text-muted-foreground">{window.location.hostname}</span>. They will only work on this domain.
        </p>
      </section>
    </div>
  );
}

