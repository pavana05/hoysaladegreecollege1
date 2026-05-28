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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(async () => {
            const userRole = await fetchUserRole(session.user.id);
            setRole(userRole);
            const userProfile = await fetchProfile(session.user.id);
            setProfile(userProfile);

            if ((window as any).AndroidBridge && session.user.email) {
              try { (window as any).AndroidBridge.onStudentLoggedIn(session.user.email); } catch {}
            }

            // Consume pending student registration info from localStorage
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
