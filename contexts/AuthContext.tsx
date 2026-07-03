"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
  }, []);

  const refreshSession = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error("AuthProvider getSession error:", error);
      applySession(null);
    } else {
      applySession(data.session);
    }

    setLoading(false);
  }, [applySession]);

  const signOut = useCallback(async () => {
    setLoading(true);

    if (typeof window !== "undefined") {
      localStorage.removeItem("current_school_id");
      localStorage.removeItem("current_school_name");
      localStorage.removeItem("current_semester");
    }

    await supabase.auth.signOut();

    applySession(null);
    setLoading(false);
  }, [applySession]);

  useEffect(() => {
    void refreshSession();

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
      setLoading(false);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [refreshSession, applySession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      isAuthenticated: !!user,
      refreshSession,
      signOut,
    }),
    [user, session, loading, refreshSession, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}