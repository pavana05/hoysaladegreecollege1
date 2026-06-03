import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User, Phone, MapPin, Calendar, BookOpen, Hash, Camera, Upload, Sparkles,
  Shield, Fingerprint, Trash2, FileText, Download, Lock, ChevronRight,
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

  const fieldGroups: { title: string; items: { label: string; value: any; mono?: boolean; full?: boolean }[] }[] = [
    {
      title: "Identity",
      items: [
        { label: "Full Name", value: profile?.full_name },
        { label: "Father's Name", value: student?.father_name },
        { label: "Mother's Name", value: student?.mother_name },
        { label: "Date of Birth", value: student?.date_of_birth, mono: true },
        { label: "Gender", value: (student as any)?.gender },
        { label: "Blood Group", value: (student as any)?.blood_group, mono: true },
        { label: "Nationality", value: (student as any)?.nationality },
        { label: "Religion", value: (student as any)?.religion },
        { label: "Category", value: (student as any)?.category },
        { label: "Aadhaar No.", value: formatAadhaar((student as any)?.aadhaar_number), mono: true },
      ],
    },
    {
      title: "Academic",
      items: [
        { label: "Roll Number", value: student?.roll_number, mono: true },
        { label: "Course", value: student?.courses?.name },
        { label: "Semester", value: student?.semester ? `Semester ${student.semester}` : null },
        { label: "Admission Year", value: student?.admission_year, mono: true },
        { label: "Joined On", value: (student as any)?.joined_at ? new Date((student as any).joined_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : null },
      ],
    },
    {
      title: "Contact",
      items: [
        { label: "Phone", value: (student as any)?.phone || profile?.phone, mono: true },
        { label: "Parent Phone", value: student?.parent_phone, mono: true },
        { label: "Address", value: student?.address, full: true },
      ],
    },
  ];

  const avatarUrl = (student as any)?.avatar_url;
  const initials = (profile?.full_name || "S").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden bg-card border border-border/40 rounded-3xl p-6 sm:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-secondary/[0.04]" />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">My Profile</h2>
            <p className="font-body text-xs text-muted-foreground mt-0.5">Your personal details</p>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden bg-card border border-border/40 rounded-3xl p-6 sm:p-8">
        <div className="relative flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group">
            {avatarUrl ? (
              <img src={avatarUrl} alt={profile?.full_name} className="w-32 h-32 rounded-3xl object-cover border-2 border-primary/20" />
            ) : (
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/20">
                <span className="font-display text-3xl font-bold text-primary">{initials}</span>
              </div>
            )}
            <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 rounded-3xl bg-foreground/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
              <Camera className="w-8 h-8 text-white" />
            </button>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-primary flex items-center justify-center border-2 border-card">
              <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
          </div>
          <div className="text-center sm:text-left flex-1">
            <h3 className="font-display text-2xl font-bold text-foreground">{profile?.full_name || "Student"}</h3>
            <p className="font-body text-sm text-primary font-semibold mt-1">{student?.courses?.name || "No course assigned"}</p>
            <div className="mt-4">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadAvatarMutation.mutate(file);
              }} />
              <Button variant="outline" size="sm" className="rounded-2xl font-body text-xs" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                {uploading ? "Uploading..." : <><Upload className="w-3 h-3 mr-1.5" /> {avatarUrl ? "Change Photo" : "Upload Photo"}</>}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden bg-card border border-border/40 rounded-3xl">
        {/* Aurora accents — premium dark */}
        <div className="pointer-events-none absolute -top-24 -right-20 w-72 h-72 rounded-full bg-primary/[0.07] blur-[80px]" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 w-72 h-72 rounded-full bg-primary/[0.04] blur-[80px]" />

        <div className="relative px-6 sm:px-8 pt-6 sm:pt-7 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-primary to-primary/30" />
            <h3 className="font-display text-base sm:text-lg font-semibold text-foreground tracking-tight">Personal Information</h3>
          </div>
          <span className="hidden sm:inline-flex font-body text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">Read-only</span>
        </div>

        <div className="relative px-3 sm:px-5 pb-3 sm:pb-4 pt-2">
          {fieldGroups.map((group, gi) => (
            <div key={group.title} className={gi > 0 ? "mt-4 sm:mt-5" : ""}>
              <div className="flex items-center gap-2 px-3 sm:px-4 mb-1.5">
                <span className="font-body text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/80">{group.title}</span>
                <span className="flex-1 h-px bg-gradient-to-r from-border/60 via-border/30 to-transparent" />
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 sm:gap-x-3">
                {group.items.map((it, idx) => {
                  const v = it.value;
                  const empty = v === null || v === undefined || v === "";
                  return (
                    <div
                      key={it.label}
                      className={`group flex items-baseline justify-between gap-4 px-3 sm:px-4 py-2.5 rounded-xl hover:bg-muted/30 transition-colors duration-200 ${it.full ? "sm:col-span-2" : ""} ${idx !== 0 ? "border-t border-border/20 sm:border-t-0" : ""}`}
                    >
                      <dt className="font-body text-[11.5px] uppercase tracking-[0.1em] text-muted-foreground/70 shrink-0">
                        {it.label}
                      </dt>
                      <dd
                        className={`text-right text-sm font-semibold tabular-nums ${empty ? "text-muted-foreground/40 font-normal italic" : "text-foreground"} ${it.mono ? "font-mono tracking-tight" : "font-body"} truncate max-w-[60%]`}
                        title={empty ? "Not provided" : String(v)}
                      >
                        {empty ? "—" : v}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          ))}
        </div>
      </div>

      {/* Documents Section */}
      <div className="relative overflow-hidden bg-card border border-border/40 rounded-3xl p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-primary/8 border border-primary/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-body text-xs font-bold text-muted-foreground uppercase tracking-[0.15em]">My Documents</h3>
            <p className="font-body text-[10px] text-muted-foreground mt-0.5">Documents uploaded by the college</p>
          </div>
        </div>
        {documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map((doc: any) => (
              <div key={doc.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/20">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="font-body text-sm text-foreground truncate">{doc.file_name}</p>
                    <p className="font-body text-[10px] text-muted-foreground">
                      {doc.document_type?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())} · {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl font-body text-xs shrink-0" onClick={async () => {
                  try {
                    const { data, error } = await supabase.storage.from("student-documents").download(doc.file_url);
                    if (error) throw error;
                    const url = URL.createObjectURL(data);
                    const a = document.createElement("a");
                    a.href = url; a.download = doc.file_name; a.click();
                    URL.revokeObjectURL(url);
                  } catch (e: any) { toast.error("Download failed: " + e.message); }
                }}>
                  <Download className="w-3 h-3 mr-1.5" /> Download
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="font-body text-sm text-muted-foreground/60">No documents uploaded yet.</p>
        )}
      </div>

      <div className="relative overflow-hidden bg-card border border-border/40 rounded-3xl p-6 sm:p-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/8 border border-primary/10 flex items-center justify-center">
              <Fingerprint className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-body text-xs font-bold text-muted-foreground uppercase tracking-[0.15em]">Passkey / Biometric Login</h3>
              <p className="font-body text-[10px] text-muted-foreground mt-0.5">Sign in with fingerprint, face, or screen lock</p>
            </div>
          </div>
        </div>

        {/* App Lock Toggle */}
        {appLockAvailable && (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/20 mb-4">
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 text-primary" />
              <div>
                <p className="font-body text-sm font-semibold text-foreground">App Lock</p>
                <p className="font-body text-[10px] text-muted-foreground">
                  Require biometric verification when opening the app
                </p>
              </div>
            </div>
            <Switch
              checked={appLock.isEnabled}
              onCheckedChange={handleToggleAppLock}
            />
          </div>
        )}

        {/* Passkey Login Toggle */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/20 mb-4">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-primary" />
            <div>
              <p className="font-body text-sm font-semibold text-foreground">Quick Passkey Login</p>
              <p className="font-body text-[10px] text-muted-foreground">
                Use biometric authentication (fingerprint/face/screen lock) at login
              </p>
            </div>
          </div>
          <Switch
            checked={passkeyLoginEnabled}
            onCheckedChange={handleTogglePasskeyLogin}
          />
        </div>

        {passkeys && passkeys.length > 0 && (
          <div className="space-y-2 mb-4">
            {passkeys.map((pk: any) => (
              <div key={pk.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/20">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-primary" />
                  <span className="font-body text-sm text-foreground">{pk.name || "My Passkey"}</span>
                  <span className="font-body text-[10px] text-muted-foreground">{new Date(pk.created_at).toLocaleDateString()}</span>
                </div>
                <button onClick={() => handleDeletePasskey(pk.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Button variant="outline" size="sm" className="rounded-2xl font-body text-xs" disabled={registeringPasskey} onClick={handleRegisterPasskey}>
          {registeringPasskey ? "Registering..." : <><Fingerprint className="w-3 h-3 mr-1.5" /> Register Passkey</>}
        </Button>
        <p className="font-body text-[10px] text-muted-foreground/60 mt-2.5 leading-relaxed">
          ⚠️ Passkeys are bound to the domain where registered. A passkey created here (<span className="font-semibold text-muted-foreground/80">{window.location.hostname}</span>) will only work on this same domain.
        </p>
      </div>
    </div>
  );
}
