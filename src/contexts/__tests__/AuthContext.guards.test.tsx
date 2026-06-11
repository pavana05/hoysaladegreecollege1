/**
 * End-to-end-style guard tests: under no Supabase auth-state-change scenario
 * (sign-in, token refresh after network reconnect, silent session swap,
 * mid-session role escalation) can a student account land inside
 * /dashboard/admin. These tests drive the real AuthContext + ProtectedRoute
 * components against a mocked Supabase client.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import React from "react";

type AuthEvent = "INITIAL_SESSION" | "SIGNED_IN" | "TOKEN_REFRESHED" | "SIGNED_OUT";
type Session = { user: { id: string; email: string } } | null;

// ---- mock supabase client ----------------------------------------------------
const mocks = vi.hoisted(() => {
  type AuthEvent = "INITIAL_SESSION" | "SIGNED_IN" | "TOKEN_REFRESHED" | "SIGNED_OUT";
  type Session = { user: { id: string; email: string } } | null;
  const state: {
    cb: ((e: AuthEvent, s: Session) => void) | null;
    session: Session;
    roleByUid: Map<string, string>;
  } = { cb: null, session: null, roleByUid: new Map() };
  const signOutMock = vi.fn(async () => {
    state.session = null;
    state.cb?.("SIGNED_OUT", null);
  });
  return { state, signOutMock };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: any) => {
        mocks.state.cb = cb;
        return { data: { subscription: { unsubscribe: () => { mocks.state.cb = null; } } } };
      },
      getSession: async () => ({ data: { session: mocks.state.session } }),
      signInWithPassword: async ({ email }: { email: string }) => {
        const user = { id: `uid-${email}`, email };
        mocks.state.session = { user };
        mocks.state.cb?.("SIGNED_IN", mocks.state.session);
        return { data: { user, session: mocks.state.session }, error: null };
      },
      signOut: mocks.signOutMock,
    },
    rpc: async (_fn: string, args: { _user_id: string }) =>
      ({ data: mocks.state.roleByUid.get(args._user_id) ?? null, error: null }),
    from: () => ({
      select: () => ({ eq: () => ({
        maybeSingle: async () => ({ data: { approval_status: "approved" }, error: null }),
        single: async () => ({ data: null, error: null }),
      }) }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
  },
}));

const { state, signOutMock } = mocks;

// Stub window.location.replace so forceReauth doesn't blow up jsdom
const replaceMock = vi.fn();
Object.defineProperty(window, "location", {
  writable: true,
  value: { ...window.location, replace: replaceMock, pathname: "/dashboard/admin" } as any,
});

// ---- system under test ------------------------------------------------------
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardRedirect from "@/components/DashboardRedirect";

function AdminPage() { return <div>ADMIN_DASHBOARD_CONTENT</div>; }
function StudentPage() { return <div>STUDENT_DASHBOARD_CONTENT</div>; }
function LoginPage() { return <div>LOGIN_PAGE</div>; }

function SignInButton({ email }: { email: string }) {
  const { signIn } = useAuth();
  return <button onClick={() => signIn(email, "pw")}>signin</button>;
}

function renderApp(initialPath = "/dashboard/admin") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <SignInButton email="student@test.io" />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={["student", "teacher", "principal", "admin"]}>
              <DashboardRedirect />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/admin" element={
            <ProtectedRoute allowedRoles={["admin", "principal"]}><AdminPage /></ProtectedRoute>
          } />
          <Route path="/dashboard/student" element={
            <ProtectedRoute allowedRoles={["student"]}><StudentPage /></ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  state.roleByUid.clear();
  state.session = null;
  state.cb? = null;
  replaceMock.mockClear();
  signOutMock.mockClear();
});

describe("Student → Admin route isolation", () => {
  it("blocks a student from rendering /dashboard/admin on direct navigation", async () => {
    state.roleByUid.set("uid-student@test.io", "student");
    localStorage.setItem("hdc_remember", "1");

    const { getByText } = renderApp("/dashboard/admin");
    act(() => { getByText("signin").click(); });

    await waitFor(() => {
      expect(screen.queryByText("ADMIN_DASHBOARD_CONTENT")).toBeNull();
    });
    // student is redirected to /dashboard → DashboardRedirect → /dashboard/student
    await waitFor(() => {
      expect(screen.queryByText("STUDENT_DASHBOARD_CONTENT")).not.toBeNull();
    });
  });

  it("does not leak a previous admin role into a new student session after token refresh", async () => {
    // Pre-seed device with a stale admin binding (simulates earlier admin login)
    localStorage.setItem("hdc_bound_uid", "uid-admin@test.io");
    localStorage.setItem("hdc_bound_role", "admin");
    localStorage.setItem("hdc_remember", "1");
    state.roleByUid.set("uid-student@test.io", "student");

    const { getByText } = renderApp("/dashboard/admin");
    // Explicit sign-in clears bound_uid/role then binds to the new student
    act(() => { getByText("signin").click(); });

    await waitFor(() => {
      expect(localStorage.getItem("hdc_bound_uid")).toBe("uid-student@test.io");
    });
    await waitFor(() => {
      expect(screen.queryByText("STUDENT_DASHBOARD_CONTENT")).not.toBeNull();
    });
    expect(screen.queryByText("ADMIN_DASHBOARD_CONTENT")).toBeNull();
  });

  it("forces reauth when a TOKEN_REFRESHED event swaps the session to a different uid", async () => {
    state.roleByUid.set("uid-student@test.io", "student");
    state.roleByUid.set("uid-admin@test.io", "admin");
    localStorage.setItem("hdc_remember", "1");

    const { getByText } = renderApp("/dashboard/student");
    act(() => { getByText("signin").click(); });
    await waitFor(() =>
      expect(localStorage.getItem("hdc_bound_uid")).toBe("uid-student@test.io"),
    );

    // Simulate the post-reconnect token refresh resolving to a different uid.
    await act(async () => {
      state.cb??.("TOKEN_REFRESHED", { user: { id: "uid-admin@test.io", email: "admin@test.io" } });
    });

    await waitFor(() => expect(signOutMock).toHaveBeenCalled());
    expect(localStorage.getItem("hdc_bound_uid")).toBeNull();
    expect(localStorage.getItem("hdc_bound_role")).toBeNull();
    expect(replaceMock).toHaveBeenCalledWith("/login?reauth=1");
  });

  it("forces reauth if the role fetched for the bound uid changes mid-session", async () => {
    state.roleByUid.set("uid-student@test.io", "student");
    localStorage.setItem("hdc_remember", "1");

    const { getByText } = renderApp("/dashboard/student");
    act(() => { getByText("signin").click(); });
    await waitFor(() =>
      expect(localStorage.getItem("hdc_bound_role")).toBe("student"),
    );

    // Server now claims the same uid is an admin (escalation attempt).
    state.roleByUid.set("uid-student@test.io", "admin");
    await act(async () => {
      state.cb??.("TOKEN_REFRESHED", state.session);
    });

    await waitFor(() => expect(signOutMock).toHaveBeenCalled());
    expect(replaceMock).toHaveBeenCalledWith("/login?reauth=1");
  });
});
