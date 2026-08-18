import React, { createContext, useContext, useEffect, useState } from "react";
import { authService } from "./AuthService";

type AuthContextValue = {
  user: any | null;
  signin: () => Promise<void>;
  signout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(authService.getUser());

  useEffect(() => {
    // Poll for user updates
    const interval = setInterval(async () => {
      const u = authService.getUser();
      if (u !== user) setUser(u);
    }, 500);
    return () => clearInterval(interval);
  }, [user]);

  const signin = async () => authService.signIn();
  const signout = async () => authService.signOut();
  const getAccessToken = async () => authService.getAccessToken();

  return (
    <AuthContext.Provider value={{ user, signin, signout, getAccessToken }}>{children}</AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
