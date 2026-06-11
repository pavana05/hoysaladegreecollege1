import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "student" | "teacher" | "principal" | "admin";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  profile: any;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: AppRole,
    extraMeta?: Record<string, any>,
  ) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    const { data } = await supabase.rpc("get_user_role", { _user_id: userId });
    return data as AppRole | null;
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    return data;
  };

  useEffect(() => {
    let currentUserId: string | null = null;

    // Step-up reauth: any session whose user.id doesn't match the uid we
    // explicitly bound at signIn time is treated as untrusted. This blocks
    // silent identity swaps (e.g. a stale admin session being re-hydrated
    // after a token refresh / network reconnect) from reaching protected
    // routes — the user is forced back to /login to re-authenticate.
    const forceReauth = async (reason: string) => {
      console.warn("[auth] Step-up reauth required:", reason);
      try { await supabase.auth.signOut(); } catch {}
      localStorage.removeItem("hdc_bound_uid");
      localStorage.removeItem("hdc_bound_role");
      localStorage.removeItem("hdc_remember");
      sessionStorage.removeItem("hdc_remember");
      currentUserId = null;
      setUser(null); setSession(null); setRole(null); setProfile(null);
      setLoading(false);
      if (!["/login", "/register", "/forgot-password", "/reset-password"].includes(window.location.pathname)) {
        window.location.replace("/login?reauth=1");
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const nextUserId = session?.user?.id ?? null;
        const userChanged = nextUserId !== currentUserId;

        // Identity binding check — before trusting this session for any UI.
        if (session?.user) {
          const boundUid = localStorage.getItem("hdc_bound_uid");
          if (event === "SIGNED_IN" && !boundUid) {
            // First-time bind for explicit sign-in OR migration of an
            // already-persisted session on the first load after this feature.
            localStorage.setItem("hdc_bound_uid", session.user.id);
          } else if (boundUid && boundUid !== session.user.id) {
            await forceReauth(`uid mismatch (bound=${boundUid}, session=${session.user.id})`);
            return;
          } else if (!boundUid && event !== "INITIAL_SESSION") {
            // A session appeared without an explicit bind — refuse it.
            await forceReauth(`unbound session via ${event}`);
            return;
          } else if (!boundUid && event === "INITIAL_SESSION") {
            // Pre-existing session from before this guard — bind it now.
            localStorage.setItem("hdc_bound_uid", session.user.id);
          }
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          if (userChanged) {
            setRole(null);
            setProfile(null);
            setLoading(true);
          }
          currentUserId = nextUserId;

          setTimeout(async () => {
            const userRole = await fetchUserRole(session.user.id);
            if (currentUserId !== session.user.id) return;

            // Role pinning: once a role has been observed for this uid in
            // this device, any later change without an explicit re-login is
            // treated as suspicious and forces a step-up reauth.
            const boundRole = localStorage.getItem("hdc_bound_role");
            if (userRole) {
              if (!boundRole) {
                localStorage.setItem("hdc_bound_role", userRole);
              } else if (boundRole !== userRole) {
                await forceReauth(`role mismatch (bound=${boundRole}, fetched=${userRole})`);
                return;
              }
            }

            setRole(userRole);
            const userProfile = await fetchProfile(session.user.id);
            if (currentUserId !== session.user.id) return;
            setProfile(userProfile);

            if ((window as any).AndroidBridge && session.user.email) {
              try { (window as any).AndroidBridge.onStudentLoggedIn(session.user.email); } catch {}
            }

            const pendingRaw = localStorage.getItem("hdc_pending_student_info");
            if (pendingRaw && userRole === "student") {
              try {
                const pending = JSON.parse(pendingRaw);
                await supabase.from("students").update({
                  phone: pending.phone || "",
                  father_name: pending.fatherName || "",
                  mother_name: pending.motherName || "",
                  parent_phone: pending.parentPhone || "",
                  address: pending.address || "",
                  date_of_birth: pending.dateOfBirth || null,
                }).eq("user_id", session.user.id);
                if (pending.phone) {
                  await supabase.from("profiles").update({ phone: pending.phone }).eq("user_id", session.user.id);
                }
                localStorage.removeItem("hdc_pending_student_info");
              } catch (e) {
                console.warn("Failed to sync pending student info:", e);
              }
            }

            setLoading(false);
          }, 0);
        } else {
          currentUserId = null;
          setRole(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setLoading(false);
      } else {
        const rememberFlag = localStorage.getItem("hdc_remember");
        const sessionFlag = sessionStorage.getItem("hdc_remember");
        if (!rememberFlag && !sessionFlag) {
          supabase.auth.signOut().then(() => {
            setUser(null); setSession(null); setRole(null); setProfile(null);
            setLoading(false);
          });
        } else {
          sessionStorage.setItem("hdc_remember", "1");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: AppRole,
    extraMeta: Record<string, any> = {},
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role, ...extraMeta },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    if ((window as any).AndroidBridge) {
      try { (window as any).AndroidBridge.onStudentLoggedOut(); } catch {}
    }
    localStorage.removeItem("hdc_remember");
    sessionStorage.removeItem("hdc_remember");
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, profile, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
