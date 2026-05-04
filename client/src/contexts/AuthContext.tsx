import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";

export interface AuthUser {
  id: string;
  username: string;
  fullName: string | null;
  email: string;
  phoneNumber: string;
  dateOfBirth: string | null;
  profileImageUrl: string | null;
  role: "player" | "turf_owner" | "turf_staff";
  ownerStatus?: string | null;
  turfStatus?: string | null;
  turfName?: string | null;
  turfLocation?: string | null;
  turfAddress?: string | null;
  turfPincode?: string | null;
  turfImageUrls?: string[] | null;
  turfLength?: number | null;
  turfWidth?: number | null;
}

export type GoogleLoginResult =
  | {
      needsRegistration: true;
      email: string;
      fullName: string | null;
      profileImageUrl: string | null;
    }
  | {
      needsRegistration: false;
      user: AuthUser;
    };

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<GoogleLoginResult>;
  register: (data: PlayerRegisterData) => Promise<void>;
  registerOwner: (data: OwnerRegisterData) => Promise<void>;
  submitTurf: (data: TurfSubmitData) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (identifier: string, dateOfBirth: string, newPassword: string) => Promise<void>;
}

export interface PlayerRegisterData {
  username: string;
  email: string;
  phoneNumber: string;
  password: string;
  dateOfBirth: string;
}

export interface OwnerRegisterData {
  fullName: string;
  username: string;
  email: string;
  phoneNumber: string;
  password: string;
  dateOfBirth: string;
}

export interface TurfSubmitData {
  turfName: string;
  turfLocation: string;
  turfAddress: string;
  turfPincode: string;
  turfImageUrls: string[];
  turfLength: number;
  turfWidth: number;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = async () => {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setUser(data);
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    fetchMe().finally(() => setIsLoading(false));
  }, []);

  const login = async (identifier: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { identifier, password });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    setUser(data);
  };

  const loginWithGoogle = async (credential: string) => {
    const res = await apiRequest("POST", "/api/auth/google", { credential });
    const data = (await res.json()) as GoogleLoginResult;

    if (data.needsRegistration === false) {
      setUser(data.user);
    }

    return data;
  };

  const register = async (data: PlayerRegisterData) => {
    const res = await apiRequest("POST", "/api/auth/register", data);
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Registration failed");
    setUser(body);
  };

  const registerOwner = async (data: OwnerRegisterData) => {
    const res = await apiRequest("POST", "/api/auth/register/owner", data);
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Registration failed");
    setUser(body);
  };

  const submitTurf = async (data: TurfSubmitData) => {
    const res = await apiRequest("POST", "/api/owner/turf/submit", data);
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Turf submission failed");
    setUser(body);
  };

  const refreshUser = async () => {
    await fetchMe();
  };

  const logout = async () => {
    await apiRequest("POST", "/api/auth/logout", {});
    setUser(null);
  };

  const forgotPassword = async (identifier: string, dateOfBirth: string, newPassword: string) => {
    const res = await apiRequest("POST", "/api/auth/forgot-password", { identifier, dateOfBirth, newPassword });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Password reset failed");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithGoogle, register, registerOwner, submitTurf, refreshUser, logout, forgotPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
