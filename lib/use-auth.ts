"use client";

import { useEffect, useState } from "react";

type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: "admin" | "distributor" | "receiver" | string;
  organization: string;
};

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const result: ApiResponse<AuthUser> = await response.json();
        if (response.ok && result.success && result.data) {
          setUser(result.data);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return { user, loading };
}